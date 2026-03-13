-- Harden RLS policies for public schema

-- CONTENT: public read, only service_role can write/delete
alter table public.content enable row level security;

drop policy if exists content_select on public.content;
drop policy if exists content_insert on public.content;
drop policy if exists content_update on public.content;
drop policy if exists content_delete on public.content;

create policy content_select on public.content
  for select
  using (true);

create policy content_insert_admin_only on public.content
  for insert
  with check (auth.role() = 'service_role');

create policy content_update_admin_only on public.content
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy content_delete_admin_only on public.content
  for delete
  using (auth.role() = 'service_role');

-- UNLOCKS: writes only via backend (service_role); reads allowed
alter table public.unlocks enable row level security;

drop policy if exists unlocks_select_own on public.unlocks;
drop policy if exists unlocks_insert on public.unlocks;

create policy unlocks_select_all on public.unlocks
  for select
  using (true);

create policy unlocks_insert_backend_only on public.unlocks
  for insert
  with check (auth.role() = 'service_role');

-- LIKES: writes only via backend; reads allowed
alter table public.likes enable row level security;

drop policy if exists likes_select on public.likes;
drop policy if exists likes_insert on public.likes;
drop policy if exists likes_delete on public.likes;

create policy likes_select_all on public.likes
  for select
  using (true);

create policy likes_insert_backend_only on public.likes
  for insert
  with check (auth.role() = 'service_role');

create policy likes_delete_backend_only on public.likes
  for delete
  using (auth.role() = 'service_role');

-- COMMENTS: writes only via backend; reads allowed
alter table public.comments enable row level security;

drop policy if exists comments_select on public.comments;
drop policy if exists comments_insert on public.comments;

create policy comments_select_all on public.comments
  for select
  using (true);

create policy comments_insert_backend_only on public.comments
  for insert
  with check (auth.role() = 'service_role');

-- STORIES: public read, only backend can write/delete
alter table public.stories enable row level security;

drop policy if exists stories_select on public.stories;
drop policy if exists stories_insert on public.stories;
drop policy if exists stories_update on public.stories;
drop policy if exists stories_delete on public.stories;

create policy stories_select_all on public.stories
  for select
  using (true);

create policy stories_insert_backend_only on public.stories
  for insert
  with check (auth.role() = 'service_role');

create policy stories_update_backend_only on public.stories
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy stories_delete_backend_only on public.stories
  for delete
  using (auth.role() = 'service_role');

-- STORY_UNLOCKS: writes only via backend; reads allowed
alter table public.story_unlocks enable row level security;

drop policy if exists story_unlocks_select on public.story_unlocks;
drop policy if exists story_unlocks_insert on public.story_unlocks;

create policy story_unlocks_select_all on public.story_unlocks
  for select
  using (true);

create policy story_unlocks_insert_backend_only on public.story_unlocks
  for insert
  with check (auth.role() = 'service_role');

