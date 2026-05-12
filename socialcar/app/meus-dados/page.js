'use client';

import { useEffect, useRef, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { AVATARS_BUCKET, supabase } from '@/lib/supabase';
import { formatCep, formatPhone, onlyDigits } from '@/lib/format';

export default function MeusDadosPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

const EMPTY_FORM = {
  nome: '',
  email: '',
  telefone: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado_endereco: '',
};

function Inner() {
  const { user, appUser, signOut, refresh } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [emailMsg, setEmailMsg] = useState('');

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  const [status, setStatus] = useState('online');
  const [statusBusy, setStatusBusy] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    setForm({
      nome: appUser?.nome || '',
      email: user?.email || '',
      telefone: formatPhone(appUser?.telefone || ''),
      cep: formatCep(appUser?.cep || ''),
      rua: appUser?.rua || '',
      numero: appUser?.numero || '',
      complemento: appUser?.complemento || '',
      bairro: appUser?.bairro || '',
      cidade: appUser?.cidade || '',
      estado_endereco: appUser?.estado_endereco || '',
    });
    setStatus(appUser?.status === 'ausente' ? 'ausente' : 'online');
  }, [
    appUser?.nome,
    appUser?.telefone,
    appUser?.cep,
    appUser?.rua,
    appUser?.numero,
    appUser?.complemento,
    appUser?.bairro,
    appUser?.cidade,
    appUser?.estado_endereco,
    appUser?.status,
    user?.email,
  ]);

  async function lookupCep(rawCep) {
    const digits = onlyDigits(rawCep);
    if (digits.length !== 8) return;
    setCepLoading(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) {
        setCepError('CEP não encontrado.');
        return;
      }
      setForm((f) => ({
        ...f,
        rua: data.logradouro || f.rua,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        estado_endereco: (data.uf || f.estado_endereco || '').toUpperCase(),
      }));
    } catch {
      setCepError('Não foi possível consultar o CEP.');
    } finally {
      setCepLoading(false);
    }
  }

  function onCepChange(raw) {
    const masked = formatCep(raw);
    setForm((f) => ({ ...f, cep: masked }));
    if (onlyDigits(masked).length === 8) lookupCep(masked);
  }

  async function changeStatus(next) {
    if (!appUser?.id || next === status || statusBusy) return;
    setStatusBusy(true);
    const prev = status;
    setStatus(next);
    const { error } = await supabase
      .from('users')
      .update({ status: next })
      .eq('id', appUser.id);
    setStatusBusy(false);
    if (error) {
      setStatus(prev);
      return;
    }
    refresh();
  }

  async function saveAll() {
    if (!appUser?.id) return;
    if (!form.nome.trim()) {
      setSaveMsg('Informe seu nome.');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    setEmailMsg('');
    try {
      const newEmail = form.email.trim().toLowerCase();
      const oldEmail = (user?.email || '').toLowerCase();
      if (newEmail && newEmail !== oldEmail) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: newEmail });
        if (emailErr) {
          setEmailMsg('Não foi possível alterar o e-mail. Tente novamente.');
        } else {
          setEmailMsg('Enviamos um link de confirmação para o novo e-mail.');
        }
      }

      const payload = {
        nome: form.nome.trim(),
        telefone: onlyDigits(form.telefone) || null,
        cep: onlyDigits(form.cep) || null,
        rua: form.rua.trim() || null,
        numero: form.numero.trim() || null,
        complemento: form.complemento.trim() || null,
        bairro: form.bairro.trim() || null,
        cidade: form.cidade.trim() || null,
        estado_endereco: form.estado_endereco.trim().toUpperCase() || null,
      };
      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', appUser.id);
      if (error) throw error;

      await refresh();
      setSaveMsg('Alterações salvas.');
    } catch {
      setSaveMsg('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
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
    } catch {
      setAvatarError('Falha ao enviar foto. Tente novamente.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  const displayName = appUser?.nome || user?.email || 'Usuário';
  const initial = (displayName || 'S').charAt(0).toUpperCase();

  return (
    <>
      <TopBar title="Meus dados" back hideAuth />
      <div className="page-pad space-y-4">
        {/* Foto */}
        <div className="card flex items-center gap-4 p-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand-500 text-black active:scale-95 disabled:opacity-60"
            aria-label="Trocar foto de perfil"
          >
            {appUser?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={appUser.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center font-display text-3xl font-black">
                {initial}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
              {uploadingAvatar ? '…' : 'Trocar'}
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
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Foto de perfil
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Toque na foto para enviar uma nova imagem (até 5MB).
            </p>
          </div>
        </div>
        {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}

        {/* Status */}
        <div className="card p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Como você quer aparecer agora?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatusButton
              active={status === 'online'}
              onClick={() => changeStatus('online')}
              disabled={statusBusy}
              dotClass="bg-emerald-400"
              label="Online"
            />
            <StatusButton
              active={status === 'ausente'}
              onClick={() => changeStatus('ausente')}
              disabled={statusBusy}
              dotClass="bg-slate-500"
              label="Ausente"
            />
          </div>
        </div>

        {/* Dados pessoais */}
        <section className="card p-4">
          <header className="mb-3">
            <h2 className="display text-sm text-brand-500">Dados pessoais</h2>
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
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="voce@email.com"
                inputMode="email"
                autoComplete="email"
              />
              {emailMsg && <p className="mt-1 text-[11px] text-slate-300">{emailMsg}</p>}
            </Field>

            <Field label="Telefone">
              <input
                className="input"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: formatPhone(e.target.value) }))}
                placeholder="(11) 90000-0000"
                inputMode="tel"
              />
            </Field>
          </div>
        </section>

        {/* Endereço */}
        <section className="card p-4">
          <header className="mb-3">
            <h2 className="display text-sm text-brand-500">Endereço</h2>
          </header>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="CEP">
                <input
                  className="input"
                  value={form.cep}
                  onChange={(e) => onCepChange(e.target.value)}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
                {cepLoading && <p className="mt-1 text-[11px] text-slate-400">Consultando…</p>}
                {cepError && <p className="mt-1 text-[11px] text-red-400">{cepError}</p>}
              </Field>
              <Field label="Número">
                <input
                  className="input"
                  value={form.numero}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                  placeholder="123"
                  inputMode="numeric"
                />
              </Field>
            </div>

            <Field label="Rua">
              <input
                className="input"
                value={form.rua}
                onChange={(e) => setForm((f) => ({ ...f, rua: e.target.value }))}
                placeholder="Rua, avenida…"
              />
            </Field>

            <Field label="Complemento">
              <input
                className="input"
                value={form.complemento}
                onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                placeholder="Apto, bloco, referência"
              />
            </Field>

            <Field label="Bairro">
              <input
                className="input"
                value={form.bairro}
                onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                placeholder="Bairro"
              />
            </Field>

            <div className="grid grid-cols-[1fr_5rem] gap-3">
              <Field label="Cidade">
                <input
                  className="input"
                  value={form.cidade}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                  placeholder="Cidade"
                />
              </Field>
              <Field label="UF">
                <input
                  className="input uppercase"
                  value={form.estado_endereco}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      estado_endereco: e.target.value.toUpperCase().slice(0, 2),
                    }))
                  }
                  placeholder="UF"
                  maxLength={2}
                />
              </Field>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="btn-primary w-full text-sm"
        >
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
        {saveMsg && <p className="text-center text-[11px] text-slate-300">{saveMsg}</p>}

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

function StatusButton({ active, onClick, disabled, dotClass, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold uppercase tracking-wide transition active:scale-[0.98] disabled:opacity-60 ${
        active
          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
          : 'border-outline bg-elevated text-slate-300'
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
      {label}
    </button>
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
