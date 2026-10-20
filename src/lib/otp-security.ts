import { createHmac, timingSafeEqual } from 'node:crypto';

const digestSecret = () => process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function hashOtp(email: string, code: string) {
  const secret = digestSecret();
  if (!secret) throw new Error('OTP hashing secret is unavailable');
  return createHmac('sha256', secret).update(`${email.trim().toLowerCase()}:${code}`).digest('hex');
}

export function otpHashMatches(email: string, code: string, storedHash: string) {
  const actual = Buffer.from(hashOtp(email, code), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
