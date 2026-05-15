'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { summarizeBuyer } from '@/lib/format';
import { isOnline, presenceLabel } from '@/lib/presence';

export default function PerfilPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user, appUser, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!appUser?.id) { setLoadingProfile(false); return; }
    let cancel = false;
    (async () => {
      setLoadingProfile(true);
      try {
        const { data: bp } = await supabase
          .from('buyer_profiles')
          .select('*')
          .eq('user_id', appUser.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancel) setProfile(bp);
      } finally {
        if (!cancel) setLoadingProfile(false);
      }
    })();
    return () => { cancel = true; };
  }, [appUser?.id]);

  const displayName = appUser?.nome || user?.email || 'Usuário';
  const initial = (displayName || 'S').charAt(0).toUpperCase();
  const memberSince = appUser?.created_at ? formatMemberSince(appUser.created_at) : null;
  const online = isOnline(appUser?.last_seen_at);
  const lastSeenText = presenceLabel(appUser?.last_seen_at);

  return (
    <>
      <TopBar title="Perfil" back hideAuth />
      <div className="page-pad space-y-4">
        {/* Header — somente leitura */}
        <div className="card flex items-center gap-4 p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand-500 text-black">
            {appUser?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={appUser.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center font-display text-3xl font-black">
                {initial}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-lg font-bold">{displayName}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge online={online} label={lastSeenText} />
            </div>
            {memberSince && (
              <p className="mt-1 text-[11px] text-slate-400">Membro desde {memberSince}</p>
            )}
          </div>
        </div>

        {/* Suas preferências */}
        <section className="card p-4">
          <header className="flex items-center justify-between">
            <h2 className="display text-sm text-brand-500">Suas preferências</h2>
            <Link href="/onboarding" className="text-[11px] font-bold uppercase tracking-wide text-brand-500">
              Editar
            </Link>
          </header>
          {loadingProfile ? (
            <div className="mt-3 space-y-2">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ) : profile ? (
            <p className="mt-2 text-sm text-slate-200">{summarizeBuyer(profile)}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-400">Você ainda não respondeu o questionário.</p>
              <Link href="/onboarding" className="btn-secondary mt-3 inline-flex w-full justify-center text-xs">
                Responder questionário
              </Link>
            </>
          )}
        </section>

        {/* Links rápidos */}
        <ul className="card divide-y divide-outline overflow-hidden">
          <Item href="/meus-anuncios" label="Meus anúncios" />
          <Item href="/salvos" label="Salvos" />
          <Item href="/chats" label="Minhas conversas" />
          <Item href="/meus-dados" label="Meus dados" />
        </ul>

        {/* Sair */}
        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm font-bold uppercase tracking-wide text-red-300 active:scale-[0.98]"
        >
          Sair
        </button>
      </div>
    </>
  );
}

function StatusBadge({ online, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        online
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-slate-400'}`} />
      {label}
    </span>
  );
}

function Item({ href, label, icon }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-white active:bg-elevated">
        <span className="flex items-center gap-2.5">
          {icon && <span className="text-brand-500">{icon}</span>}
          {label}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

function formatMemberSince(iso) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  } catch {
    return null;
  }
}
