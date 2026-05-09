import { supabase } from '@/lib/supabase';
import Feed from '@/components/Feed';
import TopBar from '@/components/TopBar';

export const revalidate = 0;

const FEED_FIELDS =
  'id, marca, modelo, ano, versao, km, preco, cidade, estado, foto_principal_url, verificado, created_at';

async function fetchFeed() {
  const { data, error } = await supabase
    .from('listings_public')
    .select(FEED_FIELDS)
    .eq('status', 'ativo')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    const fb = await supabase
      .from('listings')
      .select(FEED_FIELDS)
      .order('created_at', { ascending: false })
      .limit(30);
    return fb.data ?? [];
  }
  return data ?? [];
}

export default async function HomePage() {
  const listings = await fetchFeed();

  return (
    <>
      <TopBar title="Feed" />
      <Feed initialListings={listings} />
    </>
  );
}
