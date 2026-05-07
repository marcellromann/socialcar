import Link from 'next/link';

export const metadata = { title: 'Entrar · Autofeed' };

export default function EntrarPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Entrar</h1>
        <p className="mt-3 text-sm text-slate-400">
          O login chega na próxima versão do Autofeed. Por enquanto qualquer pessoa pode publicar anúncios sem cadastro.
        </p>
        <Link href="/anuncios/novo" className="btn-primary mt-6 w-full">
          Anunciar carro
        </Link>
        <Link href="/" className="btn-ghost mt-2 w-full">
          Voltar para a home
        </Link>
      </div>
    </div>
  );
}
