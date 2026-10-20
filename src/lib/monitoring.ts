import { createHmac, createHash, randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { AuthSession } from '@/lib/auth-session';

const digestSecret = () => process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const normalizedEmail = (email: string) => email.trim().toLowerCase();

export async function consumeOtpRateLimit(email: string, purpose: string, limit: number, seconds: number) {
  const secret = digestSecret();
  if (!secret) throw new Error('OTP rate-limit secret is unavailable');
  const bucket = createHmac('sha256', secret)
    .update(`${normalizedEmail(email)}:${purpose}:${Math.floor(Date.now() / (seconds * 1000))}`)
    .digest('hex');
  const { data, error } = await getSupabaseAdmin().rpc('consume_otp_rate_limit', {
    p_bucket_hash: bucket,
    p_limit: limit,
    p_window_seconds: seconds,
  });
  if (error) throw error;
  return data === true;
}

export async function safeMonitoringWrite(label: string, operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch {
    // Intentionally avoid logging user data, OTPs, provider responses, or credentials.
    console.error(`[monitoring] ${label} write failed`);
  }
}

export async function recordOtpRequest(input: {
  email: string; requestId: string; purpose: string; expiresAt: Date;
}) {
  const { error } = await getSupabaseAdmin().from('otp_activity_events').insert({
    request_id: input.requestId,
    email: normalizedEmail(input.email),
    purpose: input.purpose,
    expires_at: input.expiresAt.toISOString(),
  });
  if (error) throw error;
}

export async function updateOtpActivity(requestId: string, fields: Record<string, unknown>) {
  const { error } = await getSupabaseAdmin().from('otp_activity_events').update(fields).eq('request_id', requestId);
  if (error) throw error;
}

export async function recordRateLimitedOtpAttempt(email: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('otp_activity_events').select('request_id,verification_attempts,failed_verification_attempts')
    .eq('email', normalizedEmail(email)).eq('verification_status', 'pending')
    .order('requested_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return;
  const { error: updateError } = await db.from('otp_activity_events').update({
    verification_attempts: Number(data.verification_attempts || 0) + 1,
    failed_verification_attempts: Number(data.failed_verification_attempts || 0) + 1,
  }).eq('request_id', data.request_id);
  if (updateError) throw updateError;
}

export async function recordEmailAttempt(input: {
  requestId: string; email: string; purpose: string; provider: string;
}) {
  const id = randomUUID();
  const { error } = await getSupabaseAdmin().from('email_activity_events').insert({
    id,
    otp_request_id: input.requestId,
    recipient_email: normalizedEmail(input.email),
    purpose: input.purpose,
    provider: input.provider,
  });
  if (error) throw error;
  return id;
}

export async function updateEmailAttempt(id: string, fields: Record<string, unknown>) {
  const { error } = await getSupabaseAdmin().from('email_activity_events').update(fields).eq('id', id);
  if (error) throw error;
}

export async function updateResendDelivery(input: {
  emailId: string; eventId: string; status: 'delivered' | 'delivery_delayed' | 'bounced' | 'failed';
  occurredAt: string; failureCode?: string;
}) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('email_activity_events').update({
    provider_event_id: input.eventId,
    delivery_status: input.status,
    ...(input.status === 'delivered' ? { delivered_at: input.occurredAt, failure_code: null } : {}),
    ...(input.status === 'bounced' ? { bounced_at: input.occurredAt, failure_code: 'bounced' } : {}),
    ...(input.status === 'failed' ? { failure_code: input.failureCode || 'provider_failed' } : {}),
  }).eq('provider', 'resend').eq('provider_message_id', input.emailId).select('otp_request_id').maybeSingle();
  if (error) throw error;
  if (!data?.otp_request_id) return false;
  const otpStatus = input.status === 'delivered' ? 'delivered' : input.status === 'bounced' ? 'bounced' : input.status === 'failed' ? 'failed' : 'accepted';
  const { error: otpError } = await db.from('otp_activity_events').update({
    email_status: otpStatus,
    email_failure_code: input.status === 'bounced' ? 'bounced' : input.status === 'failed' ? 'provider_failed' : null,
  }).eq('request_id', data.otp_request_id);
  if (otpError) throw otpError;
  return true;
}

export function isMonitoringAdmin(session: AuthSession | null) {
  if (!session) return false;
  const admins = (process.env.MONITORING_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => normalizedEmail(email))
    .filter(Boolean);
  return admins.includes(normalizedEmail(session.email));
}

export function hashSessionId(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function ensureChatConversation(input: { conversationId: string; email: string; sessionId: string }) {
  const db = getSupabaseAdmin();
  const existing = await db.from('chat_conversations').select('visitor_email')
    .eq('conversation_id', input.conversationId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.visitor_email === normalizedEmail(input.email);
  const { error } = await db.from('chat_conversations').insert({
    conversation_id: input.conversationId,
    visitor_email: normalizedEmail(input.email),
    session_id: input.sessionId,
  });
  if (error) {
    const check = await db.from('chat_conversations').select('visitor_email')
      .eq('conversation_id', input.conversationId).maybeSingle();
    if (check.error) throw error;
    return check.data?.visitor_email === normalizedEmail(input.email);
  }
  return true;
}

export async function recordChatMessage(input: {
  conversationId: string; requestId: string; email: string; sessionId: string;
  role: 'user' | 'assistant'; content: string; generationStatus: 'received' | 'succeeded' | 'failed';
  durationMs?: number; errorCode?: string; provider?: string | null; model?: string | null;
  promptTokens?: number; completionTokens?: number; totalTokens?: number;
}) {
  const { error } = await getSupabaseAdmin().from('chat_messages').upsert({
    conversation_id: input.conversationId,
    request_id: input.requestId,
    visitor_email: normalizedEmail(input.email),
    session_id: input.sessionId,
    role: input.role,
    content: input.content,
    generation_status: input.generationStatus,
    response_duration_ms: input.durationMs ?? null,
    error_code: input.errorCode ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    prompt_tokens: input.promptTokens ?? null,
    completion_tokens: input.completionTokens ?? null,
    total_tokens: input.totalTokens ?? null,
  }, { onConflict: 'request_id,role' });
  if (error) throw error;
  if (input.role === 'user') {
    const { error: firstMessageError } = await getSupabaseAdmin().from('chat_conversations')
      .update({ first_message: input.content }).eq('conversation_id', input.conversationId).is('first_message', null);
    if (firstMessageError) throw firstMessageError;
  }
  if (input.role === 'assistant') {
    const { error: conversationError } = await getSupabaseAdmin().from('chat_conversations').update({
      conversation_status: input.generationStatus === 'failed' ? 'failed' : 'active',
      ai_provider: input.provider ?? null,
      ai_model: input.model ?? null,
    }).eq('conversation_id', input.conversationId);
    if (conversationError) throw conversationError;
  }
}
