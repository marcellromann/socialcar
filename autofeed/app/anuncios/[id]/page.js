import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatDate, formatKm, formatPrice } from '@/lib/format';
import Gallery from './Gallery';

export const revalidate = 0;

async function fetchListing(id) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Erro ao carregar anúncio:', error.message);
    return null;
  }
  return data;
}

async function trackView(id) {
  const { error } = await supabase.rpc('increment_listing_views', { p_id: id });
  if (error) console.warn('Não foi possível incrementar views:', error.message);
}

const TRANSMISSION_LABEL = {
  manual: 'Manual',
  automatica: 'Automática',
  'semi-automatica': 'Semi-automática',
  cvt: 'CVT',
};

const FUEL_LABEL = {
  gasolina: 'Gasolina',
  etanol: 'Etanol',
  flex: 'Flex',
  diesel: 'Diesel',
  eletrico: 'Elétrico',
  hibrido: 'Híbrido',
};

export default async function ListingDetailsPage({ params }) {
  const listing = await fetchListing(params.id);
  if (!listing) notFound();

  trackView(params.id);

  const specs = [
    { label: 'Marca', value: listing.brand },
    { label: 'Modelo', value: listing.model },
    { label: 'Ano', value: listing.year },
    { label: 'Quilometragem', value: formatKm(listing.km) },
    { label: 'Câmbio', value: TRANSMISSION_LABEL[listing.transmission] || '—' },
    { label: 'Combustível', value: FUEL_LABEL[listing.fuel] || '—' },
    { label: 'Cor', value: listing.color || '—' },
    {
      label: 'Localização',
      value: [listing.city, listing.state].filter(Boolean).join(' · ') || '—',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm font-medium text-brand-500 hover:underline">
          ← Voltar para anúncios
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Gallery photos={listing.photos || []} title={listing.title} />

          <div className="card mt-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">{listing.title}</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Publicado em {formatDate(listing.created_at)}
                </p>
              </div>
              {typeof listing.views === 'number' && (
                <span className="chip">
                  {listing.views} {listing.views === 1 ? 'visualização' : 'visualizações'}
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {specs.map((s) => (
                <div key={s.label} className="rounded-lg border border-outline bg-page p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    {s.label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {listing.description && (
              <div className="mt-6">
                <h2 className="text-base font-semibold text-white">Descrição</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                  {listing.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="card sticky top-20 p-6">
            <p className="text-sm text-slate-400">Preço</p>
            <p className="text-3xl font-bold text-brand-500">
              {formatPrice(listing.price)}
            </p>

            <hr className="my-5 border-outline" />

            <h3 className="text-sm font-semibold text-white">
              Falar com o vendedor
            </h3>
            <p className="mt-2 text-sm text-slate-300">{listing.contact_name}</p>

            <a
              href={`tel:${listing.contact_phone}`}
              className="btn-primary mt-3 w-full"
            >
              {listing.contact_phone}
            </a>

            {listing.contact_email && (
              <a
                href={`mailto:${listing.contact_email}`}
                className="btn-secondary mt-2 w-full"
              >
                Enviar e-mail
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
