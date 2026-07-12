alter table public.telegram_buy_alerts
  add column if not exists market_cap_usd numeric;
