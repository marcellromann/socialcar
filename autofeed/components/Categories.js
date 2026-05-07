import Link from 'next/link';

const CATEGORIES = [
  { slug: 'carros', label: 'Carros', Icon: CarIcon },
  { slug: 'suvs', label: 'SUVs', Icon: SuvIcon },
  { slug: 'caminhonetes', label: 'Caminhonetes', Icon: PickupIcon },
  { slug: 'eletricos', label: 'Elétricos', Icon: BoltIcon },
  { slug: 'motos', label: 'Motos', Icon: MotorcycleIcon },
  { slug: 'comerciais', label: 'Comerciais', Icon: VanIcon },
];

export default function Categories() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <span className="section-eyebrow">Categorias</span>
          <h2 className="section-title mt-1">Encontre por tipo</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map(({ slug, label, Icon }) => (
          <Link
            key={slug}
            href={`/?cat=${slug}`}
            className="card group flex flex-col items-center gap-3 p-5 transition hover:border-brand-500 hover:bg-elevated"
          >
            <span className="grid h-14 w-14 place-items-center rounded-md bg-brand-500/10 text-brand-500 transition group-hover:bg-brand-500 group-hover:text-black">
              <Icon className="h-7 w-7" />
            </span>
            <span className="font-display text-sm font-bold uppercase tracking-wide text-slate-100">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function CarIcon({ className }) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M3 14l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 9l2 5" />
      <path d="M3 14h18v4a1 1 0 0 1-1 1h-1a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H4a1 1 0 0 1-1-1z" />
      <path d="M7 14h10" />
    </svg>
  );
}

function SuvIcon({ className }) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M3 15l1.6-5.5A2 2 0 0 1 6.5 8h11A2 2 0 0 1 19.4 9.5L21 15" />
      <path d="M3 15h18v4h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3z" />
      <path d="M6 8V6h12v2" />
    </svg>
  );
}

function PickupIcon({ className }) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M2 15l1.5-4.5A2 2 0 0 1 5.4 9H11v6" />
      <path d="M11 11h7l3 4" />
      <path d="M2 15h19v4h-1a2 2 0 1 1-4 0H8a2 2 0 1 1-4 0H2z" />
    </svg>
  );
}

function BoltIcon({ className }) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function MotorcycleIcon({ className }) {
  return (
    <svg {...baseProps} className={className}>
      <circle cx="5.5" cy="17" r="3" />
      <circle cx="18.5" cy="17" r="3" />
      <path d="M14 6h3l2 4-3 3" />
      <path d="M5.5 17l4-7h6" />
      <path d="M9 6h2" />
    </svg>
  );
}

function VanIcon({ className }) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M3 16V8a2 2 0 0 1 2-2h9v10" />
      <path d="M14 9h4l3 4v3h-2a2 2 0 1 1-4 0H8a2 2 0 1 1-4 0H3v-3" />
      <path d="M14 13h7" />
    </svg>
  );
}
