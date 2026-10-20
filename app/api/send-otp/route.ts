import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomInt, randomUUID } from 'node:crypto';
import { storeOtp } from '../../../src/lib/supabase';
import { consumeOtpRateLimit, recordEmailAttempt, recordOtpRequest, safeMonitoringWrite, updateEmailAttempt, updateOtpActivity } from '@/lib/monitoring';

const BodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

function generateOtp(): string {
  return String(randomInt(100000, 1_000_000));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
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

  if (result.error) throw new Error('provider_rejected');
  return { messageId: result.data?.id ?? null, providerStatus: null as number | null };
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
      rejectUnauthorized: true,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
  
  let from = (process.env.EMAIL_FROM || '').replace(/^["']|["']$/g, '').trim();
  if (!from || from.includes('yourdomain.com') || from.includes('example.com')) {
    from = `Gireesh <${user}>`;
  }

  const result = await transporter.sendMail({ from, to, subject, html });
  const responseCode = /^\s*(\d{3})/.exec(result.response || '')?.[1];
  return { messageId: result.messageId ?? null, providerStatus: responseCode ? Number(responseCode) : null };
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email, name } = BodySchema.parse(json);
    const normalizedEmail = email.trim().toLowerCase();
    const purpose = 'login';
    const requestId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    let allowed: boolean;
    try {
      allowed = await consumeOtpRateLimit(normalizedEmail, 'request', 5, 15 * 60);
    } catch {
      return NextResponse.json({ ok: false, error: 'OTP service is temporarily unavailable.' }, { status: 503 });
    }
    if (!allowed) {
      await safeMonitoringWrite('rate limited OTP request', async () => {
        await recordOtpRequest({ email: normalizedEmail, requestId, purpose, expiresAt });
        await updateOtpActivity(requestId, { email_status: 'unknown', request_status: 'failed', email_failure_code: 'rate_limited' });
      });
      return NextResponse.json({ ok: false, error: 'Too many code requests. Please wait and try again.' }, { status: 429 });
    }

    const code = generateOtp();

    await storeOtp(normalizedEmail, code, expiresAt, name, requestId, purpose);
    await safeMonitoringWrite('OTP request', () => recordOtpRequest({ email: normalizedEmail, requestId, purpose, expiresAt }));

    const subject = `${code} is your verification code`;
    const safeName = escapeHtml(name);
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Gireesh Portfolio</h2>
          <p style="font-size: 14px; color: #64748b; margin: 0;">Verification Code for Insight AI Access</p>
        </div>
        <p style="font-size: 15px; line-height: 1.5; color: #334155; margin-bottom: 16px;">Hi <strong>${safeName}</strong>,</p>
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

    let providerFailureCode = 'configuration_missing';
    let providerResponseStatus: number | null = null;
    const tryProvider = async (provider: 'resend' | 'smtp') => {
      let activityId: string | null = null;
      await safeMonitoringWrite('email attempt', async () => { activityId = await recordEmailAttempt({ requestId, email: normalizedEmail, purpose, provider }); });
      try {
        const result = provider === 'resend'
          ? await sendEmailViaResend(normalizedEmail, subject, html)
          : await sendEmailViaSmtp(normalizedEmail, subject, html);
        if (activityId) await safeMonitoringWrite('email accepted', () => updateEmailAttempt(activityId!, {
          delivery_status: 'accepted', accepted_at: new Date().toISOString(), provider_message_id: result.messageId,
          provider_response_status: result.providerStatus,
        }));
        await safeMonitoringWrite('OTP accepted', () => updateOtpActivity(requestId, {
          email_status: 'accepted', email_provider: provider, request_status: 'accepted',
          email_provider_status: result.providerStatus,
        }));
        return true;
      } catch (error) {
        providerFailureCode = error instanceof Error && error.message === 'provider_rejected' ? 'provider_rejected' : 'transport_error';
        const responseStatus = (error as { statusCode?: unknown; responseCode?: unknown })?.statusCode
          ?? (error as { responseCode?: unknown })?.responseCode;
        providerResponseStatus = typeof responseStatus === 'number' ? responseStatus : null;
        if (activityId) await safeMonitoringWrite('email failed', () => updateEmailAttempt(activityId!, {
          delivery_status: 'failed', failure_code: providerFailureCode, provider_response_status: providerResponseStatus,
        }));
        return false;
      }
    };

    // Try configured providers in the same order as before.
    if (hasResend) {
      if (await tryProvider('resend')) return NextResponse.json({ ok: true, message: 'Code sent to your email' });
    }

    if (hasSmtp) {
      if (await tryProvider('smtp')) return NextResponse.json({ ok: true, message: 'Code sent to your email' });
    }

    if (process.env.NODE_ENV !== 'production' && !hasResend && !hasSmtp) {
      await safeMonitoringWrite('local OTP generated', () => updateOtpActivity(requestId, {
        email_status: 'unknown', request_status: 'accepted', email_failure_code: null,
      }));
      return NextResponse.json({
        ok: true, devMode: true,
        devOtp: code,
        message: 'Verification code generated for local development.',
      });
    }

    await safeMonitoringWrite('OTP email failure', () => updateOtpActivity(requestId, {
      email_status: 'failed', request_status: 'failed', email_failure_code: providerFailureCode,
    }));
    return NextResponse.json({ ok: false, error: 'Email could not be sent. Please try again later.' }, { status: 503 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: 'Enter a valid name and email address.' }, { status: 400 });
    console.error('[Send-OTP] Request failed');
    return NextResponse.json({ ok: false, error: 'Could not request a verification code. Please try again.' }, { status: 500 });
  }
}


