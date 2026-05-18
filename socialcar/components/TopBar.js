'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getInitials, useAuth } from '@/lib/auth';

export default function TopBar({ title, back, right, hideAuth = false }) {
  const router = useRouter();
  const { user, appUser, loading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-outline bg-page/90 px-3 backdrop-blur">
      <div className="flex min-w-[44px] items-center">
        {back ? (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full text-white active:scale-90"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
        ) : (
          <Link href="/" aria-label="SocialCar" className="flex items-center">
            <img src="/logosocialcar.png" alt="SocialCar" style={{ height: '36px', width: 'auto' }} />
          </Link>
        )}
      </div>

      <h1 className="flex-1 truncate text-center font-display text-base font-bold uppercase tracking-wide text-white">
        {title}
      </h1>

      <div className="flex min-w-[44px] items-center justify-end gap-1">
        {right ? right : (
          !hideAuth && !loading && (
            user ? (
              <button
                type="button"
                onClick={() => router.push('/perfil')}
                aria-label="Abrir perfil"
                className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 font-display text-xs font-black uppercase text-black active:scale-90"
              >
                {getInitials(appUser?.nome || user.email)}
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <Link href="/entrar" className="rounded-full px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white active:scale-95">
                  Entrar
                </Link>
                <Link href="/cadastro" className="rounded-full bg-brand-500 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-black active:scale-95">
                  Criar
                </Link>
              </div>
            )
          )
        )}
        {right && user && !loading && (
          <button
            type="button"
            onClick={signOut}
            className="hidden"
            aria-hidden
          />
        )}
      </div>
    </header>
  );
}
