/** @jest-environment node */

import { retrievePortfolioContext } from './pinecone-retrieval';

describe('retrievePortfolioContext', () => {
  const originalHost = process.env.PINECONE_HOST;
  const originalKey = process.env.PINECONE_API_KEY;

  beforeEach(() => {
    process.env.PINECONE_HOST = 'test.pinecone.io';
    process.env.PINECONE_API_KEY = 'test-key';
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(() => {
    if (originalHost === undefined) delete process.env.PINECONE_HOST;
    else process.env.PINECONE_HOST = originalHost;
    if (originalKey === undefined) delete process.env.PINECONE_API_KEY;
    else process.env.PINECONE_API_KEY = originalKey;
  });

  it('filters the superseded embedding draft from current AI-project answers', async () => {
    const staleDraft = {
      featured_projects: [
        {
          name: 'AI Portfolio Data and Semantic Retrieval Pipeline',
          answer: 'The old draft claims a 384-dimensional MiniLM index.',
        },
        { name: 'Datavalley Coding & Assessment Platform', answer: 'Other project facts remain available.' },
      ],
    };
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ result: { hits: [{ fields: {
        title: 'Technical Portfolio Profile',
        category: 'Technical portfolio',
        section: 'featured_projects',
        content: JSON.stringify(staleDraft),
      } }] } }),
    } as Response);

    const context = await retrievePortfolioContext('Explain the AI portfolio project architecture');

    expect(context).toContain('Datavalley Coding & Assessment Platform');
    expect(context).not.toContain('MiniLM');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test.pinecone.io/records/namespaces/portfolio/search',
      expect.objectContaining({
        body: expect.stringContaining('"section"'),
      }),
    );
  });

  it('retrieves only the education profile for a specific education question', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ result: { hits: [] } }),
    } as Response);

    await retrievePortfolioContext('Tell me about Gireesh’s studies and CGPA');

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody.query.filter).toEqual({
      source_id: { $in: ['gireesh_education_knowledge_20261021'] },
    });
  });

  it('includes attendance/backlog details only for explicit questions about them', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ result: { hits: [] } }),
    } as Response);

    await retrievePortfolioContext('Did he have any backlogs?');

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody.query.filter).toEqual({
      source_id: { $in: [
        'gireesh_education_knowledge_20261021',
        'gireesh_education_attendance_backlogs_20261021',
      ] },
    });
  });

  it('keeps education out of unrelated queries but carries it through a clear short follow-up', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ result: { hits: [] } }),
    } as Response);

    await retrievePortfolioContext('What AI projects has Gireesh built?');
    let requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody.query.filter.$and[1].source_id.$nin).toContain('gireesh_education_knowledge_20261021');

    fetchMock.mockClear();
    await retrievePortfolioContext('Visitor: Which college did Gireesh attend?\nAssistant: He studied at a college.\nCurrent visitor question: What else?');
    requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody.query.filter).toEqual({
      source_id: { $in: ['gireesh_education_knowledge_20261021'] },
    });
  });
});
