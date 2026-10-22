create table if not exists public.chat_trial_sessions (
  trial_session_id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  network_hash text not null check (network_hash ~ '^[a-f0-9]{64}$'),
  answered_count integer not null default 0 check (answered_count between 0 and 2),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_trial_attempts (
  request_id uuid primary key,
  trial_session_id uuid not null references public.chat_trial_sessions(trial_session_id) on delete cascade,
  conversation_id uuid not null,
  status text not null check (status in ('reserved', 'succeeded', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists chat_trial_sessions_network_created_idx
  on public.chat_trial_sessions (network_hash, created_at desc);
create index if not exists chat_trial_sessions_created_idx
  on public.chat_trial_sessions (created_at);
create index if not exists chat_trial_attempts_session_status_idx
  on public.chat_trial_attempts (trial_session_id, status, created_at desc);
create index if not exists chat_trial_attempts_conversation_idx
  on public.chat_trial_attempts (trial_session_id, conversation_id, status);

alter table public.chat_trial_sessions enable row level security;
alter table public.chat_trial_attempts enable row level security;

create or replace function public.ensure_chat_trial_session(p_token_hash text, p_network_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.chat_trial_sessions%rowtype;
  v_pending integer;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_network_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid trial session hash';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_network_hash, 0));
  delete from public.chat_trial_sessions
    where network_hash = p_network_hash and created_at < now() - interval '30 days';
  select * into v_session from public.chat_trial_sessions where token_hash = p_token_hash for update;
  if not found then
    if (select count(*) from public.chat_trial_sessions
        where network_hash = p_network_hash and created_at > now() - interval '24 hours') >= 30 then
      return jsonb_build_object('ok', false, 'reason', 'network_limit', 'remaining', 0);
    end if;
    insert into public.chat_trial_sessions (token_hash, network_hash)
      values (p_token_hash, p_network_hash)
      returning * into v_session;
  end if;

  update public.chat_trial_attempts
    set status = 'expired', finished_at = now()
    where trial_session_id = v_session.trial_session_id
      and status = 'reserved' and created_at < now() - interval '5 minutes';
  select count(*)::integer into v_pending from public.chat_trial_attempts
    where trial_session_id = v_session.trial_session_id and status = 'reserved';
  return jsonb_build_object(
    'ok', true,
    'remaining', greatest(0, 2 - v_session.answered_count - v_pending),
    'answered', v_session.answered_count
  );
end;
$$;

create or replace function public.reserve_chat_trial_question(
  p_token_hash text, p_request_id uuid, p_conversation_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.chat_trial_sessions%rowtype;
  v_pending integer;
begin
  select * into v_session from public.chat_trial_sessions where token_hash = p_token_hash for update;
  if not found then return 'missing'; end if;

  update public.chat_trial_attempts
    set status = 'expired', finished_at = now()
    where trial_session_id = v_session.trial_session_id
      and status = 'reserved' and created_at < now() - interval '5 minutes';
  if exists (select 1 from public.chat_trial_attempts where request_id = p_request_id) then
    return 'duplicate';
  end if;

  select count(*)::integer into v_pending from public.chat_trial_attempts
    where trial_session_id = v_session.trial_session_id and status = 'reserved';
  if v_session.answered_count + v_pending >= 2 then return 'exhausted'; end if;

  insert into public.chat_trial_attempts (request_id, trial_session_id, conversation_id, status)
    values (p_request_id, v_session.trial_session_id, p_conversation_id, 'reserved');
  return 'allowed';
end;
$$;

create or replace function public.finish_chat_trial_question(
  p_token_hash text, p_request_id uuid, p_succeeded boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.chat_trial_sessions%rowtype;
  v_attempt public.chat_trial_attempts%rowtype;
begin
  select s.* into v_session
    from public.chat_trial_sessions s
    join public.chat_trial_attempts a on a.trial_session_id = s.trial_session_id
    where s.token_hash = p_token_hash and a.request_id = p_request_id
    for update of s;
  if not found then return -1; end if;

  select * into v_attempt from public.chat_trial_attempts
    where request_id = p_request_id and trial_session_id = v_session.trial_session_id for update;
  if v_attempt.status <> 'reserved' then return v_session.answered_count; end if;

  update public.chat_trial_attempts
    set status = case when p_succeeded then 'succeeded' else 'failed' end, finished_at = now()
    where request_id = p_request_id;
  if p_succeeded then
    update public.chat_trial_sessions set answered_count = least(2, answered_count + 1)
      where trial_session_id = v_session.trial_session_id returning * into v_session;
  end if;
  return v_session.answered_count;
end;
$$;

create or replace function public.can_claim_chat_trial(p_token_hash text, p_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_trial_sessions s
    join public.chat_trial_attempts a on a.trial_session_id = s.trial_session_id
    where s.token_hash = p_token_hash and a.conversation_id = p_conversation_id and a.status = 'succeeded'
  );
$$;

revoke all on function public.ensure_chat_trial_session(text, text) from public, anon, authenticated;
revoke all on function public.reserve_chat_trial_question(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_chat_trial_question(text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.can_claim_chat_trial(text, uuid) from public, anon, authenticated;
grant execute on function public.ensure_chat_trial_session(text, text) to service_role;
grant execute on function public.reserve_chat_trial_question(text, uuid, uuid) to service_role;
grant execute on function public.finish_chat_trial_question(text, uuid, boolean) to service_role;
grant execute on function public.can_claim_chat_trial(text, uuid) to service_role;
