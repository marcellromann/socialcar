'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SwipeCard from './SwipeCard';
import SwipeTutorial from './SwipeTutorial';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const FEED_FIELDS =
  'id, user_id, marca, modelo, ano, versao, km, preco, cidade, estado, foto_principal_url, verificado, created_at, destaque, destaque_expira_em';
const PAGE_SIZE = 20;

function destaqueAtivo(listing) {
  if (!listing?.destaque || !listing?.destaque_expira_em) return false;
  return new Date(listing.destaque_expira_em) > new Date();
}

// Faixas de preço do buyer_profile → predicado sobre `preco`.
const PRICE_RANGE_CHECKS = {
  ate_50k:     (p) => p <= 50000,
  '50k_100k':  (p) => p >= 50000  && p <= 100000,
  '100k_150k': (p) => p >= 100000 && p <= 150000,
  '150k_200k': (p) => p >= 150000 && p <= 200000,
  '200k_300k': (p) => p >= 200000 && p <= 300000,
  '300k_500k': (p) => p >= 300000 && p <= 500000,
  acima_500k:  (p) => p > 500000,
};

function priceInFaixa(preco, faixa) {
  const check = PRICE_RANGE_CHECKS[faixa];
  if (!check || preco == null) return false;
  return check(Number(preco));
}

function listingTier(listing, profile) {
  if (!profile) return 4;
  const sameEstado = !!profile.estado && listing.estado === profile.estado;
  const inPrice    = !!profile.faixa_preco && priceInFaixa(listing.preco, profile.faixa_preco);
  if (sameEstado && inPrice) return 1;
  if (sameEstado)            return 2;
  if (inPrice)               return 3;
  return 4;
}

function sortByProfile(listings, profile) {
  const hasProfile = profile && (profile.estado || profile.faixa_preco);
  return [...listings].sort((a, b) => {
    const da_ = destaqueAtivo(a) ? 1 : 0;
    const db_ = destaqueAtivo(b) ? 1 : 0;
    if (da_ !== db_) return db_ - da_;
    if (hasProfile) {
      const ta = listingTier(a, profile);
      const tb = listingTier(b, profile);
      if (ta !== tb) return ta - tb;
    }
    const da = a.created_at || '';
    const db = b.created_at || '';
    if (db > da) return 1;
    if (db < da) return -1;
    return 0;
  });
}

// Preserva o card atualmente no topo (depth=0) durante a reordenação para
// não trocar o card que o usuário está prestes a interagir.
function reorderPreservingHead(stack, profile) {
  if (stack.length <= 1) return sortByProfile(stack, profile);
  const [head, ...rest] = stack;
  return [head, ...sortByProfile(rest, profile)];
}

export default function Feed({ initialListings = [] }) {
  const router = useRouter();
  const { appUser } = useAuth();
  const [stack, setStack] = useState(initialListings);
  const [exhausted, setExhausted] = useState(false);
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [buyerProfile, setBuyerProfile] = useState(null);
  const buyerProfileRef = useRef(null);
  const seenRef = useRef(new Set());
  const idsLoadedRef = useRef(new Set(initialListings.map((l) => l.id)));
  const oldestCreatedAtRef = useRef(
    initialListings.length ? initialListings[initialListings.length - 1].created_at : null
  );
  const fetchingRef = useRef(false);

  const top = stack[0];
  const next = stack[1];
  const third = stack[2];
  const empty = stack.length === 0;

  // View: dispara uma única vez por listing por sessão.
  useEffect(() => {
    if (!top) return;
    if (seenRef.current.has(top.id)) return;
    seenRef.current.add(top.id);
    recordEvent(top.id, 'view', appUser?.id);
  }, [top, appUser?.id]);

  // Carrega ids salvos pelo usuário para refletir estado do bookmark.
  useEffect(() => {
    if (!appUser?.id) { setSavedIds(new Set()); return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from('saves')
        .select('listing_id')
        .eq('user_id', appUser.id);
      if (!cancel) setSavedIds(new Set((data || []).map((r) => r.listing_id)));
    })();
    return () => { cancel = true; };
  }, [appUser?.id]);

  // Carrega buyer_profile do usuário para personalizar a ordem do feed.
  useEffect(() => {
    if (!appUser?.id) {
      setBuyerProfile(null);
      buyerProfileRef.current = null;
      return;
    }
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from('buyer_profiles')
        .select('estado, faixa_preco, categorias_buscadas')
        .eq('user_id', appUser.id)
        .maybeSingle();
      if (cancel) return;
      const profile = data || null;
      buyerProfileRef.current = profile;
      setBuyerProfile(profile);
    })();
    return () => { cancel = true; };
  }, [appUser?.id]);

  // Reordena o stack quando o buyer_profile carrega (preservando o card do topo).
  useEffect(() => {
    if (!buyerProfile) return;
    setStack((s) => reorderPreservingHead(s, buyerProfile));
  }, [buyerProfile]);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      let query = supabase
        .from('listings_public')
        .select(FEED_FIELDS)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (oldestCreatedAtRef.current) {
        query = query.lt('created_at', oldestCreatedAtRef.current);
      }
      let { data, error } = await query;
      if (error) {
        let fb = supabase
          .from('listings')
          .select(FEED_FIELDS)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);
        if (oldestCreatedAtRef.current) fb = fb.lt('created_at', oldestCreatedAtRef.current);
        const r = await fb;
        data = r.data ?? [];
      }
      const fresh = (data || []).filter((l) => !idsLoadedRef.current.has(l.id));
      if (fresh.length === 0) {
        setExhausted(true);
        return;
      }
      fresh.forEach((l) => idsLoadedRef.current.add(l.id));
      oldestCreatedAtRef.current = fresh[fresh.length - 1].created_at;

      const sellerIds = [...new Set(fresh.map((l) => l.user_id).filter(Boolean))];
      let bySeller = new Map();
      if (sellerIds.length) {
        const { data: sellers } = await supabase
          .from('users')
          .select('id, last_seen_at')
          .in('id', sellerIds);
        bySeller = new Map((sellers || []).map((s) => [s.id, s.last_seen_at]));
      }
      const enriched = fresh.map((l) => ({
        ...l,
        seller_last_seen_at: bySeller.get(l.user_id) || null,
      }));
      setStack((s) => reorderPreservingHead([...s, ...enriched], buyerProfileRef.current));
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Infinite scroll: pré-busca quando o stack ficar curto.
  useEffect(() => {
    if (!exhausted && stack.length < 3) loadMore();
  }, [stack.length, exhausted, loadMore]);

  function handleReset() {
    setStack(initialListings);
    setExhausted(false);
    seenRef.current = new Set();
    idsLoadedRef.current = new Set(initialListings.map((l) => l.id));
    oldestCreatedAtRef.current = initialListings.length
      ? initialListings[initialListings.length - 1].created_at
      : null;
  }

  function handleSwipe(direction, listing) {
    setStack((s) => s.slice(1));
    if (direction === 'right') {
      recordEvent(listing.id, 'interest', appUser?.id);
      recordInterest(listing.id, appUser?.id);
      router.push(`/anuncio/${listing.id}`);
    } else {
      recordEvent(listing.id, 'pass', appUser?.id);
    }
  }

  function handleAction(action) {
    if (!top) return;
    if (action === 'pass')     handleSwipe('left', top);
    if (action === 'interest') handleSwipe('right', top);
    if (action === 'chat')     router.push(`/chats/novo?listing=${top.id}`);
    if (action === 'save')     toggleSave(top);
  }

  async function toggleSave(listing) {
    if (!appUser?.id) {
      router.push('/entrar');
      return;
    }
    const isSaved = savedIds.has(listing.id);
    setSavedIds((s) => {
      const n = new Set(s);
      if (isSaved) n.delete(listing.id); else n.add(listing.id);
      return n;
    });
    if (isSaved) {
      await supabase
        .from('saves')
        .delete()
        .eq('user_id', appUser.id)
        .eq('listing_id', listing.id);
    } else {
      recordEvent(listing.id, 'save', appUser.id);
      await supabase
        .from('saves')
        .insert({ user_id: appUser.id, listing_id: listing.id });
    }
  }

  const topIsSaved = top ? savedIds.has(top.id) : false;
  const userEstado = buyerProfile?.estado || null;

  return (
    <div className="page-pad">
      <SwipeTutorial />
      <div className="relative h-[61vh] min-h-[420px] max-h-[calc(100dvh-var(--bottom-nav-h)-110px)] w-full">
        {empty ? (
          <EmptyState onReset={handleReset} canReset={initialListings.length > 0} />
        ) : (
          <>
            {third && <SwipeCard key={third.id} listing={third} depth={2} userEstado={userEstado} />}
            {next  && <SwipeCard key={next.id}  listing={next}  depth={1} userEstado={userEstado} />}
            {top   && <SwipeCard key={top.id}   listing={top}   depth={0} userEstado={userEstado} onSwipe={handleSwipe} />}
          </>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <CircleButton label="Próximo" onClick={() => handleAction('pass')} variant="danger" disabled={empty}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6 18 18M18 6 6 18" />
          </svg>
        </CircleButton>
        <CircleButton label="Chat" onClick={() => handleAction('chat')} disabled={empty}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
          </svg>
        </CircleButton>
        <CircleButton label="Interessante" onClick={() => handleAction('interest')} variant="brand" big disabled={empty}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8-2.83A4.5 4.5 0 0 1 19 11c0 5.65-7 10-7 10Z" />
          </svg>
        </CircleButton>
        <CircleButton
          label={topIsSaved ? 'Remover dos salvos' : 'Salvar'}
          onClick={() => handleAction('save')}
          disabled={empty}
          variant={topIsSaved ? 'saved' : 'ghost'}
        >
          {topIsSaved ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h12v17l-6-4-6 4Z" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h12v17l-6-4-6 4Z" />
            </svg>
          )}
        </CircleButton>
      </div>
    </div>
  );
}

async function recordEvent(listingId, tipo, userId) {
  try {
    await supabase.from('listing_events').insert({
      listing_id: listingId,
      user_id: userId || null,
      tipo,
    });
  } catch {}
}

async function recordInterest(listingId, userId) {
  if (!userId) return;
  try {
    await supabase
      .from('interests')
      .insert({ buyer_id: userId, listing_id: listingId })
      .select();
  } catch {}
}

function CircleButton({ children, label, onClick, variant = 'ghost', big = false, disabled }) {
  const size = big ? 'h-16 w-16' : 'h-12 w-12';
  const styles = {
    ghost:  'bg-elevated text-white border border-outline',
    danger: 'bg-elevated text-red-400 border border-red-500/30',
    brand:  'bg-brand-500 text-black shadow-lg shadow-brand-500/30',
    saved:  'bg-elevated text-brand-500 border border-brand-500/40',
  }[variant];
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid ${size} place-items-center rounded-full ${styles} active:scale-90 disabled:opacity-40 transition`}
    >
      {children}
    </button>
  );
}

function EmptyState({ onReset, canReset }) {
  return (
    <div className="grid h-full w-full place-items-center rounded-3xl border border-dashed border-outline bg-card p-6 text-center">
      <div>
        <h3 className="display text-2xl text-white">Acabou por aqui!</h3>
        <p className="mt-2 text-sm text-slate-400">
          Você viu todos os anúncios por enquanto.
        </p>
        {canReset && (
          <button type="button" onClick={onReset} className="btn-primary mt-4">
            Ver novamente
          </button>
        )}
      </div>
    </div>
  );
}
