-- Story animasyon desteği: isteğe bağlı animated_cid
alter table public.stories
  add column if not exists animated_cid text;
