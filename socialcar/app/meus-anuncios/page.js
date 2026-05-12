'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import Sparkline, { bucketByDay } from '@/components/Sparkline';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatKm, formatPrice } from '@/lib/format';

const STATUS_LABEL = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-500/20 text-slate-300' },
  em_analise: { label: 'Em análise', color: 'bg-yellow-500/20 text-yellow-300' },
  ativo: { label: 'Ativo', color: 'bg-brand-500/20 text-brand-500' },
  pausado: { label: 'Pausado', color: 'bg-red-500/20 text-red-300' },
};

export default function MeusAnunciosPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appUser } = useAuth();
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [interestCounts, setInterestCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState(
    searchParams.get('published') === '1' ? 'Anúncio publicado com sucesso!' : ''
  );

  useEffect(() => {
    if (searchParams.get('published') !== '1') return;
    const timer = setTimeout(() => {
      setSuccessMsg('');
      router.replace('/meus-anuncios');
    }, 4000);
    return () => clearTimeout(timer);
  }, [searchParams, router]);

  useEffect(() => {
    if (!appUser?.id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', appUser.id)
        .order('created_at', { ascending: false });

      const ids = (listings || []).map((l) => l.id);
      let evs = [];
      let interests = [];
      if (ids.length) {
        const [{ data: e }, { data: ints }] = await Promise.all([
          supabase
            .from('listing_events')
            .select('listing_id, tipo, created_at')
            .in('listing_id', ids),
          supabase
            .from('interests')
            .select('listing_id, buyer_id')
            .in('listing_id', ids),
        ]);
        evs = e || [];
        interests = ints || [];
      }

      const ic = {};
      for (const i of interests) ic[i.listing_id] = (ic[i.listing_id] || 0) + 1;

      if (!cancel) {
        setItems(listings || []);
        setEvents(evs);
        setInterestCounts(ic);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [appUser?.id]);

  async function toggleStatus(id, current) {
    const next = current === 'ativo' ? 'pausado' : 'ativo';
    await supabase.from('listings').update({ status: next }).eq('id', id);
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, status: next } : x)));
  }

  const metricsByListing = useMemo(() => {
    const map = {};
    for (const ev of events) {
      const m = (map[ev.listing_id] ||= { view: 0, interest: 0, pass: 0, save: 0, interestTimes: [] });
      m[ev.tipo] = (m[ev.tipo] || 0) + 1;
      if (ev.tipo === 'interest') m.interestTimes.push(ev.created_at);
    }
    return map;
  }, [events]);

  return (
    <>
      <TopBar title="Meus anúncios" back />
      <div className="page-pad space-y-3">
        {successMsg && (
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 text-sm font-semibold text-brand-500">
            {successMsg}
          </div>
        )}

        <Link href="/anunciar" className="btn-primary w-full">+ Novo anúncio</Link>

        {loading ? (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="card p-3">
                <div className="flex gap-3">
                  <div className="skeleton h-16 w-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-5 w-1/3" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 border-t border-outline pt-3">
                  <div className="skeleton h-8" />
                  <div className="skeleton h-8" />
                  <div className="skeleton h-8" />
                  <div className="skeleton h-8" />
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-outline bg-card p-6 text-center text-sm text-slate-400">
            Você ainda não tem anúncios.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => {
              const status = STATUS_LABEL[it.status] || STATUS_LABEL.rascunho;
              const m = metricsByListing[it.id] || { view: 0, interest: 0, pass: 0, save: 0, interestTimes: [] };
              const uniqueInterests = interestCounts[it.id] || 0;
              const conv = m.view > 0 ? Math.round((uniqueInterests / m.view) * 100) : 0;
              const hot = uniqueInterests >= 10;
              const buckets = bucketByDay(m.interestTimes, 7);

              return (
                <li key={it.id} className="card p-3">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-elevated">
                      {it.foto_principal_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.foto_principal_url} alt="" className="h-full w-full object-cover" />
                      )}
                      {hot && (
                        <span className="absolute left-1 top-1 rounded-md bg-brand-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                          🔥 Hot
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{it.marca} {it.modelo}</p>
                      <p className="text-xs text-slate-400">{it.ano} · {formatKm(it.km)}</p>
                      <p className="mt-1 font-display text-base font-black text-brand-500">{formatPrice(it.preco)}</p>
                    </div>
                    <span className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 border-t border-outline pt-3 text-center">
                    <Metric icon="👁️"  value={m.view} label="views" />
                    <Metric icon="♥"   value={uniqueInterests} label="interesses" tone="brand" />
                    <Metric icon="✕"   value={m.pass} label="passes" />
                    <Metric icon="%"   value={`${conv}%`} label="conv." />
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">interesses · 7 dias</span>
                      <span className="text-[10px] text-slate-500">{m.interestTimes.length} eventos</span>
                    </div>
                    <Sparkline data={buckets} />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-outline pt-3">
                    <Link href={`/meus-anuncios/${it.id}/interessados`} className="btn-secondary py-2 text-xs">
                      Interessados
                    </Link>
                    <Link href={`/anuncio/${it.id}`} className="btn-secondary py-2 text-xs">Ver</Link>
                    <button
                      type="button"
                      onClick={() => toggleStatus(it.id, it.status)}
                      className="btn-secondary py-2 text-xs"
                    >
                      {it.status === 'ativo' ? 'Pausar' : 'Ativar'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function Metric({ icon, value, label, tone }) {
  return (
    <div>
      <div className={`font-display text-lg font-black ${tone === 'brand' ? 'text-brand-500' : 'text-white'}`}>
        <span className="mr-1 text-[10px]">{icon}</span>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
