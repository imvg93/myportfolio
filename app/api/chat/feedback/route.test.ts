/** @jest-environment node */

import { POST } from './route';
import { getAuthSession } from '@/lib/auth-session';
import { hashSessionId } from '@/lib/monitoring';
import { getSupabaseAdmin } from '@/lib/supabase';

const mockConversationMaybeSingle = jest.fn();
const mockFeedbackInsert = jest.fn();

jest.mock('@/lib/auth-session', () => ({
  getAuthSession: jest.fn(),
  getSessionToken: jest.fn(() => 'verified-session-token'),
}));
jest.mock('@/lib/monitoring', () => ({ hashSessionId: jest.fn(() => 'a'.repeat(64)) }));
jest.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => ({
    from: (table: string) => table === 'chat_conversations'
      ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mockConversationMaybeSingle }) }) }) }
      : { insert: mockFeedbackInsert },
  })),
}));

const conversationId = '11111111-1111-4111-8111-111111111111';

function feedbackRequest(payload: unknown = { conversationId, rating: 5, comment: 'Helpful answer' }) {
  return new Request('http://localhost/api/chat/feedback', {
    method: 'POST',
    headers: { cookie: 'verified_session=verified-session-token', 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

describe('POST /api/chat/feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthSession as jest.Mock).mockResolvedValue({ email: 'visitor@example.com' });
    mockConversationMaybeSingle.mockResolvedValue({ data: { conversation_id: conversationId }, error: null });
    mockFeedbackInsert.mockResolvedValue({ error: null });
  });

  it('stores one rating for a conversation owned by the current session', async () => {
    const response = await POST(feedbackRequest());

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(hashSessionId).toHaveBeenCalledWith('verified-session-token');
    expect(mockFeedbackInsert).toHaveBeenCalledWith({
      conversation_id: conversationId,
      rating: 5,
      comment: 'Helpful answer',
    });
    expect(getSupabaseAdmin).toHaveBeenCalled();
  });

  it('rejects feedback for a conversation owned by another session', async () => {
    mockConversationMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const response = await POST(feedbackRequest());

    expect(response.status).toBe(404);
    expect(mockFeedbackInsert).not.toHaveBeenCalled();
  });

  it('rejects duplicate ratings for the same conversation', async () => {
    mockFeedbackInsert.mockResolvedValueOnce({ error: { code: '23505' } });
    const response = await POST(feedbackRequest());

    expect(response.status).toBe(409);
  });

  it('validates the rating range', async () => {
    const response = await POST(feedbackRequest({ conversationId, rating: 6 }));

    expect(response.status).toBe(400);
    expect(mockFeedbackInsert).not.toHaveBeenCalled();
  });

  it('requires an authenticated session', async () => {
    (getAuthSession as jest.Mock).mockResolvedValueOnce(null);
    const response = await POST(feedbackRequest());

    expect(response.status).toBe(401);
    expect(mockFeedbackInsert).not.toHaveBeenCalled();
  });
});
