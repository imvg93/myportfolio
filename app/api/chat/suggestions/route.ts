import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession, getSessionToken } from '@/lib/auth-session';
import { consumeOtpRateLimit } from '@/lib/monitoring';
import { formatPortfolioContext, loadPublicPortfolioRecords } from '@/lib/portfolio-context';

const SuggestionsSchema = z.object({
  suggestions: z.array(z.object({
    label: z.enum([
      'Explore My Projects',
      'Discover My AI Work',
      'Understand My Technical Architecture',
      'Learn About My Experience',
      'Explore My Technical Skills',
      'Get My Contact Information',
    ]),
    question: z.string().trim().min(5).max(300),
  }).strict()).min(3).max(6),
}).strict();

const STARTER_QUESTION_INSTRUCTIONS = `Generate a JSON object with a "suggestions" array of three to six objects. Each object must contain a "label" and a concise, natural "question" that a visitor can send to the portfolio chatbot.

Use only subjects explicitly present in the supplied approved portfolio records. Use labels from this set and include each at most once: "Explore My Projects", "Discover My AI Work", "Understand My Technical Architecture", "Learn About My Experience", "Explore My Technical Skills", "Get My Contact Information". Include a label only if the portfolio records support a useful question for it. The question must be directly answerable from those records. Do not invent a project, skill, role, achievement, availability, or contact detail. Do not suggest sensitive family or relationship topics, or another person's private information. Do not include answers, markdown, or generic questions.`;

export async function GET(req: Request) {
  let session;
  try {
    session = await getAuthSession(getSessionToken(req));
  } catch {
    return NextResponse.json({ ok: false, error: 'Authentication service unavailable' }, { status: 503 });
  }
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const allowed = await consumeOtpRateLimit(session.email, 'chat_starter_suggestions', 10, 60 * 60);
    if (!allowed) return NextResponse.json({ ok: false, error: 'Please try again later.' }, { status: 429 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: false, suggestions: [] }, { status: 503 });

    const records = await loadPublicPortfolioRecords();
    const context = formatPortfolioContext(records);
    if (!context) return NextResponse.json({ ok: true, suggestions: [] });

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: STARTER_QUESTION_INSTRUCTIONS },
        { role: 'user', content: context.slice(0, 16000) },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) return NextResponse.json({ ok: true, suggestions: [] });
    const parsed = SuggestionsSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return NextResponse.json({ ok: true, suggestions: [] });

    const unique = Array.from(new Map(parsed.data.suggestions
      .map(({ label, question }) => [label, { label, question: question.trim() }]))
      .values())
      .filter(({ question }) => Boolean(question))
      .slice(0, 6);
    return NextResponse.json({ ok: true, suggestions: unique });
  } catch {
    console.error('[chat] Starter suggestion generation failed');
    return NextResponse.json({ ok: false, suggestions: [] }, { status: 503 });
  }
}
