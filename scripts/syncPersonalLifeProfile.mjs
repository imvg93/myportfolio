import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const inputPath = process.argv[2] ?? '/Users/chanti/Downloads/gireesh_personal_life_profile.json';
const dryRun = process.argv.includes('--dry-run');
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const profile = source?.personal_profile;
const college = source?.college_life;
const friendships = source?.friendships;
const faith = source?.temple_visits_and_personal_faith;
if (!profile || !college || !friendships || !faith) {
  throw new Error('The profile JSON is missing one or more expected sections.');
}

const rows = [
  {
    source_id: 'gireesh_personal_profile', title: 'Gireesh’s Personal Profile', category: 'Personal profile', visibility: 'private',
    content: [
      `Name: ${profile.name}`,
      `Language preference: ${profile.language_preference}`,
      ...(profile.response_guidelines?.instructions ?? []).map((item) => `Response preference: ${item}`),
    ].join('\n'),
  },
  {
    source_id: 'gireesh_college_life', title: 'Gireesh’s College Life', category: 'Personal profile', visibility: 'private',
    content: [
      `Social personality: ${college.social_personality}`,
      `Hostel life: ${college.hostel_life}`,
      `Student identity: ${college.student_identity}`,
      'Do not portray a quiet personality or backbencher identity as a personal failure.',
    ].join('\n'),
  },
  {
    source_id: 'gireesh_college_attendance_context_restricted', title: 'Gireesh’s College Attendance (Explicit Questions Only)', category: 'Education — context restricted', visibility: 'private',
    content: `Context-restricted detail. Use only when the visitor explicitly asks about Gireesh’s college attendance or absences. Do not volunteer or hint at it in a general education answer.\n${college.attendance}`,
  },
  {
    source_id: 'gireesh_friendships', title: 'Gireesh’s Friendships', category: 'Personal profile', visibility: 'private',
    content: [
      `Closest long-term friend: ${friendships.closest_long_term_friend.name}. ${friendships.closest_long_term_friend.how_they_met} ${friendships.closest_long_term_friend.current_connection}`,
      friendships.other_friends,
      friendships.view_on_friendship,
      'Village or neighborhood friends: no names or relationships are specified in the supplied profile. Do not infer these from family names or other friendships.',
      'Near his home, Gireesh does not usually roam outside and keeps a very small social circle. The supplied profile does not name people in this circle. Do not volunteer names or confirm a specific person belongs to this circle unless an approved record explicitly states that exact connection.',
    ].join('\n'),
  },
  {
    source_id: 'gireesh_temple_visits_and_personal_faith', title: 'Gireesh’s Temple Visits and Personal Faith', category: 'Personal profile', visibility: 'private',
    content: [
      faith.history,
      faith.january_2012,
      faith.recent_visits,
      faith.personal_reflection,
      faith.response_guideline,
      `Favorite deity: ${faith.favorite_deity?.value ?? 'not specified; do not guess.'}`,
    ].join('\n'),
  },
];

console.log(`Prepared ${rows.length} private profile records from ${inputPath}.`);
console.log(`Stable record IDs: ${rows.map(({ source_id }) => source_id).join(', ')}`);
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

const savedResponse = await fetch(`${supabaseUrl}/rest/v1/portfolio_data?on_conflict=source_id`, {
  method: 'POST', headers,
  body: JSON.stringify(rows.map((row) => ({ ...row, updated_at: new Date().toISOString() }))),
});
if (!savedResponse.ok) throw new Error(`Supabase upsert failed (${savedResponse.status}).`);
const saved = await savedResponse.json();
if (!Array.isArray(saved) || saved.length !== rows.length) {
  throw new Error(`Supabase confirmed ${saved?.length ?? 0} of ${rows.length} profile records.`);
}
console.log(`Supabase: saved and confirmed ${saved.length} private profile records.`);

const readUrl = new URL(`${supabaseUrl}/rest/v1/portfolio_data`);
readUrl.searchParams.set('select', 'source_id,title,category,content,visibility');
readUrl.searchParams.set('source_id', `in.(${ids.join(',')})`);
readUrl.searchParams.set('visibility', 'eq.private');
const readResponse = await fetch(readUrl, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
if (!readResponse.ok) throw new Error(`Supabase read-back failed (${readResponse.status}); records are saved but Pinecone sync did not run.`);
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
const pineconeResponse = await fetch(`https://${pineconeHost}/records/namespaces/portfolio/upsert`, {
  method: 'POST',
  headers: { 'Api-Key': pineconeKey, 'Content-Type': 'application/x-ndjson', 'X-Pinecone-Api-Version': '2025-10' },
  body: pineconeRows.map((row) => JSON.stringify(row)).join('\n'),
});
if (!pineconeResponse.ok) {
  throw new Error(`Pinecone upsert failed (${pineconeResponse.status}); Supabase records are saved and this script can be rerun.`);
}
console.log(`Pinecone: integrated embedding upsert accepted for ${pineconeRows.length} private records.`);

const verifyResponse = await fetch(`https://${pineconeHost}/records/namespaces/portfolio/search`, {
  method: 'POST',
  headers: { 'Api-Key': pineconeKey, 'Content-Type': 'application/json', 'X-Pinecone-Api-Version': '2025-10' },
  body: JSON.stringify({
    query: { top_k: ids.length, inputs: { text: 'Gireesh personal profile college friends temple' }, filter: { source_id: { $in: ids } } },
    fields: ['source_id', 'visibility'],
  }),
});
if (!verifyResponse.ok) throw new Error(`Pinecone accepted the upsert, but verification failed (${verifyResponse.status}).`);
const result = await verifyResponse.json();
const found = new Set((result?.result?.hits ?? []).map((hit) => hit?.fields?.source_id).filter(Boolean));
console.log(`Pinecone read-back: found ${found.size} of ${ids.length} profile record IDs.`);
if (found.size !== ids.length) throw new Error('Pinecone read-back has not found every profile record yet.');
