-- ============================================================================
-- SocialCar — extensão do schema para o Painel Admin (idempotente)
-- Rode em: Supabase Dashboard > SQL Editor > New query > Run.
-- Pode rodar quantas vezes precisar — todas as operações são `if not exists`
-- ou via DO blocks que ignoram duplicate_object.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS: coluna role (user | admin) e flag bloqueado
-- ----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

alter table public.users add column if not exists role user_role not null default 'user';
alter table public.users add column if not exists bloqueado boolean not null default false;

create index if not exists users_role_idx on public.users (role);

-- ----------------------------------------------------------------------------
-- PAGE_VIEWS: rastreamento de acessos ao site
-- ----------------------------------------------------------------------------
create table if not exists public.page_views (
  id          uuid primary key default gen_random_uuid(),
  page        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- user_id permite excluir acessos do próprio admin das métricas. NULL = anônimo
-- (não logado quando registrou o view). Insert via service-role (track-view).
alter table public.page_views
  add column if not exists user_id uuid references public.users(id) on delete set null;

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_page_idx       on public.page_views (page);
create index if not exists page_views_user_id_idx    on public.page_views (user_id);

alter table public.page_views enable row level security;

-- Inserção liberada para qualquer um (o middleware é anônimo).
drop policy if exists "page_views_insert_anyone" on public.page_views;
create policy "page_views_insert_anyone"
  on public.page_views for insert with check (true);

-- SELECT: só admin (linka auth.uid() → public.users.auth_id → role).
drop policy if exists "page_views_select_admin" on public.page_views;
create policy "page_views_select_admin"
  on public.page_views for select
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid() and u.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- ADMIN_LOGS: registro de ações administrativas
-- ----------------------------------------------------------------------------
create table if not exists public.admin_logs (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid references public.users(id) on delete set null,
  admin_email  text,
  acao         text not null,                  -- ex: 'delete_listing', 'block_user'
  entidade     text,                            -- ex: 'listing', 'user'
  entidade_id  uuid,
  detalhes     jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists admin_logs_created_at_idx on public.admin_logs (created_at desc);
create index if not exists admin_logs_admin_idx      on public.admin_logs (admin_id);

alter table public.admin_logs enable row level security;

-- SELECT: só admin.
drop policy if exists "admin_logs_select_admin" on public.admin_logs;
create policy "admin_logs_select_admin"
  on public.admin_logs for select
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid() and u.role = 'admin'
    )
  );

-- INSERT: o backend usa service-role (contorna RLS). Sem policy de insert público.

-- ----------------------------------------------------------------------------
-- BLOQUEIO DE ANUNCIANTES: impede criar novos anúncios se bloqueado=true.
-- A policy de insert público existente é substituída por uma que checa o flag.
-- ----------------------------------------------------------------------------
drop policy if exists "listings_insert_public" on public.listings;
create policy "listings_insert_public"
  on public.listings for insert
  with check (
    user_id is null
    or not exists (
      select 1 from public.users u
      where u.id = listings.user_id and u.bloqueado = true
    )
  );

-- ----------------------------------------------------------------------------
-- Como me tornar admin (rode UMA vez, trocando o e-mail):
--
--   update public.users set role = 'admin' where email = 'marcellfilipe99@gmail.com';
--
-- Confirme com:
--   select id, email, role, bloqueado from public.users where email = 'marcellfilipe99@gmail.com';
-- ----------------------------------------------------------------------------
