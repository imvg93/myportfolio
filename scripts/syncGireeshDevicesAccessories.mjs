import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const inputPath = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  ?? '/Users/chanti/Downloads/gireesh_devices_accessories.json';
const dryRun = process.argv.includes('--dry-run');
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const devices = source?.personal_devices_and_accessories;
const gaming = source?.gaming_interests_and_future_plans?.gaming_preferences;
const home = source?.gaming_interests_and_future_plans?.home_ownership_and_goal;
if (!devices?.phone || !devices?.laptop || !Array.isArray(devices?.watches)
  || !Array.isArray(devices?.speakers_and_smart_home_accessories) || !devices?.tablet
  || !gaming || !home) {
  throw new Error('The JSON is missing expected device, gaming, or home-goal sections.');
}

const rows = [
  {
    source_id: 'gireesh_devices_accessories',
    title: 'Gireesh’s Devices and Accessories',
    category: 'Personal profile — devices',
    content: [
      `Phone: ${devices.phone.brand} ${devices.phone.model}; ${devices.phone.note}`,
      `Laptop: ${devices.laptop.brand} ${devices.laptop.model}.`,
      `Watches: ${devices.watches.map(({ brand, model }) => `${brand}${model ? ` ${model}` : ''}`).join(', ')}. Exact watch models were not specified.`,
      `Tablet: ${devices.tablet.brand} ${devices.tablet.model}. Gireesh uses his iPad to read articles, watch movies, and play PUBG.`,
      `Speakers and smart-home accessories: ${devices.speakers_and_smart_home_accessories.map(({ brand, product, model, note }) => `${brand} ${product ?? 'smart speaker'}${model ? ` (${model})` : ''}${note ? ` — ${note}` : ''}`).join('; ')}.`,
      'Do not guess exact device generations, model names, or specifications that are not stated.',
    ].join('\n'),
    visibility: 'private',
  },
  {
    source_id: 'gireesh_gaming_interests',
    title: 'Gireesh’s Gaming Interests and Plans',
    category: 'Personal profile — interests',
    content: [
      `Interests: ${gaming.interests.join(', ')}. ${gaming.description}`,
      `Future plan: ${gaming.future_purchase_plan}`,
      `Ownership status: ${gaming.ownership_status}`,
    ].join('\n'),
    visibility: 'private',
  },
  {
    source_id: 'gireesh_home_ownership_goal',
    title: 'Gireesh’s Home Ownership Goal',
    category: 'Personal profile — personal goal',
    content: [
      `Current status: ${home.current_status}`,
      `Goal: ${home.goal}`,
      `Target: ${home.target_date}`,
      `Uncertainty: ${home.uncertainty}`,
      home.positive_description,
    ].join('\n'),
    visibility: 'private',
  },
];

console.log(`Prepared ${rows.length} private device and personal-interest records from ${inputPath}.`);
console.log(`Record IDs: ${rows.map(({ source_id }) => source_id).join(', ')}`);
if (dryRun) {
  console.log('Dry run complete. No Supabase or Pinecone changes were made.');
  process.exit(0);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
const supabaseKey = required('SUPABASE_SERVICE_ROLE_KEY');
const pineconeKey = required('PINECONE_API_KEY');
const pineconeHost = required('PINECONE_HOST').replace(/^https?:\/\//, '').replace(/\/$/, '');
const ids = rows.map(({ source_id }) => source_id);
const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=representation',
};

const saveResponse = await fetch(`${supabaseUrl}/rest/v1/portfolio_data?on_conflict=source_id`, {
  method: 'POST',
  headers,
  body: JSON.stringify(rows.map((row) => ({ ...row, updated_at: new Date().toISOString() }))),
});
if (!saveResponse.ok) throw new Error(`Supabase upsert failed (${saveResponse.status}).`);
const saved = await saveResponse.json();
if (!Array.isArray(saved) || saved.length !== rows.length) {
  throw new Error(`Supabase confirmed ${saved?.length ?? 0} of ${rows.length} records.`);
}
console.log(`Supabase: saved and confirmed ${saved.length} private records.`);

const readUrl = new URL(`${supabaseUrl}/rest/v1/portfolio_data`);
readUrl.searchParams.set('select', 'source_id,title,category,year,content,visibility');
readUrl.searchParams.set('source_id', `in.(${ids.join(',')})`);
readUrl.searchParams.set('visibility', 'eq.private');
const readResponse = await fetch(readUrl, {
  headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
});
if (!readResponse.ok) throw new Error(`Supabase read-back failed (${readResponse.status}); Pinecone sync did not run.`);
const stored = await readResponse.json();
if (stored.length !== rows.length || stored.some((row) => row.visibility !== 'private')) {
  throw new Error('Supabase read-back did not confirm every record as private; stopping before Pinecone.');
}

const pineconeRows = stored.map((row) => ({
  _id: row.source_id,
  text: [row.title, row.category, row.content].filter(Boolean).join('\n'),
  source_id: row.source_id,
  title: row.title,
  category: row.category,
  content: row.content,
  visibility: row.visibility,
}));
const upsertResponse = await fetch(`https://${pineconeHost}/records/namespaces/portfolio/upsert`, {
  method: 'POST',
  headers: { 'Api-Key': pineconeKey, 'Content-Type': 'application/x-ndjson', 'X-Pinecone-Api-Version': '2025-10' },
  body: pineconeRows.map((row) => JSON.stringify(row)).join('\n'),
});
if (!upsertResponse.ok) {
  throw new Error(`Pinecone upsert failed (${upsertResponse.status}); Supabase records are saved and this script can be rerun.`);
}
console.log(`Pinecone: integrated embedding upsert accepted for ${pineconeRows.length} private records.`);

const verifyResponse = await fetch(`https://${pineconeHost}/records/namespaces/portfolio/search`, {
  method: 'POST',
  headers: { 'Api-Key': pineconeKey, 'Content-Type': 'application/json', 'X-Pinecone-Api-Version': '2025-10' },
  body: JSON.stringify({
    query: { top_k: ids.length, inputs: { text: 'Gireesh phone laptop watches iPad HomePod gaming home goal' }, filter: { source_id: { $in: ids } } },
    fields: ['source_id', 'visibility'],
  }),
});
if (!verifyResponse.ok) throw new Error(`Pinecone accepted the upsert, but verification failed (${verifyResponse.status}).`);
const result = await verifyResponse.json();
const found = new Set((result?.result?.hits ?? []).map((hit) => hit?.fields?.source_id).filter(Boolean));
console.log(`Pinecone read-back: found ${found.size} of ${ids.length} record IDs.`);
if (found.size !== ids.length) throw new Error('Pinecone read-back has not found every record yet.');
