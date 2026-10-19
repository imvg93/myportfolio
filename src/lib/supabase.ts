import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

export async function storeOtp(email: string, otp: string, expiresAt: Date, name?: string) {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.toLowerCase().trim();

  // Delete any existing OTP for this email first
  // (Prevents database trigger error: record "new" has no field "updated_at" on UPDATE)
  await supabase.from('otp').delete().eq('email', normalizedEmail);

  const { error } = await supabase.from('otp').insert({ 
    email: normalizedEmail, 
    otp, 
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
  if (!data) return { valid: false };

  const expiresRaw = (data as any).expiresAt ?? (data as any).expires_at;
  const expiresAtMs = expiresRaw ? new Date(expiresRaw).getTime() : NaN;
  const isExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
  const isMatch = String(data.otp).trim() === String(code).trim();
  if (!isMatch || isExpired) return { valid: false };

  // Atomically consume only the matching OTP so concurrent requests cannot reuse it.
  const { data: consumed, error: consumeError } = await supabase
    .from('otp')
    .delete()
    .eq('email', normalizedEmail)
    .eq('otp', data.otp)
    .select('email')
    .maybeSingle();
  if (consumeError) throw consumeError;
  if (!consumed) return { valid: false };

  const userName: string | undefined = (data as any).name ?? undefined;
  return { valid: true, name: userName };
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


