alter table public.quotes
add column if not exists expires_at timestamptz;

update public.quotes
set expires_at = coalesce(created_at, now()) + interval '14 days'
where expires_at is null;

alter table public.quotes
alter column expires_at set default (now() + interval '14 days');
