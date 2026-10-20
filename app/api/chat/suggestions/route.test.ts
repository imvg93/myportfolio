/** @jest-environment node */

import { GET } from './route';

jest.mock('@/lib/auth-session', () => ({
  getAuthSession: jest.fn(),
  getSessionToken: jest.fn(() => 'session-token'),
}));
jest.mock('@/lib/monitoring', () => ({ consumeOtpRateLimit: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/portfolio-context', () => ({
  loadPublicPortfolioRecords: jest.fn().mockResolvedValue([
    { title: 'AI Portfolio Assistant', category: 'Project', year: 2026, content: 'A portfolio chatbot using retrieval augmented generation.' },
  ]),
  formatPortfolioContext: jest.fn(() => 'AI Portfolio Assistant | Project | 2026\nA portfolio chatbot using retrieval augmented generation.'),
}));
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ suggestions: [
        { label: 'Explore My Projects', question: 'Which projects are represented in the portfolio?' },
        { label: 'Discover My AI Work', question: 'How does the AI assistant find portfolio information?' },
        { label: 'Explore My Technical Skills', question: 'Which technologies appear in the portfolio projects?' },
      ] }) } }],
    }) } },
  })),
}));

import { getAuthSession } from '@/lib/auth-session';
import { consumeOtpRateLimit } from '@/lib/monitoring';

describe('GET /api/chat/suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    (getAuthSession as jest.Mock).mockResolvedValue({ email: 'visitor@example.com' });
    (consumeOtpRateLimit as jest.Mock).mockResolvedValue(true);
  });

  it('returns questions generated from portfolio records for an authenticated visitor', async () => {
    const response = await GET(new Request('http://localhost/api/chat/suggestions'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      suggestions: [
        { label: 'Explore My Projects', question: 'Which projects are represented in the portfolio?' },
        { label: 'Discover My AI Work', question: 'How does the AI assistant find portfolio information?' },
        { label: 'Explore My Technical Skills', question: 'Which technologies appear in the portfolio projects?' },
      ],
    });
    expect(consumeOtpRateLimit).toHaveBeenCalledWith('visitor@example.com', 'chat_starter_suggestions', 10, 3600);
  });

  it('does not generate suggestions without an authenticated session', async () => {
    (getAuthSession as jest.Mock).mockResolvedValueOnce(null);
    const response = await GET(new Request('http://localhost/api/chat/suggestions'));

    expect(response.status).toBe(401);
    expect(consumeOtpRateLimit).not.toHaveBeenCalled();
  });
});
