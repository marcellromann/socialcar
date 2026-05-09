'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import BuyerCard from '@/components/BuyerCard';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default function CompradorPublicPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<Loading />}>
        <Inner />
      </Suspense>
    </RequireAuth>
  );
}

function Loading() {
  return <div className="grid min-h-[60dvh] place-items-center text-sm text-slate-400">Carregando…</div>;
}

function Inner() {
  const { id: buyerId } = useParams();
  const params = useSearchParams();
  const listingFromQs = params.get('listing');
  const { appUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]); // [{ id, listing_id, created_at, listing }]
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatListing, setChatListing] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!appUser?.id || !buyerId) { setLoading(false); return; }

      // Cruzamento: quais dos meus anúncios o comprador curtiu?
      const { data: ints } = await supabase
        .from('interests')
        .select('id, listing_id, created_at, listings:listing_id(id, marca, modelo, preco, foto_principal_url, user_id)')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      const mine = (ints || []).filter((i) => i.listings?.user_id === appUser.id);

      if (mine.length === 0) {
        if (!cancel) { setAuthorized(false); setLoading(false); }
        return;
      }

      const { data: bp } = await supabase
        .from('buyer_profiles')
        .select('*')
        .eq('user_id', buyerId)
        .maybeSingle();

      if (!cancel) {
        setProfile(bp);
        setHistory(mine);
        setAuthorized(true);
        setChatListing(listingFromQs || mine[0]?.listing_id || null);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [appUser?.id, buyerId, listingFromQs]);

  if (authorized === false) {
    return (
      <>
        <TopBar title="Comprador" back />
        <div className="page-pad">
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Acesso negado. Você só vê o perfil de compradores que demonstraram interesse nos seus anúncios.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Comprador" back hideAuth />
      <div className="page-pad space-y-3">
        {loading ? (
          <Loading />
        ) : (
          <>
            <BuyerCard
              buyerId={buyerId}
              profile={profile}
              listing={null}
              showHistory
              historyCount={history.length}
              startChatHref={chatListing ? `/chats/novo?listing=${chatListing}&buyer=${buyerId}` : null}
            />

            <section>
              <h3 className="display text-xs uppercase tracking-wider text-slate-400">
                Anúncios seus que ele(a) curtiu
              </h3>
              <ul className="mt-2 space-y-2">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={`/anuncio/${h.listing_id}`}
                      className="flex items-center gap-3 rounded-xl border border-outline bg-card p-3 active:bg-elevated"
                    >
                      <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-elevated">
                        {h.listings?.foto_principal_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={h.listings.foto_principal_url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{h.listings?.marca} {h.listings?.modelo}</p>
                        <p className="font-display text-xs font-black text-brand-500">{formatPrice(h.listings?.preco)}</p>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(h.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </>
  );
}
