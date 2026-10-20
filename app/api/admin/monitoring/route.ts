import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession, getSessionToken } from '@/lib/auth-session';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isMonitoringAdmin } from '@/lib/monitoring';

const QuerySchema = z.object({
  view: z.enum(['stats', 'otp', 'email', 'conversations', 'messages', 'timeline']).default('stats'),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['recent', 'oldest']).default('recent'),
  email: z.string().trim().email().optional(),
  conversationId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const respondError = (message: string, status: number) => {
  const response = NextResponse.json({ ok: false, error: message }, { status });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
};
const privateResponse = (payload: unknown) => {
  const response = NextResponse.json(payload);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
};

export async function GET(request: Request) {
  let session;
  try {
    session = await getAuthSession(getSessionToken(request));
  } catch {
    return respondError('Authentication service unavailable.', 503);
  }
  if (!session) return respondError('Unauthorized.', 401);
  if (!isMonitoringAdmin(session)) return respondError('Forbidden.', 403);

  const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return respondError('Invalid monitoring query.', 400);
  const { view, q, page, pageSize, sort, email, conversationId, from, to } = parsed.data;
  const db = getSupabaseAdmin();
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  try {
    if (view === 'stats') {
      const result = await db.rpc('get_monitoring_stats', { p_from: from || null, p_to: to || null });
      if (result.error) throw result.error;
      return privateResponse({ ok: true, data: result.data ?? {} });
    }

    if (view === 'messages') {
      if (!conversationId) return respondError('A conversation ID is required.', 400);
      const conversationResult = await db.from('chat_conversations')
        .select('conversation_id,user_id,visitor_email,started_at,last_activity_at,total_messages,first_message,conversation_status,ai_provider,ai_model')
        .eq('conversation_id', conversationId).maybeSingle();
      if (conversationResult.error) throw conversationResult.error;
      if (!conversationResult.data) return respondError('Conversation not found.', 404);
      const result = await db.from('chat_messages')
        .select('message_id,request_id,conversation_id,role,content,created_at,generation_status,error_code,response_duration_ms,provider,model,prompt_tokens,completion_tokens,total_tokens', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .order('message_id', { ascending: true })
        .range(start, end);
      if (result.error) throw result.error;
      const messages = result.data ?? [];
      const requestIds = Array.from(new Set(messages
        .filter((message: Record<string, unknown>) => message.role === 'user' && typeof message.request_id === 'string')
        .map((message: Record<string, unknown>) => message.request_id as string)));
      let answeredRequestIds = new Set<string>();
      if (requestIds.length) {
        const replies = await db.from('chat_messages').select('request_id')
          .in('request_id', requestIds).eq('role', 'assistant');
        if (replies.error) throw replies.error;
        answeredRequestIds = new Set((replies.data ?? []).map((message: { request_id: string }) => message.request_id));
      }
      const transcript = messages.map((message: Record<string, unknown>) => ({
        ...message,
        has_assistant_reply: message.role === 'user' && typeof message.request_id === 'string'
          ? answeredRequestIds.has(message.request_id)
          : null,
      }));
      return privateResponse({ ok: true, conversation: conversationResult.data, data: transcript, count: result.count ?? 0, page, pageSize });
    }

    if (view === 'otp') {
      let query = db.from('otp_activity_events').select('request_id,email,user_id,purpose,requested_at,expires_at,email_status,email_provider,email_failure_code,verification_status,verification_attempts,failed_verification_attempts,verified_at,request_status', { count: 'exact' });
      if (email) query = query.eq('email', email.toLowerCase());
      if (q) query = query.ilike('email', `%${q}%`);
      if (from) query = query.gte('requested_at', from);
      if (to) query = query.lte('requested_at', to);
      const result = await query.order('requested_at', { ascending: false }).range(start, end);
      if (result.error) throw result.error;
      return privateResponse({ ok: true, data: result.data ?? [], count: result.count ?? 0, page, pageSize });
    }

    if (view === 'email') {
      let query = db.from('email_activity_events').select('id,otp_request_id,recipient_email,purpose,provider,initiated_at,accepted_at,delivered_at,bounced_at,provider_response_status,delivery_status,failure_code', { count: 'exact' });
      if (email) query = query.eq('recipient_email', email.toLowerCase());
      if (q) query = query.ilike('recipient_email', `%${q}%`);
      if (from) query = query.gte('initiated_at', from);
      if (to) query = query.lte('initiated_at', to);
      const result = await query.order('initiated_at', { ascending: false }).range(start, end);
      if (result.error) throw result.error;
      return privateResponse({ ok: true, data: result.data ?? [], count: result.count ?? 0, page, pageSize });
    }

    if (view === 'conversations') {
      const result = await db.rpc('search_monitoring_conversations_sorted', {
        p_query: q || null,
        p_email: email?.toLowerCase() || null,
        p_from: from || null,
        p_to: to || null,
        p_offset: start,
        p_limit: pageSize,
        p_sort: sort,
      });
      if (result.error) throw result.error;
      const count = result.data?.[0]?.total_count ?? 0;
      return privateResponse({ ok: true, data: result.data ?? [], count, page, pageSize });
    }

    const targetEmail = (email || q || '').toLowerCase();
    if (!targetEmail || !z.string().email().safeParse(targetEmail).success) return respondError('Enter a valid email address for the timeline.', 400);
    const result = await db.rpc('get_monitoring_user_timeline', {
      p_email: targetEmail, p_from: from || null, p_to: to || null, p_offset: start, p_limit: pageSize,
    });
    if (result.error) throw result.error;
    const data = (result.data ?? []).map((row: Record<string, any>) => ({ type: row.event_type, at: row.occurred_at, ...(row.event || {}) }));
    return privateResponse({ ok: true, data, count: result.data?.[0]?.total_count ?? 0, page, pageSize });
  } catch {
    console.error('[monitoring] query failed');
    return respondError('Could not load monitoring records. Apply the monitoring migration and try again.', 503);
  }
}
