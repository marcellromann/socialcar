import Link from 'next/link';

export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { box: 'h-7 w-7 text-base', text: 'text-xl' },
    md: { box: 'h-9 w-9 text-lg', text: 'text-2xl' },
    lg: { box: 'h-12 w-12 text-xl', text: 'text-3xl' },
  };
  const s = sizes[size] || sizes.md;

  return (
    <Link href="/" className="flex items-center gap-2">
      <span className={`grid ${s.box} place-items-center rounded-md bg-brand-500 font-display font-black uppercase text-black shadow-md shadow-brand-500/20`}>
        S
      </span>
      <span className={`font-display font-extrabold uppercase tracking-tight text-white ${s.text}`}>
        Social<span className="text-brand-500">Car</span>
      </span>
    </Link>
  );
}
