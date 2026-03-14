-- Koleksiyon listeleri: kullanıcı kendi unlock'larından listeler oluşturabilir.
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists lists_wallet on public.lists(wallet);

create table if not exists public.list_items (
  list_id uuid not null references public.lists(id) on delete cascade,
  content_id uuid not null references public.content(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, content_id)
);

create index if not exists list_items_list on public.list_items(list_id);
create index if not exists list_items_content on public.list_items(content_id);

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "lists_select" on public.lists for select using (true);
create policy "lists_insert" on public.lists for insert with check (true);
create policy "lists_update" on public.lists for update using (true);
create policy "lists_delete" on public.lists for delete using (true);

create policy "list_items_select" on public.list_items for select using (true);
create policy "list_items_insert" on public.list_items for insert with check (true);
create policy "list_items_delete" on public.list_items for delete using (true);
