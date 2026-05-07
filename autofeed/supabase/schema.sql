-- ============================================================================
-- Autofeed — schema (idempotente)
-- Rode em: Supabase Dashboard > SQL Editor > New query > Run.
-- Pode ser executado várias vezes — todas as instruções têm IF NOT EXISTS / OR REPLACE.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tabela principal de anúncios
-- ----------------------------------------------------------------------------
create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  title           text not null,
  brand           text not null,
  model           text not null,
  year            int  not null check (year between 1900 and 2100),
  km              int  not null check (km >= 0),
  price           numeric(12,2) not null check (price >= 0),
  transmission    text check (transmission in ('manual','automatica','semi-automatica','cvt')),
  fuel            text check (fuel in ('gasolina','etanol','flex','diesel','eletrico','hibrido')),
  color           text,
  city            text,
  state           text,
  description     text,
  photos          text[] not null default '{}',
  contact_name    text not null,
  contact_phone   text not null,
  contact_email   text
);

-- Coluna de visualizações (alimenta a seção "Mais buscados")
alter table public.listings
  add column if not exists views integer not null default 0;

create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_brand_model_idx on public.listings (brand, model);
create index if not exists listings_views_idx on public.listings (views desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- Sem auth na v1: leitura e inserção liberadas para o role anon.
-- Endureça quando adicionar Supabase Auth.
-- ----------------------------------------------------------------------------
alter table public.listings enable row level security;

drop policy if exists "listings_select_public" on public.listings;
create policy "listings_select_public"
  on public.listings for select
  using (true);

drop policy if exists "listings_insert_public" on public.listings;
create policy "listings_insert_public"
  on public.listings for insert
  with check (true);

-- ----------------------------------------------------------------------------
-- RPC: incrementar visualizações
-- Usa SECURITY DEFINER para que o role anon possa apenas chamar a função
-- (em vez de receber permissão geral de UPDATE na tabela).
-- ----------------------------------------------------------------------------
create or replace function public.increment_listing_views(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings set views = views + 1 where id = p_id;
$$;

revoke all on function public.increment_listing_views(uuid) from public;
grant execute on function public.increment_listing_views(uuid) to anon, authenticated;

-- ============================================================================
-- Storage: bucket público para fotos
-- Crie em: Storage > New bucket > nome `listing-photos`, marque Public bucket.
-- Em seguida rode as policies abaixo.
-- ============================================================================

drop policy if exists "listing_photos_public_read" on storage.objects;
create policy "listing_photos_public_read"
  on storage.objects for select
  using ( bucket_id = 'listing-photos' );

drop policy if exists "listing_photos_anon_insert" on storage.objects;
create policy "listing_photos_anon_insert"
  on storage.objects for insert
  with check ( bucket_id = 'listing-photos' );
