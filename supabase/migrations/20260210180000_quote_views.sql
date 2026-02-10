create extension if not exists pgcrypto;

create table if not exists public.quote_views (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  token text,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  view_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id)
);

create or replace function public.set_quote_views_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quote_views_set_updated_at on public.quote_views;
create trigger quote_views_set_updated_at
before update on public.quote_views
for each row
execute function public.set_quote_views_updated_at();

alter table public.quote_views enable row level security;

drop policy if exists "quote_views_public_insert" on public.quote_views;
create policy "quote_views_public_insert"
on public.quote_views
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_views.quote_id
      and q.share_token = quote_views.token
  )
);

drop policy if exists "quote_views_public_update" on public.quote_views;
create policy "quote_views_public_update"
on public.quote_views
for update
to anon, authenticated
using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_views.quote_id
      and q.share_token = quote_views.token
  )
)
with check (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_views.quote_id
      and q.share_token = quote_views.token
  )
);

drop policy if exists "quote_views_owner_select" on public.quote_views;
create policy "quote_views_owner_select"
on public.quote_views
for select
to authenticated
using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_views.quote_id
      and q.user_id = auth.uid()
  )
);

create or replace function public.track_quote_view(p_quote_id uuid, p_token text)
returns void
language plpgsql
security invoker
as $$
begin
  insert into public.quote_views (quote_id, token, first_viewed_at, last_viewed_at, view_count)
  values (p_quote_id, p_token, now(), now(), 1)
  on conflict (quote_id)
  do update
    set token = excluded.token,
        last_viewed_at = now(),
        view_count = public.quote_views.view_count + 1;
end;
$$;

grant execute on function public.track_quote_view(uuid, text) to anon, authenticated;
