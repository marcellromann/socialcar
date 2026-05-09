'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function RequireAuth({ children, fallback = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(pathname || '/');
      router.replace(`/entrar?next=${next}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      fallback ?? (
        <div className="grid min-h-[60dvh] place-items-center text-sm text-slate-400">
          Verificando sessão…
        </div>
      )
    );
  }

  return children;
}
