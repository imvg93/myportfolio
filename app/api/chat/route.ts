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
  nameSpellingCorrection: z.object({ correctedSpelling: z.string().trim().min(1).max(200) }).strict().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']).default('user'),
      content: z.string().min(1).max(20000),
    }),
  ).min(1),
});

const SUGGESTION_TOPICS = [
  'personal_background_and_interests',
  'family_and_personal_life',
  'hobbies_and_lifestyle',
  'education_and_learning',
  'professional_experience_and_career',
  'technical_skills_and_technologies',
  'projects_and_product_development',
  'ai_ml_and_architecture',
  'business_and_entrepreneurship',
  'career_opportunities_and_hiring',
  'contact_and_professional_networking',
  'general_conversation_and_small_talk',
  'general_knowledge',
  'other_or_unknown',
] as const;

const FollowUpSuggestionsSchema = z.object({
  activeTopic: z.enum(SUGGESTION_TOPICS),
  suggestions: z.array(z.object({
    topic: z.enum(SUGGESTION_TOPICS),
    question: z.string().trim().min(5).max(160),
  }).strict()).max(4),
}).strict();

const FOLLOW_UP_SUGGESTION_INSTRUCTIONS = `Generate a JSON object with an "activeTopic" and a "suggestions" array of zero to four objects. Each suggestion object has a "topic" and a concise "question". Topic values must be one of: ${SUGGESTION_TOPICS.join(', ')}. These topic labels are internal and are not shown to the visitor.

First determine the visitor's active topic from the latest user message and recent conversation. If the latest message is a follow-up such as "what else?", "why?", "tell me more", "what about that?", or a pronoun/reference, preserve the topic being discussed. If they clearly introduce a new subject, switch to it. Use the assistant's latest answer to understand what was covered. Do not assume every visitor wants career, education, hiring, or technical information.

Suggest only natural next questions that stay within activeTopic and are useful, distinct continuations of the current answer. Tag each question with its actual topic. Never include a suggestion whose topic differs from activeTopic. Return fewer suggestions or an empty array if there are not enough relevant, answerable questions; relevance matters more than count. For general conversation, use short, natural prompts rather than forcing a portfolio topic.

For Gireesh-related questions, suggestions must be answerable from the supplied approved portfolio context. Never invent or assume skills, projects, responsibilities, experience, availability, private facts, or achievements. Personal questions may only use information explicitly present in the approved context. Never suggest questions about Gireesh's father, his passing, or related family history, even if those topics appear in the conversation. Do not suggest another person's social profile, contact details, username, or account ID. Do not repeat earlier user questions or questions already answered. Do not include answers, markdown, or generic invitations; output only the JSON object.`;

function normalizeQuestion(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function cleanSuggestion(value: string) {
  const question = value.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, '').replace(/^['"“”]+|['"“”]+$/g, '').replace(/\s+/g, ' ');
  if (!question) return '';
  return `${question.replace(/[.!?]+$/, '')}?`;
}

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

function buildRetrievalQuery(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
  let latestUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') {
      latestUserIndex = index;
      break;
    }
  }
  if (latestUserIndex < 0) return '';

  const latestQuestion = messages[latestUserIndex].content.trim();
  const recentContext = messages
    .slice(0, latestUserIndex)
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-4)
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'Visitor'}: ${message.content.trim().slice(0, 800)}`);

  if (!recentContext.length) return latestQuestion;
  return `${recentContext.join('\n')}\nCurrent visitor question: ${latestQuestion}`;
}

function isAboutPortfolioAiProject(question: string) {
  return /\b(?:ai portfolio|portfolio ai|portfolio chatbot|portfolio assistant|ai chatbot|ai assistant|chat assistant|rag|semantic retrieval|embedding pipeline|ai project|chatbot architecture)\b/i.test(question);
}

function isAboutArchitecture(question: string) {
  return /\b(?:architect(?:ure)?|tech(?:nical)?\s*stack|system\s*design|infrastructure|how\s*(?:is\s*(?:it|this|the\s*(?:app|site|project|portfolio|system))|(?:does|do)\s*(?:it|this|the\s*(?:app|site|project|portfolio|system))\s*work)|overall\s*design|data\s*flow|backend|deploy(?:ment|ed|ing)?|diagram|aws|ecs|supabase|pinecone|mongodb|next\.?js|fastapi|docker|s3)\b/i.test(question);
}

function getArchDiagramUrl(): string | null {
  const url = process.env.ARCH_DIAGRAM_URL?.trim();
  return url || null;
}

function getSocialProfilePolicyReply(question: string): string | null {
  const normalized = question.toLowerCase().replace(/[’]/g, "'");
  const platform = /\b(linkedin|linked\s*in|github|instagram|facebook|twitter|x\.com|threads|tiktok)\b/i;
  const hasPlatform = platform.test(normalized);
  const asksForProfile = hasPlatform && (
    /\b(profile|url|website|link|username|handle|account|id)\b/i.test(normalized)
    || /\b(?:my|your|his|her|their|someone'?s|president'?s)\s+(?:linkedin|linked\s*in|github|instagram|facebook|twitter|x\.com|threads|tiktok)\b/i.test(normalized)
    || /\b[a-z][a-z0-9._-]*'s\s+(?:linkedin|linked\s*in|github|instagram|facebook|twitter|x\.com|threads|tiktok)\b/i.test(normalized)
    || /\b(?:girish|gireesh)\s+(?:linkedin|linked\s*in)\b/i.test(normalized)
    || /\b(?:linkedin|linked\s*in|github|instagram|facebook|twitter|x\.com|threads|tiktok)\b.{0,40}\b(?:of|for)\b/i.test(normalized)
  );
  if (!asksForProfile) return null;

  const asksForOwnerLinkedIn = /\b(linkedin|linked\s*in)\b/i.test(normalized)
    && (/\b(my|your|girish|gireesh)(?:'s)?\s+(?:linkedin|linked\s*in)\b/i.test(normalized)
      || /\b(?:linkedin|linked\s*in)\b.{0,20}\b(?:of|for)\s+(?:me|girish|gireesh)\b/i.test(normalized))
    && !/\bmy\s+(?:friend|colleague|brother|sister|manager|teacher|classmate)'?s?\b/i.test(normalized);
  if (asksForOwnerLinkedIn) {
    return "Gireesh's LinkedIn profile: https://www.linkedin.com/in/girishveeranki/";
  }

  return "I can answer general questions, but I can’t provide or guess another person’s social profile or account details.";
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
    const { conversationId, messages, requestId: suppliedRequestId, nameSpellingCorrection } = BodySchema.parse(await req.json());
    const requestId = suppliedRequestId || randomUUID();
    const userMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!userMessage) return NextResponse.json({ ok: false, error: 'A user message is required.' }, { status: 400 });
    const userMessageIndex = messages.lastIndexOf(userMessage);
    const priorAssistant = [...messages.slice(0, userMessageIndex)].reverse().find((message) => message.role === 'assistant');
    const assistantAskedForNameSpelling = Boolean(priorAssistant && /\b(?:spelling|spelled)\b[\s\S]{0,80}\b(?:correct|right)\b/i.test(priorAssistant.content));
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
    let spellingCorrectionSaved = false;
    if (nameSpellingCorrection && assistantAskedForNameSpelling) {
      const priorMessages = messages.slice(0, userMessageIndex);
      const previousUser = [...priorMessages].reverse().find((message) => message.role === 'user')?.content ?? '';
      const mentionedContext = `Visitor asked: ${previousUser}\nAssistant spelling check: ${priorAssistant?.content ?? ''}`.slice(0, 1000);
      try {
        const { error: spellingError } = await (await import('@/lib/supabase')).getSupabaseAdmin()
          .from('name_spelling_suggestions').insert({
            conversation_id: conversationId,
            request_id: requestId,
            visitor_email: session.email,
            mentioned_name_context: mentionedContext,
            visitor_spelling: nameSpellingCorrection.correctedSpelling,
          });
        if (spellingError) throw spellingError;
        spellingCorrectionSaved = true;
      } catch {
        // Keep chat available when the optional spelling-review table is not yet migrated.
        console.error('[chat] name spelling suggestion could not be stored');
      }
    }
    const openAiKey = process.env.OPENAI_API_KEY;
    const socialProfilePolicyReply = getSocialProfilePolicyReply(userMessage.content);
    const spellingCorrectionAcknowledgement = spellingCorrectionSaved
      ? `Okay, thanks for the correction. I’ll use “${nameSpellingCorrection?.correctedSpelling}” here. I’ve saved it for review; updating the saved record may take some time.`
      : '';
    let reply = spellingCorrectionAcknowledgement || socialProfilePolicyReply || '';
    let suggestions: string[] = [];
    let generationStatus: 'succeeded' | 'failed' = socialProfilePolicyReply || spellingCorrectionAcknowledgement ? 'succeeded' : 'failed';
    let errorCode = socialProfilePolicyReply || spellingCorrectionAcknowledgement ? '' : 'provider_unavailable';
    let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
    let responseModel: string | null = socialProfilePolicyReply || spellingCorrectionAcknowledgement ? 'application-policy' : openAiKey ? 'gpt-4o' : null;
    const archDiagramUrl = isAboutArchitecture(userMessage.content) ? getArchDiagramUrl() : null;

    if (openAiKey && !socialProfilePolicyReply && !spellingCorrectionAcknowledgement) {
      try {
        const retrievalQuery = buildRetrievalQuery(messages);
        const includeVerifiedChatArchitecture = isAboutPortfolioAiProject(retrievalQuery);
        let context = '';
        try {
          context = await retrievePortfolioContext(retrievalQuery);
        } catch {
          console.error('Could not retrieve portfolio context from Pinecone');
        }

        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: openAiKey });
        const systemPrompt = buildPortfolioSystemPrompt(context, {
          includeVerifiedChatArchitecture,
        });
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

          try {
            const suggestionResponse = await openai.chat.completions.create({
              model: responseModel || 'gpt-4o',
              temperature: 0.4,
              max_tokens: 300,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: FOLLOW_UP_SUGGESTION_INSTRUCTIONS },
                {
                  role: 'user',
                  content: JSON.stringify({
                    latestQuestion: userMessage.content,
                    recentConversation: messages
                      .filter((message) => message.role !== 'system')
                      .slice(-10)
                      .map(({ role, content }) => ({ role, content: content.slice(0, 1000) })),
                    previousUserQuestions: messages
                      .filter((message) => message.role === 'user')
                      .slice(-20)
                      .map((message) => message.content.slice(0, 300)),
                    assistantAnswer: reply.slice(0, 5000),
                    portfolioContext: context.slice(0, 10000),
                  }),
                },
              ],
            });

            const suggestionText = suggestionResponse.choices[0]?.message?.content;
            if (suggestionText) {
              const parsedSuggestions = FollowUpSuggestionsSchema.safeParse(JSON.parse(suggestionText));
              if (parsedSuggestions.success) {
                const previousQuestions = new Set(
                  messages
                    .filter((message) => message.role === 'user')
                    .map((message) => normalizeQuestion(message.content)),
                );
                const uniqueSuggestions = new Map<string, string>();
                for (const candidate of parsedSuggestions.data.suggestions) {
                  // Enforce the generator's active topic in code as a final
                  // guard against a plausible but unrelated suggestion.
                  if (candidate.topic !== parsedSuggestions.data.activeTopic) continue;
                  const suggestion = cleanSuggestion(candidate.question);
                  const normalized = normalizeQuestion(suggestion);
                  if (suggestion && normalized && !previousQuestions.has(normalized) && !uniqueSuggestions.has(normalized)) {
                    uniqueSuggestions.set(normalized, suggestion);
                  }
                }
                suggestions = Array.from(uniqueSuggestions.values()).slice(0, 4);
              }
            }

            if (suggestionResponse.usage) {
              usage = {
                prompt_tokens: (usage?.prompt_tokens ?? 0) + (suggestionResponse.usage.prompt_tokens ?? 0),
                completion_tokens: (usage?.completion_tokens ?? 0) + (suggestionResponse.usage.completion_tokens ?? 0),
                total_tokens: (usage?.total_tokens ?? 0) + (suggestionResponse.usage.total_tokens ?? 0),
              };
            }
          } catch {
            // Suggestions are an enhancement; preserve a successful answer if generation fails.
            console.error('[chat] Follow-up suggestion generation failed');
          }
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
        provider: socialProfilePolicyReply || spellingCorrectionAcknowledgement ? 'application-policy' : openAiKey ? 'openai' : 'none', model: responseModel,
        promptTokens: usage?.prompt_tokens, completionTokens: usage?.completion_tokens, totalTokens: usage?.total_tokens,
      });
    } catch {
      console.error('[monitoring] assistant chat message write failed');
      return NextResponse.json({ ok: false, error: 'The reply could not be saved. Please retry.' }, { status: 503 });
    }

    const nameSpellingCheck = /\b(?:is|does)\b[\s\S]{0,160}\b(?:spelling|spelled|spell)\b[\s\S]{0,60}\b(?:correct|right)\b/i.test(reply);
    return NextResponse.json({ ok: true, reply, suggestions, name_spelling_check: nameSpellingCheck, ...(archDiagramUrl ? { image_url: archDiagramUrl } : {}) });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ ok: false, error: 'Invalid chat request.' }, { status: 400 });
    console.error('Chat request failed');
    return NextResponse.json({ ok: false, error: 'Chat request failed. Please try again.' }, { status: 500 });
  }
}
