import Link from 'next/link';

export default function Logo({ size = 'md', href = '/' }) {
  const sizes = {
    sm: { box: 'h-7 w-7', icon: 14, text: 'text-lg' },
    md: { box: 'h-8 w-8', icon: 16, text: 'text-xl' },
    lg: { box: 'h-10 w-10', icon: 20, text: 'text-2xl' },
  };
  const s = sizes[size] || sizes.md;

  const Inner = (
    <span className="flex items-center gap-1.5">
      <span className={`grid ${s.box} place-items-center rounded-lg bg-brand-500 text-black shadow-sm shadow-brand-500/30`}>
        <CarIcon size={s.icon} />
      </span>
      <span className={`font-display font-extrabold uppercase leading-none tracking-tight ${s.text}`}>
        <span className="text-white">S</span>
        <span className="text-brand-500">C</span>
      </span>
    </span>
  );

  return href ? <Link href={href} aria-label="SocialCar">{Inner}</Link> : Inner;
}

function CarIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13h18l-2-5a3 3 0 0 0-2.8-2H7.8A3 3 0 0 0 5 8l-2 5Z" />
      <path d="M3 13v4h2v-2h14v2h2v-4" />
      <circle cx="7.5" cy="16" r="1.4" fill="currentColor" />
      <circle cx="16.5" cy="16" r="1.4" fill="currentColor" />
    </svg>
  );
}
