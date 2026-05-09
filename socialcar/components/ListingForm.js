'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PHOTOS_BUCKET, supabase } from '@/lib/supabase';
import { hashPlate, isValidPlate, maskPlate, normalizePlate } from '@/lib/plate';
import {
  fetchFipeBrands,
  fetchFipeModels,
  fetchFipeYears,
  fetchFipeDetail,
  parseFipeValor,
  mapFipeFuel,
} from '@/lib/fipe';
import { useAuth } from '@/lib/auth';

const MAX_PHOTOS = 15;
const MIN_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const ACESSORIOS_OPTIONS = [
  { id: 'ar_condicionado', label: 'Ar condicionado' },
  { id: 'direcao_eletrica', label: 'Direção elétrica' },
  { id: 'sensor_re', label: 'Sensor de ré' },
  { id: 'camera', label: 'Câmera' },
  { id: 'teto_solar', label: 'Teto solar' },
  { id: 'multimidia', label: 'Multimídia' },
  { id: 'bancos_couro', label: 'Bancos em couro' },
];

const STEPS = [
  { id: 1, title: 'Placa' },
  { id: 2, title: 'Identificar' },
  { id: 3, title: 'Detalhes' },
  { id: 4, title: 'Revisar' },
];

const initialForm = {
  placa: '',
  marca: '',
  modelo: '',
  motorizacao: '',
  ano: '',
  versao: '',
  preco: '',
  km: '',
  combustivel: '',
  cambio: '',
  cor: '',
  descricao: '',
  acessorios: [],
  codigoFipe: '',
  valorFipe: null,
};

const initialFipe = {
  brands: [],
  models: [],
  years: [],
  marcaId: '',
  modeloId: '',
  anoId: '',
  loading: { brands: false, models: false, years: false, detail: false },
  // True quando a chamada respectiva falhou — UI mostra texto livre.
  fallback: { brands: false, models: false, years: false },
};

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatBRL(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export default function ListingForm() {
  const router = useRouter();
  const { appUser } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [fipe, setFipe] = useState(initialFipe);
  const [files, setFiles] = useState([]);
  const [mainIdx, setMainIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [plateState, setPlateState] = useState({ status: 'idle', message: '' });

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files]
  );

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  // ─── Step 1: validação em tempo real da placa ──────────────────────────────
  const placaNorm = normalizePlate(form.placa);
  const placaFormatoOk = placaNorm.length === 7 && isValidPlate(placaNorm);
  const placaFormatoErro =
    placaNorm.length >= 7 && !isValidPlate(placaNorm)
      ? 'Formato inválido. Use ABC1234 ou ABC1D23.'
      : '';

  async function validatePlateAndAdvance() {
    setError(null);
    if (!placaFormatoOk) {
      setPlateState({ status: 'error', message: 'Formato inválido. Use ABC1234 ou ABC1D23.' });
      return;
    }
    setPlateState({ status: 'checking', message: 'Verificando duplicata…' });
    try {
      const placa_hash = await hashPlate(placaNorm);
      const { data: dup } = await supabase
        .from('listings')
        .select('id')
        .eq('placa_hash', placa_hash)
        .maybeSingle();
      if (dup) {
        setPlateState({
          status: 'error',
          message: 'Este veículo já está anunciado no SocialCar.',
        });
        return;
      }
      setPlateState({ status: 'ok', message: 'Placa válida.' });
      setStep(2);
    } catch (err) {
      setPlateState({
        status: 'error',
        message: 'Não conseguimos validar a placa agora. Tente novamente.',
      });
    }
  }

  // ─── Step 2: carrega marcas FIPE assim que entra no step ──────────────────
  useEffect(() => {
    if (step !== 2) return;
    if (fipe.brands.length || fipe.loading.brands || fipe.fallback.brands) return;
    let cancelled = false;
    setFipe((s) => ({ ...s, loading: { ...s.loading, brands: true } }));
    (async () => {
      try {
        const brands = await fetchFipeBrands();
        if (cancelled) return;
        setFipe((s) => ({
          ...s,
          brands,
          loading: { ...s.loading, brands: false },
          fallback: { ...s.fallback, brands: brands.length === 0 },
        }));
      } catch {
        if (cancelled) return;
        setFipe((s) => ({
          ...s,
          loading: { ...s.loading, brands: false },
          fallback: { ...s.fallback, brands: true },
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, fipe.brands.length, fipe.loading.brands, fipe.fallback.brands]);

  async function onSelectBrand(marcaId) {
    const marca = fipe.brands.find((b) => String(b.codigo) === String(marcaId));
    setFipe((s) => ({
      ...s,
      marcaId,
      models: [],
      years: [],
      modeloId: '',
      anoId: '',
      loading: { ...s.loading, models: !!marcaId },
      fallback: { ...s.fallback, models: false, years: false },
    }));
    setForm((f) => ({
      ...f,
      marca: marca?.nome || f.marca,
      modelo: '',
      ano: '',
      versao: '',
      motorizacao: '',
      combustivel: '',
      codigoFipe: '',
      valorFipe: null,
    }));
    if (!marcaId) return;
    try {
      const models = await fetchFipeModels(marcaId);
      setFipe((s) => ({
        ...s,
        models,
        loading: { ...s.loading, models: false },
        fallback: { ...s.fallback, models: models.length === 0 },
      }));
    } catch {
      setFipe((s) => ({
        ...s,
        loading: { ...s.loading, models: false },
        fallback: { ...s.fallback, models: true },
      }));
    }
  }

  async function onSelectModel(modeloId) {
    const modelo = fipe.models.find((m) => String(m.codigo) === String(modeloId));
    setFipe((s) => ({
      ...s,
      modeloId,
      years: [],
      anoId: '',
      loading: { ...s.loading, years: !!modeloId },
      fallback: { ...s.fallback, years: false },
    }));
    setForm((f) => ({
      ...f,
      modelo: modelo?.nome || f.modelo,
      ano: '',
      combustivel: '',
      codigoFipe: '',
      valorFipe: null,
    }));
    if (!modeloId) return;
    try {
      const years = await fetchFipeYears(fipe.marcaId, modeloId);
      setFipe((s) => ({
        ...s,
        years,
        loading: { ...s.loading, years: false },
        fallback: { ...s.fallback, years: years.length === 0 },
      }));
    } catch {
      setFipe((s) => ({
        ...s,
        loading: { ...s.loading, years: false },
        fallback: { ...s.fallback, years: true },
      }));
    }
  }

  async function onSelectYear(anoId) {
    setFipe((s) => ({ ...s, anoId, loading: { ...s.loading, detail: true } }));
    const detail = await fetchFipeDetail(fipe.marcaId, fipe.modeloId, anoId);
    setFipe((s) => ({ ...s, loading: { ...s.loading, detail: false } }));
    if (!detail) return;
    const valor = parseFipeValor(detail.Valor);
    const anoNum = Number(String(detail.AnoModelo || anoId).replace(/\D/g, '')) || '';
    setForm((f) => ({
      ...f,
      ano: anoNum ? String(anoNum) : f.ano,
      combustivel: mapFipeFuel(detail.Combustivel) || f.combustivel,
      codigoFipe: detail.CodigoFipe || '',
      valorFipe: valor,
      preco: f.preco || (valor ? String(valor) : ''),
    }));
  }

  function toggleAcessorio(id) {
    setForm((f) => ({
      ...f,
      acessorios: f.acessorios.includes(id)
        ? f.acessorios.filter((x) => x !== id)
        : [...f.acessorios, id],
    }));
  }

  // ─── Fotos ─────────────────────────────────────────────────────────────────
  function handleFiles(e) {
    const incoming = Array.from(e.target.files || []);
    const accepted = [];
    let limitHit = false;

    for (const file of incoming) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_PHOTO_BYTES) {
        setError(`A foto "${file.name}" passa de 5MB e foi ignorada.`);
        continue;
      }
      accepted.push(file);
    }

    setFiles((prev) => {
      const merged = [...prev, ...accepted];
      if (merged.length > MAX_PHOTOS) {
        limitHit = true;
        return merged.slice(0, MAX_PHOTOS);
      }
      return merged;
    });

    if (limitHit) setError(`Máximo de ${MAX_PHOTOS} fotos atingido`);
    e.target.value = '';
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMainIdx((i) => (i === index ? 0 : i > index ? i - 1 : i));
  }

  async function uploadPhotos(listingDraftId) {
    const urls = [];
    for (const [i, file] of files.entries()) {
      const path = `${listingDraftId}/${Date.now()}-${i}-${slugify(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw new Error(`Falha ao enviar foto: ${upErr.message}`);

      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  // ─── Navegação entre steps ─────────────────────────────────────────────────
  const canAdvanceFromStep2 =
    !!form.marca.trim() &&
    !!form.modelo.trim() &&
    !!form.motorizacao.trim() &&
    !!form.ano;
  const canAdvanceFromStep3 =
    !!form.preco &&
    !!form.km &&
    !!form.cambio &&
    !!form.cor.trim() &&
    files.length >= MIN_PHOTOS &&
    files.length <= MAX_PHOTOS;

  function goNext() {
    setError(null);
    if (step === 2) {
      if (!canAdvanceFromStep2) {
        setError('Preencha marca, modelo, motorização e ano para continuar.');
        return;
      }
    }
    if (step === 3) {
      if (!canAdvanceFromStep3) {
        if (files.length < MIN_PHOTOS) setError(`Envie pelo menos ${MIN_PHOTOS} fotos.`);
        else setError('Preencha preço, KM, câmbio e cor.');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  // ─── Submissão final ───────────────────────────────────────────────────────
  async function onSubmit() {
    setError(null);
    if (!appUser?.id) {
      setError('Faça login para anunciar.');
      return;
    }
    setSubmitting(true);
    try {
      const placa_hash = await hashPlate(placaNorm);
      const draftId = crypto.randomUUID();
      const photoUrls = await uploadPhotos(draftId);
      const main = photoUrls[mainIdx] || photoUrls[0];

      // O schema atual não tem coluna dedicada para "motorização": juntamos com a versão.
      const versaoCombinada = [form.motorizacao.trim(), form.versao.trim()]
        .filter(Boolean)
        .join(' ') || null;

      const { data: rpcId, error: rpcErr } = await supabase.rpc('create_listing_safe', {
        p_user_id: appUser.id,
        p_placa_hash: placa_hash,
        p_marca: form.marca.trim(),
        p_modelo: form.modelo.trim(),
        p_ano: Number(form.ano),
        p_versao: versaoCombinada,
        p_km: Number(form.km),
        p_preco: Number(form.preco),
        p_combustivel: form.combustivel || null,
        p_cambio: form.cambio || null,
        p_cor: form.cor.trim() || null,
        p_descricao: form.descricao.trim() || null,
        p_foto_principal_url: main,
      });

      let listingId = rpcId;
      if (rpcErr) {
        if (rpcErr.message?.includes('PLACA_DUPLICADA')) {
          throw new Error('Este veículo já está anunciado no SocialCar.');
        }
        if (rpcErr.message?.includes('RATE_LIMIT')) {
          throw new Error('Você atingiu o limite de 10 anúncios por usuário.');
        }
        const { data, error: insertErr } = await supabase
          .from('listings')
          .insert({
            user_id: appUser.id,
            placa_hash,
            marca: form.marca.trim(),
            modelo: form.modelo.trim(),
            ano: Number(form.ano),
            versao: versaoCombinada,
            km: Number(form.km),
            preco: Number(form.preco),
            combustivel: form.combustivel || null,
            cambio: form.cambio || null,
            cor: form.cor.trim() || null,
            descricao: form.descricao.trim() || null,
            acessorios: form.acessorios,
            foto_principal_url: main,
            status: 'em_analise',
            verificado: true,
          })
          .select('id')
          .single();
        if (insertErr) throw new Error(insertErr.message);
        listingId = data.id;
      }

      // Persiste acessórios quando o RPC ignora o array (versão antiga do RPC).
      if (form.acessorios.length) {
        await supabase
          .from('listings')
          .update({ acessorios: form.acessorios })
          .eq('id', listingId);
      }

      const photoRows = photoUrls.map((url, i) => ({
        listing_id: listingId,
        url,
        ordem: i === mainIdx ? 0 : i + 1,
      }));
      await supabase.from('listing_photos').insert(photoRows);

      router.push('/meus-anuncios');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Erro inesperado.');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Stepper current={step} />

      {step === 1 && (
        <Step1Plate
          placa={form.placa}
          onChange={(v) => {
            setForm((f) => ({ ...f, placa: normalizePlate(v) }));
            if (plateState.status !== 'idle')
              setPlateState({ status: 'idle', message: '' });
          }}
          formatErro={placaFormatoErro}
          plateState={plateState}
          canAdvance={placaFormatoOk && plateState.status !== 'checking'}
          onAdvance={validatePlateAndAdvance}
        />
      )}

      {step === 2 && (
        <Step2Identify
          fipe={fipe}
          form={form}
          update={update}
          onSelectBrand={onSelectBrand}
          onSelectModel={onSelectModel}
          onSelectYear={onSelectYear}
        />
      )}

      {step === 3 && (
        <Step3Details
          form={form}
          update={update}
          toggleAcessorio={toggleAcessorio}
          previews={previews}
          mainIdx={mainIdx}
          setMainIdx={setMainIdx}
          handleFiles={handleFiles}
          removeFile={removeFile}
        />
      )}

      {step === 4 && <Step4Review form={form} files={files} previews={previews} mainIdx={mainIdx} />}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {step > 1 && (
          <button type="button" onClick={goBack} className="btn-secondary flex-1" disabled={submitting}>
            Voltar
          </button>
        )}
        {step === 1 && (
          <button
            type="button"
            onClick={validatePlateAndAdvance}
            disabled={!placaFormatoOk || plateState.status === 'checking'}
            className="btn-primary flex-1"
          >
            {plateState.status === 'checking' ? 'Verificando…' : 'Continuar'}
          </button>
        )}
        {(step === 2 || step === 3) && (
          <button type="button" onClick={goNext} className="btn-primary flex-1">
            Continuar
          </button>
        )}
        {step === 4 && (
          <button type="button" onClick={onSubmit} className="btn-primary flex-1" disabled={submitting}>
            {submitting ? 'Publicando…' : 'Publicar anúncio'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ current }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold ${
                done
                  ? 'border-brand-500 bg-brand-500 text-black'
                  : active
                  ? 'border-brand-500 text-brand-500'
                  : 'border-outline text-slate-500'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              {done ? '✓' : s.id}
            </div>
            <span
              className={`hidden text-[11px] font-bold uppercase tracking-wide sm:inline ${
                active ? 'text-white' : done ? 'text-brand-500' : 'text-slate-500'
              }`}
            >
              {s.title}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 ${done ? 'bg-brand-500' : 'bg-outline'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Step 1 ──────────────────────────────────────────────────────────────────
function Step1Plate({ placa, onChange, formatErro, plateState, canAdvance, onAdvance }) {
  return (
    <section className="card space-y-3 p-4">
      <header>
        <h2 className="display text-base text-white">Placa do veículo</h2>
        <p className="text-xs text-slate-400">
          A placa é privada — nunca aparece para outros usuários. Use o formato antigo
          (ABC1234) ou Mercosul (ABC1D23).
        </p>
      </header>
      <input
        className="input uppercase tracking-widest"
        maxLength={8}
        placeholder="ABC1D23"
        value={maskPlate(placa)}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        required
      />
      {formatErro && <p className="text-xs text-red-400">{formatErro}</p>}
      {plateState.message && !formatErro && (
        <p
          className={`text-xs ${
            plateState.status === 'ok'
              ? 'text-brand-500'
              : plateState.status === 'error'
              ? 'text-red-400'
              : 'text-slate-400'
          }`}
        >
          {plateState.message}
        </p>
      )}
      <p className="text-[11px] text-slate-500">
        Vamos checar se já existe anúncio com essa placa antes de continuar.
      </p>
    </section>
  );
}

// ─── Step 2 ──────────────────────────────────────────────────────────────────
function Step2Identify({ fipe, form, update, onSelectBrand, onSelectModel, onSelectYear }) {
  const useFreeBrand = fipe.fallback.brands;
  const useFreeModel = fipe.fallback.models || useFreeBrand;
  const useFreeYear = fipe.fallback.years || useFreeModel;

  return (
    <section className="card space-y-4 p-4">
      <header>
        <h2 className="display text-base text-white">Identificar o veículo</h2>
        <p className="text-xs text-slate-400">Selecione os dados do seu veículo abaixo.</p>
      </header>

      {(useFreeBrand || fipe.fallback.models || fipe.fallback.years) && (
        <p className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-200">
          Algum dado não pôde ser carregado da FIPE. Preencha em texto livre nos campos
          abaixo — funciona normalmente.
        </p>
      )}

      {/* Marca */}
      <div>
        <label className="label">
          Marca {fipe.loading.brands && <Hint>carregando…</Hint>}
        </label>
        {useFreeBrand ? (
          <input
            className="input"
            value={form.marca}
            onChange={update('marca')}
            placeholder="Ex.: Volkswagen"
            required
          />
        ) : (
          <SearchableSelect
            listId="fipe-marcas"
            disabled={fipe.loading.brands}
            value={fipe.marcaId}
            text={form.marca}
            options={fipe.brands}
            onChange={(code, nome) => {
              if (code) {
                onSelectBrand(code);
              } else {
                // texto não bate com nenhuma opção FIPE — guarda só o que digitou
                update('marca')({ target: { value: nome } });
              }
            }}
            placeholder={fipe.loading.brands ? 'Carregando marcas…' : 'Digite ou selecione'}
          />
        )}
      </div>

      {/* Modelo */}
      <div>
        <label className="label">
          Modelo {fipe.loading.models && <Hint>carregando…</Hint>}
        </label>
        {useFreeModel ? (
          <input
            className="input"
            value={form.modelo}
            onChange={update('modelo')}
            placeholder="Ex.: Polo, Corolla, Civic"
            required
          />
        ) : (
          <SearchableSelect
            listId="fipe-modelos"
            disabled={!fipe.marcaId || fipe.loading.models}
            value={fipe.modeloId}
            text={form.modelo}
            options={fipe.models}
            onChange={(code, nome) => {
              if (code) onSelectModel(code);
              else update('modelo')({ target: { value: nome } });
            }}
            placeholder={
              !fipe.marcaId
                ? 'Escolha a marca primeiro'
                : fipe.loading.models
                ? 'Carregando modelos…'
                : 'Digite ou selecione'
            }
          />
        )}
      </div>

      {/* Ano */}
      <div>
        <label className="label">
          Ano {fipe.loading.years && <Hint>carregando…</Hint>}
        </label>
        {useFreeYear ? (
          <input
            className="input"
            type="number"
            min="1900"
            max="2100"
            value={form.ano}
            onChange={update('ano')}
            placeholder="Ex.: 2022"
            required
          />
        ) : (
          <select
            className="input"
            value={fipe.anoId}
            onChange={(e) => onSelectYear(e.target.value)}
            disabled={!fipe.modeloId || fipe.loading.years}
            required
          >
            <option value="">
              {!fipe.modeloId
                ? 'Escolha o modelo primeiro'
                : fipe.loading.years
                ? 'Carregando anos…'
                : 'Selecione o ano'}
            </option>
            {fipe.years.map((y) => (
              <option key={y.codigo} value={y.codigo}>
                {y.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Motorização (sempre texto livre, obrigatório) */}
      <div>
        <label className="label">Motorização</label>
        <input
          className="input"
          value={form.motorizacao}
          onChange={update('motorizacao')}
          placeholder="Ex.: 1.0 TSI, 2.0 Flex, 1.6 16V"
          required
        />
      </div>

      {/* Versão (opcional) */}
      <div>
        <label className="label">Versão / trim (opcional)</label>
        <input
          className="input"
          value={form.versao}
          onChange={update('versao')}
          placeholder="Ex.: Highline, XEi, EX"
        />
      </div>

      {/* Combustível — vem da FIPE quando possível, mas pode ser editado */}
      <div>
        <label className="label">Combustível</label>
        <select className="input" value={form.combustivel} onChange={update('combustivel')}>
          <option value="">—</option>
          <option value="flex">Flex</option>
          <option value="gasolina">Gasolina</option>
          <option value="etanol">Etanol</option>
          <option value="diesel">Diesel</option>
          <option value="eletrico">Elétrico</option>
          <option value="hibrido">Híbrido</option>
        </select>
      </div>

      {fipe.loading.detail && (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Spinner /> Buscando preço FIPE…
        </p>
      )}

      {form.valorFipe != null && (
        <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-500">
            Valor de referência FIPE
          </p>
          <p className="display text-2xl text-white">{formatBRL(form.valorFipe)}</p>
          <p className="mt-1 text-[11px] text-slate-300">
            {form.marca} {form.modelo}
            {form.motorizacao ? ` ${form.motorizacao}` : ''} • {form.ano}
            {form.combustivel ? ` • ${form.combustivel}` : ''}
            {form.codigoFipe ? ` • FIPE ${form.codigoFipe}` : ''}
          </p>
        </div>
      )}
    </section>
  );
}

function Hint({ children }) {
  return <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-slate-400">{children}</span>;
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
    />
  );
}

/**
 * Combobox simples baseado em <input list> + <datalist>.
 * - `value` é o código (id) atualmente selecionado.
 * - `text` é o que aparece no input (sincronizado com a opção do `value`).
 * - `onChange(code, nome)` recebe o código quando o texto digitado bate com
 *   uma opção, ou string vazia + o texto puro caso contrário.
 */
function SearchableSelect({ listId, value, text, options, onChange, placeholder, disabled }) {
  const [draft, setDraft] = useState(text || '');

  useEffect(() => {
    setDraft(text || '');
  }, [text, value]);

  function handleChange(e) {
    const v = e.target.value;
    setDraft(v);
    const match = options.find(
      (o) => String(o.nome).toLowerCase() === v.trim().toLowerCase()
    );
    onChange(match ? String(match.codigo) : '', v);
  }

  return (
    <>
      <input
        list={listId}
        className="input"
        value={draft}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.codigo} value={o.nome} />
        ))}
      </datalist>
    </>
  );
}

// ─── Step 3 ──────────────────────────────────────────────────────────────────
function Step3Details({
  form,
  update,
  toggleAcessorio,
  previews,
  mainIdx,
  setMainIdx,
  handleFiles,
  removeFile,
}) {
  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-4">
        <header>
          <h2 className="display text-base text-white">Detalhes da venda</h2>
          {form.valorFipe != null && (
            <p className="text-xs text-slate-400">
              FIPE de referência: {formatBRL(form.valorFipe)}
            </p>
          )}
        </header>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Preço de venda</label>
            <input
              className="input"
              type="number"
              min="0"
              step="100"
              value={form.preco}
              onChange={update('preco')}
              required
            />
          </div>
          <div>
            <label className="label">KM</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.km}
              onChange={update('km')}
              required
            />
          </div>
          <div>
            <label className="label">Cor</label>
            <input className="input" value={form.cor} onChange={update('cor')} required />
          </div>
          <div>
            <label className="label">Câmbio</label>
            <select className="input" value={form.cambio} onChange={update('cambio')} required>
              <option value="">—</option>
              <option value="automatica">Automático</option>
              <option value="manual">Manual</option>
              <option value="cvt">CVT</option>
              <option value="semi-automatica">Automatizado</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Descrição</label>
            <textarea
              className="input"
              rows={4}
              value={form.descricao}
              onChange={update('descricao')}
              placeholder="Conte os destaques do veículo, manutenções recentes, etc."
            />
          </div>
          <div className="col-span-2">
            <label className="label">Acessórios</label>
            <div className="grid grid-cols-2 gap-2">
              {ACESSORIOS_OPTIONS.map((a) => {
                const checked = form.acessorios.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      checked
                        ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                        : 'border-outline bg-card text-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleAcessorio(a.id)}
                    />
                    <span
                      className={`grid h-4 w-4 place-items-center rounded border ${
                        checked ? 'border-brand-500 bg-brand-500 text-black' : 'border-outline'
                      }`}
                    >
                      {checked ? '✓' : ''}
                    </span>
                    {a.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <header>
          <h2 className="display text-base text-white">Fotos</h2>
          <p className="text-xs text-slate-400">
            Mínimo {MIN_PHOTOS}, máximo {MAX_PHOTOS}. Toque numa foto para marcar como principal.
          </p>
        </header>

        <label className="grid cursor-pointer place-items-center gap-1 rounded-2xl border-2 border-dashed border-outline bg-page py-8 text-center hover:border-brand-500/50">
          <span className="text-sm font-medium text-slate-200">Selecionar fotos</span>
          <span className="text-xs text-slate-500">PNG, JPG ou WEBP — até 5MB cada</span>
          <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
        </label>

        {previews.length > 0 && (
          <>
            <p className="text-[11px] text-slate-400">
              {previews.length}/{MAX_PHOTOS} fotos
            </p>
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => setMainIdx(i)}
                  className={`relative aspect-square overflow-hidden rounded-lg border ${
                    i === mainIdx ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-outline'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                  {i === mainIdx && (
                    <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">
                      Principal
                    </span>
                  )}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white"
                    role="button"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ─── Step 4 ──────────────────────────────────────────────────────────────────
function Step4Review({ form, previews, mainIdx }) {
  const accessoriosLabels = form.acessorios
    .map((id) => ACESSORIOS_OPTIONS.find((a) => a.id === id)?.label)
    .filter(Boolean)
    .join(', ');
  const main = previews[mainIdx] || previews[0];

  return (
    <section className="card space-y-4 p-4">
      <header>
        <h2 className="display text-base text-white">Revisar e publicar</h2>
        <p className="text-xs text-slate-400">Confira as informações antes de enviar.</p>
      </header>

      {main && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={main.url}
          alt="Foto principal"
          className="aspect-video w-full rounded-xl border border-outline object-cover"
        />
      )}

      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <ReviewItem label="Marca" value={form.marca} />
        <ReviewItem label="Modelo" value={form.modelo} />
        <ReviewItem label="Motorização" value={form.motorizacao} />
        <ReviewItem label="Versão" value={form.versao} />
        <ReviewItem label="Ano" value={form.ano} />
        <ReviewItem label="Combustível" value={form.combustivel} />
        <ReviewItem label="Câmbio" value={form.cambio} />
        <ReviewItem label="Cor" value={form.cor} />
        <ReviewItem label="KM" value={form.km && Number(form.km).toLocaleString('pt-BR')} />
        <ReviewItem label="Preço" value={formatBRL(form.preco)} highlight />
        {form.valorFipe != null && (
          <ReviewItem label="FIPE ref." value={formatBRL(form.valorFipe)} />
        )}
        <ReviewItem label="Fotos" value={`${previews.length}`} />
      </dl>

      {accessoriosLabels && (
        <div>
          <p className="label">Acessórios</p>
          <p className="text-sm text-slate-200">{accessoriosLabels}</p>
        </div>
      )}

      {form.descricao && (
        <div>
          <p className="label">Descrição</p>
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{form.descricao}</p>
        </div>
      )}
    </section>
  );
}

function ReviewItem({ label, value, highlight }) {
  return (
    <>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`text-right ${highlight ? 'font-bold text-brand-500' : 'text-slate-200'}`}>
        {value || '—'}
      </dd>
    </>
  );
}
