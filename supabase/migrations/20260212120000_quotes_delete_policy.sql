alter table public.quotes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'quotes'
      and policyname = 'quotes_delete_own'
  ) then
    create policy "quotes_delete_own"
      on public.quotes
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;
