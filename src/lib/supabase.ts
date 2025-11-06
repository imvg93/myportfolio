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

  // Consume OTP: delete row
  await supabase.from('otp').delete().eq('email', email.toLowerCase());
  const userName: string | undefined = (data as any).name ?? undefined;
  return { valid: true, name: userName };
}


