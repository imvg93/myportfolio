-- Adds selectable ordering for the private admin conversation list.
-- This creates a read-only search RPC and does not modify stored chat records.
create or replace function public.search_monitoring_conversations_sorted(
  p_query text,
  p_email text,
  p_from timestamptz,
  p_to timestamptz,
  p_offset integer,
  p_limit integer,
  p_sort text
)
returns table (
  conversation_id uuid, user_id uuid, visitor_email text,
  started_at timestamptz, last_activity_at timestamptz, total_messages integer,
  first_message text, conversation_status text, ai_provider text, ai_model text,
  total_count bigint
)
language sql security definer set search_path = public, pg_temp as $$
  select c.conversation_id, c.user_id, c.visitor_email,
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
        where m.conversation_id = c.conversation_id
          and m.content ilike '%' || btrim(p_query) || '%'
      ))
  order by
    case when p_sort = 'oldest' then c.last_activity_at end asc,
    case when p_sort <> 'oldest' then c.last_activity_at end desc,
    c.conversation_id asc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.search_monitoring_conversations_sorted(text, text, timestamptz, timestamptz, integer, integer, text) from public, anon, authenticated;
grant execute on function public.search_monitoring_conversations_sorted(text, text, timestamptz, timestamptz, integer, integer, text) to service_role;
