/** @jest-environment node */

import { POST } from './route';
import { storeOtp } from '@/lib/supabase';
import { consumeOtpRateLimit, recordEmailAttempt, recordOtpRequest, updateEmailAttempt, updateOtpActivity } from '@/lib/monitoring';

let mockResendFailure = false;
jest.mock('@/lib/supabase', () => ({ storeOtp: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/monitoring', () => ({
  consumeOtpRateLimit: jest.fn().mockResolvedValue(true),
  recordEmailAttempt: jest.fn().mockResolvedValue('mail-event-id'),
  recordOtpRequest: jest.fn().mockResolvedValue(undefined),
  safeMonitoringWrite: jest.fn(async (_label: string, operation: () => Promise<unknown>) => { try { return await operation(); } catch { return undefined; } }),
  updateEmailAttempt: jest.fn().mockResolvedValue(undefined),
  updateOtpActivity: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn(async () => mockResendFailure ? { data: null, error: { message: 'private provider response' } } : { data: { id: 'provider-message-id' }, error: null }) } })) }));

const request = () => new Request('http://localhost/api/send-otp', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'Visitor@example.com', name: 'Visitor' }),
});

describe('/api/send-otp', () => {
  const oldEnv = { node: process.env.NODE_ENV, resend: process.env.RESEND_API_KEY, smtp: process.env.SMTP_USER };
  beforeEach(() => {
    jest.clearAllMocks(); mockResendFailure = false;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true, configurable: true });
    delete process.env.RESEND_API_KEY; delete process.env.SMTP_USER; delete process.env.SMTP_PASS;
  });
  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: oldEnv.node, writable: true, configurable: true });
    if (oldEnv.resend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldEnv.resend;
    if (oldEnv.smtp === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = oldEnv.smtp;
  });

  it('stores a code digest input and returns a code only in local development without an email provider', async () => {
    const response = await POST(request());
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.devMode).toBe(true);
    expect(result.devOtp).toMatch(/^\d{6}$/);
    expect(storeOtp).toHaveBeenCalledWith('visitor@example.com', result.devOtp, expect.any(Date), 'Visitor', expect.any(String), 'login');
    expect(recordOtpRequest).toHaveBeenCalled();
    expect(updateOtpActivity).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ email_status: 'unknown' }));
  });

  it('logs provider acceptance without claiming delivery', async () => {
    process.env.RESEND_API_KEY = 'test-resend-key';
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(recordEmailAttempt).toHaveBeenCalledWith(expect.objectContaining({ provider: 'resend', email: 'visitor@example.com' }));
    expect(updateEmailAttempt).toHaveBeenCalledWith('mail-event-id', expect.objectContaining({ delivery_status: 'accepted', provider_message_id: 'provider-message-id' }));
    expect(updateEmailAttempt).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ delivery_status: 'delivered' }));
  });

  it('does not return a development code in production when no provider is configured', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true });
    const response = await POST(request());
    const result = await response.json();
    expect(response.status).toBe(503);
    expect(result).not.toHaveProperty('devOtp');
    expect(result.error).not.toMatch(/code|otp|secret/i);
    expect(updateOtpActivity).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ request_status: 'failed' }));
  });

  it('records provider failures with a safe code and hides provider details from the caller', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true });
    process.env.RESEND_API_KEY = 'test-resend-key'; mockResendFailure = true;
    const response = await POST(request());
    const result = await response.json();
    expect(response.status).toBe(503);
    expect(result.error).toBe('Email could not be sent. Please try again later.');
    expect(JSON.stringify(result)).not.toContain('private provider response');
    expect(updateEmailAttempt).toHaveBeenCalledWith('mail-event-id', expect.objectContaining({ delivery_status: 'failed', failure_code: 'provider_rejected' }));
  });

  it('stops OTP requests when the server-side rate limit is reached', async () => {
    (consumeOtpRateLimit as jest.Mock).mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(storeOtp).not.toHaveBeenCalled();
    expect(recordOtpRequest).toHaveBeenCalled();
  });
});
