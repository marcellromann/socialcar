'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const ITEMS = [
  { href: '/', label: 'Feed', icon: IconFlame },
  { href: '/buscar', label: 'Buscar', icon: IconSearch },
  { href: '/anunciar', label: 'Anunciar', icon: IconPlus, primary: true },
  { href: '/chats', label: 'Chats', icon: IconChat, key: 'chats' },
  { href: '/perfil', label: 'Perfil', icon: IconUser },
];

export default function BottomNav() {
  const pathname = usePathname() || '/';
  const { appUser } = useAuth();
  const [unread, setUnread] = useState(0);

  const hidden = pathname.startsWith('/onboarding') || pathname.startsWith('/entrar') || pathname.startsWith('/cadastro');

  useEffect(() => {
    if (hidden || !appUser?.id) { setUnread(0); return; }
    let cancel = false;
    let timer;

    async function refresh() {
      const me = appUser.id;
      const { data: chats } = await supabase
        .from('chats')
        .select('id, buyer_id, seller_id, last_read_buyer_at, last_read_seller_at')
        .or(`buyer_id.eq.${me},seller_id.eq.${me}`);
      if (!chats?.length) { if (!cancel) setUnread(0); return; }
      const ids = chats.map((c) => c.id);
      const { data: msgs } = await supabase
        .from('messages')
        .select('chat_id, sender_id, created_at')
        .in('chat_id', ids);

      let count = 0;
      for (const c of chats) {
        const lr = me === c.buyer_id ? c.last_read_buyer_at : c.last_read_seller_at;
        const lrTs = lr ? new Date(lr).getTime() : 0;
        for (const m of msgs || []) {
          if (m.chat_id === c.id && m.sender_id !== me && new Date(m.created_at).getTime() > lrTs) count++;
        }
      }
      if (!cancel) setUnread(count);
    }

    refresh();
    timer = setInterval(refresh, 30_000);
    return () => { cancel = true; clearInterval(timer); };
  }, [hidden, appUser?.id, pathname]);

  if (hidden) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-mobile border-t border-outline bg-page/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-[var(--bottom-nav-h)] items-center justify-around px-2">
        {ITEMS.map(({ href, label, icon: Icon, primary, key }) => {
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
          const showBadge = key === 'chats' && unread > 0;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`relative flex flex-col items-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wide transition ${
                  active ? 'text-brand-500' : 'text-slate-400'
                }`}
              >
                <span className="relative">
                  <Icon size={22} />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-black text-black">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
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
