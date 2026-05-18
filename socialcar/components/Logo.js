import Link from 'next/link';

export default function Logo({ size = 'md', href = '/' }) {
  const heights = { sm: 32, md: 40, lg: 56 };
  const h = heights[size] || heights.md;

  const Inner = (
    <img
      src="/logosocialcar.png"
      alt="SocialCar"
      style={{ height: `${h}px`, width: 'auto' }}
    />
  );

  return href ? <Link href={href} aria-label="SocialCar" className="inline-flex items-center">{Inner}</Link> : Inner;
}
