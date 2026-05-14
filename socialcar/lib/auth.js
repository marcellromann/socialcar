'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { touchLastSeen } from './presence';

const AuthCtx = createContext({
  user: null,
  appUser: null,
  loading: true,
  refresh: () => {},
  signOut: async () => {},
  updateLastSeen: async () => {},
});

// Throttle de touchLastSeen: 1 update por minuto basta pra presença "online".
const TOUCH_THROTTLE_MS = 60_000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cache em memória do appUser já carregado, indexado por auth_id. Evita
  // refetch de /api/me em cada INITIAL_SESSION / TOKEN_REFRESHED disparado pelo
  // supabase.auth.onAuthStateChange (que acontece em todo mount e a cada hora).
  const cachedRef   = useRef({ authId: null, appUser: null });
  // Dedup: se duas chamadas a loadAppUser para o mesmo auth_id chegarem em
  // paralelo (getUser + INITIAL_SESSION), a segunda aguarda a promessa em vôo.
  const inflightRef = useRef(null); // { authId, promise }
  const lastTouchRef = useRef(0);

  const loadAppUser = useCallback(async (authUser) => {
    if (!authUser) {
      cachedRef.current = { authId: null, appUser: null };
      inflightRef.current = null;
      setAppUser(null);
      return;
    }

    // Hit no cache: mesmo auth_id já carregado. Só faz touchLastSeen com
    // throttle e mantém o appUser atual — sem fetch nem re-render.
    if (cachedRef.current.authId === authUser.id && cachedRef.current.appUser) {
      const now = Date.now();
      if (now - lastTouchRef.current > TOUCH_THROTTLE_MS) {
        lastTouchRef.current = now;
        touchLastSeen(cachedRef.current.appUser.id);
      }
      return;
    }

    // Já tem fetch em vôo pro mesmo auth_id: aguarda em vez de duplicar.
    if (inflightRef.current?.authId === authUser.id) {
      await inflightRef.current.promise;
      return;
    }

    console.log('[auth] loadAppUser — auth_id:', authUser.id, 'email:', authUser.email);

    const promise = (async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        console.warn('[auth] sem access_token na sessão — appUser ficará null');
        return null;
      }
      try {
        const res = await fetch('/api/me', {
          headers: { authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error('[auth] /api/me falhou:', res.status, json);
          return null;
        }
        console.log('[auth] /api/me →', { source: json.source, appUser: json.appUser });
        return json.appUser || null;
      } catch (e) {
        console.error('[auth] /api/me erro de rede:', e);
        return null;
      }
    })();

    inflightRef.current = { authId: authUser.id, promise };
    const data = await promise;
    inflightRef.current = null;

    if (data?.id) {
      const nowIso = new Date().toISOString();
      data.last_seen_at = nowIso;
      lastTouchRef.current = Date.now();
      touchLastSeen(data.id);
    }
    cachedRef.current = { authId: authUser.id, appUser: data };
    setAppUser(data || null);
  }, []);

  const updateLastSeen = useCallback(async () => {
    setAppUser((u) => {
      if (!u?.id) return u;
      const now = Date.now();
      if (now - lastTouchRef.current > TOUCH_THROTTLE_MS) {
        lastTouchRef.current = now;
        touchLastSeen(u.id);
      }
      return { ...u, last_seen_at: new Date(now).toISOString() };
    });
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancel) return;
      const u = data?.user || null;
      setUser((prev) => (prev?.id === u?.id ? prev : u));
      await loadAppUser(u);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user || null;
      // setUser só se o id de fato mudou — evita re-render em cascata pra
      // os 15 componentes que consomem useAuth() quando o evento é apenas
      // TOKEN_REFRESHED ou INITIAL_SESSION pro mesmo usuário.
      setUser((prev) => (prev?.id === u?.id ? prev : u));
      // SIGNED_OUT zera tudo. Caso contrário, loadAppUser já tem cache+dedup,
      // então é seguro chamar — vira no-op se o auth_id não mudou.
      if (event === 'SIGNED_OUT' || !u) {
        loadAppUser(null);
      } else {
        loadAppUser(u);
      }
    });
    return () => {
      cancel = true;
      sub.subscription.unsubscribe();
    };
  }, [loadAppUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    cachedRef.current = { authId: null, appUser: null };
    inflightRef.current = null;
    setUser(null);
    setAppUser(null);
  }, []);

  const refresh = useCallback(async () => {
    // Invalida o cache pra forçar um refetch real.
    cachedRef.current = { authId: null, appUser: null };
    const { data } = await supabase.auth.getUser();
    const u = data?.user || null;
    setUser(u);
    await loadAppUser(u);
  }, [loadAppUser]);

  const value = useMemo(
    () => ({ user, appUser, loading, signOut, refresh, updateLastSeen }),
    [user, appUser, loading, signOut, refresh, updateLastSeen]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}

export function getInitials(nameOrEmail) {
  if (!nameOrEmail) return 'S';
  const txt = String(nameOrEmail).trim();
  const parts = txt.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return txt.slice(0, 2).toUpperCase();
}
