alter table public.telegram_buy_alerts
  add column if not exists usd_amount numeric;
