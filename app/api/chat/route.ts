import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession, getSessionToken } from '@/lib/auth-session';
import { buildPortfolioSystemPrompt } from '@/lib/portfolio-context';
import { retrievePortfolioContext } from '@/lib/pinecone-retrieval';

const BodySchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']).default('user'),
      content: z.string().min(1).max(20000),
    }),
  ).min(1),
});

function removeGenericClosingInvitation(reply: string) {
  return reply
    .replace(/\s*If you have more questions about Gireesh or technology,\s*feel free to ask[!.]?\s*$/i, '')
    .trim();
}

export async function POST(req: Request) {
  let session;
  try {
    session = await getAuthSession(getSessionToken(req));
  } catch {
    return NextResponse.json({ ok: false, error: 'Authentication service unavailable' }, { status: 503 });
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { messages } = BodySchema.parse(await req.json());
    const openAiKey = process.env.OPENAI_API_KEY;
    let reply = '';

    if (openAiKey) {
      try {
        const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
        let context = '';
        if (latestUserMessage) {
          try {
            context = await retrievePortfolioContext(latestUserMessage.content);
          } catch (error) {
            console.error('Could not retrieve portfolio context from Pinecone:', error);
          }
        }

        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: openAiKey });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: buildPortfolioSystemPrompt(context) },
            ...messages.filter((message) => message.role !== 'system'),
          ],
          temperature: 0.7,
        });
        const generatedReply = completion.choices[0]?.message?.content?.trim() || '';
        reply = removeGenericClosingInvitation(generatedReply);
      } catch (error) {
        console.error('OpenAI chat request failed:', error);
      }
    }

    if (!reply) {
      reply = openAiKey
        ? 'I am having trouble generating a response right now. Please try again in a moment.'
        : 'The chatbot is not configured yet. Please try again later.';
    }

    return NextResponse.json({ ok: true, reply });
  } catch (error: any) {
    const message = error?.message || 'Chat request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
