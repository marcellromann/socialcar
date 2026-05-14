'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Tracker de page_views no cliente. Substitui o que era feito no middleware
// (que não conseguia ver a sessão Supabase para excluir o próprio admin).
// Regras:
//  - Aguarda o auth carregar antes de tomar decisão.
//  - Se o appUser.role === 'admin' → NÃO registra a visita (defesa principal).
//  - Para logados não-admin → envia o Bearer token; o backend grava o user_id
//    no page_views, permitindo filtragem defensiva nas queries do admin.
//  - Para anônimos → registra sem user_id.
export default function PageViewTracker() {
  const pathname = usePathname();
  const { appUser, loading } = useAuth();
  const lastTrackedRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    if (!pathname) return;
    // Bloqueio do admin: não registra nada.
    if (appUser?.role === 'admin') return;

    // Dedup por (pathname, user) — evita disparar 2x em remounts/HMR.
    const key = `${pathname}|${appUser?.id || 'anon'}`;
    if (lastTrackedRef.current === key) return;
    lastTrackedRef.current = key;

    (async () => {
      let token = null;
      if (appUser?.id) {
        try {
          const { data } = await supabase.auth.getSession();
          token = data?.session?.access_token || null;
        } catch {
          /* sem token: registra como anônimo */
        }
      }
      try {
        await fetch('/api/track-view', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            page: pathname,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          }),
          keepalive: true,
        });
      } catch {
        /* fire-and-forget: falhas de rede não devem quebrar a navegação */
      }
    })();
  }, [pathname, appUser?.id, appUser?.role, loading]);

  return null;
}
