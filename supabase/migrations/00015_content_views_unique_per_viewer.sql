-- Deduplicate views by viewer per content.
-- viewer_key format:
--   evm:<lowercased_wallet>
--   sol:<base58_wallet>
--   anon:<persistent_local_device_id>

alter table public.content_views
  add column if not exists viewer_key text;

-- Backfill legacy rows so existing data remains valid and unique.
update public.content_views
set viewer_key = 'legacy:' || id::text
where viewer_key is null;

alter table public.content_views
  alter column viewer_key set not null;

create unique index if not exists content_views_content_viewer_unique
  on public.content_views(content_id, viewer_key);
