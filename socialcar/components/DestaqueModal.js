'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export const DESTAQUE_PLANOS = {
  '7dias':  { dias: 7,  preco: 19.90, label: '7 dias',  precoLabel: 'R$ 19,90' },
  '15dias': { dias: 15, preco: 29.90, label: '15 dias', precoLabel: 'R$ 29,90' },
};

export default function DestaqueModal({ listing, onClose }) {
  const router = useRouter();
  const [selected, setSelected] = useState('15dias');

  function confirmar() {
    if (!selected || !listing?.id) return;
    router.push(`/pagamento?listing=${listing.id}&plano=${selected}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/80 p-0 backdrop-blur sm:place-items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md space-y-4 rounded-b-none rounded-t-2xl p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-500/15 text-2xl">
            ⭐
          </div>
          <h3 className="display mt-3 text-xl text-white">Destaque seu anúncio</h3>
          <p className="mt-1 text-sm text-slate-400">
            Apareça primeiro no feed e venda mais rápido
          </p>
          {listing && (
            <p className="mt-2 truncate text-xs text-slate-500">
              {listing.marca} {listing.modelo} · {listing.ano}
            </p>
          )}
        </header>

        <ul className="space-y-2">
          {Object.entries(DESTAQUE_PLANOS).map(([id, plano]) => {
            const isSelected = selected === id;
            const isRecommended = id === '15dias';
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`relative flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left active:scale-[0.99] ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-outline bg-page'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                        isSelected ? 'bg-brand-500 text-black' : 'bg-elevated text-slate-200'
                      }`}>
                        {plano.label}
                      </span>
                      {isRecommended && (
                        <span className="inline-flex items-center rounded-full border border-brand-500/50 bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-500">
                          Mais popular
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      Apareça no topo do feed por {plano.dias} dias
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    <p className="font-display text-lg font-black text-brand-500">{plano.precoLabel}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={confirmar}
            className="btn-primary flex-1 disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
