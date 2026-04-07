-- 30-day membership subscriptions (one active window per wallet)
create table if not exists public.subscriptions (
  wallet text primary key,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_ends_idx on public.subscriptions(ends_at desc);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select" on public.subscriptions;
create policy "subscriptions_select" on public.subscriptions
  for select using (true);

drop policy if exists "subscriptions_insert" on public.subscriptions;
create policy "subscriptions_insert" on public.subscriptions
  for insert with check (true);

drop policy if exists "subscriptions_update" on public.subscriptions;
create policy "subscriptions_update" on public.subscriptions
  for update using (true) with check (true);
