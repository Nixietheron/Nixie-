-- Track content impressions/clicks for feed analytics (each row = one view event)
create table if not exists public.content_views (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  event_type text not null default 'impression' check (event_type in ('impression', 'click')),
  created_at timestamptz not null default now()
);

create index if not exists content_views_content_idx on public.content_views(content_id);
create index if not exists content_views_created_idx on public.content_views(created_at desc);

alter table public.content_views enable row level security;

drop policy if exists "content_views_select" on public.content_views;
create policy "content_views_select" on public.content_views
  for select using (true);

drop policy if exists "content_views_insert" on public.content_views;
create policy "content_views_insert" on public.content_views
  for insert with check (true);
