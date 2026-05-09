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
    let { data } = await supabase
      .from('users')
      .select('id, email, nome, tipo, auth_id')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (!data) {
      const meta = authUser.user_metadata || {};
      const inserted = await supabase
        .from('users')
        .insert({
          auth_id: authUser.id,
          email: authUser.email,
          nome: meta.nome || meta.full_name || null,
          tipo: meta.tipo || 'comprador',
        })
        .select('id, email, nome, tipo, auth_id')
        .single();
      data = inserted.data;
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
