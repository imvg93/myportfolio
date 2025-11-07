(function () {
	'use strict';

	const dotenv = require('dotenv');
	dotenv.config();

	const { Pinecone } = require('@pinecone-database/pinecone');
	const { HfInference } = require('@huggingface/inference');

	const EXPECTED_DIMENSION = 384;

	function requireEnvVar(name) {
		const value = (process.env[name] || '').trim();
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

	function delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function httpFetch(url, options) {
		if (typeof fetch === 'function') {
			return fetch(url, options);
		}
		const mod = await import('node-fetch');
		return mod.default(url, options);
	}

	function toSingleVector(maybeMatrix) {
		if (Array.isArray(maybeMatrix) && maybeMatrix.length > 0 && Array.isArray(maybeMatrix[0])) {
			// average across token embeddings -> single sentence vector
			const length = maybeMatrix[0].length;
			const sums = new Array(length).fill(0);
			for (let i = 0; i < maybeMatrix.length; i++) {
				const tokenVec = maybeMatrix[i];
				for (let j = 0; j < length; j++) sums[j] += Number(tokenVec[j] || 0);
			}
			return sums.map((s) => s / maybeMatrix.length);
		}
		return maybeMatrix;
	}

	async function getEmbeddingFromHF({ hf, model, text }) {
		// Prefer official client; it handles router endpoints internally
		const output = await hf.featureExtraction({
			model,
			inputs: String(text),
			options: { wait_for_model: true }
		});
		const vector = toSingleVector(output);
		if (!Array.isArray(vector) || vector.some((v) => typeof v !== 'number')) {
			throw new Error('Unexpected embedding format from Hugging Face');
		}
		return vector;
	}

	async function main() {
		const pineconeApiKey = requireEnvVar('PINECONE_API_KEY');
		const pineconeIndexName = requireEnvVar('PINECONE_INDEX_NAME');
		const pineconeEnvironment = requireEnvVar('PINECONE_ENVIRONMENT');
		const hfApiKey = requireEnvVar('HUGGINGFACE_API_KEY');
		const supabaseJsonUrl = ensureValidUrl(requireEnvVar('SUPABASE_JSON_URL'));

		console.log('Starting upload to Pinecone using Hugging Face embeddings...');
		console.log(`Index: ${pineconeIndexName}`);
		console.log(`Environment: ${pineconeEnvironment}`);

		const pinecone = new Pinecone({ apiKey: pineconeApiKey });
		const index = pinecone.index(pineconeIndexName);
		const hf = new HfInference(hfApiKey);

		const response = await httpFetch(supabaseJsonUrl, { method: 'GET', cache: 'no-store' });
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
			const record = items[i] || {};
			const { id, title, category, year, content } = record;

			if (!id || !content) {
				console.warn(`Skipping item at index ${i}: missing id or content.`);
				skippedCount++;
				continue;
			}

			try {
				const embedding = await getEmbeddingFromHF({ hf, model: 'sentence-transformers/all-MiniLM-L6-v2', text: String(content) });
				if (embedding.length !== EXPECTED_DIMENSION) {
					console.warn(`ID ${id}: embedding dimension ${embedding.length} != ${EXPECTED_DIMENSION}`);
				}

				const metadata = { content: String(content) };
				if (typeof title === 'string' && title.trim().length) metadata.title = title;
				if (typeof category === 'string' && category.trim().length) metadata.category = category;
				const yearNum = typeof year === 'number' ? year : (year ? Number(year) : undefined);
				if (typeof yearNum === 'number' && !Number.isNaN(yearNum)) metadata.year = yearNum;

				await index.upsert([
					{
						id: String(id),
						values: embedding,
						metadata
					}
				]);

				uploadedCount++;
				const displayTitle = title || `ID ${id}`;
				console.log(`Uploaded: ${displayTitle} ✅ (${uploadedCount}/${items.length})`);
			} catch (err) {
				failedCount++;
				console.error(`Failed to process ID ${id}:`, err?.message || err);
			}

			const pause = 300 + Math.floor(Math.random() * 201); // 300–500ms
			await delay(pause);
		}

		try {
			const stats = await index.describeIndexStats();
			const total = (stats && (stats.totalVectorCount ?? (stats.namespaces ? Object.values(stats.namespaces).reduce((sum, ns) => sum + (ns?.vectorCount || 0), 0) : undefined))) ?? 'unknown';
			console.log(`\nCompleted. Uploaded: ${uploadedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);
			console.log(`Total vectors in index "${pineconeIndexName}": ${total}`);
		} catch (err) {
			console.warn('Could not retrieve index stats.', err?.message || err);
			console.log(`\nCompleted. Uploaded: ${uploadedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);
		}

		console.log('✅ All data uploaded successfully to Pinecone');
	}

	main().catch((err) => {
		console.error('Fatal error:', err?.message || err);
		process.exit(1);
	});
})();

