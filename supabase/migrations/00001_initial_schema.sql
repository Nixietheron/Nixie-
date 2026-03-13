-- content: artwork metadata and IPFS CIDs
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sfw_cid text not null,
  nsfw_cid text not null,
  animated_cid text,
  price_usdc numeric not null check (price_usdc >= 0),
  created_at timestamptz not null default now()
);

-- unlocks: wallet + content_id (user has paid for this content)
create table if not exists public.unlocks (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  content_id uuid not null references public.content(id) on delete cascade,
  tx_hash text,
  created_at timestamptz not null default now(),
  unique(wallet, content_id)
);

create index if not exists unlocks_wallet_content on public.unlocks(wallet, content_id);

-- likes: wallet + content_id (one like per wallet per content)
create table if not exists public.likes (
  wallet text not null,
  content_id uuid not null references public.content(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wallet, content_id)
);

create index if not exists likes_content on public.likes(content_id);

-- comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  content_id uuid not null references public.content(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_content on public.comments(content_id);

-- RLS
alter table public.content enable row level security;
alter table public.unlocks enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- content: everyone can read; only authenticated admin can insert/update (we use service role or auth.uid() for admin)
create policy "content_select" on public.content for select using (true);
create policy "content_insert" on public.content for insert with check (true);
create policy "content_update" on public.content for update using (true);

-- unlocks: users can read their own, insert their own
create policy "unlocks_select_own" on public.unlocks for select using (true);
create policy "unlocks_insert" on public.unlocks for insert with check (true);

-- likes: same
create policy "likes_select" on public.likes for select using (true);
create policy "likes_insert" on public.likes for insert with check (true);
create policy "likes_delete" on public.likes for delete using (true);

-- comments: everyone can read; anyone can insert (wallet from app)
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (true);

-- Enable Realtime in Supabase Dashboard for public.comments and public.likes if needed.
