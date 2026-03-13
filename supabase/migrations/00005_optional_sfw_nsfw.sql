-- Allow content with only SFW, or only NSFW, or only animated (at least one required at app level)
alter table public.content
  alter column sfw_cid drop not null,
  alter column nsfw_cid drop not null;
