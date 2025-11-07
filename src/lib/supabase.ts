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
  const { error } = await supabase.from('otp').upsert(
    { 
      email: email.toLowerCase(), 
      otp, 
      expiresAt: expiresAt.toISOString(),
      ...(name && { name })
    },
    { onConflict: 'email' }
  );
  if (error) throw error;
}

export async function verifyAndConsumeOtp(email: string, code: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('otp')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  if (error) throw error;
  if (!data) return { valid: false };

  const expiresRaw = (data as any).expiresAt ?? (data as any).expires_at ?? (data as any).expires_at;
  const expiresAtMs = expiresRaw ? new Date(expiresRaw).getTime() : NaN;
  const isExpired = Number.isFinite(expiresAtMs) ? expiresAtMs < Date.now() : false;
  const isMatch = String(data.otp).trim() === String(code).trim();
  if (!isMatch || isExpired) return { valid: false };

  // Mark OTP as consumed but keep record for auditing.
  const consumedAt = new Date();
  const expiredValue = new Date(consumedAt.getTime() - 1000).toISOString();
  const updatePayload: Record<string, any> = { expiresAt: expiredValue };
  if ('consumedAt' in (data as any)) {
    updatePayload.consumedAt = consumedAt.toISOString();
  } else if ('consumed_at' in (data as any)) {
    updatePayload.consumed_at = consumedAt.toISOString();
  }

  await supabase.from('otp').update(updatePayload).eq('email', email.toLowerCase());
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


