-- Optimize RLS policy expressions by wrapping auth.role() in a SELECT.
-- This avoids re-evaluating auth/current_setting for each row.

do $$
begin
  -- content
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content' and policyname = 'content_insert_admin_only'
  ) then
    execute 'alter policy content_insert_admin_only on public.content with check ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content' and policyname = 'content_update_admin_only'
  ) then
    execute 'alter policy content_update_admin_only on public.content using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content' and policyname = 'content_delete_admin_only'
  ) then
    execute 'alter policy content_delete_admin_only on public.content using ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content' and policyname = 'content_select_service_role'
  ) then
    execute 'alter policy content_select_service_role on public.content using ((select auth.role()) = ''service_role'')';
  end if;

  -- unlocks
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'unlocks' and policyname = 'unlocks_insert_backend_only'
  ) then
    execute 'alter policy unlocks_insert_backend_only on public.unlocks with check ((select auth.role()) = ''service_role'')';
  end if;

  -- likes
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'likes' and policyname = 'likes_insert_backend_only'
  ) then
    execute 'alter policy likes_insert_backend_only on public.likes with check ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'likes' and policyname = 'likes_delete_backend_only'
  ) then
    execute 'alter policy likes_delete_backend_only on public.likes using ((select auth.role()) = ''service_role'')';
  end if;

  -- comments
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comments' and policyname = 'comments_insert_backend_only'
  ) then
    execute 'alter policy comments_insert_backend_only on public.comments with check ((select auth.role()) = ''service_role'')';
  end if;

  -- stories
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stories' and policyname = 'stories_delete_backend_only'
  ) then
    execute 'alter policy stories_delete_backend_only on public.stories using ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stories' and policyname = 'stories_select_service_role'
  ) then
    execute 'alter policy stories_select_service_role on public.stories using ((select auth.role()) = ''service_role'')';
  end if;

  -- also optimize remaining service_role policies in current schema
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stories' and policyname = 'stories_insert_backend_only'
  ) then
    execute 'alter policy stories_insert_backend_only on public.stories with check ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stories' and policyname = 'stories_update_backend_only'
  ) then
    execute 'alter policy stories_update_backend_only on public.stories using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'story_unlocks' and policyname = 'story_unlocks_insert_backend_only'
  ) then
    execute 'alter policy story_unlocks_insert_backend_only on public.story_unlocks with check ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dm_threads' and policyname = 'dm_threads_service_role'
  ) then
    execute 'alter policy dm_threads_service_role on public.dm_threads using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dm_messages' and policyname = 'dm_messages_service_role'
  ) then
    execute 'alter policy dm_messages_service_role on public.dm_messages using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  end if;
end
$$;

