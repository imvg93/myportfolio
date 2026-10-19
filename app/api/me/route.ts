import { NextResponse } from 'next/server';
import { getAuthSession, getSessionToken } from '../../../src/lib/auth-session';

export async function GET(req: Request) {
  try {
    const session = await getAuthSession(getSessionToken(req));
    return NextResponse.json({ email: session?.email ?? null, name: session?.name ?? null }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ email: null, name: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}


