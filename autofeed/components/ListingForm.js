'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PHOTOS_BUCKET, supabase } from '@/lib/supabase';
import { hashPlate, isValidPlate, maskPlate, normalizePlate } from '@/lib/plate';
import { lookupPlate } from '@/lib/fipe';
import { useAuth } from '@/lib/auth';

const MAX_PHOTOS = 15;
const MIN_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const initialForm = {
  placa: '',
  marca: '',
  modelo: '',
  ano: '',
  versao: '',
  preco: '',
  km: '',
  combustivel: '',
  cambio: '',
  cor: '',
  descricao: '',
  acessorios: '',
};

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ListingForm() {
  const router = useRouter();
  const { appUser } = useAuth();
  const [form, setForm] = useState(initialForm);
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

  async function checkPlate() {
    setError(null);
    const placa = normalizePlate(form.placa);
    if (!isValidPlate(placa)) {
      setPlateState({ status: 'error', message: 'Formato inválido. Use ABC1D23 ou ABC1234.' });
      return;
    }
    setPlateState({ status: 'checking', message: 'Consultando placa na FIPE…' });

    try {
      const placa_hash = await hashPlate(placa);
      const { data: dup } = await supabase
        .from('listings')
        .select('id')
        .eq('placa_hash', placa_hash)
        .maybeSingle();
      if (dup) {
        setPlateState({ status: 'error', message: 'Já existe um anúncio com esta placa.' });
        return;
      }

      const fipe = await lookupPlate(placa);
      if (fipe) {
        setForm((f) => ({
          ...f,
          marca: fipe.marca || f.marca,
          modelo: fipe.modelo || f.modelo,
          ano: fipe.ano ? String(fipe.ano) : f.ano,
          versao: fipe.versao || f.versao,
        }));
        const fipeText = fipe.valorFipe
          ? ` — FIPE ${Number(fipe.valorFipe).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`
          : '';
        setPlateState({
          status: 'ok',
          message: `${fipe.marca} ${fipe.modelo} ${fipe.ano || ''}${fipeText}`.trim(),
        });
      } else {
        setPlateState({
          status: 'manual',
          message: 'Não encontramos os dados pela placa. Preencha marca, modelo e ano manualmente.',
        });
      }
    } catch (err) {
      setPlateState({
        status: 'manual',
        message: 'Falha ao consultar a FIPE. Você pode preencher manualmente.',
      });
    }
  }

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

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!appUser?.id) {
      setError('Faça login para anunciar.');
      return;
    }
    if (plateState.status !== 'ok' && plateState.status !== 'manual') {
      setError('Valide a placa antes de continuar.');
      return;
    }
    if (files.length < MIN_PHOTOS) {
      setError(`Envie pelo menos ${MIN_PHOTOS} fotos.`);
      return;
    }
    if (files.length > MAX_PHOTOS) {
      setError(`Máximo de ${MAX_PHOTOS} fotos atingido`);
      return;
    }
    if (!form.preco || !form.km) {
      setError('Preço e quilometragem são obrigatórios.');
      return;
    }
    if (!form.marca || !form.modelo || !form.ano) {
      setError('Marca, modelo e ano são obrigatórios.');
      return;
    }

    setSubmitting(true);
    try {
      const placa = normalizePlate(form.placa);
      const placa_hash = await hashPlate(placa);
      const draftId = crypto.randomUUID();
      const photoUrls = await uploadPhotos(draftId);
      const main = photoUrls[mainIdx] || photoUrls[0];

      const { data: rpcId, error: rpcErr } = await supabase.rpc('create_listing_safe', {
        p_user_id: appUser.id,
        p_placa_hash: placa_hash,
        p_marca: form.marca.trim(),
        p_modelo: form.modelo.trim(),
        p_ano: Number(form.ano),
        p_versao: form.versao.trim() || null,
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
          throw new Error('Já existe um anúncio com esta placa.');
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
            versao: form.versao.trim() || null,
            km: Number(form.km),
            preco: Number(form.preco),
            combustivel: form.combustivel || null,
            cambio: form.cambio || null,
            cor: form.cor.trim() || null,
            descricao: form.descricao.trim() || null,
            foto_principal_url: main,
            status: 'em_analise',
            verificado: plateState.status === 'ok',
          })
          .select('id')
          .single();
        if (insertErr) throw new Error(insertErr.message);
        listingId = data.id;
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

  const fipeLocked = plateState.status === 'ok';

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="card p-4 space-y-4">
        <header>
          <h2 className="display text-base text-white">1. Placa do veículo</h2>
          <p className="text-xs text-slate-400">A placa é privada — nunca aparece para outros usuários.</p>
        </header>
        <div className="flex gap-2">
          <input
            id="placa"
            className="input uppercase tracking-widest"
            maxLength={8}
            placeholder="ABC1D23"
            value={maskPlate(form.placa)}
            onChange={(e) => {
              setForm((f) => ({ ...f, placa: normalizePlate(e.target.value) }));
              setPlateState({ status: 'idle', message: '' });
            }}
            required
          />
          <button
            type="button"
            onClick={checkPlate}
            disabled={plateState.status === 'checking' || !form.placa}
            className="btn-primary shrink-0"
          >
            {plateState.status === 'checking' ? '...' : 'Validar'}
          </button>
        </div>
        {plateState.message && (
          <p className={`text-xs ${
            plateState.status === 'ok' ? 'text-brand-500' :
            plateState.status === 'manual' ? 'text-yellow-300' :
            plateState.status === 'error' ? 'text-red-400' : 'text-slate-400'
          }`}>
            {plateState.message}
          </p>
        )}
      </section>

      <section className="card p-4 space-y-4">
        <h2 className="display text-base text-white">2. Sobre o veículo</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Marca</label>
            <input className="input" value={form.marca} onChange={update('marca')} required readOnly={fipeLocked} />
          </div>
          <div className="col-span-2"><label className="label">Modelo</label>
            <input className="input" value={form.modelo} onChange={update('modelo')} required readOnly={fipeLocked} />
          </div>
          <div><label className="label">Ano</label>
            <input className="input" type="number" min="1900" max="2100" value={form.ano} onChange={update('ano')} required />
          </div>
          <div><label className="label">Versão</label>
            <input className="input" value={form.versao} onChange={update('versao')} />
          </div>
          <div><label className="label">Preço</label>
            <input className="input" type="number" min="0" step="100" value={form.preco} onChange={update('preco')} required />
          </div>
          <div><label className="label">KM</label>
            <input className="input" type="number" min="0" value={form.km} onChange={update('km')} required />
          </div>
          <div><label className="label">Combustível</label>
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
          <div><label className="label">Câmbio</label>
            <select className="input" value={form.cambio} onChange={update('cambio')}>
              <option value="">—</option>
              <option value="manual">Manual</option>
              <option value="automatica">Automática</option>
              <option value="semi-automatica">Semi-automática</option>
              <option value="cvt">CVT</option>
            </select>
          </div>
          <div className="col-span-2"><label className="label">Cor</label>
            <input className="input" value={form.cor} onChange={update('cor')} />
          </div>
          <div className="col-span-2"><label className="label">Descrição</label>
            <textarea className="input" rows={4} value={form.descricao} onChange={update('descricao')} />
          </div>
          <div className="col-span-2"><label className="label">Acessórios (separados por vírgula)</label>
            <input className="input" value={form.acessorios} onChange={update('acessorios')} placeholder="ar, multimídia, sensor de ré" />
          </div>
        </div>
      </section>

      <section className="card p-4 space-y-4">
        <header>
          <h2 className="display text-base text-white">3. Fotos</h2>
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
            <p className="text-[11px] text-slate-400">{previews.length}/{MAX_PHOTOS} fotos</p>
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
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
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

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Publicando...' : 'Publicar anúncio'}
      </button>
    </form>
  );
}
