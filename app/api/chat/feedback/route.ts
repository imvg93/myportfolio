import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession, getSessionToken } from '@/lib/auth-session';
import { hashSessionId } from '@/lib/monitoring';
import { getSupabaseAdmin } from '@/lib/supabase';

const FeedbackSchema = z.object({
  conversationId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
}).strict();

export async function POST(req: Request) {
  let session;
  try {
    session = await getAuthSession(getSessionToken(req));
  } catch {
    return NextResponse.json({ ok: false, error: 'Authentication service unavailable' }, { status: 503 });
  }
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof FeedbackSchema>;
  try {
    body = FeedbackSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid feedback submission.' }, { status: 400 });
  }

  const sessionToken = getSessionToken(req);
  if (!sessionToken) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getSupabaseAdmin();
    const { data: conversation, error: conversationError } = await db
      .from('chat_conversations')
      .select('conversation_id')
      .eq('conversation_id', body.conversationId)
      .eq('session_id', hashSessionId(sessionToken))
      .maybeSingle();

    if (conversationError) throw conversationError;
    if (!conversation) return NextResponse.json({ ok: false, error: 'Conversation not found.' }, { status: 404 });

    const { error } = await db.from('chat_feedback').insert({
      conversation_id: body.conversationId,
      rating: body.rating,
      comment: body.comment || null,
    });

    if (error?.code === '23505') {
      return NextResponse.json({ ok: false, error: 'Feedback was already submitted for this conversation.' }, { status: 409 });
    }
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    console.error('[feedback] Chat feedback write failed');
    return NextResponse.json({ ok: false, error: 'Feedback could not be saved right now.' }, { status: 503 });
  }
}
