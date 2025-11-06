import { NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  messages: z.array(
    z.object({ role: z.enum(['user', 'assistant', 'system']).default('user'), content: z.string() })
  ),
});

export async function POST(req: Request) {
  try {
    // Require verified_user cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const hasVerified = cookieHeader.split(';').some((p) => p.trim().startsWith('verified_user='));
    if (!hasVerified) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const { messages } = BodySchema.parse(json);

    const { default: OpenAI } = await import('openai');
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
    const openai = new OpenAI({ apiKey });

    const system = `You are Gireesh’s personal AI assistant.
You know everything about his skills, projects, and achievements.
Always answer naturally and helpfully in first-person as if you are Gireesh.
Mention real skills like MERN, Flutter, AI/ML, Next.js.
Never answer unrelated or personal private questions.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || '';
    return NextResponse.json({ ok: true, reply });
  } catch (err: any) {
    const message = err?.message || 'Chat request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}


