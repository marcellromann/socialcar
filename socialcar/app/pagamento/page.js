'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { DESTAQUE_PLANOS } from '@/components/DestaqueModal';

export default function PagamentoPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <Inner />
      </Suspense>
    </RequireAuth>
  );
}

function Inner() {
  const searchParams = useSearchParams();
  const planoId = searchParams.get('plano');
  const plano = planoId ? DESTAQUE_PLANOS[planoId] : null;

  return (
    <>
      <TopBar title="Pagamento" back />
      <div className="page-pad space-y-4">
        {plano ? (
          <section className="card p-4">
            <p className="section-eyebrow">Resumo</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-bold text-white">
                  Destaque por {plano.dias} dias
                </p>
                <p className="text-xs text-slate-400">
                  Seu anúncio aparece no topo do feed
                </p>
              </div>
              <p className="font-display text-2xl font-black text-brand-500">
                {plano.precoLabel}
              </p>
            </div>
          </section>
        ) : (
          <section className="card p-4 text-sm text-slate-400">
            Nenhum plano selecionado.
          </section>
        )}

        <section className="card border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🚧</div>
            <div className="space-y-1">
              <p className="font-display text-base font-bold text-white">
                Pagamento em breve
              </p>
              <p className="text-sm text-slate-300">
                Estamos integrando o Mercado Pago. Em breve você poderá destacar
                seu anúncio diretamente pelo app.
              </p>
            </div>
          </div>
        </section>

        <Link href="/meus-anuncios" className="btn-primary w-full">
          Voltar para meus anúncios
        </Link>
      </div>
    </>
  );
}
