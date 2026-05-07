import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import CarCard from '@/components/CarCard';
import Categories from '@/components/Categories';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import CtaBanner from '@/components/CtaBanner';

export const revalidate = 0;

const LISTING_FIELDS = 'id, title, brand, model, year, km, price, city, state, photos, views, created_at';

async function fetchListings() {
  const [topQuery, recentQuery] = await Promise.all([
    supabase
      .from('listings')
      .select(LISTING_FIELDS)
      .order('views', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('listings')
      .select(LISTING_FIELDS)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  if (topQuery.error) console.error('Erro top:', topQuery.error.message);
  if (recentQuery.error) console.error('Erro recentes:', recentQuery.error.message);

  return {
    top: topQuery.data ?? [],
    recent: recentQuery.data ?? [],
  };
}

export default async function HomePage() {
  const { top, recent } = await fetchListings();

  return (
    <>
      <Hero />

      <Categories />

      <Section
        eyebrow="Mais buscados"
        title="Os destaques da semana"
        subtitle="Os anúncios com mais visualizações"
        listings={top}
        emptyMessage="Os destaques aparecem aqui assim que houver visualizações."
        featuredFirst
      />

      <HowItWorks />

      <Section
        eyebrow="Acabaram de chegar"
        title="Anúncios recentes"
        subtitle="Selecionados a dedo pra você"
        listings={recent}
        emptyMessage="Nenhum anúncio cadastrado ainda."
        cta
      />

      <CtaBanner />
    </>
  );
}

function Section({ eyebrow, title, subtitle, listings, emptyMessage, cta, featuredFirst }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
          <h2 className="section-title mt-1">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {cta && (
          <Link href="/anuncios/novo" className="btn-secondary hidden sm:inline-flex">
            Anunciar carro
          </Link>
        )}
      </div>

      {listings.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-400">{emptyMessage}</p>
          {cta && (
            <Link href="/anuncios/novo" className="btn-primary mt-4">
              Criar o primeiro anúncio
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing, idx) => (
            <CarCard
              key={listing.id}
              listing={listing}
              featured={featuredFirst && idx < 2}
            />
          ))}
        </div>
      )}
    </section>
  );
}
