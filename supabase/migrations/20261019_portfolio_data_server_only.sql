-- Portfolio data is read by server routes using service_role. Keep direct client
-- access disabled so private source rows are not exposed through Supabase REST.
alter table public.portfolio_data enable row level security;
revoke all on table public.portfolio_data from public, anon, authenticated;
grant select, insert, update on table public.portfolio_data to service_role;
