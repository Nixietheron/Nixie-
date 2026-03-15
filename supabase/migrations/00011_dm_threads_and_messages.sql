-- DMs: users message Nixie; only admin sees all and can reply.
-- All access via backend (service_role). No anon access.

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_wallet text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_wallet)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists dm_messages_thread_id on public.dm_messages(thread_id);
create index if not exists dm_threads_updated_at on public.dm_threads(updated_at desc);

create or replace function public.dm_threads_touch_updated_at()
returns trigger as $$
begin
  update public.dm_threads set updated_at = now() where id = new.thread_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger dm_messages_touch_thread
  after insert on public.dm_messages
  for each row execute function public.dm_threads_touch_updated_at();

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

-- No anon access: only service_role can read/write (backend only)
create policy dm_threads_service_role on public.dm_threads
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy dm_messages_service_role on public.dm_messages
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
