-- Ayrı animasyon kilidi fiyatı (NSFW fiyatından bağımsız)
alter table public.content
  add column if not exists price_animated_usdc numeric not null default 0 check (price_animated_usdc >= 0);
