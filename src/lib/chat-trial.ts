import { createHash, createHmac, randomBytes } from 'node:crypto';

export const CHAT_TRIAL_COOKIE = 'chat_trial';
export const CHAT_TRIAL_TTL_SECONDS = 60 * 60 * 24 * 30;

export function getChatTrialToken(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== CHAT_TRIAL_COOKIE) continue;
    try {
      const token = decodeURIComponent(part.slice(separator + 1).trim());
      return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
    } catch { return null; }
  }
  return null;
}

export function createChatTrialToken() {
  return randomBytes(32).toString('base64url');
}

function hashSecret() {
  return process.env.TRIAL_SESSION_SECRET || process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function hashChatTrialToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function hashChatTrialNetwork(request: Request) {
  const secret = hashSecret();
  if (!secret) throw new Error('Trial session signing secret is unavailable');
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const network = request.headers.get('x-real-ip')?.trim()
    || forwardedFor
    || `unknown:${request.headers.get('user-agent') || 'no-user-agent'}`;
  return createHmac('sha256', secret).update(network).digest('hex');
}
