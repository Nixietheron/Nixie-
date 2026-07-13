-- Holder experience: favourites and short-lived room conversation.
-- Messages are intentionally ephemeral; the application removes expired rows
-- whenever a room is read and this function can also be scheduled by cron.

create table if not exists public.museum_favorites (
  wallet text not null,
  content_id uuid not null references public.content(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wallet, content_id)
);

create index if not exists museum_favorites_wallet_idx on public.museum_favorites(wallet, created_at desc);

create table if not exists public.museum_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null check (room in ('lounge', 'gallery', 'private-viewing')),
  wallet text not null,
  display_name text not null check (char_length(trim(display_name)) between 2 and 40),
  body text not null check (char_length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours')
);

create index if not exists museum_chat_messages_room_active_idx
  on public.museum_chat_messages(room, expires_at, created_at desc);

create or replace function public.cleanup_expired_museum_chat_messages()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.museum_chat_messages where expires_at <= now();
$$;

alter table public.museum_favorites enable row level security;
alter table public.museum_chat_messages enable row level security;

drop policy if exists museum_favorites_service_role on public.museum_favorites;
create policy museum_favorites_service_role on public.museum_favorites
  for all using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');

drop policy if exists museum_chat_messages_service_role on public.museum_chat_messages;
create policy museum_chat_messages_service_role on public.museum_chat_messages
  for all using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');

-- Retire paywalls while preserving legacy columns/records for safe migration.
update public.content set price_usdc = 0, price_animated_usdc = 0
where price_usdc <> 0 or price_animated_usdc <> 0;

update public.stories set is_paid = false, price_usdc = 0
where is_paid = true or price_usdc <> 0;
