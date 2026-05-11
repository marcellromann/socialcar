'use client';

import { useEffect, useState } from 'react';
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
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState({
    tem_carro: null,
    carro_atual: { marca: '', modelo: '', ano: '' },
    categorias_buscadas: [],
    faixa_preco: '',
    combustivel: [],
    estado: '',
    pretende_financiar: '',
  });

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancel) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!userData?.id || cancel) return;

      const { data: existing } = await supabase
        .from('buyer_profiles')
        .select('*')
        .eq('user_id', userData.id)
        .maybeSingle();

      if (!existing || cancel) return;

      const carroExistente = existing.carro_atual;
      const temDadosCarro = carroExistente && (carroExistente.marca || carroExistente.modelo || carroExistente.ano);

      setData({
        tem_carro: existing.tem_carro,
        carro_atual: temDadosCarro
          ? {
              marca: carroExistente.marca || '',
              modelo: carroExistente.modelo || '',
              ano: carroExistente.ano || '',
            }
          : { marca: '', modelo: '', ano: '' },
        categorias_buscadas: existing.categorias_buscadas || [],
        faixa_preco: existing.faixa_preco || '',
        combustivel: Array.isArray(existing.combustivel)
          ? existing.combustivel
          : existing.combustivel ? [existing.combustivel] : [],
        estado: existing.estado || '',
        pretende_financiar: existing.pretende_financiar || '',
      });
    })();
    return () => { cancel = true; };
  }, []);

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

  function toggleCombustivel(id) {
    setData((d) => {
      const current = d.combustivel;
      if (id === 'tanto_faz') {
        return { ...d, combustivel: current.includes('tanto_faz') ? [] : ['tanto_faz'] };
      }
      const without = current.filter((c) => c !== 'tanto_faz');
      return {
        ...d,
        combustivel: without.includes(id)
          ? without.filter((c) => c !== id)
          : [...without, id],
      };
    });
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
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErrorMsg('Sessão expirada. Faça login novamente.'); setSaving(false); return; }

      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      console.log('[onboarding] userData:', userData, 'erro:', userErr);

      const userId = userData?.id || appUser?.id;
      if (!userId) { setErrorMsg('Não foi possível identificar o usuário.'); setSaving(false); return; }

      console.log('[onboarding] carro_atual value:', data.carro_atual)

      const payload = {
        user_id: userId,
        tem_carro: data.tem_carro,
        carro_atual: data.tem_carro && (data.carro_atual?.marca || data.carro_atual?.modelo)
          ? data.carro_atual
          : null,
        categorias_buscadas: data.categorias_buscadas,
        faixa_preco: data.faixa_preco || null,
        combustivel: data.combustivel || [],
        estado: data.estado || null,
        pretende_financiar: data.pretende_financiar || null,
        updated_at: new Date().toISOString(),
      };
      console.log('[onboarding] payload:', payload);

      const { data: existing, error: existingErr } = await supabase
        .from('buyer_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('[onboarding] existing:', existing, 'erro:', existingErr);

      if (existing?.user_id) {
        const { data: updateData, error: updateError } = await supabase
          .from('buyer_profiles')
          .update(payload)
          .eq('user_id', userId)
          .select();
        console.log('[onboarding] UPDATE resultado:', updateData, updateError);
        if (updateError) {
          setErrorMsg(`Erro ao atualizar: ${updateError.message}`);
          setSaving(false);
          return;
        }
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('buyer_profiles')
          .insert(payload)
          .select();
        console.log('[onboarding] INSERT resultado:', insertData, insertError);
        if (insertError) {
          setErrorMsg(`Erro ao inserir: ${insertError.message}`);
          setSaving(false);
          return;
        }
      }

      setSuccessMsg('Preferências salvas!');
      setTimeout(() => router.replace('/perfil'), 900);
    } catch (e) {
      console.error('[onboarding] exceção em finish:', e);
      setErrorMsg(`Erro inesperado: ${e?.message || e}`);
      setSaving(false);
    }
  }

  const canAdvance = (() => {
    switch (step) {
      case 1: return data.tem_carro !== null;
      case 2: return data.carro_atual.marca && data.carro_atual.modelo;
      case 3: return data.categorias_buscadas.length > 0;
      case 4: return !!data.faixa_preco;
      case 5: return data.combustivel.length > 0;
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
          <Question label="Qual a faixa de preço?">
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
          <Question label="Prefere qual combustível?" hint="Pode marcar mais de um. &quot;Tanto faz&quot; desmarca os outros.">
            <div className="grid grid-cols-2 gap-2">
              {COMBUSTIVEIS_PERFIL.map((c) => (
                <Choice key={c.id} active={data.combustivel.includes(c.id)} onClick={() => toggleCombustivel(c.id)}>
                  {c.label}
                </Choice>
              ))}
            </div>
          </Question>
        )}

        {step === 6 && (
          <Question label="Em qual estado você mora?">
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

      {successMsg && (
        <p className="mt-3 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-center text-sm font-semibold text-brand-500">
          {successMsg}
        </p>
      )}
      {errorMsg && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs font-semibold text-red-300">
          {errorMsg}
        </p>
      )}
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
          <button type="button" className="btn-primary flex-1" onClick={finish} disabled={!canAdvance || saving || !!successMsg}>
            {saving ? 'Salvando…' : successMsg ? 'Salvo!' : 'Concluir'}
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
