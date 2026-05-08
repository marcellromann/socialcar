'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Feed', icon: IconFlame },
  { href: '/buscar', label: 'Buscar', icon: IconSearch },
  { href: '/anunciar', label: 'Anunciar', icon: IconPlus, primary: true },
  { href: '/chats', label: 'Chats', icon: IconChat },
  { href: '/perfil', label: 'Perfil', icon: IconUser },
];

export default function BottomNav() {
  const pathname = usePathname() || '/';
  const hidden = pathname.startsWith('/onboarding') || pathname.startsWith('/entrar') || pathname.startsWith('/cadastro');
  if (hidden) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-mobile border-t border-outline bg-page/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-[var(--bottom-nav-h)] items-center justify-around px-2">
        {ITEMS.map(({ href, label, icon: Icon, primary }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          if (primary) {
            return (
              <li key={href} className="flex-1 flex justify-center">
                <Link
                  href={href}
                  className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full bg-brand-500 text-black shadow-lg shadow-brand-500/30 active:scale-95"
                  aria-label={label}
                >
                  <Icon size={22} />
                </Link>
              </li>
            );
          }
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wide transition ${
                  active ? 'text-brand-500' : 'text-slate-400'
                }`}
              >
                <Icon size={22} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function IconFlame({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-3s-3 2-3 6a6 6 0 1 0 12 0c0-5-6-11-6-11Z" />
    </svg>
  );
}
function IconSearch({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function IconPlus({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconChat({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
    </svg>
  );
}
function IconUser({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
