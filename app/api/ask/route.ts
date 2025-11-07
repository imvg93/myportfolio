import { NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
	question: z.string().min(1, 'Question is required'),
});

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const FALLBACK_MODEL = 'gpt-4o-mini';
const PRIMARY_MODEL = 'gpt-5';

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function toSingleVector(embedding: any): number[] {
	if (Array.isArray(embedding) && embedding.length > 0 && Array.isArray(embedding[0])) {
		const length = embedding[0].length;
		const sums = new Array(length).fill(0);
		for (let i = 0; i < embedding.length; i++) {
			const row = embedding[i];
			for (let j = 0; j < length; j++) {
				sums[j] += Number(row[j] || 0);
			}
		}
		return sums.map((sum) => sum / embedding.length);
	}
	return embedding as number[];
}

async function embedQuestion(question: string): Promise<number[]> {
	const hfKey = process.env.HUGGINGFACE_API_KEY;
	if (!hfKey) {
		throw new Error('HUGGINGFACE_API_KEY missing. Set it to generate embeddings that match Pinecone index.');
	}
	const { HfInference } = await import('@huggingface/inference');
	const hf = new HfInference(hfKey);
	const embedding = await hf.featureExtraction({
		model: EMBEDDING_MODEL,
		inputs: question,
		options: { wait_for_model: true },
	});
	const vector = toSingleVector(embedding);
	if (!Array.isArray(vector) || vector.some((v) => typeof v !== 'number')) {
		throw new Error('Invalid embedding response from Hugging Face.');
	}
	return vector;
}

function formatContext(matches: Array<any>): { context: string; sources: Array<any> } {
	if (!matches?.length) {
		return {
			context: 'No relevant context retrieved from Pinecone.',
			sources: [],
		};
	}

	const sources = matches.map((match, index) => {
		const metadata = match?.metadata ?? {};
		return {
			index,
			id: match?.id ?? null,
			score: match?.score ?? null,
			metadata,
		};
	});

	const context = matches
		.map((match, idx) => {
			const metadata = match?.metadata ?? {};
			const title = metadata.title || `Source ${idx + 1}`;
			const year = metadata.year ? ` (Year: ${metadata.year})` : '';
			const content = metadata.content || '';
			return `${title}${year}\n${content}`.trim();
		})
		.filter(Boolean)
		.join('\n\n');

	return {
		context: context || 'No relevant context retrieved from Pinecone.',
		sources,
	};
}

interface GenerateAnswerArgs {
	question: string;
	context: string;
	model: string;
	openai: any;
}

async function generateAnswer({ question, context, model, openai }: GenerateAnswerArgs): Promise<string> {
	const messages = [
		{
			role: 'system' as const,
			content: 'You are Gireesh’s personal AI. Answer based only on his life data provided in the context. If the answer is not in the context, say you do not have that information.',
		},
		{
			role: 'user' as const,
			content: `Context:\n${context}\n\nQuestion: ${question}`,
		},
	];

	const response = await openai.chat.completions.create({
		model,
		messages,
		temperature: 0.7,
	});

	return response.choices?.[0]?.message?.content?.trim() || '';
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { question } = BodySchema.parse(body);

		const pineconeApiKey = requireEnv('PINECONE_API_KEY');
		const pineconeEnv = requireEnv('PINECONE_ENVIRONMENT');
		const pineconeIndexName = requireEnv('PINECONE_INDEX_NAME');
		const openAiKey = requireEnv('OPENAI_API_KEY');

		console.log('🔍 Generating embedding for question...');
		const vector = await embedQuestion(question);

		console.log('🔌 Connecting to Pinecone...');
		const { Pinecone } = await import('@pinecone-database/pinecone');
		const pinecone = new Pinecone({ apiKey: pineconeApiKey });
		const index = pinecone.index(pineconeIndexName);

		console.log(`🔍 Searching Pinecone... (env: ${pineconeEnv})`);
		const queryResponse = await index.query({
			vector,
			topK: 5,
			includeMetadata: true,
			filter: undefined,
		});

		const matches = queryResponse?.matches ?? [];
		const { context, sources } = formatContext(matches);

		console.log('🤖 Initializing OpenAI...');
		const { default: OpenAI } = await import('openai');
		const openai = new OpenAI({ apiKey: openAiKey });
		console.log('✅ GPT-5 connected');

		let answer = '';
		try {
			answer = await generateAnswer({ question, context, model: PRIMARY_MODEL, openai });
			console.log('💬 Generated reply with GPT-5');
		} catch (err) {
			console.warn('⚠️ GPT-5 failed, falling back to gpt-4o-mini:', err);
			answer = await generateAnswer({ question, context, model: FALLBACK_MODEL, openai });
			console.log('💬 Generated reply with gpt-4o-mini');
		}

		if (!answer) {
			answer = 'I could not generate an answer based on the available context.';
		}

		return NextResponse.json({ answer, sources });
	} catch (err: any) {
		console.error('❌ /api/ask error:', err);
		const message = err?.message || 'Unexpected error processing request';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}


