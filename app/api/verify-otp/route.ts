import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAndConsumeOtp } from '../../../src/lib/supabase';
import { AUTH_SESSION_COOKIE, AUTH_SESSION_TTL_SECONDS, createAuthSession } from '../../../src/lib/auth-session';
import { consumeOtpRateLimit, recordRateLimitedOtpAttempt, safeMonitoringWrite, updateOtpActivity } from '@/lib/monitoring';

const BodySchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email, otp } = BodySchema.parse(json);
    let allowed: boolean;
    try {
      allowed = await consumeOtpRateLimit(email, 'verify', 8, 5 * 60);
    } catch {
      return NextResponse.json({ ok: false, error: 'Verification service is temporarily unavailable.' }, { status: 503 });
    }
    if (!allowed) {
      await safeMonitoringWrite('rate limited OTP verification', () => recordRateLimitedOtpAttempt(email));
      return NextResponse.json({ ok: false, error: 'Too many attempts. Request a new code and try again.' }, { status: 429 });
    }

    const { valid, name, requestId, expired, attempts } = await verifyAndConsumeOtp(email, otp);
    if (!valid) {
      if (requestId) await safeMonitoringWrite('OTP verification failure', () => updateOtpActivity(requestId, {
        verification_attempts: expired ? attempts + 1 : attempts,
        failed_verification_attempts: attempts,
        verification_status: expired ? 'expired' : attempts >= 8 ? 'failed' : 'pending',
        request_status: expired ? 'expired' : attempts >= 8 ? 'failed' : 'accepted',
      }));
      return NextResponse.json({ ok: false, error: 'Invalid or expired code' }, { status: 401 });
    }

    if (requestId) await safeMonitoringWrite('OTP verification success', () => updateOtpActivity(requestId, {
      verification_attempts: attempts,
      failed_verification_attempts: attempts - 1,
      verification_status: 'verified', request_status: 'verified', verified_at: new Date().toISOString(),
    }));
    const token = await createAuthSession(email, name);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_SESSION_TTL_SECONDS,
    });
    // Remove legacy client-asserted identity cookies so they can never be reused.
    res.cookies.delete('verified_user');
    res.cookies.delete('verified_name');
    return res;
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: 'Enter a valid email and six-digit code.' }, { status: 400 });
    console.error('OTP verification failed');
    return NextResponse.json({ ok: false, error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}


