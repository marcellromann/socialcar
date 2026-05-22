'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatPrice, formatDate } from '@/lib/format';

const STATUS_LABEL = {
  rascunho:    { label: 'Rascunho',    color: 'bg-slate-500/20 text-slate-300' },
  em_analise:  { label: 'Em análise',  color: 'bg-yellow-500/20 text-yellow-300' },
  ativo:       { label: 'Ativo',       color: 'bg-brand-500/20 text-brand-500' },
  pausado:     { label: 'Pausado',     color: 'bg-red-500/20 text-red-300' },
};

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function authedFetch(url, options = {}) {
  const token = await getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, appUser, loading } = useAuth();

  const [stats, setStats] = useState(null);
  const [anuncios, setAnuncios] = useState([]);
  const [anunciantes, setAnunciantes] = useState([]);
  const [buscaAnuncios, setBuscaAnuncios] = useState('');
  const [buscaAnunciantes, setBuscaAnunciantes] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [filtroBusy, setFiltroBusy] = useState(false);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  const role = appUser?.role;

  const withEstado = useCallback((base, estado) => {
    return estado ? `${base}?estado=${encodeURIComponent(estado)}` : base;
  }, []);

  // Refaz os três endpoints com o estado dado. Usado tanto no fetchAll
  // inicial quanto no refetch quando o usuário muda o filtro.
  const fetchFiltered = useCallback(async (estado) => {
    setFiltroBusy(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        authedFetch(withEstado('/api/admin/stats', estado)),
        authedFetch(withEstado('/api/admin/anuncios', estado)),
        authedFetch(withEstado('/api/admin/anunciantes', estado)),
      ]);
      if (!r1.ok || !r2.ok || !r3.ok) return;
      const [statsJson, anunciosJson, anunciantesJson] = await Promise.all([
        r1.json(), r2.json(), r3.json(),
      ]);
      setStats(statsJson);
      setAnuncios(anunciosJson.items || []);
      setAnunciantes(anunciantesJson.items || []);
    } finally {
      setFiltroBusy(false);
    }
  }, [withEstado]);

  const fetchAll = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      // DIAGNÓSTICO: chama o whoami e despeja no console antes das rotas reais.
      try {
        const w = await authedFetch('/api/admin/whoami');
        console.log('[admin-ui] /api/admin/whoami status:', w.status);
        console.log('[admin-ui] /api/admin/whoami body:', await w.clone().json());
      } catch (e) {
        console.log('[admin-ui] /api/admin/whoami falhou:', e);
      }

      const [r1, r2, r3] = await Promise.all([
        authedFetch(withEstado('/api/admin/stats', estadoFiltro)),
        authedFetch(withEstado('/api/admin/anuncios', estadoFiltro)),
        authedFetch(withEstado('/api/admin/anunciantes', estadoFiltro)),
      ]);
      console.log('[admin-ui] respostas API →', {
        stats: r1.status, anuncios: r2.status, anunciantes: r3.status,
      });
      if (r1.status === 401 || r2.status === 401 || r3.status === 401) {
        setErr('Sessão expirada. Faça login novamente.');
        setBusy(false);
        return;
      }
      if (r1.status === 403 || r2.status === 403 || r3.status === 403) {
        const body = await r1.clone().json().catch(() => ({}));
        console.log('[admin-ui] ✖ servidor retornou 403:', body);
        setErr('Acesso restrito (servidor): ' + (body.error || 'sem detalhes'));
        setBusy(false);
        return;
      }
      const [statsJson, anunciosJson, anunciantesJson] = await Promise.all([
        r1.json(), r2.json(), r3.json(),
      ]);
      setStats(statsJson);
      setAnuncios(anunciosJson.items || []);
      setAnunciantes(anunciantesJson.items || []);
    } catch (e) {
      setErr('Falha ao carregar dados do admin.');
    } finally {
      setBusy(false);
    }
  }, []);

  // DIAGNÓSTICO: dispara whoami quando temos sessão, INDEPENDENTE do role.
  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      try {
        const w = await authedFetch('/api/admin/whoami');
        console.log('[admin-ui] (incondicional) whoami status:', w.status);
        console.log('[admin-ui] (incondicional) whoami body:', await w.clone().json());
      } catch (e) {
        console.log('[admin-ui] (incondicional) whoami falhou:', e);
      }
    })();
  }, [loading, user]);

  useEffect(() => {
    console.log('[admin-ui] guard tick →', {
      loading, hasUser: !!user, authEmail: user?.email,
      hasAppUser: !!appUser, role, appUser,
    });
    if (loading) return;
    if (!user) {
      router.replace('/entrar?next=' + encodeURIComponent('/admin'));
      return;
    }
    if (role && role !== 'admin') {
      console.log('[admin-ui] ✖ guard cliente: role ===', role, '→ bloqueio');
      setErr('Acesso restrito a administradores.');
      setBusy(false);
      return;
    }
    if (role === 'admin') {
      console.log('[admin-ui] ✓ guard cliente passou — chamando fetchAll()');
      fetchAll();
    } else {
      console.log('[admin-ui] role ainda indefinido — aguardando appUser carregar');
    }
  }, [loading, user, role, router, fetchAll, appUser]);

  // Quando o filtro de estado muda, refaz stats + anúncios + anunciantes.
  // Só dispara depois do load inicial (stats já populado).
  useEffect(() => {
    if (role !== 'admin' || !stats) return;
    fetchFiltered(estadoFiltro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro]);

  async function deleteAnuncio(id, titulo) {
    if (!confirm(`Deletar o anúncio "${titulo}"? Essa ação não pode ser desfeita.`)) return;
    const res = await authedFetch(`/api/admin/anuncios/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Falha ao deletar anúncio.');
      return;
    }
    setAnuncios((arr) => arr.filter((x) => x.id !== id));
    // Recarrega métricas + listas sem travar a tela.
    fetchFiltered(estadoFiltro);
  }

  async function toggleBloqueio(id, nome, atualmenteBloqueado) {
    const acao = atualmenteBloqueado ? 'desbloquear' : 'bloquear';
    if (!confirm(`Confirma ${acao} o anunciante "${nome}"?`)) return;
    const res = await authedFetch(`/api/admin/anunciantes/${id}/bloquear`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bloqueado: !atualmenteBloqueado }),
    });
    if (!res.ok) {
      alert('Falha ao atualizar status do anunciante.');
      return;
    }
    setAnunciantes((arr) =>
      arr.map((u) => (u.id === id ? { ...u, bloqueado: !atualmenteBloqueado } : u))
    );
  }

  const qAnuncios = buscaAnuncios.trim().toLowerCase();
  const anunciosFiltrados = qAnuncios
    ? anuncios.filter((a) => {
        const titulo = (a.titulo || '').toLowerCase();
        const nome = (a.anunciante_nome || '').toLowerCase();
        return titulo.includes(qAnuncios) || nome.includes(qAnuncios);
      })
    : anuncios;

  const qAnunciantes = buscaAnunciantes.trim().toLowerCase();
  const anunciantesFiltrados = qAnunciantes
    ? anunciantes.filter((u) => {
        const nome = (u.nome || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return nome.includes(qAnunciantes) || email.includes(qAnunciantes);
      })
    : anunciantes;

  if (loading || (busy && !err)) {
    return (
      <div className="page-pad">
        <p className="text-sm text-slate-400">Carregando painel…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="page-pad">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {err}
        </div>
      </div>
    );
  }

  return (
    <div className="page-pad space-y-5">
      <section className="card p-3">
        <label htmlFor="filtro-estado" className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Filtrar por estado
        </label>
        <div className="mt-2 flex items-center gap-2">
          <select
            id="filtro-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            disabled={filtroBusy}
            className="w-full rounded-xl border border-outline bg-page px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-white focus:border-brand-500 focus:outline-none disabled:opacity-60"
            aria-label="Filtrar painel por estado"
          >
            <option value="">Todos os estados</option>
            {ESTADOS_BR.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          {filtroBusy && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Atualizando…
            </span>
          )}
        </div>
        {estadoFiltro && (
          <p className="mt-2 text-[11px] text-slate-400">
            Exibindo dados de <span className="font-bold text-brand-500">{estadoFiltro}</span> em todas as seções abaixo.
          </p>
        )}
      </section>

      <section>
        <h2 className="section-eyebrow mb-2">Métricas</h2>
        <div className="grid grid-cols-2 gap-2">
          <Card title="Acessos hoje"  value={stats?.views?.hoje ?? 0} />
          <Card title="Acessos no mês" value={stats?.views?.mes ?? 0} />
          <Card title="Acessos total"  value={stats?.views?.total ?? 0} />
          <Card title="Mobile vs Desktop"
                value={`${stats?.views?.mobile_pct ?? 0}% / ${stats?.views?.desktop_pct ?? 0}%`} />
          <Card title="Anúncios ativos"     value={stats?.anuncios?.ativos ?? 0} tone="brand" />
          <Card title="Anunciantes"         value={stats?.anunciantes?.total ?? 0} />
          <Card title="Total de usuários"   value={stats?.usuarios?.total ?? 0} className="col-span-2" />
        </div>
      </section>

      <section>
        <h2 className="section-eyebrow mb-2">
          Anúncios ({anunciosFiltrados.length}
          {buscaAnuncios.trim() ? ` de ${anuncios.length}` : ''})
        </h2>
        <input
          type="search"
          inputMode="search"
          value={buscaAnuncios}
          onChange={(e) => setBuscaAnuncios(e.target.value)}
          placeholder="Buscar por título, marca, modelo ou anunciante…"
          className="mb-2 w-full rounded-xl border border-outline bg-transparent px-3 py-2 text-sm placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
        />
        <div className="card overflow-hidden">
          {anunciosFiltrados.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">
              {buscaAnuncios.trim() ? 'Nenhum anúncio encontrado.' : 'Nenhum anúncio cadastrado.'}
            </p>
          ) : (
            <ul className="divide-y divide-outline">
              {anunciosFiltrados.map((a) => {
                const st = STATUS_LABEL[a.status] || STATUS_LABEL.rascunho;
                return (
                  <li key={a.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{a.titulo}</p>
                        <p className="truncate text-xs text-slate-400">
                          {a.anunciante_nome} · {formatDate(a.created_at)}
                        </p>
                        <p className="mt-1 font-display text-base font-black text-brand-500">
                          {formatPrice(a.preco)}
                        </p>
                      </div>
                      <span className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => deleteAnuncio(a.id, a.titulo)}
                        className="rounded-full border border-red-500/60 bg-transparent px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-red-300 transition active:scale-95"
                      >
                        Deletar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="section-eyebrow mb-2">
          Anunciantes ({anunciantesFiltrados.length}
          {buscaAnunciantes.trim() ? ` de ${anunciantes.length}` : ''})
        </h2>
        <input
          type="search"
          inputMode="search"
          value={buscaAnunciantes}
          onChange={(e) => setBuscaAnunciantes(e.target.value)}
          placeholder="Buscar por nome ou email…"
          className="mb-2 w-full rounded-xl border border-outline bg-transparent px-3 py-2 text-sm placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
        />
        <div className="card overflow-hidden">
          {anunciantesFiltrados.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">
              {buscaAnunciantes.trim() ? 'Nenhum anunciante encontrado.' : 'Nenhum anunciante cadastrado.'}
            </p>
          ) : (
            <ul className="divide-y divide-outline">
              {anunciantesFiltrados.map((u) => (
                <li key={u.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {u.nome || u.email}
                        {u.role === 'admin' && (
                          <span className="ml-2 rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-brand-500">
                            Admin
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-400">{u.email}</p>
                      <p className="text-xs text-slate-500">
                        {u.qtd_anuncios} anúncio(s) · {u.qtd_acessos ?? 0} acesso(s) · cadastro em {formatDate(u.created_at)}
                      </p>
                    </div>
                    {u.bloqueado && (
                      <span className="h-fit rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">
                        Bloqueado
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => toggleBloqueio(u.id, u.nome || u.email, u.bloqueado)}
                      className={
                        u.bloqueado
                          ? 'rounded-full border border-brand-500/60 bg-transparent px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-500 transition active:scale-95'
                          : 'rounded-full border border-red-500/60 bg-transparent px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-red-300 transition active:scale-95'
                      }
                    >
                      {u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Card({ title, value, tone, className = '' }) {
  return (
    <div className={`card p-3 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <p className={`mt-1 font-display text-2xl font-black ${tone === 'brand' ? 'text-brand-500' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
