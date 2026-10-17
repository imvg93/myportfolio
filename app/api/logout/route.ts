import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('verified_user');
  response.cookies.delete('verified_name');
  return response;
}
