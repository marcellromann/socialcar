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

  async function signInGoogle() {
    setError(null);
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}${next || '/'}`
        : undefined;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (err) setError(err.message);
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

        <button
          type="button"
          onClick={signInGoogle}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-outline bg-card px-4 py-3 text-sm font-bold text-white active:scale-[0.98]"
        >
          <GoogleIcon /> Continuar com Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-500">
          <span className="h-px flex-1 bg-outline" /> ou <span className="h-px flex-1 bg-outline" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12Z" />
    </svg>
  );
}
