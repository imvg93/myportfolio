import 'dotenv/config';
import fetch from 'node-fetch';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const SUPABASE_JSON_URL = (process.env.SUPABASE_JSON_URL || '').trim();
const OPENAI_MODEL = 'text-embedding-3-small';

function requireEnvVar(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function ensureValidUrl(url) {
	if (!url) {
		throw new Error('SUPABASE_JSON_URL is missing. Provide a full public or signed object URL in .env');
	}
	try {
		const u = new URL(url);
		if (!u.protocol || !u.host) throw new Error('invalid');
		return u.toString();
	} catch (_) {
		throw new Error('SUPABASE_JSON_URL is not a valid URL. Ensure it is one line and not ending with ?');
	}
}

async function main() {
	const openaiApiKey = requireEnvVar('OPENAI_API_KEY');
	const pineconeApiKey = requireEnvVar('PINECONE_API_KEY');
	const pineconeIndexName = requireEnvVar('PINECONE_INDEX_NAME');
	// Optional for older setups; not required for serverless client but kept per request
	const pineconeEnvironment = process.env.PINECONE_ENVIRONMENT || 'us-east1-gcp';

	console.log('Starting upload to Pinecone...');
	console.log(`Index: ${pineconeIndexName}`);
	console.log(`Environment: ${pineconeEnvironment}`);

	const openai = new OpenAI({ apiKey: openaiApiKey });
	const pinecone = new Pinecone({ apiKey: pineconeApiKey });
	const index = pinecone.index(pineconeIndexName);

	const jsonUrl = ensureValidUrl(SUPABASE_JSON_URL);
	const response = await fetch(jsonUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch JSON. HTTP ${response.status} ${response.statusText}`);
	}
	const items = await response.json();
	if (!Array.isArray(items)) {
		throw new Error('Expected JSON to be an array of items.');
	}

	let uploadedCount = 0;
	let skippedCount = 0;
	let failedCount = 0;

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const { id, title, category, year, content } = item || {};

		if (!id || !content) {
			console.warn(`Skipping item at index ${i}: missing id or content.`);
			skippedCount++;
			continue;
		}

		try {
			const embeddingResponse = await openai.embeddings.create({
				model: OPENAI_MODEL,
				input: String(content)
			});
			const vector = embeddingResponse.data?.[0]?.embedding;
			if (!Array.isArray(vector)) {
				throw new Error('No embedding returned.');
			}

			await index.upsert([
				{
					id: String(id),
					values: vector,
					metadata: {
						title: title ?? null,
						category: category ?? null,
						year: typeof year === 'number' ? year : (year ? Number(year) : null),
						content: String(content)
					}
				}
			]);

			uploadedCount++;
			const displayTitle = title || `ID ${id}`;
			console.log(`Uploaded: ${displayTitle} ✅ (${uploadedCount}/${items.length})`);
		} catch (err) {
			failedCount++;
			console.error(`Failed to process ID ${id}:`, err?.message || err);
		}
	}

	// Fetch index stats to confirm upload
	try {
		const stats = await index.describeIndexStats();
		const total = (stats && (stats.totalVectorCount ?? (stats.namespaces ? Object.values(stats.namespaces).reduce((sum, ns) => sum + (ns?.vectorCount || 0), 0) : undefined))) ?? 'unknown';
		console.log(`\nCompleted. Uploaded: ${uploadedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);
		console.log(`Total vectors in index "${pineconeIndexName}": ${total}`);
	} catch (err) {
		console.warn('Could not retrieve index stats.', err?.message || err);
		console.log(`\nCompleted. Uploaded: ${uploadedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);
	}
}

main().catch((err) => {
	console.error('Fatal error:', err?.message || err);
	process.exit(1);
});


