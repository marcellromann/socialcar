'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import PasswordInput from '@/components/PasswordInput';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function EntrarPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen-mobile place-items-center text-slate-400">Carregando…</div>}>
      <EntrarForm />
    </Suspense>
  );
}

function EntrarForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message || 'Não foi possível entrar.');
      setSubmitting(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen-mobile flex flex-col px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo size="md" />
        <Link href="/cadastro" className="text-xs font-bold uppercase tracking-wide text-brand-500">
          Criar conta
        </Link>
      </header>

      <div className="flex-1">
        <h1 className="display-tight text-4xl font-extrabold">Entrar</h1>
        <p className="mt-1 text-sm text-slate-400">Acesse sua conta SocialCar.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary mt-2 w-full" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>

      <footer className="pt-6 text-center text-xs text-slate-400">
        Não tem conta?{' '}
        <Link href="/cadastro" className="font-bold text-brand-500">Cadastre-se</Link>
      </footer>
    </main>
  );
}
