'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  MARCAS_FIPE,
  MODELOS_POR_MARCA,
  MOTORIZACOES_COMUNS,
  MARCA_OUTRA,
  MODELO_OUTRO,
  MOTORIZACAO_OUTRA,
} from '@/lib/marcas';

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const REQUIRED = [
  'marca','modelo','motorizacao','ano','km',
  'combustivel','cambio','cor','cidade','estado','preco','descricao',
];

export default function EditarAnuncioPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function capitalizeWords(s) {
  return String(s).replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFieldErrors(form) {
  const e = {};
  if (form.ano && !/^\d{4}$/.test(String(form.ano))) e.ano = 'Informe o ano com 4 dígitos.';
  if (form.km !== '' && form.km != null) {
    const s = String(form.km);
    if (!/^\d+$/.test(s) || s.length < 2 || s.length > 6) e.km = 'Quilometragem inválida.';
  }
  if (form.preco !== '' && form.preco != null) {
    const s = String(form.preco);
    if (!/^\d+$/.test(s) || s.length < 4 || s.length > 8) e.preco = 'Preço inválido.';
  }
  if (form.descricao) {
    if (form.descricao.length > 400) e.descricao = 'Máximo 400 caracteres.';
    else if (form.descricao.trim().length < 30)
      e.descricao = 'Descrição muito curta. Mínimo 30 caracteres.';
  }
  return e;
}

function isValid(form, field) {
  const v = form[field];
  if (typeof v === 'string' && !v.trim()) return false;
  if (v === '' || v == null) return false;
  return !getFieldErrors(form)[field];
}

function inputCls({ error, valid }) {
  if (error) return 'input border-red-500 focus:border-red-500 focus:ring-red-500/30';
  if (valid) return 'input border-brand-500';
  return 'input';
}

function splitVersao(versao) {
  if (!versao) return { motorizacao: '', versao: '' };
  const parts = String(versao).trim().split(/\s+/);
  if (!parts.length) return { motorizacao: '', versao: '' };
  const motoMatch = MOTORIZACOES_COMUNS.find((m) => m.toLowerCase() === parts[0].toLowerCase());
  if (motoMatch) {
    return { motorizacao: motoMatch, versao: parts.slice(1).join(' ') };
  }
  if (/^\d/.test(parts[0])) {
    return { motorizacao: parts[0], versao: parts.slice(1).join(' ') };
  }
  return { motorizacao: '', versao: parts.join(' ') };
}

function Inner() {
  const router = useRouter();
  const { id } = useParams();
  const { appUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    marca: '', modelo: '', motorizacao: '', versao: '',
    ano: '', km: '', combustivel: '', cambio: '', cor: '',
    cidade: '', estado: '', preco: '', descricao: '',
  });
  const [marcaCustom, setMarcaCustom] = useState(false);
  const [modeloCustom, setModeloCustom] = useState(false);
  const [motorizacaoCustom, setMotorizacaoCustom] = useState(false);

  useEffect(() => {
    if (!appUser?.id || !id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: listing, error: fetchErr } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();
      if (cancel) return;
      if (fetchErr || !listing || listing.user_id !== appUser.id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { motorizacao, versao } = splitVersao(listing.versao);
      const cap = (s) => (s ? capitalizeWords(s) : '');
      const knownMarca = MARCAS_FIPE.some((m) => m.nome === listing.marca);
      const knownModelo = knownMarca && MODELOS_POR_MARCA[listing.marca]?.includes(listing.modelo);
      const knownMoto = MOTORIZACOES_COMUNS.some((m) => m.toLowerCase() === motorizacao.toLowerCase());
      setMarcaCustom(!knownMarca && !!listing.marca);
      setModeloCustom(!knownModelo && !!listing.modelo);
      setMotorizacaoCustom(!knownMoto && !!motorizacao);
      setForm({
        marca: listing.marca || '',
        modelo: listing.modelo || '',
        motorizacao,
        versao,
        ano: listing.ano ? String(listing.ano) : '',
        km: listing.km != null ? String(listing.km) : '',
        combustivel: cap(listing.combustivel),
        cambio: cap(listing.cambio),
        cor: listing.cor || '',
        cidade: listing.cidade || '',
        estado: listing.estado || '',
        preco: listing.preco != null ? String(Math.round(Number(listing.preco))) : '',
        descricao: listing.descricao || '',
      });
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [appUser?.id, id]);

  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);
  const canSave = REQUIRED.every((f) => isValid(form, f));

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }
  function updateCap(field) {
    return (e) => setForm((f) => ({ ...f, [field]: capitalizeWords(e.target.value) }));
  }
  function updateDigits(field, max) {
    return (e) => {
      let d = (e.target.value || '').replace(/\D/g, '');
      if (max) d = d.slice(0, max);
      setForm((f) => ({ ...f, [field]: d }));
    };
  }

  function handleMarcaSelect(value) {
    if (value === MARCA_OUTRA) {
      setMarcaCustom(true); setModeloCustom(false);
      setForm((f) => ({ ...f, marca: '', modelo: '' }));
      return;
    }
    setMarcaCustom(false); setModeloCustom(false);
    setForm((f) => ({ ...f, marca: value, modelo: '' }));
  }
  function handleModeloSelect(value) {
    if (value === MODELO_OUTRO) {
      setModeloCustom(true);
      setForm((f) => ({ ...f, modelo: '' }));
      return;
    }
    setModeloCustom(false);
    setForm((f) => ({ ...f, modelo: value }));
  }
  function handleMotorizacaoSelect(value) {
    if (value === MOTORIZACAO_OUTRA) {
      setMotorizacaoCustom(true);
      setForm((f) => ({ ...f, motorizacao: '' }));
      return;
    }
    setMotorizacaoCustom(false);
    setForm((f) => ({ ...f, motorizacao: value }));
  }

  async function onSave() {
    if (!canSave || !appUser?.id) return;
    setSaving(true);
    setError(null);
    try {
      const versaoCombinada =
        [form.motorizacao.trim(), form.versao.trim()].filter(Boolean).join(' ') || null;
      const payload = {
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        ano: Number(form.ano),
        versao: versaoCombinada,
        km: Number(form.km),
        preco: Number(form.preco),
        combustivel: form.combustivel ? form.combustivel.toLowerCase() : null,
        cambio: form.cambio ? form.cambio.toLowerCase() : null,
        cor: form.cor.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado || null,
        descricao: form.descricao.trim() || null,
        updated_at: new Date().toISOString(),
      };
      console.log('cambio sendo enviado:', form.cambio);
      console.log('payload completo:', payload);
      const { error: upErr } = await supabase
        .from('listings')
        .update(payload)
        .eq('id', id)
        .eq('user_id', appUser.id);
      if (upErr) throw new Error(upErr.message);
      router.push('/meus-anuncios');
      router.refresh();
    } catch (e) {
      setError(e.message || 'Erro inesperado.');
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <>
        <TopBar title="Editar anúncio" back />
        <div className="page-pad">
          <p className="rounded-xl border border-dashed border-outline bg-card p-6 text-center text-sm text-slate-400">
            Anúncio não encontrado.
          </p>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <TopBar title="Editar anúncio" back />
        <div className="page-pad space-y-3">
          {[0,1,2,3,4,5].map((i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
        </div>
      </>
    );
  }

  const knownModels = MODELOS_POR_MARCA[form.marca];
  const marcaSelectValue = marcaCustom ? MARCA_OUTRA : form.marca;
  const v = (f) => isValid(form, f);
  const e = (f) => fieldErrors[f];
  const precoFormatado = form.preco ? `R$ ${Number(form.preco).toLocaleString('pt-BR')}` : '';

  return (
    <>
      <TopBar title="Editar anúncio" back />
      <div className="page-pad space-y-4">
        <section className="card space-y-4 p-4">
          <header>
            <h2 className="display text-lg text-white">Dados do veículo</h2>
            <p className="text-xs text-slate-400">Atualize as informações do seu anúncio.</p>
          </header>

          <Field label="Marca" error={e('marca')}>
            {marcaCustom ? (
              <div className="space-y-2">
                <input
                  className={inputCls({ error: e('marca'), valid: v('marca') })}
                  value={form.marca}
                  onChange={updateCap('marca')}
                  placeholder="Digite a marca do seu veículo"
                />
                <button
                  type="button"
                  onClick={() => { setMarcaCustom(false); setModeloCustom(false); setMotorizacaoCustom(false); setForm((f) => ({ ...f, marca: '', modelo: '', motorizacao: '' })); }}
                  className="text-[11px] font-bold uppercase tracking-wide text-brand-500 active:opacity-80"
                >
                  ← Voltar
                </button>
              </div>
            ) : (
              <select
                className={inputCls({ error: e('marca'), valid: v('marca') })}
                value={marcaSelectValue}
                onChange={(ev) => handleMarcaSelect(ev.target.value)}
              >
                <option value="">Selecionar marca</option>
                {MARCAS_FIPE.map((m) => <option key={m.codigo} value={m.nome}>{m.nome}</option>)}
                <option value={MARCA_OUTRA}>Outra marca</option>
              </select>
            )}
          </Field>

          <Field label="Modelo" error={e('modelo')}>
            {marcaCustom || !knownModels || modeloCustom ? (
              <div className="space-y-2">
                <input
                  className={inputCls({ error: e('modelo'), valid: v('modelo') })}
                  value={form.modelo}
                  onChange={updateCap('modelo')}
                  placeholder={form.marca ? 'Ex: Corolla, Civic, Onix' : 'Selecione a marca primeiro'}
                  disabled={!marcaCustom && !form.marca}
                />
                {knownModels && modeloCustom && (
                  <button
                    type="button"
                    onClick={() => { setModeloCustom(false); setForm((f) => ({ ...f, modelo: '' })); }}
                    className="text-[11px] font-bold uppercase tracking-wide text-brand-500 active:opacity-80"
                  >
                    ← Voltar
                  </button>
                )}
              </div>
            ) : (
              <select
                className={inputCls({ error: e('modelo'), valid: v('modelo') })}
                value={form.modelo}
                onChange={(ev) => handleModeloSelect(ev.target.value)}
              >
                <option value="">Selecionar modelo</option>
                {knownModels.map((m) => <option key={m} value={m}>{m}</option>)}
                <option value={MODELO_OUTRO}>Outro modelo</option>
              </select>
            )}
          </Field>

          <Field label="Motorização" error={e('motorizacao')}>
            {motorizacaoCustom ? (
              <div className="space-y-2">
                <input
                  className={inputCls({ error: e('motorizacao'), valid: v('motorizacao') })}
                  value={form.motorizacao}
                  onChange={updateCap('motorizacao')}
                  placeholder="Ex: 1.0 TSI, 2.0 Flex, 1.6 16V"
                />
                <button
                  type="button"
                  onClick={() => { setMotorizacaoCustom(false); setForm((f) => ({ ...f, motorizacao: '' })); }}
                  className="text-[11px] font-bold uppercase tracking-wide text-brand-500 active:opacity-80"
                >
                  ← Voltar
                </button>
              </div>
            ) : (
              <select
                className={inputCls({ error: e('motorizacao'), valid: v('motorizacao') })}
                value={form.motorizacao}
                onChange={(ev) => handleMotorizacaoSelect(ev.target.value)}
                disabled={!form.modelo}
              >
                <option value="">{form.modelo ? 'Selecionar motorização' : 'Selecione o modelo primeiro'}</option>
                {MOTORIZACOES_COMUNS.map((m) => <option key={m} value={m}>{m}</option>)}
                <option value={MOTORIZACAO_OUTRA}>Outra motorização</option>
              </select>
            )}
          </Field>

          <Field label="Versão">
            <input
              className={inputCls({ valid: !!form.versao.trim() })}
              value={form.versao}
              onChange={updateCap('versao')}
              placeholder="Ex: Highline, XEi, Comfort (opcional)"
            />
          </Field>

          <Field label="Ano" error={e('ano')}>
            <input
              className={inputCls({ error: e('ano'), valid: v('ano') })}
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={form.ano}
              onChange={updateDigits('ano', 4)}
              placeholder="Ex: 2023"
            />
          </Field>

          <Field label="Quilometragem (km)" error={e('km')}>
            <input
              className={inputCls({ error: e('km'), valid: v('km') })}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={form.km}
              onChange={updateDigits('km', 6)}
              placeholder="Ex: 45000"
            />
          </Field>

          <Field label="Combustível">
            <select
              className={inputCls({ valid: v('combustivel') })}
              value={form.combustivel}
              onChange={update('combustivel')}
            >
              <option value="">Selecione</option>
              <option value="Flex">Flex</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Diesel">Diesel</option>
              <option value="Elétrico">Elétrico</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Etanol">Etanol</option>
            </select>
          </Field>

          <Field label="Câmbio">
            <select
              className={inputCls({ valid: v('cambio') })}
              value={form.cambio}
              onChange={update('cambio')}
            >
              <option value="">Selecione</option>
              <option value="Manual">Manual</option>
              <option value="Automático">Automático</option>
              <option value="CVT">CVT</option>
              <option value="Automatizado">Automatizado</option>
            </select>
          </Field>

          <Field label="Cor" error={e('cor')}>
            <input
              className={inputCls({ error: e('cor'), valid: v('cor') })}
              value={form.cor}
              onChange={updateCap('cor')}
              placeholder="Ex: Prata, Preto, Branco"
            />
          </Field>

          <Field label="Cidade" error={e('cidade')}>
            <input
              className={inputCls({ error: e('cidade'), valid: v('cidade') })}
              value={form.cidade}
              onChange={updateCap('cidade')}
              placeholder="Ex: São Paulo"
            />
          </Field>

          <Field label="Estado">
            <select
              className={inputCls({ valid: v('estado') })}
              value={form.estado}
              onChange={update('estado')}
            >
              <option value="">Selecione</option>
              {ESTADOS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>

          <Field label="Preço de venda (R$)" error={e('preco')}>
            <input
              className={inputCls({ error: e('preco'), valid: v('preco') })}
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={precoFormatado}
              onChange={updateDigits('preco', 8)}
              placeholder="Ex: 85000"
            />
          </Field>

          <Field label="Descrição do veículo" error={e('descricao')}>
            <textarea
              className={`${inputCls({ error: e('descricao'), valid: v('descricao') })} resize-none`}
              style={{ height: 100 }}
              value={form.descricao}
              onChange={update('descricao')}
              maxLength={400}
              placeholder="Descreva o estado do veículo, histórico de manutenção, diferenciais..."
            />
            <p className={`mt-1 text-[11px] ${form.descricao.length > 400 ? 'text-red-400' : 'text-slate-400'}`}>
              {form.descricao.length}/400 caracteres
            </p>
          </Field>
        </section>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary flex-1"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
