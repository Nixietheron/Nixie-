create table if not exists public.museum_presence (
  wallet text primary key,
  display_name text not null,
  avatar text not null check (avatar in ('female', 'male')),
  access_source text not null check (access_source in ('token', 'nft', 'preview')),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.museum_reactions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  wallet text not null,
  reaction text not null check (reaction in ('linger', 'dangerous', 'favorite-tonight')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  unique(content_id, wallet, reaction)
);

create index if not exists museum_reactions_active_idx on public.museum_reactions(content_id, expires_at, created_at desc);

create table if not exists public.museum_notices (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(trim(body)) between 1 and 280),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.museum_presence enable row level security;
alter table public.museum_reactions enable row level security;
alter table public.museum_notices enable row level security;

create policy museum_presence_service_role on public.museum_presence for all using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');
create policy museum_reactions_service_role on public.museum_reactions for all using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');
create policy museum_notices_service_role on public.museum_notices for all using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');
