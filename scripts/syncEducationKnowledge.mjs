import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Pass the education JSON file path as the first argument.');
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (source?.record_type !== 'education_knowledge' || !source.education) {
  throw new Error('Input must be an education_knowledge JSON file.');
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

const education = source.education;
const schoolLines = (education.school_history ?? []).map((school) => {
  const result = school.class_10_result
    ? `; class 10 result: ${school.class_10_result.value} ${school.class_10_result.unit}`
    : '';
  return `${school.stage}: ${school.institution}, ${school.location ?? 'location not supplied'}${result}.`;
});
const intermediate = education.intermediate;
const entrance = education.entrance_exam;
const degree = education.undergraduate_degree;
const profileContent = [
  `Education information supplied by ${source.person?.name ?? 'Gireesh Veeranki'}:`,
  ...schoolLines,
  intermediate && `Intermediate: ${intermediate.institution}; first year ${intermediate.first_year.value} ${intermediate.first_year.unit}; second year ${intermediate.second_year.value} ${intermediate.second_year.unit}. The exact grading scale was not supplied.`,
  entrance && `${entrance.name}: reported rank ${entrance.rank_display ?? entrance.rank}. Exam year not supplied.`,
  degree && `Undergraduate degree: ${degree.field} (${degree.abbreviation}) at ${degree.institution}. The reason for choosing the institution was not supplied.`,
  'Class 4 appears in both reported school ranges; retain the ranges as provided without inferring transition dates.',
].filter(Boolean).join('\n');

const profileId = 'gireesh_education_knowledge_20261021';
const restrictedId = 'gireesh_education_attendance_backlogs_20261021';
const profileTitle = 'Gireesh’s Education Background';
const restrictedTitle = 'Gireesh’s Attendance and Backlog Details (Explicit Questions Only)';
const restrictedContent = [
  'Context-restricted education details. Use this record only when the visitor explicitly asks about attendance, absences, backlogs, or arrears. Do not volunteer or hint at these facts in a general education answer.',
  ...(source.private_or_context_restricted_details?.details ?? []),
].join('\n');
const now = new Date().toISOString();
const rows = [
  { source_id: profileId, title: profileTitle, category: 'Education', year: null, content: profileContent, visibility: 'public', updated_at: now },
  { source_id: restrictedId, title: restrictedTitle, category: 'Education — context restricted', year: null, content: restrictedContent, visibility: 'private', updated_at: now },
];

const supabaseHeaders = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=representation',
};
const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/portfolio_data?on_conflict=source_id`, {
  method: 'POST',
  headers: supabaseHeaders,
  body: JSON.stringify(rows),
});
if (!upsertResponse.ok) {
  console.error(`Supabase upsert failed (HTTP ${upsertResponse.status}).`);
  process.exit(1);
}
const storedRows = await upsertResponse.json();
if (!Array.isArray(storedRows) || storedRows.length !== rows.length) {
  throw new Error('Supabase did not confirm both education records.');
}
console.log(`Supabase: upserted and confirmed ${storedRows.length} education records.`);

const pineconeRecords = rows.map((row) => ({
  _id: row.source_id,
  text: [row.title, row.category, row.content].join('\n'),
  source_id: row.source_id,
  visibility: row.visibility,
  title: row.title,
  category: row.category,
  content: row.content,
}));
const pineconeResponse = await fetch(`https://${pineconeHost}/records/namespaces/portfolio/upsert`, {
  method: 'POST',
  headers: {
    'Api-Key': pineconeKey,
    'Content-Type': 'application/x-ndjson',
    'X-Pinecone-Api-Version': '2025-10',
  },
  body: pineconeRecords.map((record) => JSON.stringify(record)).join('\n'),
});
if (!pineconeResponse.ok) {
  console.error(`Pinecone upsert failed (HTTP ${pineconeResponse.status}); Supabase records were saved and the Pinecone sync can be safely retried.`);
  process.exit(1);
}
console.log(`Pinecone: upsert request accepted for ${pineconeRecords.length} education records in namespace "portfolio".`);

const verificationResponse = await fetch(`https://${pineconeHost}/records/namespaces/portfolio/search`, {
  method: 'POST',
  headers: {
    'Api-Key': pineconeKey,
    'Content-Type': 'application/json',
    'X-Pinecone-Api-Version': '2025-10',
  },
  body: JSON.stringify({
    query: {
      top_k: 5,
      inputs: { text: 'Gireesh school college education CGPA EAMCET attendance backlogs' },
      filter: { source_id: { $in: [profileId, restrictedId] } },
    },
    fields: ['source_id', 'title', 'category', 'content', 'visibility'],
  }),
});
if (!verificationResponse.ok) {
  console.error(`Pinecone upsert was accepted, but read-back verification failed (HTTP ${verificationResponse.status}).`);
  process.exit(1);
}
const verification = await verificationResponse.json();
const verifiedIds = new Set((verification?.result?.hits ?? []).map((hit) => hit?.fields?.source_id).filter(Boolean));
console.log(`Pinecone read-back: found ${verifiedIds.size} of ${rows.length} education record IDs.`);
