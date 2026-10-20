-- Monitoring is written/read only by server routes using the Supabase service role.
-- Clear outstanding legacy plaintext OTPs before removing their column.
delete from public.otp;
alter table public.otp drop column if exists otp;
alter table public.otp add column if not exists otp_hash text;
alter table public.otp add column if not exists request_id uuid;
alter table public.otp add column if not exists purpose text not null default 'login';
alter table public.otp add column if not exists failed_attempts integer not null default 0;

create table if not exists public.otp_activity_events (
  request_id uuid primary key,
  email text not null,
  user_id uuid,
  purpose text not null default 'login',
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  email_status text not null default 'initiated'
    check (email_status in ('initiated', 'accepted', 'delivered', 'bounced', 'failed', 'unknown')),
  email_provider text,
  email_provider_status integer,
  email_failure_code text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'failed', 'expired')),
  verification_attempts integer not null default 0 check (verification_attempts >= 0),
  failed_verification_attempts integer not null default 0 check (failed_verification_attempts >= 0),
  verified_at timestamptz,
  request_status text not null default 'pending'
    check (request_status in ('pending', 'accepted', 'failed', 'verified', 'expired')),
  created_at timestamptz not null default now()
);
create index if not exists otp_activity_email_requested_idx
  on public.otp_activity_events (email, requested_at desc);
create index if not exists otp_activity_status_requested_idx
  on public.otp_activity_events (verification_status, requested_at desc);

create table if not exists public.email_activity_events (
  id uuid primary key default gen_random_uuid(),
  otp_request_id uuid references public.otp_activity_events(request_id) on delete cascade,
  recipient_email text not null,
  purpose text not null,
  provider text not null,
  initiated_at timestamptz not null default now(),
  accepted_at timestamptz,
  provider_message_id text,
  provider_event_id text,
  provider_response_status integer,
  delivered_at timestamptz,
  bounced_at timestamptz,
  delivery_status text not null default 'initiated'
    check (delivery_status in ('initiated', 'accepted', 'delivered', 'delivery_delayed', 'failed', 'bounced', 'unknown')),
  failure_code text,
  created_at timestamptz not null default now()
);
create index if not exists email_activity_recipient_initiated_idx
  on public.email_activity_events (recipient_email, initiated_at desc);
create index if not exists email_activity_status_initiated_idx
  on public.email_activity_events (delivery_status, initiated_at desc);
create index if not exists email_activity_provider_message_idx
  on public.email_activity_events (provider, provider_message_id);

create table if not exists public.chat_conversations (
  conversation_id uuid primary key,
  user_id uuid,
  visitor_email text not null,
  session_id text not null check (session_id ~ '^[0-9a-f]{64}$'),
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  total_messages integer not null default 0 check (total_messages >= 0),
  first_message text,
  conversation_status text not null default 'active'
    check (conversation_status in ('active', 'completed', 'failed')),
  ai_provider text,
  ai_model text,
  created_at timestamptz not null default now()
);
create index if not exists chat_conversations_email_started_idx
  on public.chat_conversations (visitor_email, started_at desc);
create index if not exists chat_conversations_activity_idx
  on public.chat_conversations (last_activity_at desc);
create extension if not exists pg_trgm;

alter table public.chat_messages
  add column if not exists message_id uuid not null default gen_random_uuid(),
  add column if not exists request_id uuid,
  add column if not exists user_id uuid,
  add column if not exists session_id text,
  add column if not exists generation_status text not null default 'succeeded'
    check (generation_status in ('received', 'succeeded', 'failed')),
  add column if not exists error_code text,
  add column if not exists response_duration_ms integer,
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists prompt_tokens integer,
  add column if not exists completion_tokens integer,
  add column if not exists total_tokens integer;
create unique index if not exists chat_messages_message_id_idx on public.chat_messages (message_id);
create unique index if not exists chat_messages_request_role_idx
  on public.chat_messages (request_id, role);
create index if not exists chat_messages_email_created_idx
  on public.chat_messages (visitor_email, created_at desc);
create index if not exists chat_messages_status_created_idx
  on public.chat_messages (generation_status, created_at desc);
create index if not exists chat_messages_content_trgm_idx
  on public.chat_messages using gin (content gin_trgm_ops);

create or replace function public.search_monitoring_conversations(
  p_query text default null,
  p_email text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_offset integer default 0,
  p_limit integer default 25
)
returns table (
  conversation_id uuid, user_id uuid, visitor_email text, session_id text,
  started_at timestamptz, last_activity_at timestamptz, total_messages integer,
  first_message text, conversation_status text, ai_provider text, ai_model text,
  total_count bigint
)
language sql security definer set search_path = public, pg_temp as $$
  select c.conversation_id, c.user_id, c.visitor_email, c.session_id,
         c.started_at, c.last_activity_at, c.total_messages, c.first_message,
         c.conversation_status, c.ai_provider, c.ai_model, count(*) over ()
  from public.chat_conversations c
  where (p_email is null or c.visitor_email = lower(trim(p_email)))
    and (p_from is null or c.started_at >= p_from)
    and (p_to is null or c.started_at <= p_to)
    and (p_query is null or btrim(p_query) = ''
      or c.conversation_id::text = btrim(p_query)
      or c.visitor_email ilike '%' || btrim(p_query) || '%'
      or coalesce(c.first_message, '') ilike '%' || btrim(p_query) || '%'
      or exists (
        select 1 from public.chat_messages m
        where m.conversation_id = c.conversation_id and m.content ilike '%' || btrim(p_query) || '%'
      ))
  order by c.last_activity_at desc
  offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.get_monitoring_user_timeline(
  p_email text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_offset integer default 0,
  p_limit integer default 25
)
returns table (event_type text, occurred_at timestamptz, event jsonb, total_count bigint)
language sql security definer set search_path = public, pg_temp as $$
  with activity as (
    select 'otp'::text as event_type, o.requested_at as occurred_at,
      jsonb_build_object('request_id', o.request_id, 'email', o.email, 'purpose', o.purpose,
        'email_status', o.email_status, 'verification_status', o.verification_status,
        'verification_attempts', o.verification_attempts,
        'failed_verification_attempts', o.failed_verification_attempts,
        'verified_at', o.verified_at, 'request_status', o.request_status) as event
    from public.otp_activity_events o
    where o.email = lower(trim(p_email)) and (p_from is null or o.requested_at >= p_from) and (p_to is null or o.requested_at <= p_to)
    union all
    select 'email', e.initiated_at,
      jsonb_build_object('recipient_email', e.recipient_email, 'purpose', e.purpose, 'provider', e.provider,
        'delivery_status', e.delivery_status, 'failure_code', e.failure_code)
    from public.email_activity_events e
    where e.recipient_email = lower(trim(p_email)) and (p_from is null or e.initiated_at >= p_from) and (p_to is null or e.initiated_at <= p_to)
    union all
    select 'chat', c.started_at,
      jsonb_build_object('conversation_id', c.conversation_id, 'visitor_email', c.visitor_email,
        'last_activity_at', c.last_activity_at, 'total_messages', c.total_messages,
        'conversation_status', c.conversation_status)
    from public.chat_conversations c
    where c.visitor_email = lower(trim(p_email)) and (p_from is null or c.started_at >= p_from) and (p_to is null or c.started_at <= p_to)
  )
  select a.event_type, a.occurred_at, a.event, count(*) over ()
  from activity a order by a.occurred_at desc
  offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.get_monitoring_stats(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'otpRequests', (select count(*) from public.otp_activity_events o where (p_from is null or o.requested_at >= p_from) and (p_to is null or o.requested_at <= p_to)),
    'verifiedOtp', (select count(*) from public.otp_activity_events o where o.verification_status = 'verified' and (p_from is null or o.requested_at >= p_from) and (p_to is null or o.requested_at <= p_to)),
    'failedOtp', (select coalesce(sum(o.failed_verification_attempts), 0) from public.otp_activity_events o where (p_from is null or o.requested_at >= p_from) and (p_to is null or o.requested_at <= p_to)),
    'emailFailures', (select count(*) from public.email_activity_events e where e.delivery_status = 'failed' and (p_from is null or e.initiated_at >= p_from) and (p_to is null or e.initiated_at <= p_to)),
    'conversations', (select count(*) from public.chat_conversations c where (p_from is null or c.started_at >= p_from) and (p_to is null or c.started_at <= p_to)),
    'activeConversations', (select count(*) from public.chat_conversations c where c.conversation_status = 'active' and (p_from is null or c.started_at >= p_from) and (p_to is null or c.started_at <= p_to)),
    'userMessages', (select count(*) from public.chat_messages m where m.role = 'user' and (p_from is null or m.created_at >= p_from) and (p_to is null or m.created_at <= p_to)),
    'assistantMessages', (select count(*) from public.chat_messages m where m.role = 'assistant' and (p_from is null or m.created_at >= p_from) and (p_to is null or m.created_at <= p_to)),
    'failedChats', (select count(*) from public.chat_messages m where m.role = 'assistant' and m.generation_status = 'failed' and (p_from is null or m.created_at >= p_from) and (p_to is null or m.created_at <= p_to))
  );
$$;

create or replace function public.bump_chat_conversation_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.chat_conversations
  set total_messages = total_messages + 1, last_activity_at = new.created_at
  where conversation_id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists chat_messages_bump_conversation on public.chat_messages;
create trigger chat_messages_bump_conversation after insert on public.chat_messages
for each row execute function public.bump_chat_conversation_activity();

-- Cross-instance rate limits retain only keyed digests, never raw email addresses or IPs.
create table if not exists public.otp_rate_limit_buckets (
  bucket_hash text primary key check (bucket_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);
create or replace function public.consume_otp_rate_limit(p_bucket_hash text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare current_count integer;
begin
  if p_bucket_hash !~ '^[0-9a-f]{64}$' or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate-limit parameters';
  end if;
  insert into public.otp_rate_limit_buckets (bucket_hash, window_started_at, request_count)
  values (p_bucket_hash, now(), 1)
  on conflict (bucket_hash) do update set
    window_started_at = case when otp_rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= now() then now() else otp_rate_limit_buckets.window_started_at end,
    request_count = case when otp_rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= now() then 1 else otp_rate_limit_buckets.request_count + 1 end,
    updated_at = now()
  returning request_count into current_count;
  return current_count <= p_limit;
end;
$$;
revoke all on function public.consume_otp_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_otp_rate_limit(text, integer, integer) to service_role;
revoke all on function public.search_monitoring_conversations(text, text, timestamptz, timestamptz, integer, integer) from public, anon, authenticated;
grant execute on function public.search_monitoring_conversations(text, text, timestamptz, timestamptz, integer, integer) to service_role;
revoke all on function public.get_monitoring_user_timeline(text, timestamptz, timestamptz, integer, integer) from public, anon, authenticated;
grant execute on function public.get_monitoring_user_timeline(text, timestamptz, timestamptz, integer, integer) to service_role;
revoke all on function public.get_monitoring_stats(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_monitoring_stats(timestamptz, timestamptz) to service_role;
revoke all on function public.bump_chat_conversation_activity() from public, anon, authenticated;

alter table public.otp_activity_events enable row level security;
alter table public.email_activity_events enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.otp_rate_limit_buckets enable row level security;
alter table public.otp enable row level security;
revoke all on public.otp_activity_events, public.email_activity_events, public.chat_conversations,
  public.chat_messages, public.otp_rate_limit_buckets from public, anon, authenticated;
revoke all on public.otp from public, anon, authenticated;
grant select, insert, update on public.otp_activity_events, public.email_activity_events,
  public.chat_conversations, public.chat_messages to service_role;
grant select, insert, update, delete on public.otp, public.otp_rate_limit_buckets to service_role;

create or replace function public.prune_monitoring_events()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.email_activity_events where initiated_at < now() - interval '180 days';
  delete from public.otp_activity_events where requested_at < now() - interval '180 days';
  delete from public.chat_messages where created_at < now() - interval '180 days';
  delete from public.chat_conversations where last_activity_at < now() - interval '180 days';
  delete from public.otp_rate_limit_buckets where updated_at < now() - interval '2 days';
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'otp' and column_name = 'expiresAt') then
    execute 'delete from public.otp where "expiresAt" < now()';
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'otp' and column_name = 'expires_at') then
    execute 'delete from public.otp where expires_at < now()';
  end if;
end;
$$;
revoke all on function public.prune_monitoring_events() from public, anon, authenticated;
create extension if not exists pg_cron;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'prune-monitoring-events') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'prune-monitoring-events';
  end if;
  perform cron.schedule('prune-monitoring-events', '27 4 * * *', 'select public.prune_monitoring_events()');
end
$$;
