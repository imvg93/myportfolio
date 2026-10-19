import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAndConsumeOtp } from '../../../src/lib/supabase';
import { AUTH_SESSION_COOKIE, AUTH_SESSION_TTL_SECONDS, createAuthSession } from '../../../src/lib/auth-session';

const BodySchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email, otp } = BodySchema.parse(json);

    const { valid, name } = await verifyAndConsumeOtp(email, otp);
    if (!valid) return NextResponse.json({ ok: false, error: 'Invalid or expired code' }, { status: 401 });

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
    console.error('OTP verification failed:', err);
    return NextResponse.json({ ok: false, error: 'Verification failed. Please try again.' }, { status: 400 });
  }
}


