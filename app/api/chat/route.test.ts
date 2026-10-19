/** @jest-environment node */

import { POST } from './route';
import { storeChatTurn } from '@/lib/mongodb';
import { buildPortfolioSystemPrompt, formatPortfolioContext, loadPublicPortfolioRecords } from '@/lib/portfolio-context';

jest.mock('@/lib/mongodb', () => ({
  storeChatTurn: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/portfolio-context', () => ({
  buildPortfolioSystemPrompt: jest.fn((context: string) => `Portfolio context:\n${context}`),
  formatPortfolioContext: jest.fn(() => 'Approved public profile context'),
  loadPublicPortfolioRecords: jest.fn().mockResolvedValue([
    { title: 'Projects', category: 'Engineering', year: null, content: 'Built portfolio projects.' },
  ]),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'OpenAI reply' } }],
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

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  afterAll(() => {
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  });

  it('uses OpenAI with public Supabase context and stores the reply with verified email', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const response = await POST(chatRequest('verified_user=Visitor%40Example.com'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ reply: 'OpenAI reply' });
    expect(loadPublicPortfolioRecords).toHaveBeenCalledTimes(1);
    expect(formatPortfolioContext).toHaveBeenCalledTimes(1);
    expect(buildPortfolioSystemPrompt).toHaveBeenCalledWith('Approved public profile context');
    expect(storeChatTurn).toHaveBeenCalledWith(
      conversationId,
      'visitor@example.com',
      'What have you built?',
      'OpenAI reply',
    );
  });

  it('stores a friendly fallback when OpenAI is not configured', async () => {
    const response = await POST(chatRequest('verified_user=visitor%40example.com'));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.reply).toBe('The chatbot is not configured yet. Please try again later.');
    expect(loadPublicPortfolioRecords).not.toHaveBeenCalled();
    expect(storeChatTurn).toHaveBeenCalledWith(
      conversationId,
      'visitor@example.com',
      'What have you built?',
      result.reply,
    );
  });

  it('rejects requests without a valid verified email before calling OpenAI or MongoDB', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const response = await POST(chatRequest('verified_user=not-an-email'));

    expect(response.status).toBe(401);
    expect(loadPublicPortfolioRecords).not.toHaveBeenCalled();
    expect(storeChatTurn).not.toHaveBeenCalled();
  });

  it('rejects invalid conversation IDs before loading context or logging', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const invalidPayload = {
      conversationId: 'not-a-uuid',
      messages: [{ role: 'user', content: 'Question' }],
    };

    const response = await POST(chatRequest('verified_user=visitor%40example.com', invalidPayload));

    expect(response.status).toBe(400);
    expect(loadPublicPortfolioRecords).not.toHaveBeenCalled();
    expect(storeChatTurn).not.toHaveBeenCalled();
  });
});
