/** @jest-environment node */

import { createHash } from 'node:crypto';
import { createAuthSession, getAuthSession, getSessionToken, revokeAuthSession } from './auth-session';
import { getSupabaseAdmin } from './supabase';

jest.mock('./supabase', () => ({ getSupabaseAdmin: jest.fn() }));

describe('opaque auth sessions', () => {
  let query: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();
    query = {
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn(),
      eq: jest.fn(),
      gt: jest.fn(),
      is: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { email: 'visitor@example.com', name: 'Visitor' }, error: null }),
      update: jest.fn(),
      then: jest.fn((resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(resolve, reject)),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.gt.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    (getSupabaseAdmin as jest.Mock).mockReturnValue({ from: jest.fn(() => query) });
  });

  it('stores only a SHA-256 hash of a cryptographically random token with a one-hour expiry', async () => {
    let stored: Record<string, unknown> | undefined;
    query.insert.mockImplementation(async (row: Record<string, unknown>) => {
      stored = row;
      return { error: null };
    });

    const token = await createAuthSession('Visitor@Example.com', 'Visitor');

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(stored?.token_hash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(stored?.token_hash).not.toBe(token);
    expect(stored?.email).toBe('visitor@example.com');
    expect(new Date(String(stored?.expires_at)).getTime()).toBeGreaterThan(Date.now() + 59 * 60 * 1000);
  });

  it('looks up only unexpired and unrevoked sessions and rejects expired or revoked records', async () => {
    const token = 'x'.repeat(43);
    await expect(getAuthSession(token)).resolves.toEqual({ email: 'visitor@example.com', name: 'Visitor' });
    expect(query.eq).toHaveBeenCalledWith('token_hash', createHash('sha256').update(token).digest('hex'));
    expect(query.gt).toHaveBeenCalledWith('expires_at', expect.any(String));
    expect(query.is).toHaveBeenCalledWith('revoked_at', null);

    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(getAuthSession(token)).resolves.toBeNull();
    await expect(getAuthSession(null)).resolves.toBeNull();
    await expect(getAuthSession('malformed')).resolves.toBeNull();
  });

  it('revokes an existing session by its token hash', async () => {
    const token = 'z'.repeat(43);
    await revokeAuthSession(token);
    expect(query.update).toHaveBeenCalledWith({ revoked_at: expect.any(String) });
    expect(query.eq).toHaveBeenCalledWith('token_hash', createHash('sha256').update(token).digest('hex'));
    expect(query.is).toHaveBeenCalledWith('revoked_at', null);
  });

  it('parses only the named session cookie and safely handles malformed encoding', () => {
    expect(getSessionToken(new Request('http://localhost', { headers: { cookie: 'other=a; verified_session=abc%2F123' } })))
      .toBe('abc/123');
    expect(getSessionToken(new Request('http://localhost', { headers: { cookie: 'verified_session=%E0%A4%A' } })))
      .toBeNull();
  });
});
