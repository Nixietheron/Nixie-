create table if not exists public.museum_profiles (
  wallet text primary key,
  display_name text not null check (char_length(trim(display_name)) between 2 and 40),
  avatar text not null check (avatar in ('female', 'male')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists museum_profiles_updated_at_idx on public.museum_profiles(updated_at desc);

alter table public.museum_profiles enable row level security;

create policy "museum_profiles_select" on public.museum_profiles for select using (true);
create policy "museum_profiles_insert" on public.museum_profiles for insert with check (true);
create policy "museum_profiles_update" on public.museum_profiles for update using (true);
