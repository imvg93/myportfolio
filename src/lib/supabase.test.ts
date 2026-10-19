/** @jest-environment node */

import { verifyAndConsumeOtp } from './supabase';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('verifyAndConsumeOtp', () => {
  let otpRecord: Record<string, unknown> | null;
  let consumed: Record<string, unknown> | null;
  let deleteCalled: boolean;
  let readQuery: any;
  let consumeQuery: any;
  const adminClient = { from: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    otpRecord = { email: 'visitor@example.com', otp: '123456', expiresAt: new Date(Date.now() + 60_000).toISOString() };
    consumed = { email: 'visitor@example.com' };
    deleteCalled = false;
    readQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => ({ data: otpRecord, error: null })),
    };
    consumeQuery = {
      delete: jest.fn(() => { deleteCalled = true; return consumeQuery; }),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => ({ data: consumed, error: null })),
    };
    adminClient.from = jest.fn().mockReturnValueOnce(readQuery).mockReturnValueOnce(consumeQuery);
    (createClient as jest.Mock).mockReturnValue(adminClient);
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  it('rejects an expired OTP without consuming another record', async () => {
    otpRecord!.expiresAt = new Date(Date.now() - 1000).toISOString();
    await expect(verifyAndConsumeOtp('visitor@example.com', '123456')).resolves.toEqual({ valid: false });
    expect(deleteCalled).toBe(false);
  });

  it('rejects an OTP with no valid expiration timestamp', async () => {
    otpRecord!.expiresAt = 'invalid';
    await expect(verifyAndConsumeOtp('visitor@example.com', '123456')).resolves.toEqual({ valid: false });
    expect(deleteCalled).toBe(false);
  });

  it('rejects a wrong OTP without consuming it', async () => {
    await expect(verifyAndConsumeOtp('visitor@example.com', '000000')).resolves.toEqual({ valid: false });
    expect(deleteCalled).toBe(false);
  });

  it('consumes a valid OTP once and returns the stored name', async () => {
    otpRecord!.name = 'Visitor';
    await expect(verifyAndConsumeOtp('Visitor@Example.com', '123456')).resolves.toEqual({ valid: true, name: 'Visitor' });
    expect(deleteCalled).toBe(true);
    expect(consumeQuery.eq).toHaveBeenNthCalledWith(1, 'email', 'visitor@example.com');
    expect(consumeQuery.eq).toHaveBeenNthCalledWith(2, 'otp', '123456');

    consumed = null;
    adminClient.from.mockReset().mockReturnValueOnce(readQuery).mockReturnValueOnce(consumeQuery);
    await expect(verifyAndConsumeOtp('visitor@example.com', '123456')).resolves.toEqual({ valid: false });
  });
});
