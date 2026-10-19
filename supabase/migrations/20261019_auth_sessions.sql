-- Opaque server-side sessions for the custom email OTP login flow.
create table if not exists public.auth_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  email text not null,
  name text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists auth_sessions_expiration_idx
  on public.auth_sessions (expires_at);

alter table public.auth_sessions enable row level security;
revoke all on table public.auth_sessions from public, anon, authenticated;
grant select, insert, update on table public.auth_sessions to service_role;

-- Expired and revoked session records are pruned daily.
create extension if not exists pg_cron;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'prune-expired-auth-sessions') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'prune-expired-auth-sessions';
  end if;
  perform cron.schedule(
    'prune-expired-auth-sessions',
    '43 3 * * *',
    $job$delete from public.auth_sessions where expires_at < now() or revoked_at < now() - interval '1 day'$job$
  );
end
$$;
