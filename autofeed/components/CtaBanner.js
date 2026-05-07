import Link from 'next/link';

export default function CtaBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="relative overflow-hidden rounded-lg bg-brand-500 px-6 py-12 text-black sm:px-12 sm:py-16">
        <div
          className="absolute inset-0 -z-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 90% 10%, rgba(0,0,0,0.4), transparent 50%), radial-gradient(circle at 10% 100%, rgba(0,0,0,0.25), transparent 45%)',
          }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-black/70">
              Anuncie já
            </span>
            <h2 className="font-display mt-2 text-3xl font-black uppercase leading-none tracking-tight sm:text-5xl">
              Vende mais rápido <br className="hidden sm:block" />
              quem anúncia na <span className="underline decoration-black decoration-4 underline-offset-4">SocialCar</span>.
            </h2>
            <p className="mt-3 max-w-xl text-sm font-medium text-black/80 sm:text-base">
              Publique seu anúncio em minutos e alcance milhares de compradores prontos pra fechar negócio.
            </p>
          </div>
          <Link
            href="/anuncios/novo"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-brand-500 transition hover:bg-page"
          >
            Anunciar carro
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ArrowRight({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
