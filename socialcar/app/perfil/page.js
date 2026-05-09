'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { summarizeBuyer } from '@/lib/format';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!appUser?.id) { setLoading(false); return; }
      const { data: bp } = await supabase
        .from('buyer_profiles').select('*').eq('user_id', appUser.id).maybeSingle();
      if (!cancel) {
        setProfile(bp);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [appUser?.id]);

  return (
    <>
      <TopBar title="Perfil" back hideAuth />
      <div className="page-pad space-y-4">
        <div className="card flex items-center gap-3 p-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-500 font-display text-2xl font-black text-black">
            {(appUser?.nome || user?.email || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{appUser?.nome || 'Usuário'}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
            {appUser?.tipo && (
              <span className="chip mt-1 inline-flex">{appUser.tipo}</span>
            )}
          </div>
        </div>

        <section className="card p-4">
          <header className="flex items-center justify-between">
            <h2 className="display text-sm text-brand-500">Suas preferências</h2>
            <Link href="/onboarding" className="text-[11px] font-bold uppercase tracking-wide text-brand-500">
              Editar
            </Link>
          </header>
          <p className="mt-2 text-sm text-slate-200">
            {profile ? summarizeBuyer(profile) || 'Sem preferências definidas' : 'Você ainda não respondeu o questionário.'}
          </p>
          {!profile && (
            <Link href="/onboarding" className="btn-secondary mt-3 w-full text-xs">
              Responder questionário
            </Link>
          )}
        </section>

        <ul className="card divide-y divide-outline overflow-hidden">
          <Item href="/meus-anuncios" label="Meus anúncios" />
          <Item href="/chats" label="Minhas conversas" />
          <Item href="/onboarding" label="Atualizar preferências" />
        </ul>

        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 active:scale-[0.98]"
        >
          Sair
        </button>

        {loading && <p className="text-center text-xs text-slate-500">Carregando…</p>}
      </div>
    </>
  );
}

function Item({ href, label }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-white active:bg-elevated">
        {label}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}
