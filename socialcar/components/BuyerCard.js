'use client';

import Link from 'next/link';
import { buyerAlias, computeMatch } from '@/lib/anon';
import {
  CATEGORIAS, COMBUSTIVEIS_PERFIL, FAIXAS_PRECO, FINANCIAMENTO,
} from '@/lib/format';

function lookup(arr, id) {
  return arr.find((x) => x.id === id)?.label || id;
}

export default function BuyerCard({
  buyerId,
  profile,
  listing,
  createdAt,
  href,
  startChatHref,
  showHistory,
  historyCount,
}) {
  const match = listing && profile ? computeMatch(listing, profile) : null;
  const alias = buyerAlias(buyerId);

  return (
    <article className="card p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          {href ? (
            <Link href={href} className="font-display text-lg font-black text-white hover:text-brand-500">
              {alias}
            </Link>
          ) : (
            <h3 className="font-display text-lg font-black text-white">{alias}</h3>
          )}
          {createdAt && (
            <p className="text-[11px] text-slate-500">
              Interesse {new Date(createdAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        {match != null && (
          <span className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${
            match >= 80 ? 'bg-brand-500/20 text-brand-500' :
            match >= 50 ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-slate-500/20 text-slate-300'
          }`}>
            {match}% match
          </span>
        )}
      </header>

      {profile ? (
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
          <Field label="Tem carro">
            {profile.tem_carro
              ? (profile.carro_atual?.marca
                  ? `Sim — ${profile.carro_atual.marca} ${profile.carro_atual.modelo || ''}`.trim()
                  : 'Sim')
              : 'Não'}
          </Field>
          <Field label="Estado">{profile.estado || '—'}</Field>
          <Field label="Faixa">{lookup(FAIXAS_PRECO, profile.faixa_preco) || '—'}</Field>
          <Field label="Combustível">{lookup(COMBUSTIVEIS_PERFIL, profile.combustivel) || '—'}</Field>
          <Field label="Financia">{lookup(FINANCIAMENTO, profile.pretende_financiar) || '—'}</Field>
          <Field label="Buscando">
            {(profile.categorias_buscadas || []).map((c) => lookup(CATEGORIAS, c)).join(', ') || '—'}
          </Field>
        </dl>
      ) : (
        <p className="mt-3 text-xs text-slate-400">Comprador ainda não preencheu o questionário.</p>
      )}

      {showHistory && (
        <p className="mt-3 border-t border-outline pt-3 text-xs text-slate-300">
          🔥 Curtiu <strong className="text-white">{historyCount}</strong>{' '}
          {historyCount === 1 ? 'anúncio' : 'anúncios'} seu(s)
        </p>
      )}

      {startChatHref && (
        <Link href={startChatHref} className="btn-primary mt-3 w-full text-xs">
          Iniciar conversa
        </Link>
      )}

      <p className="mt-3 text-[10px] text-slate-500">
        Os dados pessoais do comprador permanecem privados.
      </p>
    </article>
  );
}

function Field({ label, children }) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-right text-white">{children}</dd>
    </>
  );
}
