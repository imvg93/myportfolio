import OpenAI from 'openai';

const APPROVED_PRIVATE_SOURCE_IDS = [
  'v2_private_family_history',
  'v2_private_emotional_reactions',
  'v2_private_relationships_boundaries',
  'v2_private_lifestyle_daily_routine',
  'v2_private_family_financial_vow',
] as const;

type PineconeMatch = {
  metadata?: {
    title?: string;
    category?: string;
    year?: number;
    content?: string;
  };
};

function config() {
  const apiKey = process.env.PINECONE_API_KEY;
  const host = process.env.PINECONE_HOST?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const dimension = Number(process.env.PINECONE_DIMENSION || '384');
  if (!apiKey || !host) {
    throw new Error('PINECONE_API_KEY and PINECONE_HOST must be configured on the server');
  }
  if (!Number.isInteger(dimension) || dimension < 1) {
    throw new Error('PINECONE_DIMENSION must be a positive integer');
  }
  return { apiKey, host, dimension };
}

export async function retrievePortfolioContext(question: string): Promise<string> {
  const { apiKey, host, dimension } = config();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
    dimensions: dimension,
  });
  const vector = embedding.data[0]?.embedding;
  if (!vector || vector.length !== dimension) throw new Error('Embedding dimension does not match Pinecone configuration');

  const response = await fetch(`https://${host}/query`, {
    method: 'POST',
    headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      namespace: 'portfolio',
      vector,
      topK: 5,
      includeMetadata: true,
      filter: {
        $or: [
          { visibility: { $eq: 'public' } },
          { source_id: { $in: [...APPROVED_PRIVATE_SOURCE_IDS] } },
        ],
      },
    }),
  });
  if (!response.ok) throw new Error(`Pinecone query failed (${response.status})`);
  const result = (await response.json()) as { matches?: PineconeMatch[] };
  return (result.matches ?? [])
    .map(({ metadata }) => {
      const content = metadata?.content?.trim();
      if (!content) return '';
      const heading = [metadata?.title, metadata?.category, metadata?.year]
        .filter((part) => part !== null && part !== undefined && String(part).trim())
        .join(' | ');
      return `${heading}\n${content}`;
    })
    .filter(Boolean)
    .join('\n\n');
}
