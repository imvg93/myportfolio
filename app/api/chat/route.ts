import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storeChatTurn } from '@/lib/mongodb';
import {
  buildPortfolioSystemPrompt,
  formatPortfolioContext,
  loadPublicPortfolioRecords,
} from '@/lib/portfolio-context';

const BodySchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']).default('user'),
      content: z.string().min(1).max(20000),
    }),
  ).min(1),
});

function getVerifiedEmail(req: Request): string | null {
  const cookie = (req.headers.get('cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('verified_user='));
  if (!cookie) return null;

  try {
    const email = decodeURIComponent(cookie.slice('verified_user='.length)).trim().toLowerCase();
    return z.string().email().safeParse(email).success ? email : null;
  } catch {
    return null;
  }
}

async function persistTurn(
  conversationId: string,
  visitorEmail: string,
  messages: Array<{ role: string; content: string }>,
  reply: string,
) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  if (!lastUserMessage || !reply) return;
  try {
    await storeChatTurn(conversationId, visitorEmail, lastUserMessage.content, reply);
  } catch (error) {
    console.error('Chat log write failed:', error);
  }
}

export async function POST(req: Request) {
  try {
    const visitorEmail = getVerifiedEmail(req);
    if (!visitorEmail) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, messages } = BodySchema.parse(await req.json());
    const openAiKey = process.env.OPENAI_API_KEY;
    let reply = '';

    if (openAiKey) {
      try {
        let context = '';
        try {
          const publicRecords = await loadPublicPortfolioRecords();
          context = formatPortfolioContext(publicRecords);
        } catch (error) {
          console.error('Could not load public portfolio context:', error);
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
        reply = completion.choices[0]?.message?.content?.trim() || '';
      } catch (error) {
        console.error('OpenAI chat request failed:', error);
      }
    }

    if (!reply) {
      reply = openAiKey
        ? 'I am having trouble generating a response right now. Please try again in a moment.'
        : 'The chatbot is not configured yet. Please try again later.';
    }

    await persistTurn(conversationId, visitorEmail, messages, reply);
    return NextResponse.json({ ok: true, reply });
  } catch (error: any) {
    const message = error?.message || 'Chat request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
