import { NextResponse } from 'next/server';
import { getAuthSession, getSessionToken } from '@/lib/auth-session';
import { CHAT_TRIAL_COOKIE, CHAT_TRIAL_TTL_SECONDS, createChatTrialToken, getChatTrialToken, hashChatTrialNetwork, hashChatTrialToken } from '@/lib/chat-trial';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession(getSessionToken(request));
    if (session) return NextResponse.json({ ok: true, authenticated: true, remaining: null });

    const token = getChatTrialToken(request) || createChatTrialToken();
    const { data, error } = await getSupabaseAdmin().rpc('ensure_chat_trial_session', {
      p_token_hash: hashChatTrialToken(token),
      p_network_hash: hashChatTrialNetwork(request),
    });
    if (error) throw error;
    if (!data?.ok) {
      return NextResponse.json({ ok: false, reason: data?.reason || 'unavailable', remaining: 0 }, { status: 429 });
    }

    const response = NextResponse.json({ ok: true, authenticated: false, remaining: Number(data.remaining ?? 0) });
    if (!getChatTrialToken(request)) {
      response.cookies.set(CHAT_TRIAL_COOKIE, token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
        maxAge: CHAT_TRIAL_TTL_SECONDS,
      });
    }
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'The chat trial is temporarily unavailable.' }, { status: 503 });
  }
}
