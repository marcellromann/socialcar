'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatKm, formatPrice } from '@/lib/format';

const STATUS_LABEL = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-500/20 text-slate-300' },
  em_analise: { label: 'Em análise', color: 'bg-yellow-500/20 text-yellow-300' },
  ativo: { label: 'Ativo', color: 'bg-brand-500/20 text-brand-500' },
  pausado: { label: 'Pausado', color: 'bg-red-500/20 text-red-300' },
};

export default function MeusAnunciosPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { appUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!appUser?.id) { setLoading(false); return; }
      const { data } = await supabase
        .from('listings')
        .select('id, marca, modelo, ano, km, preco, foto_principal_url, status, created_at')
        .eq('user_id', appUser.id)
        .order('created_at', { ascending: false });
      if (!cancel) {
        setItems(data || []);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [appUser?.id]);

  async function toggleStatus(id, current) {
    const next = current === 'ativo' ? 'pausado' : 'ativo';
    await supabase.from('listings').update({ status: next }).eq('id', id);
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, status: next } : x)));
  }

  return (
    <>
      <TopBar title="Meus anúncios" back />
      <div className="page-pad space-y-3">
        <Link href="/anunciar" className="btn-primary w-full">+ Novo anúncio</Link>

        {loading ? (
          <p className="text-center text-sm text-slate-400">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-outline bg-card p-6 text-center text-sm text-slate-400">
            Você ainda não tem anúncios.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => {
              const status = STATUS_LABEL[it.status] || STATUS_LABEL.rascunho;
              return (
                <li key={it.id} className="card p-3">
                  <div className="flex gap-3">
                    <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-elevated">
                      {it.foto_principal_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.foto_principal_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{it.marca} {it.modelo}</p>
                      <p className="text-xs text-slate-400">{it.ano} · {formatKm(it.km)}</p>
                      <p className="mt-1 font-display text-base font-black text-brand-500">{formatPrice(it.preco)}</p>
                    </div>
                    <span className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-outline pt-3">
                    <Link href={`/anuncio/${it.id}`} className="btn-secondary flex-1 py-2 text-xs">Ver</Link>
                    <button
                      type="button"
                      onClick={() => toggleStatus(it.id, it.status)}
                      className="btn-secondary flex-1 py-2 text-xs"
                    >
                      {it.status === 'ativo' ? 'Pausar' : 'Ativar'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
