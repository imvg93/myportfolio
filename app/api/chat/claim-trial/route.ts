import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession, getSessionToken } from '@/lib/auth-session';
import { getChatTrialToken, hashChatTrialToken } from '@/lib/chat-trial';
import { ensureChatConversation, hashSessionId, recordChatMessage } from '@/lib/monitoring';
import { getSupabaseAdmin } from '@/lib/supabase';

const BodySchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(z.object({
    id: z.string().uuid(), role: z.enum(['user', 'assistant']), content: z.string().min(1).max(20000),
    generationStatus: z.enum(['succeeded', 'failed']).optional(),
  }).strict()).min(1).max(40),
}).strict();

export async function POST(request: Request) {
  try {
    const sessionToken = getSessionToken(request);
    const session = await getAuthSession(sessionToken);
    const trialToken = getChatTrialToken(request);
    if (!session || !sessionToken || !trialToken) return NextResponse.json({ ok: false, error: 'Sign in to save this trial chat.' }, { status: 401 });

    const body = BodySchema.parse(await request.json());
    const { data: canClaim, error: claimError } = await getSupabaseAdmin().rpc('can_claim_chat_trial', {
      p_token_hash: hashChatTrialToken(trialToken), p_conversation_id: body.conversationId,
    });
    if (claimError) throw claimError;
    if (canClaim !== true) return NextResponse.json({ ok: false, error: 'This trial chat cannot be linked to the signed-in account.' }, { status: 403 });

    const sessionId = hashSessionId(sessionToken);
    const canLog = await ensureChatConversation({ conversationId: body.conversationId, email: session.email, sessionId });
    if (!canLog) return NextResponse.json({ ok: false, error: 'This conversation belongs to another account.' }, { status: 403 });
    for (const message of body.messages) {
      await recordChatMessage({
        conversationId: body.conversationId,
        requestId: message.id,
        email: session.email,
        sessionId,
        role: message.role,
        content: message.content,
        generationStatus: message.role === 'assistant' ? (message.generationStatus || 'succeeded') : 'received',
        provider: message.role === 'assistant' ? 'openai' : null,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: 'Trial conversation could not be saved.' }, { status: 400 });
    }
    console.error('[chat] trial conversation claim failed');
    return NextResponse.json({ ok: false, error: 'Trial conversation could not be saved right now.' }, { status: 503 });
  }
}
