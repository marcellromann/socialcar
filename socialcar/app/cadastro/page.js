'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import PasswordInput from '@/components/PasswordInput';
import { supabase } from '@/lib/supabase';

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null); setInfo(null);

    if (form.password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { nome: form.nome },
      },
    });
    console.log('[Cadastro] signUp →', { user: data?.user, session: !!data?.session, error: err });
    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }

    // Cria o registro em public.users (vincula auth_id)
    const userId = data?.user?.id;
    if (userId) {
      const { data: existing, error: lookupErr } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userId)
        .maybeSingle();
      console.log('[Cadastro] users lookup existente →', { existing, error: lookupErr });

      if (!existing) {
        const insertPayload = {
          auth_id: userId,
          email: form.email,
          nome: form.nome,
        };
        console.log('[Cadastro] inserindo public.users:', insertPayload);
        const { data: inserted, error: insertErr } = await supabase
          .from('users')
          .insert(insertPayload)
          .select('id, auth_id, email, nome')
          .single();
        console.log('[Cadastro] resultado insert public.users:', { inserted, error: insertErr });
        if (insertErr) {
          // 23505 = unique_violation. Pode acontecer se o AuthProvider
          // (onAuthStateChange) já tiver inserido em paralelo. Não é erro real.
          if (insertErr.code === '23505') {
            console.log('[Cadastro] insert em paralelo detectado — registro já existe');
          } else {
            setError(`Falha ao criar perfil: ${insertErr.message}`);
            setSubmitting(false);
            return;
          }
        }
      } else {
        console.log('[Cadastro] já existia em public.users — id:', existing.id);
      }
    } else {
      console.warn('[Cadastro] signUp não retornou user.id — registro em public.users NÃO criado');
    }

    if (!data.session) {
      // Confirmação de email habilitada no Supabase
      setInfo('Enviamos um e-mail de confirmação. Verifique sua caixa de entrada para ativar a conta.');
      setSubmitting(false);
      return;
    }

    router.replace('/onboarding');
    router.refresh();
  }

  return (
    <main className="min-h-screen-mobile flex flex-col px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo size="md" />
        <Link href="/entrar" className="text-xs font-bold uppercase tracking-wide text-brand-500">
          Já tenho conta
        </Link>
      </header>

      <div className="flex-1">
        <h1 className="display-tight text-4xl font-extrabold">Criar conta</h1>
        <p className="mt-1 text-sm text-slate-400">Cadastre-se para começar a usar a SocialCar.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="label" htmlFor="nome">Nome</label>
            <input id="nome" required className="input" value={form.nome} onChange={update('nome')} />
          </div>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" required className="input"
              value={form.email} onChange={update('email')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="password">Senha</label>
              <PasswordInput id="password" required minLength={6}
                value={form.password} onChange={update('password')} />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirmar</label>
              <PasswordInput id="confirm" required minLength={6}
                value={form.confirm} onChange={update('confirm')} />
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
          )}
          {info && (
            <p className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 text-sm text-brand-100">{info}</p>
          )}

          <button type="submit" className="btn-primary mt-2 w-full" disabled={submitting}>
            {submitting ? 'Criando…' : 'Criar conta'}
          </button>
        </form>
      </div>

      <footer className="pt-6 text-center text-xs text-slate-400">
        Já tem conta?{' '}
        <Link href="/entrar" className="font-bold text-brand-500">Entrar</Link>
      </footer>
    </main>
  );
}
