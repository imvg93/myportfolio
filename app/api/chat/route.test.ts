/** @jest-environment node */

import { POST } from './route';
import { storeChatTurn } from '@/lib/mongodb';
import { buildPortfolioSystemPrompt } from '@/lib/portfolio-context';
import { getAuthSession } from '@/lib/auth-session';
import { retrievePortfolioContext } from '@/lib/pinecone-retrieval';

let mockOpenAiShouldFail = false;

jest.mock('@/lib/auth-session', () => ({
  getAuthSession: jest.fn(),
  getSessionToken: (request: Request) => {
    const match = request.headers.get('cookie')?.match(/(?:^|;\s*)verified_session=([^;]+)/);
    return match?.[1] ?? null;
  },
}));

// This spy stands in for the Mongo helper: chat requests must never call it.
jest.mock('@/lib/mongodb', () => ({
  storeChatTurn: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/portfolio-context', () => ({
  buildPortfolioSystemPrompt: jest.fn((context: string) => `Portfolio context:\n${context}`),
}));

jest.mock('@/lib/pinecone-retrieval', () => ({
  retrievePortfolioContext: jest.fn().mockResolvedValue('Approved public profile context'),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockImplementation(() => {
          if (mockOpenAiShouldFail) return Promise.reject(new Error('provider unavailable'));
          return Promise.resolve({ choices: [{ message: { content: 'OpenAI reply' } }] });
        }),
      },
    },
  })),
}));

const conversationId = '11111111-1111-4111-8111-111111111111';

function chatRequest(cookie?: string, payload?: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(payload ?? {
      conversationId,
      messages: [{ role: 'user', content: 'What have you built?' }],
    }),
  });
}

describe('/api/chat', () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalMongoUri = process.env.MONGODB_URI;
  const originalMongoDatabase = process.env.MONGODB_DATABASE;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAiShouldFail = false;
    delete process.env.OPENAI_API_KEY;
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_DATABASE;
    (getAuthSession as jest.Mock).mockResolvedValue({ email: 'visitor@example.com', name: 'Visitor' });
  });

  afterAll(() => {
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
    if (originalMongoUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalMongoUri;
    if (originalMongoDatabase === undefined) delete process.env.MONGODB_DATABASE;
    else process.env.MONGODB_DATABASE = originalMongoDatabase;
  });

  it('returns an OpenAI reply with MongoDB unavailable and never attempts transcript persistence', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, reply: 'OpenAI reply' });
    expect(retrievePortfolioContext).toHaveBeenCalledWith('What have you built?');
    expect(buildPortfolioSystemPrompt).toHaveBeenCalledWith('Approved public profile context');
    expect(storeChatTurn).not.toHaveBeenCalled();
  });

  it('returns the configured fallback when OpenAI is not configured without MongoDB', async () => {
    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.reply).toBe('The chatbot is not configured yet. Please try again later.');
    expect(retrievePortfolioContext).not.toHaveBeenCalled();
    expect(storeChatTurn).not.toHaveBeenCalled();
  });

  it('returns the existing friendly fallback when the AI provider fails', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    mockOpenAiShouldFail = true;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.reply).toBe('I am having trouble generating a response right now. Please try again in a moment.');
    expect(storeChatTurn).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('rejects a forged legacy email cookie before calling the AI provider or MongoDB', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    (getAuthSession as jest.Mock).mockResolvedValue(null);

    const response = await POST(chatRequest('verified_user=not-an-email'));

    expect(response.status).toBe(401);
    expect(retrievePortfolioContext).not.toHaveBeenCalled();
    expect(storeChatTurn).not.toHaveBeenCalled();
  });

  it('rejects invalid conversation IDs before loading context or attempting MongoDB persistence', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const invalidPayload = {
      conversationId: 'not-a-uuid',
      messages: [{ role: 'user', content: 'Question' }],
    };

    const response = await POST(chatRequest(`verified_session=${'a'.repeat(43)}`, invalidPayload));

    expect(response.status).toBe(400);
    expect(retrievePortfolioContext).not.toHaveBeenCalled();
    expect(storeChatTurn).not.toHaveBeenCalled();
  });
});
