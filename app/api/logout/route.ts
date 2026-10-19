import { NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE, getSessionToken, revokeAuthSession } from '../../../src/lib/auth-session';

export async function POST(request: Request) {
  let revoked = true;
  try {
    await revokeAuthSession(getSessionToken(request));
  } catch {
    revoked = false;
  }
  const response = NextResponse.json({ ok: revoked }, { status: revoked ? 200 : 503 });
  response.cookies.delete(AUTH_SESSION_COOKIE);
  response.cookies.delete('verified_user');
  response.cookies.delete('verified_name');
  return response;
}
