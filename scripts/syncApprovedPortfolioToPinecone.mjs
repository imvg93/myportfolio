import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config({ path: '.env.local' });
dotenv.config();

const privateIds = [
  'v2_private_family_history',
  'v2_private_emotional_reactions',
  'v2_private_relationships_boundaries',
  'v2_private_lifestyle_daily_routine',
  'v2_private_family_financial_vow',
];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
const supabaseKey = required('SUPABASE_SERVICE_ROLE_KEY');
const pineconeKey = required('PINECONE_API_KEY');
const pineconeHost = required('PINECONE_HOST').replace(/^https?:\/\//, '').replace(/\/$/, '');
const dimension = Number(process.env.PINECONE_DIMENSION || '384');
if (!Number.isInteger(dimension) || dimension < 1) throw new Error('PINECONE_DIMENSION must be a positive integer');
const openai = new OpenAI({ apiKey: required('OPENAI_API_KEY') });

async function loadRecords(filter) {
  const url = new URL(`${supabaseUrl}/rest/v1/portfolio_data`);
  url.searchParams.set('select', 'source_id,title,category,year,content,visibility');
  url.searchParams.set('limit', '1000');
  for (const [key, value] of Object.entries(filter)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  if (!response.ok) throw new Error(`Supabase record fetch failed (${response.status})`);
  return response.json();
}

const publicRows = await loadRecords({ visibility: 'eq.public' });
const privateRows = await loadRecords({
  visibility: 'eq.private',
  source_id: `in.(${privateIds.join(',')})`,
});
const records = [...publicRows, ...privateRows].filter((record) =>
  record.visibility === 'public' || (record.visibility === 'private' && privateIds.includes(record.source_id)),
);
if (!records.length) throw new Error('No approved portfolio records found in Supabase');

const vectors = [];
for (let offset = 0; offset < records.length; offset += 50) {
  const batch = records.slice(offset, offset + 50);
  const inputs = batch.map((record) =>
    [record.title, record.category, record.year, record.content].filter(Boolean).join('\n'),
  );
  const embedded = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: inputs,
    dimensions: dimension,
  });
  for (let i = 0; i < batch.length; i += 1) {
    const record = batch[i];
    const values = embedded.data[i]?.embedding;
    if (!values || values.length !== dimension) throw new Error('Embedding dimension does not match PINECONE_DIMENSION');
    vectors.push({
      id: record.source_id,
      values,
      metadata: {
        source_id: record.source_id,
        visibility: record.visibility,
        ...(record.title ? { title: record.title } : {}),
        ...(record.category ? { category: record.category } : {}),
        ...(record.year !== null && record.year !== undefined ? { year: record.year } : {}),
        ...(record.content ? { content: record.content } : {}),
      },
    });
  }
}

for (let offset = 0; offset < vectors.length; offset += 100) {
  const response = await fetch(`https://${pineconeHost}/vectors/upsert`, {
    method: 'POST',
    headers: { 'Api-Key': pineconeKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ namespace: 'portfolio', vectors: vectors.slice(offset, offset + 100) }),
  });
  if (!response.ok) throw new Error(`Pinecone upsert failed (${response.status}): ${await response.text()}`);
}

console.log(`Synced ${vectors.length} approved portfolio records to Pinecone namespace "portfolio".`);
