import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseAdmin } from './supabase';

export const AUTH_SESSION_COOKIE = 'verified_session';
export const AUTH_SESSION_TTL_SECONDS = 60 * 60;

export type AuthSession = {
  email: string;
  name: string | null;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAuthSession(email: string, name?: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_SECONDS * 1000).toISOString();
  const { error } = await getSupabaseAdmin().from('auth_sessions').insert({
    token_hash: hashToken(token),
    email: email.trim().toLowerCase(),
    name: name ?? null,
    expires_at: expiresAt,
  });
  if (error) throw error;
  return token;
}

export async function getAuthSession(token: string | null | undefined): Promise<AuthSession | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { data, error } = await getSupabaseAdmin()
    .from('auth_sessions')
    .select('email,name')
    .eq('token_hash', hashToken(token))
    .gt('expires_at', new Date().toISOString())
    .is('revoked_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!data || typeof data.email !== 'string') return null;
  return { email: data.email, name: typeof data.name === 'string' ? data.name : null };
}

export async function revokeAuthSession(token: string | null | undefined): Promise<void> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  const { error } = await getSupabaseAdmin()
    .from('auth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', hashToken(token))
    .is('revoked_at', null);
  if (error) throw error;
}

export function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== AUTH_SESSION_COOKIE) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}
