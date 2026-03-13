-- Add description column to content table
alter table public.content
  add column if not exists description text;

-- Create function + trigger to enforce max 3 comments per wallet per content
create or replace function public.check_comment_limit()
returns trigger language plpgsql as $$
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

drop trigger if exists enforce_comment_limit on public.comments;

create trigger enforce_comment_limit
  before insert on public.comments
  for each row execute function public.check_comment_limit();
