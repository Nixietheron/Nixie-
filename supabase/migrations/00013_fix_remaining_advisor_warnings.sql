-- Fix remaining Supabase Advisor warnings:
-- 1) role-mutable search_path on functions
-- 2) unrestricted RLS write policies on lists/list_items

-- ---------------------------------------------------------------------------
-- 1) Functions: set explicit search_path
-- ---------------------------------------------------------------------------

create or replace function public.check_comment_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  comment_count int;
begin
  select count(*) into comment_count
  from public.comments
  where wallet = NEW.wallet
    and content_id = NEW.content_id;

  if comment_count >= 3 then
    raise exception 'comment_limit_exceeded';
  end if;

  return NEW;
end;
$$;

create or replace function public.dm_threads_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_threads set updated_at = now() where id = new.thread_id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) RLS: lists/list_items write policies should not be unrestricted
--    Backend already uses service_role for writes in app code.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lists' and policyname = 'lists_insert'
  ) then
    execute 'alter policy lists_insert on public.lists with check ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lists' and policyname = 'lists_update'
  ) then
    execute 'alter policy lists_update on public.lists using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lists' and policyname = 'lists_delete'
  ) then
    execute 'alter policy lists_delete on public.lists using ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'list_items' and policyname = 'list_items_insert'
  ) then
    execute 'alter policy list_items_insert on public.list_items with check ((select auth.role()) = ''service_role'')';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'list_items' and policyname = 'list_items_delete'
  ) then
    execute 'alter policy list_items_delete on public.list_items using ((select auth.role()) = ''service_role'')';
  end if;
end
$$;

