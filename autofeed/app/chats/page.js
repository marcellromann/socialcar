'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function ChatsListPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { appUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!appUser?.id) { setLoading(false); return; }
      const { data } = await supabase
        .from('chats')
        .select('id, listing_id, created_at, listings:listing_id(marca, modelo, foto_principal_url)')
        .or(`buyer_id.eq.${appUser.id},seller_id.eq.${appUser.id}`)
        .order('created_at', { ascending: false });
      if (!cancel) {
        setChats(data || []);
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
        ) : chats.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-outline bg-card p-10 text-center">
            <p className="text-sm text-slate-400">Nenhuma conversa ainda. Dê interesse em um anúncio para começar.</p>
            <Link href="/" className="btn-primary mt-4">Ir para o feed</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {chats.map((c) => (
              <li key={c.id}>
                <Link href={`/chats/${c.id}`} className="flex items-center gap-3 rounded-xl border border-outline bg-card p-3 active:bg-elevated">
                  <div className="h-12 w-12 overflow-hidden rounded-lg bg-elevated">
                    {c.listings?.foto_principal_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.listings.foto_principal_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {c.listings?.marca} {c.listings?.modelo}
                    </p>
                    <p className="text-xs text-slate-400">Conversa iniciada</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
