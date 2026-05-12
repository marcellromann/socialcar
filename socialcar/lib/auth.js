'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const AuthCtx = createContext({
  user: null,
  appUser: null,
  loading: true,
  refresh: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAppUser = useCallback(async (authUser) => {
    if (!authUser) { setAppUser(null); return; }

    console.log('[auth] loadAppUser — auth_id:', authUser.id, 'email:', authUser.email);

    const { data: existing, error: lookupErr } = await supabase
      .from('users')
      .select('id, email, nome, tipo, auth_id, telefone, avatar_url, created_at, cep, rua, numero, complemento, bairro, cidade, estado_endereco, status')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    console.log('[auth] users lookup →', { existing, error: lookupErr });

    let data = existing;

    // Primeira vez (login social ou cadastro que não criou o registro): insere agora
    if (!data) {
      const meta = authUser.user_metadata || {};
      const insertPayload = {
        auth_id: authUser.id,
        email: authUser.email,
        nome: meta.nome || meta.full_name || meta.name || null,
        tipo: meta.tipo || 'comprador',
      };
      console.log('[auth] criando registro em public.users (primeira vez):', insertPayload);
      const { data: inserted, error: insertErr } = await supabase
        .from('users')
        .insert(insertPayload)
        .select('id, email, nome, tipo, auth_id, telefone, avatar_url, created_at, cep, rua, numero, complemento, bairro, cidade, estado_endereco, status')
        .single();
      console.log('[auth] resultado insert public.users:', { inserted, error: insertErr });

      if (insertErr) {
        // 23505 = unique_violation. Significa que /cadastro já inseriu em
        // paralelo. Refetch o registro existente em vez de tratar como falha.
        if (insertErr.code === '23505') {
          console.log('[auth] insert em paralelo detectado — refetch do registro existente');
          const { data: refetched } = await supabase
            .from('users')
            .select('id, email, nome, tipo, auth_id, telefone, avatar_url, created_at, cep, rua, numero, complemento, bairro, cidade, estado_endereco, status')
            .eq('auth_id', authUser.id)
            .maybeSingle();
          data = refetched || null;
        } else {
          console.error('[auth] FALHA ao criar public.users — appUser ficará null:', insertErr);
        }
      } else {
        data = inserted;
      }
    }

    setAppUser(data || null);
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancel) return;
      const u = data?.user || null;
      setUser(u);
      await loadAppUser(u);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      loadAppUser(u);
    });
    return () => {
      cancel = true;
      sub.subscription.unsubscribe();
    };
  }, [loadAppUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAppUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const u = data?.user || null;
    setUser(u);
    await loadAppUser(u);
  }, [loadAppUser]);

  const value = useMemo(
    () => ({ user, appUser, loading, signOut, refresh }),
    [user, appUser, loading, signOut, refresh]
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
