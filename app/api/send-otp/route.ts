import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storeOtp } from '../../../src/lib/supabase';

const BodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendEmailViaResend(to: string, subject: string, html: string) {
  const { Resend } = await import('resend');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === '...') throw new Error('RESEND_API_KEY not configured');
  const from = (process.env.EMAIL_FROM || 'no-reply@example.com').replace(/^["']|["']$/g, '');
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from, to, subject, html });
  if (result.error) throw result.error;
}

async function sendEmailViaSmtp(to: string, subject: string, html: string) {
  const nodemailer = (await import('nodemailer')).default;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  if (!host || !user || !pass) throw new Error('SMTP configuration missing');
  
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false, // Fix for self-signed certificate error
    },
  });
  
  const fromEmail = (process.env.EMAIL_FROM || user).replace(/^["']|["']$/g, '').replace(/^.*<(.+)>.*$/, '$1') || user;
  await transporter.sendMail({ from: fromEmail, to, subject, html });
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email, name } = BodySchema.parse(json);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await storeOtp(email, code, expiresAt, name);

    const subject = 'Your verification code';
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6;">
        <h2>Hi ${name},</h2>
        <p>Your one-time passcode is:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; padding: 12px 16px; background: #0f172a; color: #e2e8f0; width: fit-content; border-radius: 10px;">${code}</div>
        <p>This code expires in 5 minutes.</p>
        <p style="color:#64748b">Requested for gireesh.ai chat access.</p>
      </div>
    `;

    // Try Resend first if configured, otherwise use SMTP
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && resendKey !== '...') {
      try {
        await sendEmailViaResend(email, subject, html);
        return NextResponse.json({ ok: true });
      } catch (resendError: any) {
        console.error('Resend failed, trying SMTP:', resendError?.message);
      }
    }

    // Use SMTP
    try {
      await sendEmailViaSmtp(email, subject, html);
      return NextResponse.json({ ok: true });
    } catch (smtpError: any) {
      console.error('SMTP error:', smtpError?.message);
      throw new Error(`Email sending failed: ${smtpError?.message || 'Unknown error'}`);
    }
  } catch (err: any) {
    const message = err?.message || 'Failed to send OTP';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}


