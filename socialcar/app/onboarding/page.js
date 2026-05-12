'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { CATEGORIAS, FAIXAS_PRECO } from '@/lib/format';

const STEPS = 4;

const MARCAS_FIPE = [
  { codigo: '1', nome: 'Acura' },
  { codigo: '2', nome: 'Agrale' },
  { codigo: '3', nome: 'Alfa Romeo' },
  { codigo: '4', nome: 'AM Gen' },
  { codigo: '5', nome: 'Asia Motors' },
  { codigo: '6', nome: 'Aston Martin' },
  { codigo: '7', nome: 'Audi' },
  { codigo: '8', nome: 'BMW' },
  { codigo: '9', nome: 'BRM' },
  { codigo: '10', nome: 'Buggy' },
  { codigo: '11', nome: 'Bugre' },
  { codigo: '12', nome: 'Cadillac' },
  { codigo: '13', nome: 'CBT Jipe' },
  { codigo: '14', nome: 'Chery' },
  { codigo: '15', nome: 'Chevrolet' },
  { codigo: '16', nome: 'Chrysler' },
  { codigo: '17', nome: 'Citroën' },
  { codigo: '18', nome: 'Cross Lander' },
  { codigo: '19', nome: 'Daewoo' },
  { codigo: '20', nome: 'Daihatsu' },
  { codigo: '21', nome: 'Dodge' },
  { codigo: '22', nome: 'Effa' },
  { codigo: '23', nome: 'Emis' },
  { codigo: '24', nome: 'Engesa' },
  { codigo: '25', nome: 'Envemo' },
  { codigo: '26', nome: 'Ferrari' },
  { codigo: '27', nome: 'Fiat' },
  { codigo: '28', nome: 'Fibravan' },
  { codigo: '29', nome: 'Ford' },
  { codigo: '30', nome: 'Fyber' },
  { codigo: '31', nome: 'Geely' },
  { codigo: '32', nome: 'GM' },
  { codigo: '33', nome: 'Gurgel' },
  { codigo: '34', nome: 'GWM' },
  { codigo: '35', nome: 'Honda' },
  { codigo: '36', nome: 'Hyundai' },
  { codigo: '37', nome: 'Isuzu' },
  { codigo: '38', nome: 'JAC' },
  { codigo: '39', nome: 'Jaguar' },
  { codigo: '40', nome: 'Jeep' },
  { codigo: '41', nome: 'Kia' },
  { codigo: '42', nome: 'Lada' },
  { codigo: '43', nome: 'Lamborghini' },
  { codigo: '44', nome: 'Land Rover' },
  { codigo: '45', nome: 'Lexus' },
  { codigo: '46', nome: 'Lifan' },
  { codigo: '47', nome: 'Mahindra' },
  { codigo: '48', nome: 'Maserati' },
  { codigo: '49', nome: 'Mazda' },
  { codigo: '50', nome: 'Mercedes-Benz' },
  { codigo: '51', nome: 'Mitsubishi' },
  { codigo: '52', nome: 'Nissan' },
  { codigo: '53', nome: 'Peugeot' },
  { codigo: '54', nome: 'Pontiac' },
  { codigo: '55', nome: 'Porsche' },
  { codigo: '56', nome: 'RAM' },
  { codigo: '57', nome: 'Renault' },
  { codigo: '58', nome: 'Rolls-Royce' },
  { codigo: '59', nome: 'Seat' },
  { codigo: '60', nome: 'Subaru' },
  { codigo: '61', nome: 'Suzuki' },
  { codigo: '62', nome: 'Toyota' },
  { codigo: '63', nome: 'Troller' },
  { codigo: '64', nome: 'Volkswagen' },
  { codigo: '65', nome: 'Volvo' },
];

const EMPTY_CARRO = { marca: '', modelo: '', ano: '' };

function capitalizeWords(s) {
  return String(s || '').replace(/(^|\s)([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

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
    carro_atual: { ...EMPTY_CARRO },
    categorias_buscadas: [],
    faixa_preco: '',
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

      const carroExistente = existing.carro_atual || {};
      setData({
        tem_carro: existing.tem_carro,
        carro_atual: {
          marca: carroExistente.marca || '',
          modelo: carroExistente.modelo || '',
          ano: carroExistente.ano || '',
        },
        categorias_buscadas: existing.categorias_buscadas || [],
        faixa_preco: existing.faixa_preco || '',
      });
    })();
    return () => { cancel = true; };
  }, []);

  function set(key, value) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function setCarroField(patch) {
    setData((d) => ({ ...d, carro_atual: { ...d.carro_atual, ...patch } }));
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
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErrorMsg('Sessão expirada. Faça login novamente.'); setSaving(false); return; }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      const userId = userData?.id || appUser?.id;
      if (!userId) { setErrorMsg('Não foi possível identificar o usuário.'); setSaving(false); return; }

      const c = data.carro_atual;
      const carroAtual = data.tem_carro && (c.marca || c.modelo)
        ? { marca: c.marca || '', modelo: c.modelo || '', ano: c.ano || '' }
        : null;

      const payload = {
        user_id: userId,
        tem_carro: data.tem_carro,
        carro_atual: carroAtual,
        categorias_buscadas: data.categorias_buscadas,
        faixa_preco: data.faixa_preco || null,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('buyer_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing?.user_id) {
        const { error } = await supabase
          .from('buyer_profiles')
          .update(payload)
          .eq('user_id', userId);
        if (error) { setErrorMsg(`Erro ao atualizar: ${error.message}`); setSaving(false); return; }
      } else {
        const { error } = await supabase
          .from('buyer_profiles')
          .insert(payload);
        if (error) { setErrorMsg(`Erro ao inserir: ${error.message}`); setSaving(false); return; }
      }

      setSuccessMsg('Preferências salvas!');
      setTimeout(() => router.replace('/perfil'), 900);
    } catch (e) {
      setErrorMsg(`Erro inesperado: ${e?.message || e}`);
      setSaving(false);
    }
  }

  const canAdvance = (() => {
    switch (step) {
      case 1: return data.tem_carro !== null;
      case 2: return !!(data.carro_atual.marca && data.carro_atual.modelo);
      case 3: return data.categorias_buscadas.length > 0;
      case 4: return !!data.faixa_preco;
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
          <Question label="Qual é o seu veículo?">
            <div className="space-y-3">
              <Field label="Marca">
                <select
                  className="input"
                  value={data.carro_atual.marca}
                  onChange={(e) => setCarroField({ marca: e.target.value })}
                >
                  <option value="">Selecionar marca</option>
                  {MARCAS_FIPE.map((m) => (
                    <option key={m.codigo} value={m.nome}>{m.nome}</option>
                  ))}
                </select>
              </Field>

              <Field label="Modelo">
                <input
                  className="input"
                  type="text"
                  placeholder="Ex: Corolla, Civic, Onix"
                  value={data.carro_atual.modelo}
                  onChange={(e) => setCarroField({ modelo: capitalizeWords(e.target.value) })}
                />
              </Field>

              <Field label="Ano">
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  placeholder="Ex: 2022"
                  min={1960}
                  max={2026}
                  value={data.carro_atual.ano}
                  onChange={(e) => setCarroField({ ano: e.target.value })}
                />
              </Field>
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
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
