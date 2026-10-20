import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateResendDelivery } from '@/lib/monitoring';

const EventSchema = z.object({
  type: z.string(),
  created_at: z.string().datetime().optional(),
  data: z.object({ email_id: z.string().min(1) }).passthrough(),
}).passthrough();

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if (!webhookSecret || !apiKey) return NextResponse.json({ ok: false }, { status: 503 });

  const payload = await request.text();
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!id || !timestamp || !signature) return NextResponse.json({ ok: false }, { status: 400 });

  let event: z.infer<typeof EventSchema>;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const verified = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
    const parsed = EventSchema.safeParse(verified);
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    event = parsed.data;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const status = event.type === 'email.delivered' ? 'delivered'
    : event.type === 'email.delivery_delayed' ? 'delivery_delayed'
      : event.type === 'email.bounced' ? 'bounced'
        : event.type === 'email.failed' ? 'failed'
          : null;
  if (!status) return NextResponse.json({ ok: true, ignored: true });

  try {
    await updateResendDelivery({
      emailId: event.data.email_id,
      eventId: id,
      status,
      occurredAt: event.created_at || new Date().toISOString(),
      ...(status === 'failed' ? { failureCode: 'provider_failed' } : {}),
    });
    return NextResponse.json({ ok: true });
  } catch {
    console.error('[monitoring] Resend delivery update failed');
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
