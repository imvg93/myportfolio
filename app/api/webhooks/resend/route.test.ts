/** @jest-environment node */

import { POST } from './route';
import { updateResendDelivery } from '@/lib/monitoring';

let mockWebhookEvent: unknown;
let mockVerifyFails = false;
jest.mock('@/lib/monitoring', () => ({ updateResendDelivery: jest.fn().mockResolvedValue(true) }));
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ webhooks: { verify: jest.fn(() => {
  if (mockVerifyFails) throw new Error('signature invalid');
  return mockWebhookEvent;
}) } })) }));

const request = (body = '{}') => new Request('http://localhost/api/webhooks/resend', {
  method: 'POST', headers: { 'content-type': 'application/json', 'svix-id': 'event_1', 'svix-timestamp': '1730000000', 'svix-signature': 'test-signature' }, body,
});

describe('Resend delivery webhook', () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousSecret = process.env.RESEND_WEBHOOK_SECRET;
  beforeEach(() => {
    jest.clearAllMocks(); mockVerifyFails = false;
    process.env.RESEND_API_KEY = 'test-resend-key'; process.env.RESEND_WEBHOOK_SECRET = 'whsec_test';
    mockWebhookEvent = { type: 'email.delivered', created_at: '2026-10-20T12:00:00.000Z', data: { email_id: 'resend-email-id' } };
  });
  afterAll(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET; else process.env.RESEND_WEBHOOK_SECRET = previousSecret;
  });
  it('verifies signatures and records only the provider-reported delivery event', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(updateResendDelivery).toHaveBeenCalledWith({
      emailId: 'resend-email-id', eventId: 'event_1', status: 'delivered', occurredAt: '2026-10-20T12:00:00.000Z',
    });
  });
  it('rejects invalid signatures without writing activity', async () => {
    mockVerifyFails = true;
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(updateResendDelivery).not.toHaveBeenCalled();
  });
  it('ignores other email event types without changing delivery status', async () => {
    mockWebhookEvent = { type: 'email.opened', data: { email_id: 'resend-email-id' } };
    const response = await POST(request());
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: true });
    expect(updateResendDelivery).not.toHaveBeenCalled();
  });
});
