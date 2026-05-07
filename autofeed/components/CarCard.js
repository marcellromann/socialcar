import Link from 'next/link';
import { formatKm, formatPrice } from '@/lib/format';

export default function CarCard({ listing, featured = false }) {
  const cover = listing.photos?.[0];

  return (
    <Link
      href={`/anuncios/${listing.id}`}
      className="card group overflow-hidden transition hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/10"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-elevated">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm uppercase tracking-wide text-slate-500">
            Sem foto
          </div>
        )}

        {featured && (
          <span className="absolute left-2 top-2 rounded bg-brand-500 px-2 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-widest text-black">
            Destaque
          </span>
        )}

        {typeof listing.views === 'number' && listing.views > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
            {listing.views} {listing.views === 1 ? 'view' : 'views'}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display line-clamp-1 text-lg font-bold uppercase tracking-tight text-white">
          {listing.title}
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          {listing.brand} {listing.model} · {listing.year}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display text-2xl font-extrabold text-brand-500">
            {formatPrice(listing.price)}
          </span>
          <span className="text-xs uppercase tracking-wide text-slate-500">{formatKm(listing.km)}</span>
        </div>
        {(listing.city || listing.state) && (
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
            {[listing.city, listing.state].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  );
}
