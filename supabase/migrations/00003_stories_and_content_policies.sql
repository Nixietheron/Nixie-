-- Content: allow delete for admin (via service role or app logic; RLS permits delete for all for now, app will restrict)
create policy "content_delete" on public.content for delete using (true);

-- Stories: temporary feed items (Instagram-like), expire after duration
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  image_cid text not null,
  nsfw_cid text,
  is_paid boolean not null default false,
  price_usdc numeric not null default 0 check (price_usdc >= 0),
  duration_hours int not null default 24 check (duration_hours > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists stories_expires_at on public.stories(expires_at);

alter table public.stories enable row level security;

create policy "stories_select" on public.stories for select using (true);
create policy "stories_insert" on public.stories for insert with check (true);
create policy "stories_update" on public.stories for update using (true);
create policy "stories_delete" on public.stories for delete using (true);

-- Story unlocks (for paid stories)
create table if not exists public.story_unlocks (
  story_id uuid not null references public.stories(id) on delete cascade,
  wallet text not null,
  created_at timestamptz not null default now(),
  primary key (story_id, wallet)
);

alter table public.story_unlocks enable row level security;
create policy "story_unlocks_select" on public.story_unlocks for select using (true);
create policy "story_unlocks_insert" on public.story_unlocks for insert with check (true);
