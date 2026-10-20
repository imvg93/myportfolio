/** @jest-environment node */

import { GET } from './route';
import { getAuthSession } from '@/lib/auth-session';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isMonitoringAdmin } from '@/lib/monitoring';

jest.mock('@/lib/auth-session', () => ({ getAuthSession: jest.fn(), getSessionToken: jest.fn(() => 'opaque-session') }));
jest.mock('@/lib/supabase', () => ({ getSupabaseAdmin: jest.fn() }));
jest.mock('@/lib/monitoring', () => ({ isMonitoringAdmin: jest.fn() }));

describe('/api/admin/monitoring authorization', () => {
  beforeEach(() => jest.clearAllMocks());
  it('rejects requests without a verified session', async () => {
    (getAuthSession as jest.Mock).mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/admin/monitoring'));
    expect(response.status).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });
  it('rejects authenticated non-admins before querying protected records', async () => {
    (getAuthSession as jest.Mock).mockResolvedValue({ email: 'visitor@example.com', name: 'Visitor' });
    (isMonitoringAdmin as jest.Mock).mockReturnValue(false);
    const response = await GET(new Request('http://localhost/api/admin/monitoring'));
    expect(response.status).toBe(403);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('returns the conversation identity and a chronologically ordered transcript to an admin', async () => {
    const conversation = {
      conversation_id: '11111111-1111-4111-8111-111111111111', visitor_email: 'visitor@example.com',
      started_at: '2026-10-20T10:00:00.000Z', last_activity_at: '2026-10-20T10:01:00.000Z',
      total_messages: 2, first_message: 'Hello', conversation_status: 'active',
    };
    const messages = [
      { message_id: 'm1', request_id: 'r1', role: 'user', content: 'Hello' },
      { message_id: 'm2', request_id: 'r1', role: 'assistant', content: 'Hi' },
    ];
    const conversationQuery = {
      select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn().mockResolvedValue({ data: conversation, error: null }),
    };
    conversationQuery.select.mockReturnValue(conversationQuery);
    conversationQuery.eq.mockReturnValue(conversationQuery);
    const messageQuery = { select: jest.fn(), eq: jest.fn(), order: jest.fn(), range: jest.fn().mockResolvedValue({ data: messages, count: 2, error: null }) };
    messageQuery.select.mockReturnValue(messageQuery);
    messageQuery.eq.mockReturnValue(messageQuery);
    messageQuery.order.mockReturnValue(messageQuery);
    const replyQuery = { select: jest.fn(), in: jest.fn(), eq: jest.fn().mockResolvedValue({ data: [{ request_id: 'r1' }], error: null }) };
    replyQuery.select.mockReturnValue(replyQuery);
    replyQuery.in.mockReturnValue(replyQuery);
    let chatMessageQueryCount = 0;
    (getSupabaseAdmin as jest.Mock).mockReturnValue({ from: jest.fn((table: string) => {
      if (table === 'chat_conversations') return conversationQuery;
      chatMessageQueryCount += 1;
      return chatMessageQueryCount === 1 ? messageQuery : replyQuery;
    }) });
    (getAuthSession as jest.Mock).mockResolvedValue({ email: 'admin@example.com', name: 'Admin' });
    (isMonitoringAdmin as jest.Mock).mockReturnValue(true);

    const response = await GET(new Request(`http://localhost/api/admin/monitoring?view=messages&conversationId=${conversation.conversation_id}`));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.conversation.visitor_email).toBe('visitor@example.com');
    expect(body.data).toMatchObject([
      { message_id: 'm1', has_assistant_reply: true },
      { message_id: 'm2', has_assistant_reply: null },
    ]);
    expect(messageQuery.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: true });
    expect(messageQuery.order).toHaveBeenNthCalledWith(2, 'message_id', { ascending: true });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('passes the selected sort and query filters to the private conversation search', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
    (getSupabaseAdmin as jest.Mock).mockReturnValue({ rpc });
    (getAuthSession as jest.Mock).mockResolvedValue({ email: 'admin@example.com', name: 'Admin' });
    (isMonitoringAdmin as jest.Mock).mockReturnValue(true);
    const response = await GET(new Request('http://localhost/api/admin/monitoring?view=conversations&sort=oldest&q=visitor%40example.com&page=2&pageSize=10'));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('search_monitoring_conversations_sorted', expect.objectContaining({
      p_query: 'visitor@example.com', p_sort: 'oldest', p_offset: 10, p_limit: 10,
    }));
  });
});
