alter table public.profiles
add column if not exists quote_defaults_json jsonb;
