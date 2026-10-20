/** @jest-environment node */

import { verifyAndConsumeOtp } from './supabase';
import { hashOtp } from './otp-security';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('verifyAndConsumeOtp', () => {
  let otpRecord: Record<string, unknown> | null;
  let consumed: Record<string, unknown> | null;
  let readQuery: any;
  let consumeQuery: any;
  let updateQuery: any;
  const adminClient = { from: jest.fn() };
  const email = 'visitor@example.com';
  const code = '123456';
  const requestId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    otpRecord = { email, otp_hash: hashOtp(email, code), request_id: requestId, failed_attempts: 0, expiresAt: new Date(Date.now() + 60_000).toISOString() };
    consumed = { email };
    readQuery = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn(async () => ({ data: otpRecord, error: null })) };
    consumeQuery = { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), maybeSingle: jest.fn(async () => ({ data: consumed, error: null })) };
    updateQuery = { update: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ error: null }) };
    adminClient.from = jest.fn().mockReturnValueOnce(readQuery).mockReturnValueOnce(consumeQuery);
    (createClient as jest.Mock).mockReturnValue(adminClient);
  });

  it('rejects expired and malformed expiration timestamps without consuming the OTP', async () => {
    otpRecord!.expiresAt = new Date(Date.now() - 1000).toISOString();
    await expect(verifyAndConsumeOtp(email, code)).resolves.toMatchObject({ valid: false, expired: true });
    expect(consumeQuery.delete).not.toHaveBeenCalled();
    otpRecord!.expiresAt = 'invalid';
    adminClient.from.mockReset().mockReturnValueOnce(readQuery);
    await expect(verifyAndConsumeOtp(email, code)).resolves.toMatchObject({ valid: false, expired: true });
  });

  it('rejects wrong codes and increments attempts without storing the submitted code', async () => {
    adminClient.from.mockReset().mockReturnValueOnce(readQuery).mockReturnValueOnce(updateQuery);
    await expect(verifyAndConsumeOtp(email, '000000')).resolves.toMatchObject({ valid: false, attempts: 1 });
    expect(updateQuery.update).toHaveBeenCalledWith({ failed_attempts: 1 });
    expect(consumeQuery.delete).not.toHaveBeenCalled();
  });

  it('consumes a matching keyed digest once and returns only the stored name', async () => {
    otpRecord!.name = 'Visitor';
    await expect(verifyAndConsumeOtp('Visitor@Example.com', code)).resolves.toMatchObject({ valid: true, name: 'Visitor', requestId, attempts: 1 });
    expect(consumeQuery.eq).toHaveBeenNthCalledWith(1, 'email', email);
    expect(consumeQuery.eq).toHaveBeenNthCalledWith(2, 'otp_hash', hashOtp(email, code));
    consumed = null;
    adminClient.from.mockReset().mockReturnValueOnce(readQuery).mockReturnValueOnce(consumeQuery);
    await expect(verifyAndConsumeOtp(email, code)).resolves.toMatchObject({ valid: false });
  });
});
