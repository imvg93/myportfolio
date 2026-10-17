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
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || apiKey === '...' || apiKey.length < 5) {
    throw new Error('RESEND_API_KEY not configured');
  }

  // Clean from address
  let from = (process.env.EMAIL_FROM || '').replace(/^["']|["']$/g, '').trim();
  if (!from || from.includes('yourdomain.com') || from.includes('example.com')) {
    from = 'Gireesh Portfolio <onboarding@resend.dev>';
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Resend delivery failed');
  }
}

async function sendEmailViaSmtp(to: string, subject: string, html: string) {
  const nodemailer = (await import('nodemailer')).default;
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  // App passwords frequently contain spaces (e.g. "abcd efgh ijkl mnop")
  const pass = process.env.SMTP_PASS?.trim().replace(/\s+/g, '');
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true' || port === 465;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration missing (host, user, or pass not provided)');
  }
  
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false, // Fix for self-signed certificate error
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
  
  let from = (process.env.EMAIL_FROM || '').replace(/^["']|["']$/g, '').trim();
  if (!from || from.includes('yourdomain.com') || from.includes('example.com')) {
    from = `Gireesh <${user}>`;
  }

  await transporter.sendMail({ from, to, subject, html });
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email, name } = BodySchema.parse(json);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Always store OTP first in Supabase
    await storeOtp(email, code, expiresAt, name);

    const subject = `${code} is your verification code`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Gireesh Portfolio</h2>
          <p style="font-size: 14px; color: #64748b; margin: 0;">Verification Code for Insight AI Access</p>
        </div>
        <p style="font-size: 15px; line-height: 1.5; color: #334155; margin-bottom: 16px;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.5; color: #334155; margin-bottom: 24px;">Use the verification passcode below to continue to the AI chat:</p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 14px 28px; background: #0f172a; color: #ffffff; border-radius: 12px; font-family: monospace;">
            ${code}
          </div>
        </div>
        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 24px;">
          This code expires in 5 minutes. If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    `;

    const resendKey = process.env.RESEND_API_KEY?.trim();
    const hasResend = Boolean(resendKey && resendKey !== '...' && resendKey.length > 5);
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const hasSmtp = Boolean(smtpUser && smtpPass);

    // 1. Try Resend if configured
    if (hasResend) {
      try {
        await sendEmailViaResend(email, subject, html);
        return NextResponse.json({ ok: true, message: 'Code sent to your email' });
      } catch (resendError: any) {
        console.error('[Send-OTP] Resend error:', resendError?.message);
        if (!hasSmtp && process.env.NODE_ENV === 'production') {
          throw new Error(`Email sending failed: ${resendError?.message || 'Resend error'}`);
        }
      }
    }

    // 2. Try SMTP if configured
    if (hasSmtp) {
      try {
        await sendEmailViaSmtp(email, subject, html);
        return NextResponse.json({ ok: true, message: 'Code sent to your email' });
      } catch (smtpError: any) {
        console.error('[Send-OTP] SMTP error:', smtpError?.message);
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Email sending failed: ${smtpError?.message || 'SMTP error'}`);
        }
      }
    }

    // 3. Fallback for local development or when credentials aren't set yet
    console.log(`\n====================================================`);
    console.log(`[OTP SERVICE - LOCAL DEV / FALLBACK]`);
    console.log(`Recipient: ${name} <${email}>`);
    console.log(`👉 YOUR OTP CODE IS: [ ${code} ]`);
    console.log(`Expires in 5 minutes (${expiresAt.toLocaleTimeString()})`);
    console.log(`====================================================\n`);

    if (process.env.NODE_ENV !== 'production' || (!hasResend && !hasSmtp)) {
      return NextResponse.json({
        ok: true,
        devMode: !hasResend && !hasSmtp,
        devOtp: code,
        message: 'Verification code generated! (Dev mode: logged to console)',
      });
    }

    throw new Error('Email service not configured. Please add RESEND_API_KEY or SMTP credentials in .env.local');
  } catch (err: any) {
    const message = err?.message || 'Failed to send OTP';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}


