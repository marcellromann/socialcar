'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { AVATARS_BUCKET, supabase } from '@/lib/supabase';
import { summarizeBuyer } from '@/lib/format';

export default function PerfilPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user, appUser, signOut, refresh } = useAuth();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [form, setForm] = useState({ nome: '', telefone: '' });
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState('');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    setForm({
      nome: appUser?.nome || '',
      telefone: appUser?.telefone || '',
    });
  }, [appUser?.nome, appUser?.telefone]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingProfile(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;
        if (!authUser || cancel) { setLoadingProfile(false); return; }

        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', authUser.id)
          .maybeSingle();

        if (!userData?.id || cancel) { setLoadingProfile(false); return; }

        const { data: bp } = await supabase
          .from('buyer_profiles')
          .select('*')
          .eq('user_id', userData.id)
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

  async function saveAccount() {
    if (!appUser?.id) return;
    setAccountMsg('');
    setSavingAccount(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          nome: form.nome.trim() || null,
          telefone: form.telefone.trim() || null,
        })
        .eq('id', appUser.id);
      if (error) throw error;
      await refresh();
      setAccountMsg('Alterações salvas.');
    } catch (e) {
      setAccountMsg('Não foi possível salvar. Tente novamente.');
    } finally {
      setSavingAccount(false);
    }
  }

  async function onAvatarChange(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file || !appUser?.id) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Selecione uma imagem.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Imagem deve ter no máximo 5MB.');
      return;
    }

    setAvatarError('');
    setUploadingAvatar(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${appUser.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: updErr } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', appUser.id);
      if (updErr) throw updErr;

      await refresh();
    } catch (e) {
      setAvatarError('Falha ao enviar foto. Tente novamente.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  const displayName = appUser?.nome || user?.email || 'Usuário';
  const initial = (displayName || 'S').charAt(0).toUpperCase();
  const memberSince = appUser?.created_at ? formatMemberSince(appUser.created_at) : null;

  return (
    <>
      <TopBar title="Perfil" back hideAuth />
      <div className="page-pad space-y-4">
        {/* Card principal: avatar + identidade */}
        <div className="card flex items-center gap-4 p-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-brand-500 text-black active:scale-95 disabled:opacity-60"
            aria-label="Trocar foto de perfil"
          >
            {appUser?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={appUser.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center font-display text-2xl font-black">
                {initial}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
              {uploadingAvatar ? '…' : 'Foto'}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChange}
          />

          <div className="flex-1 min-w-0">
            <p className="truncate text-base font-bold">{displayName}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {appUser?.tipo && <span className="chip">{appUser.tipo}</span>}
              {memberSince && (
                <span className="text-[11px] text-slate-400">Membro desde {memberSince}</span>
              )}
            </div>
          </div>
        </div>
        {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}

        {/* Minha conta */}
        <section className="card p-4">
          <header className="mb-3">
            <h2 className="display text-sm text-brand-500">Minha conta</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              O e-mail é usado para login e não pode ser alterado.
            </p>
          </header>

          <div className="space-y-3">
            <Field label="Nome completo">
              <input
                className="input"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Seu nome"
              />
            </Field>

            <Field label="E-mail">
              <input className="input opacity-60" value={user?.email || ''} readOnly />
            </Field>

            <Field label="Telefone (opcional)">
              <input
                className="input"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                placeholder="(11) 90000-0000"
                inputMode="tel"
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={saveAccount}
            disabled={savingAccount}
            className="btn-primary mt-4 w-full text-sm"
          >
            {savingAccount ? 'Salvando…' : 'Salvar alterações'}
          </button>
          {accountMsg && <p className="mt-2 text-center text-[11px] text-slate-400">{accountMsg}</p>}
        </section>

        {/* Preferências */}
        <section className="card p-4">
          <header className="flex items-center justify-between">
            <h2 className="display text-sm text-brand-500">Suas preferências</h2>
            <Link href="/onboarding" className="text-[11px] font-bold uppercase tracking-wide text-brand-500">
              Editar
            </Link>
          </header>
          {loadingProfile ? (
            <p className="mt-2 text-sm text-slate-400">Carregando…</p>
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

        <ul className="card divide-y divide-outline overflow-hidden">
          <Item href="/meus-anuncios" label="Meus anúncios" />
          <Item href="/chats" label="Minhas conversas" />
        </ul>

        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 active:scale-[0.98]"
        >
          Sair
        </button>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
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

function formatMemberSince(iso) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  } catch {
    return null;
  }
}
