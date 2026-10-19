import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const apiKey = required('PINECONE_API_KEY');
const currentName = required('PINECONE_INDEX_NAME');
const targetName = process.env.PINECONE_INTEGRATED_INDEX_NAME?.trim()
  || (currentName.endsWith('-integrated') ? currentName : `${currentName}-integrated`);
if (!/^[a-z0-9](?:[a-z0-9-]{0,43}[a-z0-9])?$/.test(targetName)) {
  throw new Error('PINECONE_INTEGRATED_INDEX_NAME must be 1–45 lowercase letters, numbers, or hyphens');
}

const controlHeaders = {
  'Api-Key': apiKey,
  'Content-Type': 'application/json',
  'X-Pinecone-Api-Version': '2025-10',
};

async function describeIndex(name) {
  const response = await fetch(`https://api.pinecone.io/indexes/${encodeURIComponent(name)}`, {
    headers: controlHeaders,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Pinecone index lookup failed (${response.status})`);
  return response.json();
}

const current = await describeIndex(currentName);
if (!current?.spec?.serverless) throw new Error('The current Pinecone index must be a serverless index');

let target = await describeIndex(targetName);
if (!target) {
  const createResponse = await fetch('https://api.pinecone.io/indexes', {
    method: 'POST',
    headers: controlHeaders,
    body: JSON.stringify({
      name: targetName,
      vector_type: 'dense',
      dimension: 1024,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: current.spec.serverless.cloud,
          region: current.spec.serverless.region,
        },
      },
      embed: {
        model: 'llama-text-embed-v2',
        field_map: { text: 'text' },
        write_parameters: { input_type: 'passage', truncate: 'END' },
        read_parameters: { input_type: 'query', truncate: 'END' },
      },
    }),
  });
  if (!createResponse.ok) throw new Error(`Pinecone integrated index creation failed (${createResponse.status})`);
  target = await describeIndex(targetName);
}

if (target && !target.embed) {
  const configureResponse = await fetch(`https://api.pinecone.io/indexes/${encodeURIComponent(targetName)}`, {
    method: 'PATCH',
    headers: controlHeaders,
    body: JSON.stringify({
      embed: {
        model: 'llama-text-embed-v2',
        field_map: { text: 'text' },
        write_parameters: { input_type: 'passage', truncate: 'END' },
        read_parameters: { input_type: 'query', truncate: 'END' },
      },
    }),
  });
  if (!configureResponse.ok) {
    const detail = await configureResponse.text();
    throw new Error(`Pinecone embedding configuration failed (${configureResponse.status}): ${detail}`);
  }
  target = await describeIndex(targetName);
}

if (target.embed?.model !== 'llama-text-embed-v2' || target.dimension !== 1024) {
  throw new Error('Target index exists but is not configured for the expected Pinecone embedding model and dimension');
}

for (let attempt = 0; (!target.status?.ready || target.embed?.model !== 'llama-text-embed-v2') && attempt < 60; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  target = await describeIndex(targetName);
  if (!target) throw new Error('Pinecone target index disappeared while waiting for readiness');
}
if (!target.status?.ready || target.embed?.model !== 'llama-text-embed-v2' || !target.host) {
  throw new Error('Pinecone integrated index did not become ready in time');
}

process.env.PINECONE_HOST = target.host;
process.env.PINECONE_INDEX_NAME = targetName;
await import('./syncApprovedPortfolioToPinecone.mjs');

const statsResponse = await fetch(`https://${target.host}/describe_index_stats`, {
  method: 'POST',
  headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
if (!statsResponse.ok) throw new Error(`Pinecone index verification failed (${statsResponse.status})`);
const stats = await statsResponse.json();
const indexedCount = stats.namespaces?.portfolio?.vectorCount ?? 0;
if (!indexedCount) throw new Error('Pinecone reports no indexed records in the portfolio namespace');

console.log(JSON.stringify({
  integratedIndex: targetName,
  host: target.host,
  model: target.embed.model,
  dimension: target.dimension,
  namespace: 'portfolio',
  indexedRecords: indexedCount,
  originalIndexPreserved: currentName,
}));
