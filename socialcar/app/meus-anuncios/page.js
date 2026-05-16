'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import DestaqueModal from '@/components/DestaqueModal';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatKm, formatPrice } from '@/lib/format';

const STATUS_LABEL = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-500/20 text-slate-300' },
  em_analise: { label: 'Em análise', color: 'bg-yellow-500/20 text-yellow-300' },
  ativo: { label: 'Ativo', color: 'bg-brand-500/20 text-brand-500' },
  pausado: { label: 'Pausado', color: 'bg-red-500/20 text-red-300' },
};

const EXPIRATION_DAYS = 90;
const EXPIRATION_WARNING_DAYS = 7;

const DELETE_REASONS = [
  { id: 'vendi_socialcar', label: 'Vendi pela SocialCar 🎉', celebrate: true },
  { id: 'vendi_outro',     label: 'Vendi por outro meio',    celebrate: false },
  { id: 'desisti',         label: 'Desisti de vender',       celebrate: false },
];

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch { return '—'; }
}

function expirationInfo(createdAt) {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  const expires = new Date(created);
  expires.setDate(expires.getDate() + EXPIRATION_DAYS);
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((expires - now) / msPerDay);
  return { expires, daysLeft, expired: daysLeft <= 0 };
}

function destaqueInfo(listing) {
  if (!listing?.destaque || !listing?.destaque_expira_em) return null;
  const expires = new Date(listing.destaque_expira_em);
  const now = new Date();
  return { expires, expired: expires <= now };
}

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
  const [deleteFor, setDeleteFor] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const [destaqueFor, setDestaqueFor] = useState(null);

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
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const ids = (listings || []).map((l) => l.id);
      let evs = [];
      let interests = [];
      if (ids.length) {
        const [{ data: e }, { data: ints }] = await Promise.all([
          supabase
            .from('listing_events')
            .select('listing_id, tipo')
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

  async function renew(id) {
    const nowIso = new Date().toISOString();
    await supabase
      .from('listings')
      .update({ created_at: nowIso, status: 'ativo' })
      .eq('id', id);
    setItems((arr) => arr.map((x) => x.id === id ? { ...x, created_at: nowIso, status: 'ativo' } : x));
  }

  async function confirmDelete(reasonId) {
    if (!deleteFor) return;
    const reason = DELETE_REASONS.find((r) => r.id === reasonId);
    if (!reason) return;

    if (reason.celebrate) {
      setCelebrate(true);
      await new Promise((r) => setTimeout(r, 1500));
    }

    await supabase
      .from('listings')
      .update({
        motivo_exclusao: reason.id,
        deleted_at: new Date().toISOString(),
        status: 'pausado',
      })
      .eq('id', deleteFor.id);

    setItems((arr) => arr.filter((x) => x.id !== deleteFor.id));
    setDeleteFor(null);
    setCelebrate(false);
  }

  const metricsByListing = useMemo(() => {
    const map = {};
    for (const ev of events) {
      const m = (map[ev.listing_id] ||= { view: 0, interest: 0, pass: 0, save: 0 });
      m[ev.tipo] = (m[ev.tipo] || 0) + 1;
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
              const m = metricsByListing[it.id] || { view: 0, interest: 0 };
              const uniqueInterests = interestCounts[it.id] || 0;
              const exp = expirationInfo(it.created_at);
              const expiringSoon = exp && !exp.expired && exp.daysLeft <= EXPIRATION_WARNING_DAYS;
              const dest = destaqueInfo(it);
              const destaqueAtivo = dest && !dest.expired;
              const destaqueExpirado = dest && dest.expired;

              return (
                <li key={it.id} className="card p-3">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-elevated">
                      {it.foto_principal_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.foto_principal_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{it.marca} {it.modelo}</p>
                      <p className="text-xs text-slate-400">{it.ano} · {formatKm(it.km)}</p>
                      <p className="mt-1 font-display text-base font-black text-brand-500">{formatPrice(it.preco)}</p>
                    </div>
                    <span className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {destaqueAtivo && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-500">
                      <span>⭐</span>
                      <span>Em destaque até {formatDate(dest.expires)}</span>
                    </div>
                  )}
                  {destaqueExpirado && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline bg-elevated px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-300">
                      <span>Destaque expirado</span>
                      <button
                        type="button"
                        onClick={() => setDestaqueFor(it)}
                        className="rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black active:scale-95"
                      >
                        Renovar destaque
                      </button>
                    </div>
                  )}
                  {!dest && (
                    <button
                      type="button"
                      onClick={() => setDestaqueFor(it)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-500 active:scale-[0.98]"
                    >
                      <span>⭐</span>
                      <span>Destacar anúncio</span>
                    </button>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-outline pt-3 text-center">
                    <Metric icon="👁️" value={m.view} label="visualizações" />
                    <Metric icon="♥"  value={uniqueInterests} label="interesses" tone="brand" />
                  </div>

                  <div className="mt-3 space-y-1 border-t border-outline pt-3 text-[11px] text-slate-400">
                    <p>Anunciado em: <span className="text-slate-200">{formatDate(it.created_at)}</span></p>
                    <p>
                      Expira em: <span className="text-slate-200">{formatDate(exp?.expires)}</span>
                      {exp?.expired && (
                        <span className="ml-2 inline-block rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-300">
                          Expirado
                        </span>
                      )}
                      {expiringSoon && (
                        <span className="ml-2 inline-block rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-300">
                          Expira em {exp.daysLeft} {exp.daysLeft === 1 ? 'dia' : 'dias'}
                        </span>
                      )}
                    </p>
                  </div>

                  {exp?.expired && (
                    <button
                      type="button"
                      onClick={() => renew(it.id)}
                      className="btn-primary mt-3 w-full py-2 text-xs"
                    >
                      Renovar anúncio
                    </button>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-outline pt-3">
                    <Link href={`/meus-anuncios/${it.id}/interessados`} className="btn-secondary py-2 text-xs">
                      Interessados
                    </Link>
                    <Link href={`/anuncio/${it.id}`} className="btn-secondary py-2 text-xs">Ver</Link>
                    <Link href={`/editar/${it.id}`} className="btn-secondary py-2 text-xs">Editar</Link>
                    <button
                      type="button"
                      onClick={() => toggleStatus(it.id, it.status)}
                      className="btn-secondary py-2 text-xs"
                    >
                      {it.status === 'ativo' ? 'Pausar' : 'Ativar'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteFor(it)}
                    className="mt-2 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-red-300 active:scale-[0.98]"
                  >
                    Excluir
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {deleteFor && (
        <DeleteModal
          listing={deleteFor}
          celebrate={celebrate}
          onClose={() => !celebrate && setDeleteFor(null)}
          onConfirm={confirmDelete}
        />
      )}

      {destaqueFor && (
        <DestaqueModal
          listing={destaqueFor}
          onClose={() => setDestaqueFor(null)}
        />
      )}
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

function DeleteModal({ listing, celebrate, onClose, onConfirm }) {
  const [selected, setSelected] = useState(null);

  if (celebrate) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur">
        <div className="card max-w-sm p-6 text-center">
          <div className="text-5xl">🎉</div>
          <h3 className="display mt-3 text-xl text-brand-500">Parabéns pela venda!</h3>
          <p className="mt-2 text-sm text-slate-300">
            Que bom que a SocialCar te ajudou a vender seu carro.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 backdrop-blur sm:place-items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md space-y-4 rounded-b-none rounded-t-2xl p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h3 className="display text-lg text-white">Por que você está removendo este anúncio?</h3>
          <p className="mt-1 truncate text-xs text-slate-400">
            {listing.marca} {listing.modelo} · {listing.ano}
          </p>
        </header>

        <ul className="space-y-2">
          {DELETE_REASONS.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelected(r.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold active:scale-[0.99] ${
                  selected === r.id
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-outline bg-page text-slate-200'
                }`}
              >
                <span>{r.label}</span>
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                    selected === r.id ? 'border-brand-500 bg-brand-500 text-black' : 'border-outline'
                  }`}
                >
                  {selected === r.id && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => onConfirm(selected)}
            className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white active:scale-[0.98] disabled:opacity-40"
          >
            Confirmar exclusão
          </button>
        </div>
      </div>
    </div>
  );
}
