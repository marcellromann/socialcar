import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-outline">
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 18%, rgba(170,255,0,0.22), transparent 45%), radial-gradient(circle at 82% 0%, rgba(170,255,0,0.12), transparent 40%)',
        }}
        aria-hidden
      />
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="max-w-3xl">
          <span className="section-eyebrow">Marketplace automotivo</span>
          <h1 className="display-tight mt-3 text-5xl font-black sm:text-7xl">
            Seu próximo carro <br className="hidden sm:block" />
            <span className="text-brand-500">no seu feed</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-400 sm:text-lg">
            Milhares de anúncios de carros, motos e comerciais — direto de quem vende.
            Encontre, compare e feche negócio sem complicação.
          </p>

          <form
            action="/"
            className="mt-8 flex w-full max-w-2xl items-center gap-2 rounded-md border border-outline bg-card p-2 shadow-lg shadow-black/40"
          >
            <div className="flex flex-1 items-center gap-2 px-2">
              <SearchIcon className="h-5 w-5 text-slate-500" />
              <input
                type="search"
                name="q"
                placeholder="Buscar por marca, modelo ou cidade..."
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-primary px-6">
              Buscar
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-display font-semibold uppercase tracking-wider text-slate-500">Populares:</span>
            {['Honda Civic', 'Toyota Hilux', 'Jeep Compass', 'VW Nivus'].map((t) => (
              <Link
                key={t}
                href={`/?q=${encodeURIComponent(t)}`}
                className="rounded-full border border-outline bg-card px-3 py-1 font-semibold uppercase tracking-wide text-slate-300 transition hover:border-brand-500 hover:text-brand-500"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
