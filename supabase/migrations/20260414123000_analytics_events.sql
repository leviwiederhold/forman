create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc', now()),
  event_name text not null,
  user_id uuid references auth.users (id) on delete set null,
  trade text,
  source_page text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_event_name_created_at_idx
  on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_user_id_created_at_idx
  on public.analytics_events (user_id, created_at desc);

alter table public.analytics_events enable row level security;
