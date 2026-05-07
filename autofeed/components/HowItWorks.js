const STEPS = [
  {
    n: '01',
    title: 'Crie sua conta',
    desc: 'Cadastre-se em segundos e tenha acesso a milhares de anúncios em todo o Brasil.',
  },
  {
    n: '02',
    title: 'Busque e compare',
    desc: 'Use filtros por marca, modelo, preço e cidade para encontrar o carro ideal.',
  },
  {
    n: '03',
    title: 'Fale direto',
    desc: 'Converse direto com quem vende. Sem intermediários, sem taxas escondidas.',
  },
  {
    n: '04',
    title: 'Feche negócio',
    desc: 'Combine condições, faça a vistoria e leve seu próximo carro pra casa.',
  },
];

export default function HowItWorks() {
  return (
    <section className="border-y border-outline bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 max-w-2xl">
          <span className="section-eyebrow">Como funciona</span>
          <h2 className="section-title mt-1">Em 4 passos simples</h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            Da primeira busca até a chave na mão, sem complicação.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="card relative overflow-hidden p-6 transition hover:border-brand-500/60"
            >
              <span className="font-display absolute -right-2 -top-3 select-none text-7xl font-black leading-none text-brand-500/10">
                {s.n}
              </span>
              <span className="font-display inline-block text-sm font-bold uppercase tracking-widest text-brand-500">
                Passo {s.n}
              </span>
              <h3 className="font-display mt-2 text-2xl font-extrabold uppercase tracking-tight text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-slate-400">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
