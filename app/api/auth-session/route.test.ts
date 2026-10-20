/** @jest-environment node */

import { POST as verifyOtp } from '../verify-otp/route';
import { GET as getMe } from '../me/route';
import { POST as logout } from '../logout/route';
import { verifyAndConsumeOtp } from '@/lib/supabase';
import { createAuthSession, getAuthSession, getSessionToken, revokeAuthSession } from '@/lib/auth-session';

jest.mock('@/lib/supabase', () => ({ verifyAndConsumeOtp: jest.fn() }));
jest.mock('@/lib/monitoring', () => ({
  consumeOtpRateLimit: jest.fn().mockResolvedValue(true),
  safeMonitoringWrite: jest.fn(async (_label: string, operation: () => Promise<unknown>) => operation()),
  updateOtpActivity: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/auth-session', () => ({
  AUTH_SESSION_COOKIE: 'verified_session',
  AUTH_SESSION_TTL_SECONDS: 3600,
  createAuthSession: jest.fn(),
  getAuthSession: jest.fn(),
  getSessionToken: jest.fn(),
  revokeAuthSession: jest.fn(),
}));

const makeRequest = (url: string, body?: unknown, cookie?: string) => new Request(url, {
  method: body ? 'POST' : 'GET',
  headers: {
    ...(body ? { 'content-type': 'application/json' } : {}),
    ...(cookie ? { cookie } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

describe('OTP-backed server sessions', () => {
  const oldNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true });
    (createAuthSession as jest.Mock).mockResolvedValue('a'.repeat(43));
  });

  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: oldNodeEnv, writable: true, configurable: true });
  });

  it('creates an HttpOnly, Secure one-hour session cookie after valid OTP', async () => {
    (verifyAndConsumeOtp as jest.Mock).mockResolvedValue({ valid: true, name: 'Visitor' });

    const response = await verifyOtp(makeRequest('http://localhost/api/verify-otp', {
      email: 'Visitor@example.com', otp: '123456',
    }));

    expect(response.status).toBe(200);
    expect(createAuthSession).toHaveBeenCalledWith('Visitor@example.com', 'Visitor');
    const cookie = response.cookies.get('verified_session');
    expect(cookie?.value).toBe('a'.repeat(43));
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/');
    expect(cookie?.maxAge).toBe(3600);
    expect(response.cookies.get('verified_user')?.value).toBe('');
  });

  it('does not require Secure cookies for localhost development', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true, configurable: true });
    (verifyAndConsumeOtp as jest.Mock).mockResolvedValue({ valid: true });
    const response = await verifyOtp(makeRequest('http://localhost/api/verify-otp', {
      email: 'visitor@example.com', otp: '123456',
    }));

    expect(response.cookies.get('verified_session')?.secure).toBe(false);
  });

  it('rejects invalid OTP without creating a session', async () => {
    (verifyAndConsumeOtp as jest.Mock).mockResolvedValue({ valid: false });

    const response = await verifyOtp(makeRequest('http://localhost/api/verify-otp', {
      email: 'visitor@example.com', otp: '000000',
    }));

    expect(response.status).toBe(401);
    expect(createAuthSession).not.toHaveBeenCalled();
  });

  it('returns server-resolved identity for a valid session and null for no session', async () => {
    (getSessionToken as jest.Mock).mockReturnValue('opaque-token');
    (getAuthSession as jest.Mock).mockResolvedValueOnce({ email: 'visitor@example.com', name: 'Visitor' });
    const validResponse = await getMe(makeRequest('http://localhost/api/me', undefined, 'verified_session=opaque-token'));
    await expect(validResponse.json()).resolves.toEqual({ email: 'visitor@example.com', name: 'Visitor' });

    (getSessionToken as jest.Mock).mockReturnValue(null);
    (getAuthSession as jest.Mock).mockResolvedValueOnce(null);
    const anonymousResponse = await getMe(makeRequest('http://localhost/api/me'));
    await expect(anonymousResponse.json()).resolves.toEqual({ email: null, name: null });
  });

  it('revokes the session on logout and clears both new and legacy cookies', async () => {
    (getSessionToken as jest.Mock).mockReturnValue('opaque-token');
    const response = await logout(makeRequest('http://localhost/api/logout', {}, 'verified_session=opaque-token'));

    expect(revokeAuthSession).toHaveBeenCalledWith('opaque-token');
    expect(response.cookies.get('verified_session')?.value).toBe('');
    expect(response.cookies.get('verified_user')?.value).toBe('');
    expect(response.cookies.get('verified_name')?.value).toBe('');
  });

  it('does not use client-supplied legacy email as authentication', async () => {
    (getSessionToken as jest.Mock).mockReturnValue(null);
    (getAuthSession as jest.Mock).mockResolvedValue(null);
    const response = await getMe(makeRequest('http://localhost/api/me', undefined, 'verified_user=forged@example.com'));

    await expect(response.json()).resolves.toEqual({ email: null, name: null });
  });
});
