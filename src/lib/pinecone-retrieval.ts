const APPROVED_PRIVATE_SOURCE_IDS = [
  'v2_private_family_history',
  'v2_private_emotional_reactions',
  'v2_private_relationships_boundaries',
  'v2_private_lifestyle_daily_routine',
  'v2_private_family_financial_vow',
] as const;

const OWNER_INTRO_SOURCE_ID = 'owner_who_is_girish_intro_001';

function isGeneralIdentityQuestion(question: string) {
  const normalized = question.toLowerCase().replace(/[’']/g, '').replace(/[?!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(who is|who are) (girish|gireesh)( veeranki)?$/.test(normalized)
    || /^(who are you|introduce yourself|introduce (girish|gireesh)( veeranki)?)$/.test(normalized);
}

type PineconeRecordFields = {
  title?: string;
  category?: string;
  year?: number;
  content?: string;
};

type PineconeSearchResponse = {
  result?: { hits?: Array<{ fields?: PineconeRecordFields }> };
};

function config() {
  const apiKey = process.env.PINECONE_API_KEY;
  const host = process.env.PINECONE_HOST?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!apiKey || !host) {
    throw new Error('PINECONE_API_KEY and PINECONE_HOST must be configured on the server');
  }
  return { apiKey, host };
}

export async function retrievePortfolioContext(question: string): Promise<string> {
  const { apiKey, host } = config();
  const identityQuestion = isGeneralIdentityQuestion(question);
  const response = await fetch(`https://${host}/records/namespaces/portfolio/search`, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      'X-Pinecone-Api-Version': '2025-10',
    },
    body: JSON.stringify({
      query: {
        top_k: identityQuestion ? 1 : 5,
        inputs: { text: question },
        filter: identityQuestion
          ? { source_id: { $eq: OWNER_INTRO_SOURCE_ID } }
          : {
              $or: [
                { visibility: { $eq: 'public' } },
                { source_id: { $in: [...APPROVED_PRIVATE_SOURCE_IDS] } },
              ],
          },
      },
      fields: ['title', 'category', 'year', 'content'],
    }),
  });
  if (!response.ok) throw new Error(`Pinecone search failed (${response.status})`);
  const result = (await response.json()) as PineconeSearchResponse;
  return (result.result?.hits ?? [])
    .map(({ fields }) => {
      const content = fields?.content?.trim();
      if (!content) return '';
      const heading = [fields?.title, fields?.category, fields?.year]
        .filter((part) => part !== null && part !== undefined && String(part).trim())
        .join(' | ');
      return `${heading}\n${content}`;
    })
    .filter(Boolean)
    .join('\n\n');
}
