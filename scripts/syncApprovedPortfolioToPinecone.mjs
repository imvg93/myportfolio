import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const privateIds = [
  'v2_private_relationships_boundaries',
  'v2_private_lifestyle_daily_routine',
  'v2_private_family_financial_vow',
];
const ownerPrivateFamilyIds = new Set([
  'v2_private_family_history',
  'v2_private_emotional_reactions',
  'owner_restricted_family_history',
  'owner_restricted_emotional_reactions',
  'girish_qa_027',
  'family_background_raw_private_20261020',
  'bio_002',
  'bio_003',
  'detail_family_private',
]);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
const supabaseKey = required('SUPABASE_SERVICE_ROLE_KEY');
const pineconeKey = required('PINECONE_API_KEY');
const pineconeHost = required('PINECONE_HOST').replace(/^https?:\/\//, '').replace(/\/$/, '');

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
  !ownerPrivateFamilyIds.has(record.source_id)
  && (record.visibility === 'public' || (record.visibility === 'private' && privateIds.includes(record.source_id))),
);
if (!records.length) throw new Error('No approved portfolio records found in Supabase');

for (let offset = 0; offset < records.length; offset += 50) {
  const batch = records.slice(offset, offset + 50).map((record) => ({
      _id: record.source_id,
      text: [record.title, record.category, record.year, record.content].filter(Boolean).join('\n'),
      source_id: record.source_id,
      visibility: record.visibility,
      ...(record.title ? { title: record.title } : {}),
      ...(record.category ? { category: record.category } : {}),
      ...(record.year !== null && record.year !== undefined ? { year: record.year } : {}),
      ...(record.content ? { content: record.content } : {}),
    }));
  const response = await fetch(`https://${pineconeHost}/records/namespaces/portfolio/upsert`, {
    method: 'POST',
    headers: {
      'Api-Key': pineconeKey,
      'Content-Type': 'application/x-ndjson',
      'X-Pinecone-Api-Version': '2025-10',
    },
    body: batch.map((record) => JSON.stringify(record)).join('\n'),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Pinecone integrated upsert failed (${response.status}): ${detail}`);
  }
}

console.log(`Synced ${records.length} approved portfolio records to Pinecone namespace "portfolio" using integrated embeddings.`);
