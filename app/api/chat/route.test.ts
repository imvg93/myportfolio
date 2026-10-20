/** @jest-environment node */

import { POST } from './route';
import { buildPortfolioSystemPrompt } from '@/lib/portfolio-context';
import { getAuthSession } from '@/lib/auth-session';
import { retrievePortfolioContext } from '@/lib/pinecone-retrieval';
import { ensureChatConversation, recordChatMessage } from '@/lib/monitoring';

let mockOpenAiShouldFail = false;
let mockCurrentSearchShouldFail = false;
let mockSuggestionsPayload: unknown = null;

jest.mock('@/lib/auth-session', () => ({
  getAuthSession: jest.fn(),
  getSessionToken: (request: Request) => {
    const match = request.headers.get('cookie')?.match(/(?:^|;\s*)verified_session=([^;]+)/);
    return match?.[1] ?? null;
  },
}));
jest.mock('@/lib/monitoring', () => ({
  ensureChatConversation: jest.fn().mockResolvedValue(true),
  hashSessionId: jest.fn(() => 'a'.repeat(64)),
  recordChatMessage: jest.fn().mockResolvedValue(undefined),
  safeMonitoringWrite: jest.fn(async (_label, operation) => { try { return await operation(); } catch { return undefined; } }),
}));
jest.mock('@/lib/portfolio-context', () => ({
  buildPortfolioSystemPrompt: jest.fn((context: string) => `Portfolio context:\n${context}`),
}));
jest.mock('@/lib/pinecone-retrieval', () => ({ retrievePortfolioContext: jest.fn().mockResolvedValue('Approved public profile context') }));
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn().mockImplementation((request: { response_format?: unknown }) => {
      if (mockOpenAiShouldFail) return Promise.reject(new Error('provider unavailable'));
      const content = request?.response_format
        ? mockSuggestionsPayload === null ? null : JSON.stringify(mockSuggestionsPayload)
        : 'OpenAI reply';
      return Promise.resolve({ choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } });
    }) } },
    responses: { create: jest.fn().mockImplementation(() => {
      if (mockCurrentSearchShouldFail) return Promise.reject(new Error('web search unavailable'));
      return Promise.resolve({
        output_text: 'The current answer is supported by search.',
        output: [{ type: 'message', content: [{
          type: 'output_text',
          annotations: [{ type: 'url_citation', title: 'Official source', url: 'https://example.com/current' }],
        }] }],
        usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
      });
    }) },
  })),
}));

const conversationId = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
function chatRequest(cookie?: string, payload?: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(payload ?? { conversationId, requestId, messages: [{ role: 'user', content: 'What have you built?' }] }),
  });
}

describe('/api/chat monitoring', () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  beforeEach(() => {
    jest.clearAllMocks(); mockOpenAiShouldFail = false; mockCurrentSearchShouldFail = false; mockSuggestionsPayload = null; delete process.env.OPENAI_API_KEY;
    (getAuthSession as jest.Mock).mockResolvedValue({ email: 'visitor@example.com', name: 'Visitor' });
    (ensureChatConversation as jest.Mock).mockResolvedValue(true);
    (recordChatMessage as jest.Mock).mockResolvedValue(undefined);
  });
  afterAll(() => {
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  });

  it('returns an AI reply and records both the visitor message and actual assistant reply', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, reply: 'OpenAI reply' });
    expect(retrievePortfolioContext).toHaveBeenCalledWith('What have you built?');
    expect(buildPortfolioSystemPrompt).toHaveBeenCalledWith('Approved public profile context', {
      includeVerifiedChatArchitecture: false,
    });
    expect(recordChatMessage).toHaveBeenCalledTimes(2);
    expect(recordChatMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({ role: 'user', content: 'What have you built?', generationStatus: 'received' }));
    expect(recordChatMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({ role: 'assistant', content: 'OpenAI reply', generationStatus: 'succeeded', totalTokens: 30 }));
  });

  it('uses recent conversation context to retrieve evidence for a project follow-up', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`, {
      conversationId,
      requestId,
      messages: [
        { role: 'user', content: 'Explain your AI portfolio project and its architecture.' },
        { role: 'assistant', content: 'The assistant uses retrieval over portfolio records.' },
        { role: 'user', content: 'What database does it use?' },
      ],
    }));
    expect(response.status).toBe(200);
    expect(retrievePortfolioContext).toHaveBeenCalledWith(expect.stringContaining('Explain your AI portfolio project'));
    expect(retrievePortfolioContext).toHaveBeenCalledWith(expect.stringContaining('Current visitor question: What database does it use?'));
    expect(buildPortfolioSystemPrompt).toHaveBeenCalledWith('Approved public profile context', {
      includeVerifiedChatArchitecture: true,
    });
  });

  it('keeps suggestions on the personal topic and filters mismatched categories', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    mockSuggestionsPayload = {
      activeTopic: 'personal_background_and_interests',
      suggestions: [
        { topic: 'personal_background_and_interests', question: 'What motivates him?' },
        { topic: 'technical_skills_and_technologies', question: 'Which technologies does he use?' },
      ],
    };
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`, {
      conversationId,
      requestId,
      messages: [{ role: 'user', content: 'Tell me about your personal background.' }],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      suggestions: ['What motivates him?'],
    });
  });

  it('preserves the active topic for short follow-ups such as "what else?"', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    mockSuggestionsPayload = {
      activeTopic: 'hobbies_and_lifestyle',
      suggestions: [
        { topic: 'hobbies_and_lifestyle', question: 'What other interests does he have?' },
        { topic: 'education_and_learning', question: 'Where did he study?' },
      ],
    };
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`, {
      conversationId,
      requestId,
      messages: [
        { role: 'user', content: 'What do you like doing in your free time?' },
        { role: 'assistant', content: 'He enjoys several activities.' },
        { role: 'user', content: 'What else?' },
      ],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      suggestions: ['What other interests does he have?'],
    });
    expect(retrievePortfolioContext).toHaveBeenCalledWith(expect.stringContaining('Current visitor question: What else?'));
  });

  it('continues answering general knowledge questions', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`, {
      conversationId,
      requestId,
      messages: [{ role: 'user', content: 'What is artificial intelligence?' }],
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, reply: 'OpenAI reply' });
    expect(retrievePortfolioContext).toHaveBeenCalledWith('What is artificial intelligence?');
    expect(buildPortfolioSystemPrompt).toHaveBeenCalledWith('Approved public profile context', {
      includeVerifiedChatArchitecture: false,
    });
  });

  it('records a failed assistant response if OpenAI is unavailable', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key'; mockOpenAiShouldFail = true;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.reply).toContain('trouble generating');
    expect(recordChatMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({ role: 'assistant', generationStatus: 'failed', errorCode: 'provider_error' }));
    jest.restoreAllMocks();
  });

  it('does not send a chat turn when the user message cannot be saved', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    (recordChatMessage as jest.Mock).mockRejectedValue(new Error('database unavailable'));
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`));
    expect(response.status).toBe(503);
    expect(recordChatMessage).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });

  it('does not return an AI answer that failed to persist', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    (recordChatMessage as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('database unavailable'));
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`));
    expect(response.status).toBe(503);
    expect(recordChatMessage).toHaveBeenCalledTimes(2);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });

  it('uses web search and returns citations for current or changing facts', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`, {
      conversationId,
      requestId,
      messages: [{ role: 'user', content: 'Who is the current presdent?' }],
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.reply).toContain('The current answer is supported by search.');
    expect(body.reply).toContain('[Official source](https://example.com/current)');
    expect(recordChatMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({
      role: 'assistant', generationStatus: 'succeeded', model: 'gpt-4.1', totalTokens: 35,
    }));
  });

  it('does not guess current facts when web search fails', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    mockCurrentSearchShouldFail = true;
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`, {
      conversationId,
      requestId,
      messages: [{ role: 'user', content: 'Who is the current president?' }],
    }));
    expect(response.status).toBe(200);
    expect(recordChatMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({
      role: 'assistant', generationStatus: 'succeeded', model: 'gpt-4o',
    }));
  });

  it('does not allow one email to reuse another email’s conversation ID', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    (ensureChatConversation as jest.Mock).mockResolvedValue(false);
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`));
    expect(response.status).toBe(403);
    expect(retrievePortfolioContext).not.toHaveBeenCalled();
  });

  it('rejects invalid input and unauthenticated requests', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const invalid = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`, { conversationId: 'bad', messages: [] }));
    expect(invalid.status).toBe(400);
    (getAuthSession as jest.Mock).mockResolvedValue(null);
    const unauthorized = await POST(chatRequest('verified_user=forged@example.com'));
    expect(unauthorized.status).toBe(401);
  });
});
