import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { otpHashMatches, hashOtp } from '@/lib/otp-security';

let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  cachedAdminClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'portfolio-otp-admin' } },
  });
  return cachedAdminClient;
}

export async function storeOtp(email: string, otp: string, expiresAt: Date, name?: string, requestId?: string, purpose = 'login') {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.toLowerCase().trim();

  // Delete any existing OTP for this email first
  // (Prevents database trigger error: record "new" has no field "updated_at" on UPDATE)
  const { error: deleteError } = await supabase.from('otp').delete().eq('email', normalizedEmail);
  if (deleteError) throw deleteError;

  const { error } = await supabase.from('otp').insert({
    email: normalizedEmail, 
    otp_hash: hashOtp(normalizedEmail, otp),
    request_id: requestId ?? randomUUID(),
    purpose,
    failed_attempts: 0,
    expiresAt: expiresAt.toISOString(),
    ...(name && { name })
  });
  if (error) throw error;
}

export async function verifyAndConsumeOtp(email: string, code: string) {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from('otp')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { valid: false, requestId: null, expired: false, attempts: 0 };

  const expiresRaw = (data as any).expiresAt ?? (data as any).expires_at;
  const expiresAtMs = expiresRaw ? new Date(expiresRaw).getTime() : NaN;
  const isExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
  const requestId = typeof data.request_id === 'string' ? data.request_id : null;
  const failedAttempts = Number((data as any).failed_attempts || 0);
  if (isExpired) return { valid: false, requestId, expired: true, attempts: failedAttempts };
  if (failedAttempts >= 8) return { valid: false, requestId, expired: false, attempts: failedAttempts };

  const isMatch = typeof data.otp_hash === 'string' && otpHashMatches(normalizedEmail, code, data.otp_hash);
  if (!isMatch) {
    const attempts = failedAttempts + 1;
    const { error: attemptError } = await supabase.from('otp').update({ failed_attempts: attempts }).eq('email', normalizedEmail);
    if (attemptError) throw attemptError;
    return { valid: false, requestId, expired: false, attempts };
  }

  // Atomically consume only the matching OTP so concurrent requests cannot reuse it.
  const { data: consumed, error: consumeError } = await supabase
    .from('otp')
    .delete()
    .eq('email', normalizedEmail)
    .eq('otp_hash', hashOtp(normalizedEmail, code))
    .select('email')
    .maybeSingle();
  if (consumeError) throw consumeError;
  if (!consumed) return { valid: false, requestId, expired: false, attempts: failedAttempts };

  const userName: string | undefined = (data as any).name ?? undefined;
  return { valid: true, name: userName, requestId, expired: false, attempts: failedAttempts + 1 };
}

export async function storeResumeRequest(name: string, email: string) {
  const supabase = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  const payload = {
    name,
    email: email.toLowerCase(),
    requested_at: timestamp,
  };

  const { error } = await supabase.from('resume_requests').insert(payload);
  if (error) throw error;
}


