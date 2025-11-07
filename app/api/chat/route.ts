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

    // Helpers
    const toSingleVector = (maybeMatrix: any): number[] => {
      if (Array.isArray(maybeMatrix) && maybeMatrix.length > 0 && Array.isArray(maybeMatrix[0])) {
        const length = maybeMatrix[0].length;
        const sums = new Array(length).fill(0);
        for (let i = 0; i < maybeMatrix.length; i++) {
          const tokenVec = maybeMatrix[i];
          for (let j = 0; j < length; j++) sums[j] += Number(tokenVec[j] || 0);
        }
        return sums.map((s) => s / maybeMatrix.length);
      }
      return maybeMatrix as number[];
    };

    const extractHFText = (out: any): string => {
      if (!out) return '';
      if (typeof out === 'string') return out;
      if (Array.isArray(out)) {
        const first = out[0];
        if (!first) return '';
        if (typeof first === 'string') return first;
        return (first.generated_text || first.output_text || '').toString();
      }
      if (typeof out === 'object') {
        return (out.generated_text || out.output_text || '').toString();
      }
      return '';
    };

    // Try to retrieve relevant context from Pinecone using HF embeddings
    let ragContext = '';
    try {
      const userLast = [...messages].reverse().find((m) => m.role === 'user');
      if (userLast && process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME && process.env.HUGGINGFACE_API_KEY) {
        const { HfInference } = await import('@huggingface/inference');
        const { Pinecone } = await import('@pinecone-database/pinecone');
        const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pc.index(process.env.PINECONE_INDEX_NAME);
        const embed = await hf.featureExtraction({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: String(userLast.content),
          options: { wait_for_model: true }
        });
        const vector = toSingleVector(embed);
        if (!Array.isArray(vector) || vector.some((v) => typeof v !== 'number')) {
          throw new Error('Invalid embedding vector');
        }
        const results: any = await index.query({ topK: 5, includeMetadata: true, vector });
        const chunks = (results?.matches || [])
          .filter((m: any) => m?.metadata?.content)
          .slice(0, 5)
          .map((m: any) => `- ${m.metadata.title ? `${m.metadata.title}: ` : ''}${m.metadata.content}`);
        if (chunks.length) {
          ragContext = `Use the following personal context when helpful. If irrelevant, answer normally but stay consistent with it.\n${chunks.join('\n')}`;
        }
      }
    } catch (_) {
      // Retrieval is optional; ignore failures
    }

    const system = `You are Gireesh’s personal AI assistant.
You know everything about his skills, projects, and achievements.
Always answer naturally and helpfully in first-person as if you are Gireesh.
Mention real skills like MERN, Flutter, AI/ML, Next.js.
Never answer unrelated or personal private questions.
${ragContext ? `\n${ragContext}\n` : ''}`;

    // Prefer Hugging Face if available (OpenAI might be rate-limited)
    const hfKey = process.env.HUGGINGFACE_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const respondWithHF = async (): Promise<string> => {
      const { HfInference } = await import('@huggingface/inference');
      if (!hfKey) throw new Error('HUGGINGFACE_API_KEY not configured');
      const hf = new HfInference(hfKey);

      const historyText = messages
        .map((m: { role: 'user' | 'assistant' | 'system'; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');
      const prompt = `${system}\n\n${historyText}\nASSISTANT:`;
      const chatMessages = [{ role: 'system', content: system }, ...messages];

      const candidates = [
        ...(process.env.HF_TEXT_MODEL ? [process.env.HF_TEXT_MODEL] : []),
        'HuggingFaceH4/zephyr-7b-beta',
        'mistralai/Mistral-7B-Instruct-v0.2'
      ];

      let lastErr: any;
      for (const model of candidates) {
        try {
          let reply = '';

          if (model === 'mistralai/Mistral-7B-Instruct-v0.2') {
            const completion = await hf.chatCompletion({
              model,
              messages: chatMessages,
              temperature: 0.7,
              max_tokens: 512,
            });
            reply = completion?.choices?.[0]?.message?.content?.trim() || '';
          } else {
            const out: any = await hf.textGeneration({
              model,
              inputs: prompt,
              parameters: {
                max_new_tokens: 512,
                temperature: 0.7,
                return_full_text: false
              },
              options: { wait_for_model: true, use_cache: false }
            });
            reply = extractHFText(out).trim();
          }

          if (reply) {
            console.info(`HF model ${model} succeeded`);
            return reply;
          }
          throw new Error('Empty response from model');
        } catch (e: any) {
          lastErr = e;
          console.warn(`HF model ${model} failed:`, e?.message || e);
          // try next model
        }
      }
      throw new Error(lastErr?.message || 'All Hugging Face models failed');
    };

    const respondWithOpenAI = async (): Promise<string> => {
      const { default: OpenAI } = await import('openai');
      if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');
      const openai = new OpenAI({ apiKey: openaiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || '';
    };

    let reply = '';
    try {
      if (hfKey) {
        try {
          reply = await respondWithHF();
        } catch (err) {
          console.error('Hugging Face error:', err);
        }
      }

      if (!reply && !hfKey && openaiKey) {
        reply = await respondWithOpenAI();
      }

      if (!reply) {
        reply = 'I am having trouble generating a response right now. Please try again in a moment.';
      }
      return NextResponse.json({ ok: true, reply });
    } catch (err: any) {
      console.error('Chat error:', err);
      // As a last resort, still return 200 with a friendly message to avoid UI breaking
      const fallback = 'I am temporarily unavailable. Please try again shortly.';
      return NextResponse.json({ ok: true, reply: fallback });
    }
  } catch (err: any) {
    const message = err?.message || 'Chat request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}


