import Link from 'next/link';
import Logo from './Logo';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-outline bg-page/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/" className="btn-ghost">Anúncios</Link>
            <Link href="/anuncios/novo" className="btn-ghost">Anunciar</Link>
            <Link href="/" className="btn-ghost">Categorias</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/entrar" className="btn-ghost">Entrar</Link>
          <Link href="/cadastro" className="btn-primary">Cadastrar</Link>
        </div>
      </div>
    </header>
  );
}
