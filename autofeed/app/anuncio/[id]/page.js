import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatKm, formatPrice, simulatePayment } from '@/lib/format';
import Gallery from '@/components/Gallery';
import TopBar from '@/components/TopBar';

export const revalidate = 0;

const FIELDS =
  'id, marca, modelo, ano, versao, km, preco, combustivel, cambio, cor, descricao, acessorios, cidade, estado, foto_principal_url, verificado, created_at';

async function fetchListing(id) {
  const { data, error } = await supabase
    .from('listings_public')
    .select(FIELDS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    const fb = await supabase.from('listings').select(FIELDS).eq('id', id).maybeSingle();
    return fb.data;
  }
  return data;
}

async function fetchPhotos(id) {
  const { data } = await supabase
    .from('listing_photos')
    .select('url, ordem')
    .eq('listing_id', id)
    .order('ordem', { ascending: true });
  return (data || []).map((p) => p.url);
}

export default async function ListingDetailPage({ params }) {
  const listing = await fetchListing(params.id);
  if (!listing) notFound();

  const photos = await fetchPhotos(params.id);
  const sim = simulatePayment(listing.preco);

  return (
    <>
      <TopBar title="Anúncio" back />
      <div className="page-pad space-y-5">
        <Gallery photos={photos} main={listing.foto_principal_url} />

        <div>
          <div className="flex items-center gap-2">
            {listing.verificado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                Verificado
              </span>
            )}
            <span className="chip">{listing.ano}</span>
            <span className="chip">{formatKm(listing.km)}</span>
          </div>
          <h1 className="display-tight mt-2 text-3xl font-extrabold text-white">
            {listing.marca} {listing.modelo}
          </h1>
          {listing.versao && <p className="mt-1 text-sm text-slate-400">{listing.versao}</p>}
        </div>

        <div className="card p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-400">Preço</span>
            {listing.cidade && (
              <span className="text-xs text-slate-400">
                {listing.cidade}{listing.estado ? `/${listing.estado}` : ''}
              </span>
            )}
          </div>
          <div className="mt-1 font-display text-4xl font-black text-brand-500">
            {formatPrice(listing.preco)}
          </div>
          {sim && (
            <p className="mt-2 text-xs text-slate-400">
              Entrada {formatPrice(sim.entrada)} +{' '}
              <span className="font-semibold text-white">{sim.months}x de {formatPrice(sim.parcela)}</span>
            </p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="display text-sm text-brand-500">Detalhes</h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-3 text-sm">
            <Detail label="Combustível" value={cap(listing.combustivel)} />
            <Detail label="Câmbio" value={cap(listing.cambio)} />
            <Detail label="Cor" value={listing.cor} />
            <Detail label="Ano" value={listing.ano} />
          </dl>
          {listing.descricao && (
            <p className="mt-4 whitespace-pre-line border-t border-outline pt-3 text-sm text-slate-300">
              {listing.descricao}
            </p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="display text-sm text-brand-500">Relatório SocialCar</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <Item ok>Histórico FIPE conferido</Item>
            <Item ok>Sem restrições financeiras</Item>
            <Item ok>Sem recall em aberto</Item>
            <Item ok>Placa validada e única na plataforma</Item>
          </ul>
        </div>

        <div className="grid gap-3">
          <Link
            href={`/chats/novo?listing=${listing.id}`}
            className="btn-primary w-full"
          >
            Tenho interesse — Iniciar conversa
          </Link>
          <Link href="/" className="btn-secondary w-full">
            Voltar ao feed
          </Link>
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-white">{value || '—'}</dd>
    </div>
  );
}

function Item({ children, ok }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`grid h-5 w-5 place-items-center rounded-full ${ok ? 'bg-brand-500 text-black' : 'bg-elevated text-slate-400'}`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </span>
      {children}
    </li>
  );
}

function cap(s) {
  if (!s) return null;
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}
