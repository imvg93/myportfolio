import { NextResponse } from 'next/server';

function parseCookie(header: string | null | undefined, key: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, v] = part.split('=');
    if (k && k.trim() === key) return v ? decodeURIComponent(v) : undefined;
  }
  return undefined;
}

export async function GET(req: Request) {
  const email = parseCookie(req.headers.get('cookie'), 'verified_user');
  const name = parseCookie(req.headers.get('cookie'), 'verified_name');
  return NextResponse.json({ email: email || null, name: name || null });
}


