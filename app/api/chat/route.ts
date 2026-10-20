import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession, getSessionToken } from '@/lib/auth-session';
import { buildPortfolioSystemPrompt } from '@/lib/portfolio-context';
import { retrievePortfolioContext } from '@/lib/pinecone-retrieval';
import { randomUUID } from 'node:crypto';
import { ensureChatConversation, hashSessionId, recordChatMessage } from '@/lib/monitoring';

const BodySchema = z.object({
  conversationId: z.string().uuid(),
  requestId: z.string().uuid().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']).default('user'),
      content: z.string().min(1).max(20000),
    }),
  ).min(1),
});

function removeGenericClosingInvitation(reply: string) {
  return reply
    .replace(
      /\s*(?:(?:if you have (?:any )?(?:more|further) questions(?: about [^.!?\n]*)?,\s*)?feel free to ask(?: me)?(?: [^.!?\n]*)?)[!.]?\s*$/i,
      '',
    )
    .trim();
}

function needsCurrentInformationSearch(question: string) {
  const normalized = question.toLowerCase();
  const timeWords = /\b(current(?:ly)?|latest|recent(?:ly)?|today|tonight|this week|this month|this year|right now|as of|breaking|news|update|upcoming)\b/;
  const changingTopics = /\b(pres\w{2,10}|prime\s*minist\w*|chief minister|governor|mayor|ceo|weather|stock|share price|exchange rate|election|won|score|ranking|price|version|release date)\b/;
  return timeWords.test(normalized) || changingTopics.test(normalized);
}

function getWebCitations(response: {
  output: Array<{
    type: string;
    content?: Array<{
      type: string;
      annotations?: Array<{ type: string; title?: string; url?: string }>;
    }>;
  }>;
}) {
  const citations = new Map<string, string>();
  for (const item of response.output) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      if (part.type !== 'output_text') continue;
      for (const annotation of part.annotations ?? []) {
        if (annotation.type === 'url_citation' && annotation.url) {
          citations.set(annotation.url, annotation.title || annotation.url);
        }
      }
    }
  }
  return Array.from(citations.entries()).map(([url, title]) => ({ url, title }));
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
    const { conversationId, messages, requestId: suppliedRequestId } = BodySchema.parse(await req.json());
    const requestId = suppliedRequestId || randomUUID();
    const userMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!userMessage) return NextResponse.json({ ok: false, error: 'A user message is required.' }, { status: 400 });
    const sessionToken = getSessionToken(req);
    if (!sessionToken) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    let canLog = false;
    try {
      canLog = await ensureChatConversation({
        conversationId,
        email: session.email,
        sessionId: hashSessionId(sessionToken),
      });
    } catch {
      console.error('[monitoring] conversation setup failed');
      return NextResponse.json({ ok: false, error: 'Chat storage is temporarily unavailable.' }, { status: 503 });
    }
    if (!canLog) return NextResponse.json({ ok: false, error: 'This conversation is unavailable.' }, { status: 403 });
    const startedAt = Date.now();
    try {
      await recordChatMessage({
        conversationId, requestId, email: session.email, sessionId: hashSessionId(sessionToken),
        role: 'user', content: userMessage.content, generationStatus: 'received',
      });
    } catch {
      console.error('[monitoring] user chat message write failed');
      return NextResponse.json({ ok: false, error: 'The message could not be saved. Please retry.' }, { status: 503 });
    }
    const openAiKey = process.env.OPENAI_API_KEY;
    let reply = '';
    let generationStatus: 'succeeded' | 'failed' = 'failed';
    let errorCode = 'provider_unavailable';
    let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
    let responseModel: string | null = openAiKey ? 'gpt-4o' : null;

    if (openAiKey) {
      try {
        let context = '';
        try {
          context = await retrievePortfolioContext(userMessage.content);
        } catch {
          console.error('Could not retrieve portfolio context from Pinecone');
        }

        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: openAiKey });
        const systemPrompt = buildPortfolioSystemPrompt(context);
        let generatedReply = '';
        if (needsCurrentInformationSearch(userMessage.content)) {
          try {
            const currentResponse = await openai.responses.create({
              model: 'gpt-4.1',
              instructions: systemPrompt,
              input: messages
                .filter((message) => message.role !== 'system')
                .map(({ role, content }) => ({ role: role as 'user' | 'assistant', content })),
              tools: [{ type: 'web_search' }],
              tool_choice: 'required',
              include: ['web_search_call.action.sources'],
            });
            generatedReply = currentResponse.output_text.trim();
            usage = {
              prompt_tokens: currentResponse.usage?.input_tokens,
              completion_tokens: currentResponse.usage?.output_tokens,
              total_tokens: currentResponse.usage?.total_tokens,
            };
            const citations = getWebCitations(currentResponse);
            if (citations.length) {
              generatedReply += `\n\nSources:\n${citations.map(({ title, url }) => `- [${title.replace(/[\[\]]/g, '')}](${url})`).join('\n')}`;
            }
            responseModel = 'gpt-4.1';
          } catch {
            console.error('[chat] Current-information search failed');
            const fallback = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: `${systemPrompt}\n\nThe live web search did not work for this request. Do not guess at current or changing facts from memory. Briefly explain that you cannot verify the current information right now.`,
                },
                ...messages.filter((message) => message.role !== 'system'),
              ],
              temperature: 0.7,
            });
            generatedReply = fallback.choices[0]?.message?.content?.trim() || '';
            usage = fallback.usage;
          }
        } else {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.filter((message) => message.role !== 'system'),
            ],
            temperature: 0.7,
          });
          generatedReply = completion.choices[0]?.message?.content?.trim() || '';
          usage = completion.usage;
        }
        reply = removeGenericClosingInvitation(generatedReply);
        if (reply) {
          generationStatus = 'succeeded';
          errorCode = '';
        }
      } catch {
        console.error('OpenAI chat request failed');
        errorCode = 'provider_error';
      }
    }

    if (!reply) {
      reply = openAiKey
        ? 'I am having trouble generating a response right now. Please try again in a moment.'
        : 'The chatbot is not configured yet. Please try again later.';
    }

    try {
      await recordChatMessage({
        conversationId, requestId, email: session.email, sessionId: hashSessionId(sessionToken),
        role: 'assistant', content: reply, generationStatus,
        durationMs: Date.now() - startedAt,
        ...(generationStatus === 'failed' ? { errorCode } : {}),
        provider: openAiKey ? 'openai' : 'none', model: responseModel,
        promptTokens: usage?.prompt_tokens, completionTokens: usage?.completion_tokens, totalTokens: usage?.total_tokens,
      });
    } catch {
      console.error('[monitoring] assistant chat message write failed');
      return NextResponse.json({ ok: false, error: 'The reply could not be saved. Please retry.' }, { status: 503 });
    }

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ ok: false, error: 'Invalid chat request.' }, { status: 400 });
    console.error('Chat request failed');
    return NextResponse.json({ ok: false, error: 'Chat request failed. Please try again.' }, { status: 500 });
  }
}
