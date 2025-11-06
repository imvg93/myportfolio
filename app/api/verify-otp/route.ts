import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAndConsumeOtp } from '../../../src/lib/supabase';

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

    const res = NextResponse.json({ ok: true });
    res.cookies.set('verified_user', email.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });
    if (name) {
      res.cookies.set('verified_name', String(name), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
      });
    }
    return res;
  } catch (err: any) {
    const message = err?.message || 'Verification failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}


