-- State and idempotency records for the server-side Telegram buy-alert worker.
-- These tables have no public API; only the service-role client accesses them.
create table if not exists public.telegram_buy_alert_state (
  stream_key text primary key,
  last_processed_block bigint not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_buy_alerts (
  id text primary key,
  transaction_hash text not null,
  log_index bigint not null,
  block_number bigint not null,
  buyer_wallet text not null,
  pool_address text not null,
  token_amount numeric not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (transaction_hash, log_index)
);

create index if not exists telegram_buy_alerts_unsent_idx
  on public.telegram_buy_alerts (block_number asc)
  where sent_at is null;

alter table public.telegram_buy_alert_state enable row level security;
alter table public.telegram_buy_alerts enable row level security;
