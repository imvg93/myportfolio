#!/usr/bin/env node
/**
 * Upload a JSON file to Supabase, then embed it in Pinecone.
 *
 * What this script does, in order:
 *   1. Reads any JSON file: an array of records, a single record, or a nested
 *      object. With nested objects, each leaf value becomes a separate row.
 *      Common fields such as id/source_id, title/name, category, year,
 *      content/text/description are recognized. Other values are stored as
 *      readable JSON text.
 *   2. Gives each row a stable source_id based on the file name and JSON path.
 *   3. Upserts those rows into public.portfolio_data in Supabase. Upsert means
 *      rerunning this script updates matching source_id rows rather than
 *      creating duplicates.
 *   4. Reads the rows back from Supabase. Pinecone is populated from this
 *      response, so Supabase is the source for the embedding step.
 *   5. Sends text plus metadata to the integrated-embedding Pinecone index.
 *      Pinecone creates vectors from the `text` field; no separate embedding
 *      API or Hugging Face key is needed.
 *
 * Privacy: defaults to visibility=public, which makes records searchable by
 * the portfolio chatbot. Choose --visibility private to store them as private.
 * Review the source JSON before uploading it to real accounts.
 *
 * Prerequisites:
 *   - Root .env.local contains SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *     PINECONE_API_KEY, and PINECONE_HOST.
 *   - Supabase public.portfolio_data exists and has a unique source_id.
 *   - The Pinecone index behind PINECONE_HOST has integrated embeddings enabled
 *     and accepts the `text` field (same index used by the portfolio sync).
 *   - Node.js 18+ and the project's dotenv dependency are installed.
 *
 * Commands from the project root:
 *   node scripts/uploadPersonalityData.mjs --dry-run /path/to/file.json
 *   node scripts/uploadPersonalityData.mjs /path/to/file.json
 *   node scripts/uploadPersonalityData.mjs /path/to/file.json --visibility private
 *
 * Dry-run validates and prints a small preview without contacting either API.
 */

import dotenv from 'dotenv';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const visibilityArgIndex = args.indexOf('--visibility');
const visibilityValueIndex = visibilityArgIndex >= 0 ? visibilityArgIndex + 1 : -1;
const inlineVisibilityArg = args.find((arg) => arg.startsWith('--visibility='));
const visibility = visibilityArgIndex >= 0
  ? args[visibilityArgIndex + 1]
  : inlineVisibilityArg?.split('=', 2)[1] ?? 'public';
if (!['public', 'private'].includes(visibility)) {
  throw new Error('Use --visibility public or --visibility private.');
}
const inputPath = args.find((arg, index) => arg !== '--dry-run'
  && arg !== '--visibility'
  && index !== visibilityValueIndex
  && !arg.startsWith('--visibility='))
  ?? path.join(os.homedir(), 'Downloads', 'gireesh_personality.json');

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function asText(value) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function firstValue(object, keys) {
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null && object[key] !== '') return object[key];
  }
  return undefined;
}

function toRows(data, fileName, defaultVisibility) {
  const rows = [];
  const filePrefix = slug(path.basename(fileName, path.extname(fileName))) || 'json_upload';
  const commonContentKeys = ['content', 'text', 'body', 'description', 'summary'];

  function addRecord(value, recordPath) {
    const object = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const suppliedContent = firstValue(object, commonContentKeys);
    const pathLabel = recordPath.map((part) => String(part).replaceAll('_', ' ')).join(': ');
    const suppliedTitle = firstValue(object, ['title', 'name', 'heading', 'label']);
    const title = suppliedTitle === undefined
      ? (pathLabel || `${filePrefix} record ${rows.length + 1}`)
      : String(suppliedTitle);
    const extraFields = Object.fromEntries(Object.entries(object).filter(([key]) =>
      ![...commonContentKeys, 'title', 'name', 'heading', 'label', 'category', 'type', 'section',
        'source_id', 'id', 'key', 'slug', 'year', 'visibility'].includes(key),
    ));
    const content = suppliedContent === undefined
      ? asText(value)
      : [asText(suppliedContent), Object.keys(extraFields).length ? asText(extraFields) : undefined]
        .filter(Boolean).join('\n');
    if (!content?.trim()) return;

    const category = String(firstValue(object, ['category', 'type', 'section'])
      ?? recordPath[0]
      ?? filePrefix).replaceAll('_', ' ');
    const suppliedId = firstValue(object, ['source_id', 'id', 'key', 'slug']);
    const generatedId = recordPath.map((part) => slug(String(part))).filter(Boolean).join('_');
    const sourceId = `${filePrefix}_${slug(String(suppliedId ?? generatedId ?? rows.length + 1))}`;
    const yearValue = firstValue(object, ['year']);
    const row = {
      source_id: sourceId,
      title,
      category,
      content,
      visibility: defaultVisibility,
    };
    if (yearValue !== undefined && Number.isInteger(Number(yearValue))) row.year = Number(yearValue);
    rows.push(row);
  }

  function walk(value, recordPath = []) {
    if (Array.isArray(value)) {
      // A nested array is usually a field of a document (such as quotes or
      // traits), so keep it together. Arrays at the file root or under common
      // collection names are treated as lists of separate records.
      const collectionNames = new Set(['records', 'items', 'data', 'results', 'entries', 'documents']);
      const lastPathPart = String(recordPath.at(-1) ?? '').toLowerCase();
      if (recordPath.length > 1 && !collectionNames.has(lastPathPart)) {
        addRecord(value, recordPath);
        return;
      }
      value.forEach((item, index) => {
        addRecord(item, [...recordPath, index + 1]);
      });
      return;
    }
    if (value && typeof value === 'object') {
      const hasContentField = commonContentKeys.some((key) => value[key] !== undefined);
      if (hasContentField || recordPath.length >= 2) {
        addRecord(value, recordPath);
        return;
      }
      for (const [key, child] of Object.entries(value)) walk(child, [...recordPath, key]);
      return;
    }
    addRecord(value, recordPath.length ? recordPath : ['root']);
  }

  walk(data);
  if (!rows.length) throw new Error('No non-empty records were found in the JSON.');
  const ids = rows.map((row) => row.source_id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Generated duplicate source_id values; provide unique IDs in the input JSON or adjust its keys.');
  }
  return rows;
}

if (!fs.existsSync(inputPath)) throw new Error(`JSON file not found: ${inputPath}`);
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const rows = toRows(source, inputPath, visibility);
console.log(`Prepared ${rows.length} ${visibility} records from ${inputPath}.`);
console.log(`Example record: ${rows[0].source_id} — ${rows[0].title}`);
if (dryRun) {
  console.log('Dry run complete. No Supabase or Pinecone changes were made.');
  process.exit(0);
}

const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
const supabaseKey = required('SUPABASE_SERVICE_ROLE_KEY');
const pineconeKey = required('PINECONE_API_KEY');
const pineconeHost = required('PINECONE_HOST').replace(/^https?:\/\//, '').replace(/\/$/, '');
const now = new Date().toISOString();
const uploadRows = rows.map((row) => ({ ...row, updated_at: now }));
const supabaseHeaders = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=representation',
};

// Step 1: save/update the normalized records in Supabase.
const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/portfolio_data?on_conflict=source_id`, {
  method: 'POST',
  headers: supabaseHeaders,
  body: JSON.stringify(uploadRows),
});
if (!upsertResponse.ok) {
  console.error(`Supabase upsert failed (HTTP ${upsertResponse.status}). Check the table schema and credentials.`);
  process.exit(1);
}
const saved = await upsertResponse.json();
if (!Array.isArray(saved) || saved.length !== rows.length) {
  throw new Error(`Supabase confirmed ${saved?.length ?? 0} of ${rows.length} rows; stopping before Pinecone.`);
}
console.log(`Supabase: saved and confirmed ${saved.length} rows in public.portfolio_data.`);

// Step 2: read the saved rows back so Pinecone is populated from Supabase.
const readUrl = new URL(`${supabaseUrl}/rest/v1/portfolio_data`);
readUrl.searchParams.set('select', 'source_id,title,category,content,visibility');
readUrl.searchParams.set('source_id', `in.(${rows.map((row) => row.source_id).join(',')})`);
readUrl.searchParams.set('visibility', `eq.${visibility}`);
readUrl.searchParams.set('limit', String(rows.length + 1));
const readResponse = await fetch(readUrl, {
  headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
});
if (!readResponse.ok) {
  console.error(`Supabase read-back failed (HTTP ${readResponse.status}); rows are saved and Pinecone can be retried.`);
  process.exit(1);
}
const storedRows = await readResponse.json();
const expectedIds = new Set(rows.map((row) => row.source_id));
const records = storedRows.filter((row) => expectedIds.has(row.source_id) && row.visibility === visibility);
if (records.length !== rows.length) {
  throw new Error(`Supabase read-back returned ${records.length} of ${rows.length} ${visibility} rows; stopping before Pinecone.`);
}

// Step 3: Pinecone's integrated embedding endpoint embeds each record's text.
// Stable IDs make this an idempotent upsert, just like the Supabase operation.
const pineconeRecords = records.map((row) => ({
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
  headers: {
    'Api-Key': pineconeKey,
    'Content-Type': 'application/x-ndjson',
    'X-Pinecone-Api-Version': '2025-10',
  },
  body: pineconeRecords.map((record) => JSON.stringify(record)).join('\n'),
});
if (!pineconeResponse.ok) {
  const detail = (await pineconeResponse.text()).slice(0, 500);
  console.error(`Pinecone upsert failed (HTTP ${pineconeResponse.status}): ${detail}`);
  console.error('Supabase rows are saved. Rerun this script to safely retry the Pinecone upsert.');
  process.exit(1);
}
console.log(`Pinecone: integrated embedding upsert accepted for ${records.length} records in namespace "portfolio".`);

// Step 4: read back matching IDs to confirm Pinecone can retrieve the records.
const verifyResponse = await fetch(`https://${pineconeHost}/records/namespaces/portfolio/search`, {
  method: 'POST',
  headers: {
    'Api-Key': pineconeKey,
    'Content-Type': 'application/json',
    'X-Pinecone-Api-Version': '2025-10',
  },
  body: JSON.stringify({
    query: {
      top_k: Math.min(records.length, 100),
      inputs: { text: 'Gireesh personality values lifestyle family background' },
      filter: { source_id: { $in: [...expectedIds] } },
    },
    fields: ['source_id', 'title', 'visibility'],
  }),
});
if (!verifyResponse.ok) {
  console.error(`Pinecone accepted the upsert, but read-back failed (HTTP ${verifyResponse.status}).`);
  process.exit(1);
}
const verification = await verifyResponse.json();
const foundIds = new Set((verification?.result?.hits ?? []).map((hit) => hit?.fields?.source_id).filter(Boolean));
console.log(`Pinecone read-back: found ${foundIds.size} of ${records.length} records.`);
if (foundIds.size !== records.length) {
  console.error('Some records may not appear in the read-back query yet. Check the Pinecone namespace and index configuration.');
  process.exit(1);
}
console.log('Done. Supabase holds the source records; Pinecone holds their searchable embeddings.');
