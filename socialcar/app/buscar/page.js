'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabase';
import { formatKm, formatPrice } from '@/lib/format';

export default function BuscarPage() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const base = supabase
        .from('listings_public')
        .select('id, marca, modelo, ano, km, preco, foto_principal_url, cidade, estado, verificado, destaque, destaque_expira_em, zero_km')
        .eq('status', 'ativo')
        .order('destaque', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(40);
      const { data, error } = await base;
      let rows = data;
      if (error) {
        const fb = await supabase
          .from('listings')
          .select('id, marca, modelo, ano, km, preco, foto_principal_url, cidade, estado, verificado, destaque, destaque_expira_em, zero_km')
          .eq('status', 'ativo')
          .is('deleted_at', null)
          .order('destaque', { ascending: false })
          .order('created_at', { ascending: false }).limit(40);
        rows = fb.data;
      }
      if (!cancel) {
        setItems(rows || []);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const term = q.toLowerCase();
    return items.filter((it) =>
      `${it.marca} ${it.modelo} ${it.ano} ${it.cidade || ''} ${it.estado || ''}`.toLowerCase().includes(term)
    );
  }, [items, q]);

  return (
    <>
      <TopBar title="Buscar" />
      <div className="page-pad space-y-3">
        <input
          className="input"
          placeholder="Marca, modelo, cidade…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {loading ? (
          <p className="text-center text-sm text-slate-400">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-outline bg-card p-6 text-center text-sm text-slate-400">
            Nada encontrado.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {filtered.map((it) => {
              const destAtivo =
                !!it.destaque &&
                !!it.destaque_expira_em &&
                new Date(it.destaque_expira_em) > new Date();
              return (
                <li key={it.id}>
                  <Link href={`/anuncio/${it.id}`} className="block overflow-hidden rounded-xl border border-outline bg-card active:bg-elevated">
                    <div className="relative aspect-[4/3] bg-elevated">
                      {it.foto_principal_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.foto_principal_url} alt="" className="h-full w-full object-cover" />
                      )}
                      {destAtivo && (
                        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                          ⭐ Destaque
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-bold text-white">{it.marca} {it.modelo}</p>
                      <p className="truncate text-[11px] text-slate-400">{it.ano} · {formatKm(it.km)}</p>
                      <p className="mt-1 font-display text-sm font-black text-brand-500">{formatPrice(it.preco)}</p>
                    </div>
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
