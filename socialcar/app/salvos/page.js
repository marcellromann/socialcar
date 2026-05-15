'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';

export default function SalvosPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { appUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser?.id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('saves')
        .select('id, listing_id, created_at, listings:listing_id (id, marca, modelo, preco, cidade, estado, foto_principal_url, status)')
        .eq('user_id', appUser.id)
        .order('created_at', { ascending: false });
      if (!cancel) {
        const rows = (data || []).filter((s) => s.listings).map((s) => ({
          save_id: s.id,
          ...s.listings,
        }));
        setItems(rows);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [appUser?.id]);

  async function remover(saveId, listingId) {
    setItems((arr) => arr.filter((x) => x.save_id !== saveId));
    await supabase.from('saves').delete().eq('id', saveId);
  }

  return (
    <>
      <TopBar title="Salvos" back />
      <div className="page-pad">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card overflow-hidden p-0">
                <div className="skeleton aspect-[4/3] w-full" />
                <div className="space-y-2 p-3">
                  <div className="skeleton h-3 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {items.map((it) => (
              <li key={it.save_id} className="card relative overflow-hidden p-0">
                <Link href={`/anuncio/${it.id}`} className="block">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-elevated">
                    {it.foto_principal_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.foto_principal_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-slate-500">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 17h18M5 17V9l2-4h10l2 4v8M7 17v2M17 17v2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-bold">{it.marca} {it.modelo}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {[it.cidade, it.estado].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <p className="mt-1 font-display text-sm font-black text-brand-500">{formatPrice(it.preco)}</p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => remover(it.save_id, it.id)}
                  aria-label="Remover dos salvos"
                  className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-brand-500 backdrop-blur active:scale-90"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h12v17l-6-4-6 4Z" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-outline bg-card p-8 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-elevated text-slate-400">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4h12v17l-6-4-6 4Z" />
          </svg>
        </div>
        <p className="mt-4 text-sm text-slate-300">Nenhum anúncio salvo ainda</p>
        <Link href="/" className="btn-primary mt-4 inline-flex w-full justify-center">
          Explorar carros
        </Link>
      </div>
    </div>
  );
}
