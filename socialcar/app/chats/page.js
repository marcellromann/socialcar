'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { buyerAlias } from '@/lib/anon';
import { isOnline } from '@/lib/presence';

export default function ChatsListPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { appUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!appUser?.id) { setLoading(false); return; }
      const me = appUser.id;

      const { data: chats } = await supabase
        .from('chats')
        .select('id, buyer_id, seller_id, listing_id, created_at, last_read_buyer_at, last_read_seller_at, listings:listing_id(marca, modelo, foto_principal_url)')
        .or(`buyer_id.eq.${me},seller_id.eq.${me}`)
        .order('created_at', { ascending: false });

      const ids = (chats || []).map((c) => c.id);
      let lastByChat = {};
      let unreadByChat = {};
      if (ids.length) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('chat_id, sender_id, texto, created_at')
          .in('chat_id', ids)
          .order('created_at', { ascending: false });

        for (const m of msgs || []) {
          if (!lastByChat[m.chat_id]) lastByChat[m.chat_id] = m;
        }

        for (const c of chats) {
          const lastRead = me === c.buyer_id ? c.last_read_buyer_at : c.last_read_seller_at;
          const lr = lastRead ? new Date(lastRead).getTime() : 0;
          unreadByChat[c.id] = (msgs || []).filter(
            (m) => m.chat_id === c.id && m.sender_id !== me && new Date(m.created_at).getTime() > lr,
          ).length;
        }
      }

      const otherIds = [
        ...new Set((chats || []).map((c) => (me === c.buyer_id ? c.seller_id : c.buyer_id))),
      ];
      let presenceById = new Map();
      if (otherIds.length) {
        const { data: peers } = await supabase
          .from('users')
          .select('id, last_seen_at')
          .in('id', otherIds);
        presenceById = new Map((peers || []).map((p) => [p.id, p.last_seen_at]));
      }

      if (!cancel) {
        setRows(
          (chats || []).map((c) => {
            const otherUserId = me === c.buyer_id ? c.seller_id : c.buyer_id;
            return {
              ...c,
              iAmSeller: me === c.seller_id,
              otherUserId,
              otherLastSeenAt: presenceById.get(otherUserId) || null,
              lastMessage: lastByChat[c.id],
              unread: unreadByChat[c.id] || 0,
            };
          }),
        );
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [appUser?.id]);

  return (
    <>
      <TopBar title="Chats" />
      <div className="page-pad">
        {loading ? (
          <p className="text-center text-sm text-slate-400">Carregando…</p>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-outline bg-card p-10 text-center">
            <p className="text-sm text-slate-400">Nenhuma conversa ainda. Dê interesse em um anúncio para começar.</p>
            <Link href="/" className="btn-primary mt-4">Ir para o início</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((c) => {
              const headline = c.iAmSeller
                ? buyerAlias(c.buyer_id)
                : `${c.listings?.marca || ''} ${c.listings?.modelo || ''}`.trim() || 'Anúncio';
              const subtitle = c.iAmSeller
                ? `${c.listings?.marca || ''} ${c.listings?.modelo || ''}`.trim()
                : 'Vendedor';

              return (
                <li key={c.id}>
                  <Link
                    href={`/chats/${c.id}`}
                    className="flex items-center gap-3 rounded-xl border border-outline bg-card p-3 active:bg-elevated"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-elevated">
                      {c.listings?.foto_principal_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.listings.foto_principal_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{headline}</p>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            isOnline(c.otherLastSeenAt) ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                          aria-label={isOnline(c.otherLastSeenAt) ? 'Online' : 'Ausente'}
                        />
                      </div>
                      <p className="truncate text-xs text-slate-400">
                        {c.lastMessage?.texto || subtitle}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-brand-500 px-1.5 text-[11px] font-black text-black">
                        {c.unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
