-- ============================================================================
-- SocialCar — schema (idempotente)
-- Rode em: Supabase Dashboard > SQL Editor > New query > Run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Helper: id do app-user a partir do auth.uid() (Supabase Auth → public.users)
-- ----------------------------------------------------------------------------
create or replace function public.current_user_id() returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid() limit 1;
$$;
revoke all on function public.current_user_id() from public;
grant execute on function public.current_user_id() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- USERS (perfil público + tipo)
-- ----------------------------------------------------------------------------
do $$ begin
  create type user_kind as enum ('comprador', 'vendedor', 'ambos');
exception when duplicate_object then null; end $$;

create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid unique,
  email       text unique not null,
  nome        text,
  tipo        user_kind not null default 'comprador',
  created_at  timestamptz not null default now()
);

create index if not exists users_auth_id_idx on public.users (auth_id);

-- ----------------------------------------------------------------------------
-- BUYER_PROFILES (questionário do comprador)
-- ----------------------------------------------------------------------------
create table if not exists public.buyer_profiles (
  user_id              uuid primary key references public.users(id) on delete cascade,
  tem_carro            boolean,
  carro_atual          jsonb,                       -- { marca, modelo, ano }
  categorias_buscadas  text[] default '{}',         -- hatch, sedan, suv, caminhonete, eletrico, moto
  faixa_preco          text,                        -- ate_50k, 50k_100k, 100k_150k, 150k_200k, acima_200k
  combustivel          text,                        -- flex, diesel, eletrico, hibrido, tanto_faz
  estado               text,
  pretende_financiar   text,                        -- sim, a_vista, nao_sei
  updated_at           timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- LISTINGS (anúncios — placa armazenada como hash)
-- ----------------------------------------------------------------------------
do $$ begin
  create type listing_status as enum ('rascunho', 'em_analise', 'ativo', 'pausado');
exception when duplicate_object then null; end $$;

create table if not exists public.listings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references public.users(id) on delete set null,
  placa_hash         text unique not null,
  marca              text not null,
  modelo             text not null,
  ano                int  not null check (ano between 1900 and 2100),
  versao             text,
  km                 int  not null check (km >= 0),
  preco              numeric(12,2) not null check (preco >= 0),
  combustivel        text check (combustivel in ('gasolina','etanol','flex','diesel','eletrico','hibrido')),
  cambio             text check (cambio in ('manual','automatica','semi-automatica','cvt')),
  cor                text,
  descricao          text,
  acessorios         text[] default '{}',
  cidade             text,
  estado             text,
  foto_principal_url text,
  status             listing_status not null default 'rascunho',
  verificado         boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists listings_status_idx     on public.listings (status);
create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_user_id_idx    on public.listings (user_id);

-- Mantém a check de combustivel sincronizada em tabelas já existentes.
do $$ begin
  alter table public.listings drop constraint if exists listings_combustivel_check;
  alter table public.listings add constraint listings_combustivel_check
    check (combustivel in ('gasolina','etanol','flex','diesel','eletrico','hibrido'));
end $$;

-- ----------------------------------------------------------------------------
-- LISTING_PHOTOS (galeria de fotos de cada anúncio)
-- Limite por anúncio: mínimo 3, máximo 15 (validado no frontend).
-- ----------------------------------------------------------------------------
create table if not exists public.listing_photos (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  url         text not null,
  ordem       int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists listing_photos_listing_idx on public.listing_photos (listing_id, ordem);

-- ----------------------------------------------------------------------------
-- INTERESTS (swipe direita / botão "tenho interesse")
-- ----------------------------------------------------------------------------
create table if not exists public.interests (
  id          uuid primary key default gen_random_uuid(),
  buyer_id    uuid not null references public.users(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (buyer_id, listing_id)
);

create index if not exists interests_listing_idx on public.interests (listing_id);
create index if not exists interests_buyer_idx   on public.interests (buyer_id);

-- ----------------------------------------------------------------------------
-- CHATS + MESSAGES
-- ----------------------------------------------------------------------------
create table if not exists public.chats (
  id          uuid primary key default gen_random_uuid(),
  buyer_id    uuid not null references public.users(id) on delete cascade,
  seller_id   uuid not null references public.users(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (buyer_id, seller_id, listing_id)
);

create index if not exists chats_buyer_idx  on public.chats (buyer_id);
create index if not exists chats_seller_idx on public.chats (seller_id);

-- Marcação de leitura por lado (para badge de não lidas no /chats)
alter table public.chats
  add column if not exists last_read_buyer_at  timestamptz default '-infinity',
  add column if not exists last_read_seller_at timestamptz default '-infinity';

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references public.chats(id) on delete cascade,
  sender_id   uuid not null references public.users(id) on delete cascade,
  texto       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists messages_chat_created_idx on public.messages (chat_id, created_at);

-- ----------------------------------------------------------------------------
-- LISTING_EVENTS (telemetria de view/interest/pass/save no feed)
-- ----------------------------------------------------------------------------
do $$ begin
  create type listing_event_kind as enum ('view', 'interest', 'pass', 'save');
exception when duplicate_object then null; end $$;

create table if not exists public.listing_events (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  user_id     uuid references public.users(id) on delete set null,
  tipo        listing_event_kind not null,
  created_at  timestamptz not null default now()
);

create index if not exists listing_events_listing_tipo_idx
  on public.listing_events (listing_id, tipo, created_at desc);
create index if not exists listing_events_user_idx
  on public.listing_events (user_id, created_at desc);

alter table public.listing_events enable row level security;

drop policy if exists "listing_events_insert_anyone" on public.listing_events;
create policy "listing_events_insert_anyone"
  on public.listing_events for insert with check (true);

drop policy if exists "listing_events_select_owner" on public.listing_events;
create policy "listing_events_select_owner"
  on public.listing_events for select
  using (
    listing_id in (
      select id from public.listings where user_id = public.current_user_id()
    )
  );

-- ----------------------------------------------------------------------------
-- VIEW pública de anúncios (NUNCA expõe placa)
-- ----------------------------------------------------------------------------
create or replace view public.listings_public as
  select
    id, user_id, marca, modelo, ano, versao, km, preco, combustivel, cambio,
    cor, descricao, acessorios, cidade, estado, foto_principal_url,
    status, verificado, created_at, updated_at
  from public.listings;

-- ----------------------------------------------------------------------------
-- RPC: criar anúncio com checagem de placa duplicada e rate limit (10/usuário)
-- ----------------------------------------------------------------------------
create or replace function public.create_listing_safe(
  p_user_id uuid,
  p_placa_hash text,
  p_marca text,
  p_modelo text,
  p_ano int,
  p_versao text,
  p_km int,
  p_preco numeric,
  p_combustivel text,
  p_cambio text,
  p_cor text,
  p_descricao text,
  p_foto_principal_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_id    uuid;
begin
  if exists (select 1 from public.listings where placa_hash = p_placa_hash) then
    raise exception 'PLACA_DUPLICADA' using errcode = '23505';
  end if;

  select count(*) into v_count from public.listings where user_id = p_user_id;
  if v_count >= 10 then
    raise exception 'RATE_LIMIT' using errcode = 'P0001';
  end if;

  insert into public.listings (
    user_id, placa_hash, marca, modelo, ano, versao, km, preco,
    combustivel, cambio, cor, descricao, foto_principal_url, status, verificado
  ) values (
    p_user_id, p_placa_hash, p_marca, p_modelo, p_ano, p_versao, p_km, p_preco,
    p_combustivel, p_cambio, p_cor, p_descricao, p_foto_principal_url, 'em_analise', true
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_listing_safe(
  uuid, text, text, text, int, text, int, numeric, text, text, text, text, text
) from public;
grant execute on function public.create_listing_safe(
  uuid, text, text, text, int, text, int, numeric, text, text, text, text, text
) to anon, authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.users           enable row level security;
alter table public.buyer_profiles  enable row level security;
alter table public.listings        enable row level security;
alter table public.listing_photos  enable row level security;
alter table public.interests       enable row level security;
alter table public.chats           enable row level security;
alter table public.messages        enable row level security;
alter table public.listing_events  enable row level security;

-- USERS: dono lê e atualiza, qualquer um insere o próprio registro
drop policy if exists "users_self_read"   on public.users;
drop policy if exists "users_self_write"  on public.users;
drop policy if exists "users_open_insert" on public.users;
create policy "users_self_read"   on public.users for select using (true);
create policy "users_open_insert" on public.users for insert with check (true);
create policy "users_self_write"  on public.users for update using (true);

-- BUYER PROFILES:
--   - dono lê/escreve o próprio perfil
--   - vendedor lê o perfil de quem deu interesse em algum dos anúncios dele
drop policy if exists "buyer_profiles_rw"            on public.buyer_profiles;
drop policy if exists "buyer_profiles_select"        on public.buyer_profiles;
drop policy if exists "buyer_profiles_insert_self"   on public.buyer_profiles;
drop policy if exists "buyer_profiles_update_self"   on public.buyer_profiles;

create policy "buyer_profiles_select"
  on public.buyer_profiles for select
  using (
    user_id = public.current_user_id()
    or user_id in (
      select i.buyer_id
      from public.interests i
      join public.listings l on l.id = i.listing_id
      where l.user_id = public.current_user_id()
    )
  );

create policy "buyer_profiles_insert_self"
  on public.buyer_profiles for insert
  with check (user_id = public.current_user_id());

create policy "buyer_profiles_update_self"
  on public.buyer_profiles for update
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- LISTINGS: leitura pública (placa nunca aparece na view), escrita liberada na v1
drop policy if exists "listings_select_public" on public.listings;
drop policy if exists "listings_insert_public" on public.listings;
drop policy if exists "listings_update_public" on public.listings;
create policy "listings_select_public" on public.listings for select using (true);
create policy "listings_insert_public" on public.listings for insert with check (true);
create policy "listings_update_public" on public.listings for update using (true);

-- LISTING PHOTOS: leitura pública, inserção liberada
drop policy if exists "listing_photos_rw" on public.listing_photos;
create policy "listing_photos_rw" on public.listing_photos for all using (true) with check (true);

-- INTERESTS:
--   - comprador insere e lê os próprios interesses
--   - vendedor lê interesses dos próprios anúncios
drop policy if exists "interests_rw"                  on public.interests;
drop policy if exists "interests_select_self_or_seller" on public.interests;
drop policy if exists "interests_insert_self"         on public.interests;
create policy "interests_select_self_or_seller"
  on public.interests for select
  using (
    buyer_id = public.current_user_id()
    or listing_id in (
      select id from public.listings where user_id = public.current_user_id()
    )
  );
create policy "interests_insert_self"
  on public.interests for insert
  with check (buyer_id = public.current_user_id());

-- CHATS / MESSAGES: participantes leem e escrevem
drop policy if exists "chats_rw"        on public.chats;
drop policy if exists "chats_select"    on public.chats;
drop policy if exists "chats_insert"    on public.chats;
drop policy if exists "chats_update"    on public.chats;
drop policy if exists "messages_rw"     on public.messages;
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;

create policy "chats_select" on public.chats for select using (
  buyer_id = public.current_user_id() or seller_id = public.current_user_id()
);
create policy "chats_insert" on public.chats for insert with check (
  buyer_id = public.current_user_id() or seller_id = public.current_user_id()
);
create policy "chats_update" on public.chats for update using (
  buyer_id = public.current_user_id() or seller_id = public.current_user_id()
);

create policy "messages_select" on public.messages for select using (
  chat_id in (
    select id from public.chats
    where buyer_id = public.current_user_id() or seller_id = public.current_user_id()
  )
);
create policy "messages_insert" on public.messages for insert with check (
  sender_id = public.current_user_id()
  and chat_id in (
    select id from public.chats
    where buyer_id = public.current_user_id() or seller_id = public.current_user_id()
  )
);

-- ============================================================================
-- STORAGE: bucket público para fotos
-- Crie em: Storage > New bucket > nome `listing-photos`, marque Public bucket.
-- ============================================================================
drop policy if exists "listing_photos_public_read"  on storage.objects;
drop policy if exists "listing_photos_anon_insert"  on storage.objects;

create policy "listing_photos_public_read"
  on storage.objects for select
  using ( bucket_id = 'listing-photos' );

create policy "listing_photos_anon_insert"
  on storage.objects for insert
  with check ( bucket_id = 'listing-photos' );
