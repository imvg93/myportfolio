import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildPortfolioSystemPrompt, formatPortfolioContext, loadPublicPortfolioRecords } from '@/lib/portfolio-context';

const BodySchema = z.object({ question: z.string().trim().min(1).max(20000) });

export async function POST(req: Request) {
  try {
    const { question } = BodySchema.parse(await req.json());
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 503 });
    }

    const records = await loadPublicPortfolioRecords();
    const context = formatPortfolioContext(records);
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: openAiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildPortfolioSystemPrompt(context) },
        { role: 'user', content: question },
      ],
      temperature: 0.7,
    });
    const answer = completion.choices[0]?.message?.content?.trim() || 'I could not generate an answer right now.';
    const sources = records.map(({ title, category, year }) => ({ title, category, year }));

    return NextResponse.json({ answer, sources });
  } catch (error: any) {
    console.error('Portfolio ask request failed:', error);
    const message = error?.message || 'Unexpected error processing request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
