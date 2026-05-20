'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PHOTOS_BUCKET, supabase } from '@/lib/supabase';
import { hashPlate, isValidPlate, maskPlate, normalizePlate } from '@/lib/plate';
import { useAuth } from '@/lib/auth';
import { computeVerification } from '@/lib/verification';
import { DESTAQUE_PLANOS } from '@/components/DestaqueModal';

const MAX_PHOTOS = 15;
const MIN_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const STEPS = [
  { id: 1, title: 'Placa' },
  { id: 2, title: 'Veículo' },
  { id: 3, title: 'Fotos' },
  { id: 4, title: 'Revisar' },
];

const ESTADOS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

const REQUIRED_STEP2 = [
  'marca',
  'modelo',
  'motorizacao',
  'ano',
  'km',
  'combustivel',
  'cambio',
  'cor',
  'cidade',
  'estado',
  'preco',
  'descricao',
];

const initialForm = {
  placa: '',
  zero_km: false,
  marca: '',
  modelo: '',
  motorizacao: '',
  versao: '',
  ano: '',
  km: '',
  combustivel: '',
  cambio: '',
  cor: '',
  cidade: '',
  estado: '',
  preco: '',
  descricao: '',
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

// Capitaliza a primeira letra de cada palavra preservando o resto.
function capitalizeWords(s) {
  return String(s).replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFieldErrors(form) {
  const e = {};
  if (form.ano && !/^\d{4}$/.test(form.ano)) e.ano = 'Informe o ano com 4 dígitos.';
  if (!form.zero_km && form.km) {
    if (!/^\d+$/.test(form.km) || form.km.length < 2 || form.km.length > 6) {
      e.km = 'Quilometragem inválida.';
    }
  }
  if (form.preco) {
    if (!/^\d+$/.test(form.preco) || form.preco.length < 4 || form.preco.length > 8) {
      e.preco = 'Preço inválido.';
    }
  }
  if (form.descricao) {
    if (form.descricao.length > 400) e.descricao = 'Máximo 400 caracteres.';
    else if (form.descricao.trim().length < 50)
      e.descricao = 'Descrição muito curta. Mínimo 50 caracteres.';
  }
  return e;
}

function isFieldValid(form, field) {
  if (field === 'km' && form.zero_km) return true;
  const v = form[field];
  if (typeof v === 'string' && !v.trim()) return false;
  if (!v) return false;
  return !getFieldErrors(form)[field];
}

function inputCls({ error, valid }) {
  if (error) return 'input border-red-500 focus:border-red-500 focus:ring-red-500/30';
  if (valid) return 'input border-brand-500';
  return 'input';
}

export default function ListingForm() {
  const router = useRouter();
  const { appUser } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [mainIdx, setMainIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [plateState, setPlateState] = useState({ status: 'idle', message: '' });
  const [destaquePlano, setDestaquePlano] = useState(null);
  const [submittingPath, setSubmittingPath] = useState(null); // null | 'destaque' | 'free'

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files]
  );

  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function updateCap(field) {
    return (e) =>
      setForm((f) => ({ ...f, [field]: capitalizeWords(e.target.value) }));
  }

  function updateDigits(field, max) {
    return (e) => {
      let digits = (e.target.value || '').replace(/\D/g, '');
      if (max) digits = digits.slice(0, max);
      setForm((f) => ({ ...f, [field]: digits }));
    };
  }

  // ─── Step 1: validação em tempo real da placa ──────────────────────────────
  const placaNorm = normalizePlate(form.placa);
  const isZeroKm = !!form.zero_km;
  const placaInformada = placaNorm.length > 0;
  const placaFormatoOk = isZeroKm
    ? (!placaInformada || (placaNorm.length === 7 && isValidPlate(placaNorm)))
    : (placaNorm.length === 7 && isValidPlate(placaNorm));
  const podeAvancarStep1 = isZeroKm
    ? (!placaInformada || (placaNorm.length === 7 && isValidPlate(placaNorm)))
    : placaFormatoOk;
  const placaFormatoErro =
    placaNorm.length >= 7 && !isValidPlate(placaNorm)
      ? 'Formato inválido. Use ABC1234 ou ABC1D23.'
      : '';

  function toggleZeroKm(checked) {
    setForm((f) => ({
      ...f,
      zero_km: checked,
      km: checked ? '0' : (f.km === '0' ? '' : f.km),
    }));
    setPlateState({ status: 'idle', message: '' });
  }

  async function validatePlateAndAdvance() {
    setError(null);
    if (isZeroKm && !placaInformada) {
      setPlateState({ status: 'ok', message: 'Veículo zero km — placa opcional.' });
      setStep(2);
      return;
    }
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

  // ─── Validação de avanço ───────────────────────────────────────────────────
  const canAdvanceFromStep2 = REQUIRED_STEP2.every((f) => isFieldValid(form, f));
  const canAdvanceFromStep3 = files.length >= MIN_PHOTOS && files.length <= MAX_PHOTOS;

  function goNext() {
    setError(null);
    if (step === 2 && !canAdvanceFromStep2) {
      setError('Preencha todos os campos obrigatórios corretamente.');
      return;
    }
    if (step === 3 && !canAdvanceFromStep3) {
      if (files.length < MIN_PHOTOS) setError(`Envie pelo menos ${MIN_PHOTOS} fotos.`);
      else setError(`Máximo de ${MAX_PHOTOS} fotos atingido.`);
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  // ─── Submissão final ───────────────────────────────────────────────────────
  async function onSubmit(planoId = null) {
    setError(null);
    setSubmitting(true);
    setSubmittingPath(planoId ? 'destaque' : 'free');
    try {
      // Lookup explícito do user_id interno (não confia só no contexto)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('[ListingForm] auth.getUser →', authUser?.id);
      if (!authUser) throw new Error('Faça login para anunciar.');

      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single();
      console.log('[ListingForm] users lookup →', { userData, error: userErr });
      if (!userData?.id) {
        throw new Error('Perfil não encontrado em public.users. Refaça o cadastro ou entre novamente.');
      }

      const placa_hash = (isZeroKm && !placaInformada)
        ? `zero-km:${crypto.randomUUID()}`
        : await hashPlate(placaNorm);
      const draftId = crypto.randomUUID();
      const photoUrls = await uploadPhotos(draftId);
      const main = photoUrls[mainIdx] || photoUrls[0];

      const versaoCombinada =
        [form.motorizacao.trim(), form.versao.trim()].filter(Boolean).join(' ') || null;

      const listingShape = {
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        ano: Number(form.ano),
        km: isZeroKm ? 0 : Number(form.km),
        preco: Number(form.preco),
        combustivel: form.combustivel || null,
        cambio: form.cambio || null,
        cor: form.cor.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado || null,
        descricao: form.descricao.trim() || null,
        foto_principal_url: main,
      };

      const verification = computeVerification(listingShape, {
        placa: placaNorm,
        placaUnica: true,
        fotosCount: photoUrls.length,
        temFotoPrincipal: !!main,
      });

      const plano = planoId ? DESTAQUE_PLANOS[planoId] : null;
      const destaqueFields = plano
        ? {
            destaque: true,
            destaque_plano: planoId,
            destaque_expira_em: new Date(Date.now() + plano.dias * 24 * 60 * 60 * 1000).toISOString(),
          }
        : {};

      const insertPayload = {
        ...listingShape,
        user_id: userData.id,
        placa_hash,
        versao: versaoCombinada,
        status: 'ativo',
        verificado: verification.passed,
        zero_km: isZeroKm,
        ...destaqueFields,
      };

      console.log('[ListingForm] userData.id (public.users) =', userData.id);
      console.log('[ListingForm] auth.uid() =', authUser.id);
      console.log('[ListingForm] appUser.id (contexto) =', appUser?.id);
      console.log('cambio value:', form.cambio);
      console.log('combustivel value:', form.combustivel);
      console.log('cambio enviado:', form.cambio);
      console.log('payload completo:', insertPayload);

      const { data: inserted, error: insertErr } = await supabase
        .from('listings')
        .insert(insertPayload)
        .select('id, user_id, status')
        .single();

      if (insertErr) {
        if (insertErr.code === '23505' || insertErr.message?.toLowerCase().includes('placa_hash')) {
          throw new Error('Este veículo já está anunciado no SocialCar.');
        }
        throw new Error(insertErr.message);
      }

      console.log('[ListingForm] listing inserido:', inserted);
      console.log('[ListingForm] CONFIRMAÇÃO — user_id gravado bate com userData.id?', inserted.user_id === userData.id);
      const listingId = inserted.id;

      const photoRows = photoUrls.map((url, i) => ({
        listing_id: listingId,
        url,
        ordem: i === mainIdx ? 0 : i + 1,
      }));
      await supabase.from('listing_photos').insert(photoRows);

      if (planoId) {
        router.push(`/pagamento?listing=${listingId}&plano=${planoId}`);
      } else {
        const params = new URLSearchParams({ published: '1' });
        if (!verification.passed) {
          const failed = verification.checks.filter((c) => !c.passed).map((c) => c.id).join(',');
          params.set('unverified', failed);
        }
        router.push(`/meus-anuncios?${params.toString()}`);
      }
      router.refresh();
    } catch (err) {
      setError(err.message || 'Erro inesperado.');
      setSubmitting(false);
      setSubmittingPath(null);
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
          zeroKm={isZeroKm}
          onZeroKmChange={toggleZeroKm}
        />
      )}

      {step === 2 && (
        <Step2Vehicle
          form={form}
          update={update}
          updateCap={updateCap}
          updateDigits={updateDigits}
          fieldErrors={fieldErrors}
          zeroKm={isZeroKm}
        />
      )}

      {step === 3 && (
        <Step3Photos
          previews={previews}
          mainIdx={mainIdx}
          setMainIdx={setMainIdx}
          handleFiles={handleFiles}
          removeFile={removeFile}
        />
      )}

      {step === 4 && (
        <Step4Review
          form={form}
          previews={previews}
          mainIdx={mainIdx}
          destaquePlano={destaquePlano}
          setDestaquePlano={setDestaquePlano}
          submitting={submitting}
          submittingPath={submittingPath}
          onPublish={(planoId) => onSubmit(planoId)}
        />
      )}

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
            disabled={!podeAvancarStep1 || plateState.status === 'checking'}
            className="btn-primary flex-1"
          >
            {plateState.status === 'checking' ? 'Verificando…' : 'Continuar'}
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvanceFromStep2}
            className="btn-primary flex-1"
          >
            Avançar para fotos
          </button>
        )}
        {step === 3 && (
          <button type="button" onClick={goNext} className="btn-primary flex-1">
            Continuar
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
function Step1Plate({ placa, onChange, formatErro, plateState, zeroKm, onZeroKmChange }) {
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
        className="input uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-50"
        maxLength={8}
        placeholder={zeroKm ? 'Opcional para zero km' : 'ABC1D23'}
        value={maskPlate(placa)}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        required={!zeroKm}
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

      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-outline bg-page p-3 transition hover:border-brand-500/40">
        <input
          type="checkbox"
          checked={!!zeroKm}
          onChange={(e) => onZeroKmChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-500"
        />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-white">Veículo zero km (0 km)</span>
          <span className="block text-[11px] text-slate-400">
            Marque se o carro ainda não foi emplacado. A placa fica opcional e a quilometragem é fixada em 0.
          </span>
        </span>
      </label>
    </section>
  );
}

// ─── Step 2 ──────────────────────────────────────────────────────────────────
function Step2Vehicle({ form, update, updateCap, updateDigits, fieldErrors, zeroKm }) {
  const precoFormatado = form.preco
    ? `R$ ${Number(form.preco).toLocaleString('pt-BR')}`
    : '';

  const v = (field) => isFieldValid(form, field);
  const e = (field) => fieldErrors[field];
  const capitalizeStyle = { textTransform: 'capitalize' };

  return (
    <section className="card space-y-4 p-4">
      <header>
        <h2 className="display text-lg text-white">Dados do veículo</h2>
        <p className="text-xs text-slate-400">Preencha as informações do seu carro.</p>
      </header>

      <Field label="Marca" error={e('marca')}>
        <input
          type="text"
          className={inputCls({ error: e('marca'), valid: v('marca') })}
          style={capitalizeStyle}
          value={form.marca}
          onChange={updateCap('marca')}
          placeholder="Ex: Volkswagen, Toyota, BMW"
          required
        />
      </Field>

      <Field label="Modelo" error={e('modelo')}>
        <input
          type="text"
          className={inputCls({ error: e('modelo'), valid: v('modelo') })}
          style={capitalizeStyle}
          value={form.modelo}
          onChange={updateCap('modelo')}
          placeholder="Ex: Polo, Corolla, X5"
          required
        />
      </Field>

      <Field label="Motorização" error={e('motorizacao')}>
        <input
          type="text"
          className={inputCls({ error: e('motorizacao'), valid: v('motorizacao') })}
          style={capitalizeStyle}
          value={form.motorizacao}
          onChange={updateCap('motorizacao')}
          placeholder="Ex: 1.0 TSI, 2.0 Flex, 3.0 TDI"
          required
        />
      </Field>

      <Field label="Versão">
        <input
          type="text"
          className={inputCls({ valid: !!form.versao.trim() })}
          style={capitalizeStyle}
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
          required
        />
      </Field>

      <Field label="Quilometragem (km)" error={e('km')}>
        <input
          className={`${inputCls({ error: e('km'), valid: v('km') })} disabled:cursor-not-allowed disabled:opacity-60`}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={zeroKm ? '0' : form.km}
          onChange={updateDigits('km', 6)}
          placeholder={zeroKm ? '0 (zero km)' : 'Ex: 45000'}
          disabled={zeroKm}
          required
        />
        {zeroKm && (
          <p className="mt-1 text-[11px] text-brand-500">Quilometragem fixada em 0 (veículo zero km).</p>
        )}
      </Field>

      <Field label="Combustível" error={e('combustivel')}>
        <input
          type="text"
          className={inputCls({ error: e('combustivel'), valid: v('combustivel') })}
          style={capitalizeStyle}
          value={form.combustivel}
          onChange={updateCap('combustivel')}
          placeholder="Ex: Flex, Gasolina, Diesel, Elétrico"
          required
        />
      </Field>

      <Field label="Câmbio" error={e('cambio')}>
        <input
          type="text"
          className={inputCls({ error: e('cambio'), valid: v('cambio') })}
          style={capitalizeStyle}
          value={form.cambio}
          onChange={updateCap('cambio')}
          placeholder="Ex: Manual, Automático, CVT"
          required
        />
      </Field>

      <Field label="Cor" error={e('cor')}>
        <input
          className={inputCls({ error: e('cor'), valid: v('cor') })}
          style={capitalizeStyle}
          value={form.cor}
          onChange={updateCap('cor')}
          placeholder="Ex: Prata, Preto, Branco"
          required
        />
      </Field>

      <Field label="Cidade" error={e('cidade')}>
        <input
          className={inputCls({ error: e('cidade'), valid: v('cidade') })}
          style={capitalizeStyle}
          value={form.cidade}
          onChange={updateCap('cidade')}
          placeholder="Ex: São Paulo"
          required
        />
      </Field>

      <Field label="Estado">
        <select
          className={inputCls({ valid: v('estado') })}
          value={form.estado}
          onChange={update('estado')}
          required
        >
          <option value="">Selecione</option>
          {ESTADOS.map((u) => (
            <option key={u.sigla} value={u.sigla}>
              {u.sigla} — {u.nome}
            </option>
          ))}
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
          required
        />
      </Field>

      <Field label="Descrição do veículo" error={e('descricao')}>
        <textarea
          className={`${inputCls({
            error: e('descricao'),
            valid: v('descricao'),
          })} resize-none`}
          style={{ height: 100 }}
          value={form.descricao}
          onChange={update('descricao')}
          maxLength={400}
          placeholder="Descreva o estado do veículo, histórico de manutenção, diferenciais..."
          required
        />
        <p
          className={`mt-1 text-[11px] ${
            form.descricao.length > 400 ? 'text-red-400' : 'text-slate-400'
          }`}
        >
          {form.descricao.length}/400 caracteres
        </p>
      </Field>
    </section>
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

// ─── Step 3 ──────────────────────────────────────────────────────────────────
function Step3Photos({ previews, mainIdx, setMainIdx, handleFiles, removeFile }) {
  return (
    <section className="card space-y-4 p-4">
      <header>
        <h2 className="display text-base text-white">Fotos</h2>
        <p className="text-xs text-slate-400">
          Mínimo {MIN_PHOTOS}, máximo {MAX_PHOTOS}. Toque numa foto para marcar como principal.
        </p>
      </header>

      <div
        className="flex items-start gap-2"
        style={{
          background: 'rgba(239, 159, 39, 0.1)',
          border: '1px solid rgba(239, 159, 39, 0.3)',
          color: 'rgba(239, 159, 39, 0.9)',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '13px',
        }}
      >
        <span aria-hidden>⚠️</span>
        <span>
          Verifique a qualidade das fotos antes de enviar. Anúncios com fotos escuras,
          borradas ou de baixa qualidade poderão ser removidos.
        </span>
      </div>

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
  );
}

// ─── Step 4 ──────────────────────────────────────────────────────────────────
function Step4Review({
  form,
  previews,
  mainIdx,
  destaquePlano,
  setDestaquePlano,
  submitting,
  submittingPath,
  onPublish,
}) {
  const main = previews[mainIdx] || previews[0];

  return (
    <div className="space-y-4">
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
          <ReviewItem label="KM" value={form.km && Number(form.km).toLocaleString('pt-BR')} />
          <ReviewItem label="Combustível" value={form.combustivel} />
          <ReviewItem label="Câmbio" value={form.cambio} />
          <ReviewItem label="Cor" value={form.cor} />
          <ReviewItem label="Cidade" value={form.cidade} />
          <ReviewItem label="Estado" value={form.estado} />
          <ReviewItem label="Preço" value={formatBRL(form.preco)} highlight />
          <ReviewItem label="Fotos" value={`${previews.length}`} />
        </dl>

        {form.descricao && (
          <div>
            <p className="label">Descrição</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{form.descricao}</p>
          </div>
        )}
      </section>

      <section className="card relative space-y-3 p-4" style={{ border: '1px solid #00CC00' }}>
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
          ⭐ Recomendado
        </span>
        <header className="pt-1">
          <h3 className="display text-base text-white">Publicar com Destaque</h3>
          <p className="text-xs text-slate-400">Apareça primeiro no feed e venda mais rápido</p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DESTAQUE_PLANOS).map(([id, plano]) => {
            const selected = destaquePlano === id;
            const popular = id === '15dias';
            return (
              <button
                key={id}
                type="button"
                onClick={() => setDestaquePlano(id)}
                className={`relative rounded-xl border px-3 py-3 text-center active:scale-[0.99] ${
                  selected ? 'border-brand-500 bg-brand-500/10' : 'border-outline bg-page'
                }`}
              >
                {popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border border-brand-500/50 bg-page px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-500">
                    Mais popular
                  </span>
                )}
                <p className={`text-xs font-bold uppercase tracking-wide ${selected ? 'text-brand-500' : 'text-slate-200'}`}>
                  {plano.label}
                </p>
                <p className="mt-1 font-display text-base font-black text-brand-500">
                  {plano.precoLabel}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPublish(destaquePlano)}
          disabled={!destaquePlano || submitting}
          className="btn-primary w-full"
        >
          {submittingPath === 'destaque' ? 'Publicando…' : 'Publicar com Destaque'}
        </button>
      </section>

      <section className="card space-y-3 p-4">
        <header>
          <h3 className="display text-base text-white">Publicar sem destaque</h3>
          <p className="text-xs text-slate-400">Seu anúncio aparecerá no feed normalmente</p>
        </header>
        <button
          type="button"
          onClick={() => onPublish(null)}
          disabled={submitting}
          className="btn-secondary w-full"
        >
          {submittingPath === 'free' ? 'Publicando…' : 'Publicar gratuitamente'}
        </button>
      </section>
    </div>
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
