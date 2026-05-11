'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import BuyerCard from '@/components/BuyerCard';
import { supabase } from '@/lib/supabase';
import { formatKm, formatPrice } from '@/lib/format';

export default function InteressadosPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { id: listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [interests, setInterests] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancel) { setAuthorized(false); setLoading(false); }
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!userData?.id) {
        if (!cancel) { setAuthorized(false); setLoading(false); }
        return;
      }

      const { data: l } = await supabase
        .from('listings')
        .select('id, marca, modelo, ano, km, preco, combustivel, estado, foto_principal_url, user_id')
        .eq('id', listingId)
        .maybeSingle();

      if (!l || l.user_id !== userData.id) {
        if (!cancel) { setAuthorized(false); setLoading(false); }
        return;
      }
      if (!cancel) setListing(l);

      const { data: ints } = await supabase
        .from('interests')
        .select('id, buyer_id, created_at')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      const buyerIds = (ints || []).map((i) => i.buyer_id);
      let profMap = {};
      if (buyerIds.length) {
        const { data: prof } = await supabase
          .from('buyer_profiles')
          .select('*')
          .in('user_id', buyerIds);
        for (const p of prof || []) profMap[p.user_id] = p;
      }

      if (!cancel) {
        setInterests(ints || []);
        setProfiles(profMap);
        setAuthorized(true);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [listingId]);

  if (authorized === false) {
    return (
      <>
        <TopBar title="Interessados" back />
        <div className="page-pad">
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Você só pode ver os interessados dos seus próprios anúncios.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Interessados" back />
      <div className="page-pad space-y-3">
        {listing && <ListingHeader listing={listing} />}

        {loading ? (
          <p className="text-center text-sm text-slate-400">Carregando…</p>
        ) : interests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-outline bg-card p-6 text-center text-sm text-slate-400">
            Ainda ninguém deu interesse neste anúncio.
          </p>
        ) : (
          <ul className="space-y-3">
            {interests.map((i) => (
              <li key={i.id}>
                <BuyerCard
                  buyerId={i.buyer_id}
                  profile={profiles[i.buyer_id]}
                  listing={listing}
                  createdAt={i.created_at}
                  href={`/perfil/comprador/${i.buyer_id}?listing=${listingId}`}
                  startChatHref={`/chats/novo?listing=${listingId}&buyer=${i.buyer_id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ListingHeader({ listing }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-outline bg-card p-3">
      <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-elevated">
        {listing.foto_principal_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.foto_principal_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div>
        <p className="text-sm font-bold">{listing.marca} {listing.modelo}</p>
        <p className="text-xs text-slate-400">{listing.ano} · {formatKm(listing.km)}</p>
        <p className="font-display text-sm font-black text-brand-500">{formatPrice(listing.preco)}</p>
      </div>
    </div>
  );
}
