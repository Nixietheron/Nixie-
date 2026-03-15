-- Security: prevent anon from reading content and stories (nsfw_cid, animated_cid would be exposed).
-- All reads of content and stories must go through the backend using service_role.

-- CONTENT: only service_role can select (backend uses createAdminClient for content reads)
drop policy if exists content_select on public.content;
create policy content_select_service_role on public.content
  for select
  using (auth.role() = 'service_role');

-- STORIES: only service_role can select (backend uses createAdminClient for story reads)
drop policy if exists stories_select_all on public.stories;
create policy stories_select_service_role on public.stories
  for select
  using (auth.role() = 'service_role');
