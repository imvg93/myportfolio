const APPROVED_PRIVATE_SOURCE_IDS = [
  'v2_private_relationships_boundaries',
  'v2_private_lifestyle_daily_routine',
  'v2_private_family_financial_vow',
  'gireesh_personal_profile',
  'gireesh_college_life',
  'gireesh_friendships',
  'gireesh_temple_visits_and_personal_faith',
  'gireesh_twin_ai_inspiration',
  'gireesh_personal_routine_weekdays',
  'gireesh_personal_routine_weekend',
  'gireesh_devices_accessories',
  'gireesh_gaming_interests',
  'gireesh_home_ownership_goal',
] as const;
const PERSONAL_LIFE_ATTENDANCE_SOURCE_ID = 'gireesh_college_attendance_context_restricted';

// Exclude these even if stale Pinecone metadata or Supabase visibility calls them public.
const OWNER_PRIVATE_FAMILY_SOURCE_IDS = [
  'v2_private_family_history',
  'v2_private_emotional_reactions',
  'owner_restricted_family_history',
  'owner_restricted_emotional_reactions',
  'girish_qa_027',
  'bio_002',
  'bio_003',
  'detail_family_private',
] as const;

const OWNER_INTRO_SOURCE_ID = 'owner_who_is_girish_intro_001';
const EDUCATION_PROFILE_SOURCE_ID = 'gireesh_education_knowledge_20261021';
const EDUCATION_RESTRICTED_SOURCE_ID = 'gireesh_education_attendance_backlogs_20261021';
const EDUCATION_SOURCE_IDS = [
  EDUCATION_PROFILE_SOURCE_ID,
  EDUCATION_RESTRICTED_SOURCE_ID,
  // Older education records can contain conflicting or broader information.
  'v2_education_schooling',
  'v2_education_college',
  'detail_education',
] as const;

type EducationQueryMode = 'none' | 'profile' | 'restricted';

function latestQuestion(query: string) {
  const marker = query.match(/Current visitor question:\s*([\s\S]*)$/i);
  return (marker?.[1] ?? query).trim();
}

function hasEducationTopic(text: string) {
  return /\b(?:educat\w*|stud(?:y|ies|ied|ying)|school(?:ing)?|college|university|universit\w*|10th|intermediate|MPC|CGPA|GPA|grade points?|marks?|exam(?:ination)?|EAMCET|EAPCET|rank|degree|undergraduate|bachelor'?s?|NRI Institute|Sri Chaitanya|MNR|Balaji Vidhyalayam|engineering degree|ECE degree)\b/i.test(text);
}

function educationQueryMode(query: string): EducationQueryMode {
  const current = latestQuestion(query);
  const restrictedTopic = /\b(?:attendance|attend\w*|absen(?:t|ce|ces)|backlogs?|arrears?)\b/i.test(current);
  if (restrictedTopic) return 'restricted';
  if (hasEducationTopic(current)) return 'profile';

  // Resolve only clear short follow-ups against the immediately preceding
  // visitor topic. A fresh explicit topic (e.g. projects or backend) wins.
  const switchesTopic = /\b(?:project|backend|frontend|technology|technologies|skills?|career|job|experience|database|AI|RAG|architecture|contact)\b/i.test(current);
  const isFollowUp = /^(?:and\s+)?(?:what else|what about (?:it|that|them|those|the second one|the first one)|how about (?:it|that|the second one|the first one)|tell me more|why(?: did you choose that)?|can you explain that|explain that|more about (?:it|that))\??$/i.test(current);
  if (switchesTopic || !isFollowUp) return 'none';

  const previousVisitorMessages = Array.from(query.matchAll(/Visitor:\s*([^\n]*)/g), (match) => match[1]);
  const previousQuestion = previousVisitorMessages.at(-1) ?? '';
  return hasEducationTopic(previousQuestion) ? 'profile' : 'none';
}

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
  section?: string;
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
  const educationMode = educationQueryMode(question);
  const filter = identityQuestion
    ? { source_id: { $eq: OWNER_INTRO_SOURCE_ID } }
    : educationMode !== 'none'
      ? {
          source_id: {
            $in: educationMode === 'restricted'
              ? [EDUCATION_PROFILE_SOURCE_ID, EDUCATION_RESTRICTED_SOURCE_ID, 'gireesh_college_life', PERSONAL_LIFE_ATTENDANCE_SOURCE_ID]
              : [EDUCATION_PROFILE_SOURCE_ID, 'gireesh_college_life'],
          },
        }
      : {
          $and: [
            {
              $or: [
                { visibility: { $eq: 'public' } },
                { source_id: { $in: [...APPROVED_PRIVATE_SOURCE_IDS] } },
              ],
            },
            { source_id: { $nin: [...OWNER_PRIVATE_FAMILY_SOURCE_IDS, ...EDUCATION_SOURCE_IDS] } },
          ],
        };
  const current = latestQuestion(question);
  const isFollowUp = /^(?:and\s+)?(?:what else|what about (?:it|that|them|those|the second one|the first one)|how about (?:it|that|the second one|the first one)|tell me more|why(?: did you choose that)?|can you explain that|explain that|more about (?:it|that))\??$/i.test(current);
  const searchInput = isFollowUp ? question : current;

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
        inputs: { text: searchInput },
        filter,
      },
      fields: ['title', 'category', 'year', 'content', 'section'],
    }),
  });
  if (!response.ok) throw new Error(`Pinecone search failed (${response.status})`);
  const result = (await response.json()) as PineconeSearchResponse;
  const aiProjectQuestion = /\b(?:ai portfolio|portfolio ai|portfolio chatbot|portfolio assistant|ai chatbot|ai assistant|chat assistant|rag|semantic retrieval|embedding pipeline|ai project|chatbot architecture)\b/i.test(question);
  return (result.result?.hits ?? [])
    .map(({ fields }) => {
      let content = fields?.content?.trim();
      if (!content) return '';

      // This draft describes an older 384-dimensional embedding design. Keep
      // it out of current-chat architecture answers, where it conflicts with
      // the verified integrated-index configuration in the system prompt.
      if (aiProjectQuestion && content.includes('AI Portfolio Data and Semantic Retrieval Pipeline')) {
        try {
          const parsed = JSON.parse(content) as { featured_projects?: Array<{ name?: string }> };
          if (Array.isArray(parsed.featured_projects)) {
            const currentProjects = parsed.featured_projects.filter(
              (project) => project.name !== 'AI Portfolio Data and Semantic Retrieval Pipeline',
            );
            content = currentProjects.length ? JSON.stringify({ featured_projects: currentProjects }, null, 2) : '';
          }
        } catch {
          content = '';
        }
        if (!content) return '';
      }

      const heading = [fields?.title, fields?.category, fields?.year]
        .filter((part) => part !== null && part !== undefined && String(part).trim())
        .join(' | ');
      return `${heading}\n${content}`;
    })
    .filter(Boolean)
    .join('\n\n');
}
