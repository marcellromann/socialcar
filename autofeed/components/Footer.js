import Link from 'next/link';
import Logo from './Logo';

const sections = [
  {
    title: 'Marketplace',
    links: [
      { href: '/', label: 'Todos os anúncios' },
      { href: '/anuncios/novo', label: 'Anunciar carro' },
      { href: '/?cat=carros', label: 'Carros' },
      { href: '/?cat=motos', label: 'Motos' },
      { href: '/?cat=eletricos', label: 'Elétricos' },
    ],
  },
  {
    title: 'Conta',
    links: [
      { href: '/entrar', label: 'Entrar' },
      { href: '/cadastro', label: 'Cadastrar' },
      { href: '/', label: 'Meus anúncios' },
      { href: '/', label: 'Favoritos' },
    ],
  },
  {
    title: 'SocialCar',
    links: [
      { href: '/', label: 'Sobre' },
      { href: '/', label: 'Como funciona' },
      { href: '/', label: 'Ajuda' },
      { href: '/', label: 'Contato' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-outline bg-page">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Logo size="md" />
            <p className="mt-4 max-w-xs text-sm text-slate-400">
              Marketplace automotivo para encontrar e anunciar carros, motos e veículos comerciais.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <SocialLink label="Instagram" Icon={InstagramIcon} />
              <SocialLink label="Facebook" Icon={FacebookIcon} />
              <SocialLink label="X" Icon={XIcon} />
              <SocialLink label="YouTube" Icon={YoutubeIcon} />
            </div>
          </div>

          {sections.map((s) => (
            <div key={s.title}>
              <h4 className="font-display text-sm font-bold uppercase tracking-widest text-white">
                {s.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {s.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-slate-400 transition hover:text-brand-500">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-outline pt-6 sm:flex-row sm:items-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            © {new Date().getFullYear()} SocialCar — Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-5 text-xs uppercase tracking-wide text-slate-500">
            <Link href="/" className="hover:text-brand-500">Termos</Link>
            <Link href="/" className="hover:text-brand-500">Privacidade</Link>
            <Link href="/" className="hover:text-brand-500">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ label, Icon }) {
  return (
    <Link
      href="/"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-md border border-outline bg-card text-slate-400 transition hover:border-brand-500 hover:text-brand-500"
    >
      <Icon className="h-4 w-4" />
    </Link>
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

function InstagramIcon({ className }) {
  return (
    <svg {...baseProps} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon({ className }) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H9v3h2v8h3v-8h2.5l.5-3H14V8z" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M4 4l16 16" />
      <path d="M20 4 4 20" />
    </svg>
  );
}

function YoutubeIcon({ className }) {
  return (
    <svg {...baseProps} className={className}>
      <rect x="2" y="6" width="20" height="12" rx="3" />
      <path d="M10 9.5v5l5-2.5-5-2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
