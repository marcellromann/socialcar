import Link from 'next/link';

export const metadata = { title: 'Cadastrar · Autofeed' };

export default function CadastroPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Criar conta</h1>
        <p className="mt-3 text-sm text-slate-400">
          O cadastro de usuário chega na próxima versão. Hoje você já pode publicar anúncios sem precisar de uma conta.
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
