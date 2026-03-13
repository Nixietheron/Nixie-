-- Unlock per type: NSFW and Animated require separate payments.
-- One row per (wallet, content_id, unlock_type).

alter table public.unlocks
  add column if not exists unlock_type text not null default 'nsfw'
    check (unlock_type in ('nsfw', 'animated'));

-- Drop old unique so we can have both nsfw and animated per user per content
alter table public.unlocks drop constraint if exists unlocks_wallet_content_id_key;

create unique index if not exists unlocks_wallet_content_type
  on public.unlocks(wallet, content_id, unlock_type);
