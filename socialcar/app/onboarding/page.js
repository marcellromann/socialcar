'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  CATEGORIAS, COMBUSTIVEIS_PERFIL, ESTADOS_BR, FAIXAS_PRECO, FINANCIAMENTO,
} from '@/lib/format';

const STEPS = 7;

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const router = useRouter();
  const { appUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    tem_carro: null,
    carro_atual: { marca: '', modelo: '', ano: '' },
    categorias_buscadas: [],
    faixa_preco: '',
    combustivel: '',
    estado: '',
    pretende_financiar: '',
  });

  function set(key, value) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function toggleCategoria(id) {
    setData((d) => ({
      ...d,
      categorias_buscadas: d.categorias_buscadas.includes(id)
        ? d.categorias_buscadas.filter((c) => c !== id)
        : [...d.categorias_buscadas, id],
    }));
  }

  function next() {
    if (step === 1 && data.tem_carro === false) { setStep(3); return; }
    setStep((s) => Math.min(STEPS, s + 1));
  }

  function back() {
    if (step === 3 && data.tem_carro === false) { setStep(1); return; }
    setStep((s) => Math.max(1, s - 1));
  }

  async function finish() {
    if (!appUser?.id) return;
    setSaving(true);
    try {
      await supabase.from('buyer_profiles').upsert({
        user_id: appUser.id,
        tem_carro: data.tem_carro,
        carro_atual: data.tem_carro ? data.carro_atual : null,
        categorias_buscadas: data.categorias_buscadas,
        faixa_preco: data.faixa_preco || null,
        combustivel: data.combustivel || null,
        estado: data.estado || null,
        pretende_financiar: data.pretende_financiar || null,
      });
    } catch {}
    router.replace('/');
  }

  const canAdvance = (() => {
    switch (step) {
      case 1: return data.tem_carro !== null;
      case 2: return data.carro_atual.marca && data.carro_atual.modelo;
      case 3: return data.categorias_buscadas.length > 0;
      case 4: return !!data.faixa_preco;
      case 5: return !!data.combustivel;
      case 6: return !!data.estado;
      case 7: return !!data.pretende_financiar;
      default: return false;
    }
  })();

  return (
    <main className="min-h-screen-mobile flex flex-col px-5 py-6">
      <div className="mb-2 flex items-center">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="grid h-10 w-10 -ml-2 place-items-center rounded-full text-white active:scale-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
      </div>

      <header className="mb-6">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.3em] text-brand-500">
          {step}/{STEPS}
        </p>
        <h1 className="display-tight mt-1 text-3xl font-extrabold">
          Queremos te conhecer melhor
        </h1>
        <div className="mt-3 h-1 rounded bg-elevated">
          <div
            className="h-full rounded bg-brand-500 transition-all"
            style={{ width: `${(step / STEPS) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex-1">
        {step === 1 && (
          <Question label="Você já tem um carro?">
            <ChoiceRow>
              <Choice active={data.tem_carro === true}  onClick={() => set('tem_carro', true)}>Sim</Choice>
              <Choice active={data.tem_carro === false} onClick={() => set('tem_carro', false)}>Não</Choice>
            </ChoiceRow>
          </Question>
        )}

        {step === 2 && (
          <Question label="Qual é o seu carro atual?">
            <div className="space-y-3">
              <input className="input" placeholder="Marca"
                value={data.carro_atual.marca}
                onChange={(e) => set('carro_atual', { ...data.carro_atual, marca: e.target.value })} />
              <input className="input" placeholder="Modelo"
                value={data.carro_atual.modelo}
                onChange={(e) => set('carro_atual', { ...data.carro_atual, modelo: e.target.value })} />
              <input className="input" type="number" placeholder="Ano"
                value={data.carro_atual.ano}
                onChange={(e) => set('carro_atual', { ...data.carro_atual, ano: e.target.value })} />
            </div>
          </Question>
        )}

        {step === 3 && (
          <Question label="O que você está buscando?" hint="Pode marcar mais de um">
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map((c) => (
                <Choice key={c.id} active={data.categorias_buscadas.includes(c.id)} onClick={() => toggleCategoria(c.id)}>
                  {c.label}
                </Choice>
              ))}
            </div>
          </Question>
        )}

        {step === 4 && (
          <Question label="Qual sua faixa de preço?">
            <div className="space-y-2">
              {FAIXAS_PRECO.map((f) => (
                <Choice key={f.id} block active={data.faixa_preco === f.id} onClick={() => set('faixa_preco', f.id)}>
                  {f.label}
                </Choice>
              ))}
            </div>
          </Question>
        )}

        {step === 5 && (
          <Question label="Prefere qual combustível?">
            <div className="grid grid-cols-2 gap-2">
              {COMBUSTIVEIS_PERFIL.map((c) => (
                <Choice key={c.id} active={data.combustivel === c.id} onClick={() => set('combustivel', c.id)}>
                  {c.label}
                </Choice>
              ))}
            </div>
          </Question>
        )}

        {step === 6 && (
          <Question label="Em qual estado você está?">
            <select className="input" value={data.estado} onChange={(e) => set('estado', e.target.value)}>
              <option value="">Selecione…</option>
              {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Question>
        )}

        {step === 7 && (
          <Question label="Você pretende financiar?">
            <div className="space-y-2">
              {FINANCIAMENTO.map((f) => (
                <Choice key={f.id} block active={data.pretende_financiar === f.id} onClick={() => set('pretende_financiar', f.id)}>
                  {f.label}
                </Choice>
              ))}
            </div>
          </Question>
        )}
      </div>

      <footer className="flex gap-3 pt-4">
        {step > 1 && (
          <button type="button" className="btn-secondary flex-1" onClick={back}>
            Voltar
          </button>
        )}
        {step < STEPS ? (
          <button type="button" className="btn-primary flex-1" onClick={next} disabled={!canAdvance}>
            Continuar
          </button>
        ) : (
          <button type="button" className="btn-primary flex-1" onClick={finish} disabled={!canAdvance || saving}>
            {saving ? 'Salvando…' : 'Concluir'}
          </button>
        )}
      </footer>
    </main>
  );
}

function Question({ label, hint, children }) {
  return (
    <div>
      <h2 className="display text-2xl text-white">{label}</h2>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function ChoiceRow({ children }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function Choice({ children, active, onClick, block }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${block ? 'w-full text-left' : ''} rounded-xl border px-4 py-3 text-sm font-semibold transition active:scale-[0.98] ${
        active
          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
          : 'border-outline bg-card text-white'
      }`}
    >
      {children}
    </button>
  );
}
