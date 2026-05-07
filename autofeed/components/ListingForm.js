'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PHOTOS_BUCKET, supabase } from '@/lib/supabase';

const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

const initialState = {
  title: '',
  brand: '',
  model: '',
  year: '',
  km: '',
  price: '',
  transmission: '',
  fuel: '',
  color: '',
  city: '',
  state: '',
  description: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
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
  const [form, setForm] = useState(initialState);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files]
  );

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleFiles(e) {
    const incoming = Array.from(e.target.files || []);
    const accepted = [];
    for (const file of incoming) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_PHOTO_BYTES) {
        setError(`A foto "${file.name}" passa de 5MB e foi ignorada.`);
        continue;
      }
      accepted.push(file);
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, MAX_PHOTOS));
    e.target.value = '';
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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

    if (files.length === 0) {
      setError('Envie ao menos uma foto do veículo.');
      return;
    }

    setSubmitting(true);
    try {
      const draftId = crypto.randomUUID();
      const photoUrls = await uploadPhotos(draftId);

      const payload = {
        title: form.title.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        km: Number(form.km),
        price: Number(form.price),
        transmission: form.transmission || null,
        fuel: form.fuel || null,
        color: form.color.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        description: form.description.trim() || null,
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim() || null,
        photos: photoUrls,
      };

      const { data, error: insertErr } = await supabase
        .from('listings')
        .insert(payload)
        .select('id')
        .single();

      if (insertErr) throw new Error(insertErr.message);

      router.push(`/anuncios/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Erro inesperado.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-white">Sobre o veículo</h2>

        <div>
          <label className="label" htmlFor="title">Título do anúncio</label>
          <input
            id="title"
            className="input"
            placeholder="Ex.: Honda Civic EXL 2020 impecável"
            required
            value={form.title}
            onChange={update('title')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="brand">Marca</label>
            <input id="brand" className="input" required value={form.brand} onChange={update('brand')} />
          </div>
          <div>
            <label className="label" htmlFor="model">Modelo</label>
            <input id="model" className="input" required value={form.model} onChange={update('model')} />
          </div>
          <div>
            <label className="label" htmlFor="year">Ano</label>
            <input id="year" type="number" min="1900" max="2100" className="input" required value={form.year} onChange={update('year')} />
          </div>
          <div>
            <label className="label" htmlFor="km">Quilometragem</label>
            <input id="km" type="number" min="0" className="input" required value={form.km} onChange={update('km')} />
          </div>
          <div>
            <label className="label" htmlFor="price">Preço (R$)</label>
            <input id="price" type="number" min="0" step="0.01" className="input" required value={form.price} onChange={update('price')} />
          </div>
          <div>
            <label className="label" htmlFor="color">Cor</label>
            <input id="color" className="input" value={form.color} onChange={update('color')} />
          </div>
          <div>
            <label className="label" htmlFor="transmission">Câmbio</label>
            <select id="transmission" className="input" value={form.transmission} onChange={update('transmission')}>
              <option value="">Selecione</option>
              <option value="manual">Manual</option>
              <option value="automatica">Automática</option>
              <option value="semi-automatica">Semi-automática</option>
              <option value="cvt">CVT</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="fuel">Combustível</label>
            <select id="fuel" className="input" value={form.fuel} onChange={update('fuel')}>
              <option value="">Selecione</option>
              <option value="gasolina">Gasolina</option>
              <option value="etanol">Etanol</option>
              <option value="flex">Flex</option>
              <option value="diesel">Diesel</option>
              <option value="eletrico">Elétrico</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="city">Cidade</label>
            <input id="city" className="input" value={form.city} onChange={update('city')} />
          </div>
          <div>
            <label className="label" htmlFor="state">Estado (UF)</label>
            <input id="state" maxLength={2} className="input uppercase" value={form.state} onChange={update('state')} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">Descrição</label>
          <textarea
            id="description"
            rows={5}
            className="input"
            placeholder="Detalhes do estado do carro, opcionais, manutenção, etc."
            value={form.description}
            onChange={update('description')}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Fotos</h2>
          <p className="text-xs text-slate-500">
            Até {MAX_PHOTOS} fotos · máx. 5MB cada · a primeira é a capa
          </p>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline bg-page px-4 py-8 text-center transition hover:border-brand-500/50 hover:bg-elevated">
          <span className="text-sm font-medium text-slate-200">Clique para selecionar imagens</span>
          <span className="text-xs text-slate-500">PNG, JPG ou WEBP</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
        </label>

        {previews.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {previews.map((p, i) => (
              <div key={p.url} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-outline bg-page">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-black">
                    Capa
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white hover:bg-black/80"
                  aria-label="Remover foto"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-white">Contato</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="contact_name">Seu nome</label>
            <input id="contact_name" className="input" required value={form.contact_name} onChange={update('contact_name')} />
          </div>
          <div>
            <label className="label" htmlFor="contact_phone">Telefone / WhatsApp</label>
            <input id="contact_phone" className="input" required placeholder="(11) 99999-9999" value={form.contact_phone} onChange={update('contact_phone')} />
          </div>
          <div>
            <label className="label" htmlFor="contact_email">E-mail (opcional)</label>
            <input id="contact_email" type="email" className="input" value={form.contact_email} onChange={update('contact_email')} />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-outline pt-4">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Publicando...' : 'Publicar anúncio'}
        </button>
      </div>
    </form>
  );
}
