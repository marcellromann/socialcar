'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { PHOTOS_BUCKET, supabase } from '@/lib/supabase';

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const REQUIRED = [
  'marca','modelo','motorizacao','ano','km',
  'combustivel','cambio','cor','cidade','estado','preco','descricao',
];

const MAX_PHOTOS = 15;
const MIN_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractStoragePath(url) {
  if (!url) return null;
  const marker = `/${PHOTOS_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

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
  // Fotos
  const [existingPhotos, setExistingPhotos] = useState([]); // [{ id, url, ordem }]
  const [removedExistingIds, setRemovedExistingIds] = useState([]); // [id]
  const [newPhotos, setNewPhotos] = useState([]); // [{ key, file, previewUrl }]
  const [mainKey, setMainKey] = useState(null); // 'existing:<id>' | 'new:<key>'
  const [photoError, setPhotoError] = useState(null);
  const newPreviewsRef = useRef([]);

  useEffect(() => {
    if (!appUser?.id || !id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ data: listing, error: fetchErr }, { data: photos }] = await Promise.all([
        supabase.from('listings').select('*').eq('id', id).single(),
        supabase.from('listing_photos').select('id, url, ordem').eq('listing_id', id).order('ordem'),
      ]);
      if (cancel) return;
      if (fetchErr || !listing || listing.user_id !== appUser.id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const loadedPhotos = (photos || []).map((p) => ({ id: p.id, url: p.url, ordem: p.ordem }));
      setExistingPhotos(loadedPhotos);
      setRemovedExistingIds([]);
      setNewPhotos([]);
      const principal = loadedPhotos.find((p) => p.url === listing.foto_principal_url)
        || loadedPhotos[0];
      setMainKey(principal ? `existing:${principal.id}` : null);
      const { motorizacao, versao } = splitVersao(listing.versao);
      const cap = (s) => (s ? capitalizeWords(s) : '');
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

  // ─── Fotos ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      newPreviewsRef.current.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch {}
      });
    };
  }, []);

  const visibleExisting = existingPhotos.filter((p) => !removedExistingIds.includes(p.id));
  const totalPhotos = visibleExisting.length + newPhotos.length;
  const photosOk = totalPhotos >= MIN_PHOTOS && totalPhotos <= MAX_PHOTOS;

  function handleFilesPick(e) {
    setPhotoError(null);
    const incoming = Array.from(e.target.files || []);
    const accepted = [];
    for (const file of incoming) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError(`A foto "${file.name}" passa de 5MB e foi ignorada.`);
        continue;
      }
      accepted.push(file);
    }
    setNewPhotos((prev) => {
      let merged = [...prev];
      for (const file of accepted) {
        if (visibleExisting.length + merged.length >= MAX_PHOTOS) {
          setPhotoError(`Máximo de ${MAX_PHOTOS} fotos atingido.`);
          break;
        }
        const key = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
        const previewUrl = URL.createObjectURL(file);
        newPreviewsRef.current.push(previewUrl);
        merged.push({ key, file, previewUrl });
      }
      return merged;
    });
    e.target.value = '';
  }

  function removeExistingPhoto(photoId) {
    setRemovedExistingIds((prev) => (prev.includes(photoId) ? prev : [...prev, photoId]));
    setMainKey((cur) => (cur === `existing:${photoId}` ? null : cur));
  }

  function removeNewPhoto(key) {
    setNewPhotos((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) {
        try { URL.revokeObjectURL(target.previewUrl); } catch {}
      }
      return prev.filter((p) => p.key !== key);
    });
    setMainKey((cur) => (cur === `new:${key}` ? null : cur));
  }

  function selectMain(key) {
    setMainKey(key);
  }

  async function onSave() {
    if (!canSave || !appUser?.id) return;
    if (!photosOk) {
      setError(
        totalPhotos < MIN_PHOTOS
          ? `Envie pelo menos ${MIN_PHOTOS} fotos.`
          : `Máximo de ${MAX_PHOTOS} fotos.`
      );
      return;
    }
    if (!mainKey) {
      setError('Selecione uma foto principal.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // 1) Upload das novas fotos
      const uploaded = []; // [{ key, url }]
      for (const [i, item] of newPhotos.entries()) {
        const path = `${id}/${Date.now()}-${i}-${slugify(item.file.name)}`;
        const { error: upErr } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, item.file, { cacheControl: '3600', upsert: false });
        if (upErr) throw new Error(`Falha ao enviar foto: ${upErr.message}`);
        const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
        uploaded.push({ key: item.key, url: data.publicUrl });
      }

      // 2) URL da foto principal
      let foto_principal_url = null;
      if (mainKey.startsWith('existing:')) {
        const pid = mainKey.slice('existing:'.length);
        foto_principal_url = existingPhotos.find((p) => p.id === pid)?.url || null;
      } else if (mainKey.startsWith('new:')) {
        const k = mainKey.slice('new:'.length);
        foto_principal_url = uploaded.find((u) => u.key === k)?.url || null;
      }

      // 3) Delete fotos removidas: storage + tabela
      if (removedExistingIds.length) {
        const removedRows = existingPhotos.filter((p) => removedExistingIds.includes(p.id));
        const paths = removedRows.map((p) => extractStoragePath(p.url)).filter(Boolean);
        if (paths.length) {
          await supabase.storage.from(PHOTOS_BUCKET).remove(paths);
        }
        const { error: delErr } = await supabase
          .from('listing_photos')
          .delete()
          .in('id', removedExistingIds);
        if (delErr) throw new Error(delErr.message);
      }

      // 4) Insere novas fotos (ordem definida abaixo via update)
      if (uploaded.length) {
        const rows = uploaded.map((u) => ({
          listing_id: id,
          url: u.url,
          ordem: 999,
        }));
        const { error: insErr } = await supabase.from('listing_photos').insert(rows);
        if (insErr) throw new Error(insErr.message);
      }

      // 5) Re-busca fotos pra atribuir ordem (principal = 0, demais = 1..N)
      const { data: allPhotos, error: refetchErr } = await supabase
        .from('listing_photos')
        .select('id, url')
        .eq('listing_id', id);
      if (refetchErr) throw new Error(refetchErr.message);

      const ordered = [...(allPhotos || [])].sort((a, b) => {
        if (a.url === foto_principal_url) return -1;
        if (b.url === foto_principal_url) return 1;
        return 0;
      });
      await Promise.all(
        ordered.map((p, i) =>
          supabase.from('listing_photos').update({ ordem: i }).eq('id', p.id)
        )
      );

      // 6) Atualiza o listing (campos + foto_principal_url)
      const versaoCombinada =
        [form.motorizacao.trim(), form.versao.trim()].filter(Boolean).join(' ') || null;
      const payload = {
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        ano: Number(form.ano),
        versao: versaoCombinada,
        km: Number(form.km),
        preco: Number(form.preco),
        combustivel: form.combustivel || null,
        cambio: form.cambio || null,
        cor: form.cor.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado || null,
        descricao: form.descricao.trim() || null,
        foto_principal_url,
        updated_at: new Date().toISOString(),
      };
      const { error: upErr } = await supabase
        .from('listings')
        .update(payload)
        .eq('id', id);
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

  const v = (f) => isValid(form, f);
  const e = (f) => fieldErrors[f];
  const precoFormatado = form.preco ? `R$ ${Number(form.preco).toLocaleString('pt-BR')}` : '';
  const capitalizeStyle = { textTransform: 'capitalize' };

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
            <input
              type="text"
              className={inputCls({ error: e('marca'), valid: v('marca') })}
              style={capitalizeStyle}
              value={form.marca}
              onChange={updateCap('marca')}
              placeholder="Ex: Volkswagen, Toyota, BMW"
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

          <Field label="Combustível" error={e('combustivel')}>
            <input
              type="text"
              className={inputCls({ error: e('combustivel'), valid: v('combustivel') })}
              style={capitalizeStyle}
              value={form.combustivel}
              onChange={updateCap('combustivel')}
              placeholder="Ex: Flex, Gasolina, Diesel, Elétrico"
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
            />
          </Field>

          <Field label="Cor" error={e('cor')}>
            <input
              className={inputCls({ error: e('cor'), valid: v('cor') })}
              style={capitalizeStyle}
              value={form.cor}
              onChange={updateCap('cor')}
              placeholder="Ex: Prata, Preto, Branco"
            />
          </Field>

          <Field label="Cidade" error={e('cidade')}>
            <input
              className={inputCls({ error: e('cidade'), valid: v('cidade') })}
              style={capitalizeStyle}
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

        <section className="card space-y-4 p-4">
          <header>
            <h2 className="display text-lg text-white">Fotos</h2>
            <p className="text-xs text-slate-400">
              Mínimo {MIN_PHOTOS}, máximo {MAX_PHOTOS}. Toque numa foto para marcar como principal.
            </p>
          </header>

          <label className="grid cursor-pointer place-items-center gap-1 rounded-2xl border-2 border-dashed border-outline bg-page py-8 text-center hover:border-brand-500/50">
            <span className="text-sm font-medium text-slate-200">Adicionar fotos</span>
            <span className="text-xs text-slate-500">PNG, JPG ou WEBP — até 5MB cada</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesPick}
              className="hidden"
              disabled={totalPhotos >= MAX_PHOTOS}
            />
          </label>

          <p className={`text-[11px] ${photosOk ? 'text-slate-400' : 'text-red-400'}`}>
            {totalPhotos}/{MAX_PHOTOS} fotos {totalPhotos < MIN_PHOTOS && `(mínimo ${MIN_PHOTOS})`}
          </p>

          {(visibleExisting.length > 0 || newPhotos.length > 0) && (
            <div className="grid grid-cols-3 gap-2">
              {visibleExisting.map((p) => {
                const key = `existing:${p.id}`;
                const isMain = mainKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectMain(key)}
                    className={`relative aspect-square overflow-hidden rounded-lg border ${
                      isMain ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-outline'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    {isMain && (
                      <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">
                        Principal
                      </span>
                    )}
                    <span
                      onClick={(ev) => {
                        ev.stopPropagation();
                        removeExistingPhoto(p.id);
                      }}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white"
                      role="button"
                    >
                      ×
                    </span>
                  </button>
                );
              })}
              {newPhotos.map((p) => {
                const key = `new:${p.key}`;
                const isMain = mainKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectMain(key)}
                    className={`relative aspect-square overflow-hidden rounded-lg border ${
                      isMain ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-outline'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl} alt={p.file.name} className="h-full w-full object-cover" />
                    {isMain && (
                      <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">
                        Principal
                      </span>
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">
                      Nova
                    </span>
                    <span
                      onClick={(ev) => {
                        ev.stopPropagation();
                        removeNewPhoto(p.key);
                      }}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white"
                      role="button"
                    >
                      ×
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {photoError && (
            <p className="text-xs text-red-400">{photoError}</p>
          )}
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
            disabled={!canSave || !photosOk || saving}
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
