import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const inputPath = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  ?? '/Users/chanti/Downloads/twin_ai_inspiration.json';
const dryRun = process.argv.includes('--dry-run');
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const inspiration = source?.twin_ai?.inspiration;
const routine = source?.personal_routine;
const rules = source?.current_activity_answering_rules;
if (typeof inspiration?.question !== 'string' || typeof inspiration?.answer !== 'string'
  || !routine?.weekdays || !routine?.saturday || !routine?.sunday
  || !Array.isArray(rules?.rules)) {
  throw new Error('The JSON is missing the expected Twin AI inspiration or routine sections.');
}

const rows = [
  {
    source_id: 'gireesh_twin_ai_inspiration',
    title: 'What Inspired Gireesh to Create Twin AI?',
    category: 'Personal profile',
    content: `${inspiration.question}\n${inspiration.answer}`,
    visibility: 'private',
  },
  {
    source_id: 'gireesh_personal_routine_weekdays',
    title: 'Gireesh’s Usual Weekday Routine',
    category: 'Personal profile — routine',
    content: [
      `Timezone: ${routine.timezone}`,
      `Days: ${routine.weekdays.days.join(', ')}`,
      ...routine.weekdays.schedule.map(({ start, end, activity, note }) =>
        `${start}–${end}: ${activity}${note ? ` — ${note}` : ''}`),
      ...rules.rules,
    ].join('\n'),
    visibility: 'private',
  },
  {
    source_id: 'gireesh_personal_routine_weekend',
    title: 'Gireesh’s Usual Weekend Routine',
    category: 'Personal profile — routine',
    content: [
      `Timezone: ${routine.timezone}`,
      `Saturday: ${JSON.stringify(routine.saturday)}`,
      `Sunday: ${JSON.stringify(routine.sunday)}`,
      `Routine notes: ${routine.sunday.notes}`,
      ...rules.rules,
    ].join('\n'),
    visibility: 'private',
  },
];

console.log(`Prepared ${rows.length} private Twin AI and routine records from ${inputPath}.`);
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
    query: { top_k: ids.length, inputs: { text: 'Gireesh Twin AI inspiration weekday weekend routine' }, filter: { source_id: { $in: ids } } },
    fields: ['source_id', 'visibility'],
  }),
});
if (!verifyResponse.ok) throw new Error(`Pinecone accepted the upsert, but verification failed (${verifyResponse.status}).`);
const result = await verifyResponse.json();
const found = new Set((result?.result?.hits ?? []).map((hit) => hit?.fields?.source_id).filter(Boolean));
console.log(`Pinecone read-back: found ${found.size} of ${ids.length} record IDs.`);
if (found.size !== ids.length) throw new Error('Pinecone read-back has not found every record yet.');
