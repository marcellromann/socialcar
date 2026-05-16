import { supabase } from '@/lib/supabase';
import Feed from '@/components/Feed';
import TopBar from '@/components/TopBar';

export const revalidate = 0;

const FEED_FIELDS =
  'id, user_id, marca, modelo, ano, versao, km, preco, cidade, estado, foto_principal_url, verificado, created_at, destaque, destaque_expira_em';

async function fetchFeed() {
  const { data, error } = await supabase
    .from('listings_public')
    .select(FEED_FIELDS)
    .eq('status', 'ativo')
    .order('destaque', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30);

  let listings = data ?? [];
  if (error) {
    const fb = await supabase
      .from('listings')
      .select(FEED_FIELDS)
      .order('destaque', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30);
    listings = fb.data ?? [];
  }

  const sellerIds = [...new Set(listings.map((l) => l.user_id).filter(Boolean))];
  if (sellerIds.length) {
    const { data: sellers } = await supabase
      .from('users')
      .select('id, last_seen_at')
      .in('id', sellerIds);
    const byId = new Map((sellers || []).map((s) => [s.id, s.last_seen_at]));
    listings = listings.map((l) => ({ ...l, seller_last_seen_at: byId.get(l.user_id) || null }));
  }

  return listings;
}

export default async function HomePage() {
  const listings = await fetchFeed();

  return (
    <>
      <TopBar title="Início" />
      <Feed initialListings={listings} />
    </>
  );
}
