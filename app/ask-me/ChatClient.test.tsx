import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatClient from './ChatClient';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority, ...props }: Record<string, unknown>) => <img {...props} />,
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  const motion = new Proxy({}, {
    get: (_target, tag: string) => React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const { initial, animate, exit, transition, layout, ...domProps } = props;
      return React.createElement(tag, { ...domProps, ref });
    }),
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe('/ask-me chat client', () => {
  beforeEach(() => {
    (HTMLElement.prototype as HTMLElement & { scrollTo: jest.Mock }).scrollTo = jest.fn();
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/me') {
        return { json: async () => ({ email: 'visitor@example.com', name: 'Visitor' }) };
      }
      if (String(input) === '/api/chat/suggestions') {
        return { ok: true, json: async () => ({
          ok: true,
          suggestions: [
            { label: 'Explore My Projects', question: 'Which projects has Gireesh built?' },
            { label: 'Discover My AI Work', question: 'What AI work is in the portfolio?' },
            { label: 'Explore My Technical Skills', question: 'Which technologies does he use?' },
          ],
        }) };
      }
      if (String(input) === '/api/chat') {
        return { ok: true, status: 200, json: async () => ({ ok: true, reply: 'Here is the answer from the assistant.' }) };
      }
      if (String(input) === '/api/chat/feedback') {
        return { ok: true, status: 201, json: async () => ({ ok: true }) };
      }
      return { json: async () => ({}) };
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the reply returned by the chat API', async () => {
    render(<ChatClient />);

    expect(screen.getByRole('heading', { name: "Gireesh's AI Assistant" })).toBeInTheDocument();
    expect(screen.getByText('Your guide to my technical work, projects, skills, and engineering experience. Ask me anything to explore my professional background.')).toBeInTheDocument();
    for (const label of [
      'Explore My Projects',
      'Discover My AI Work',
      'Understand My Technical Architecture',
      'Learn About My Experience',
      'Explore My Technical Skills',
      'Get My Contact Information',
    ]) {
      expect(screen.getByRole('button', { name: `Ask: ${label}` })).toBeInTheDocument();
    }
    await waitFor(() => expect(screen.getByLabelText('Suggested questions')).toHaveAttribute('aria-busy', 'false'));
    expect(await screen.findByRole('button', { name: 'Ask: Explore My Projects' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask: Discover My AI Work' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask: Explore My Technical Skills' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ask: Explore My Projects' }));
    await waitFor(() => {
      const chatCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url) === '/api/chat');
      expect(chatCall).toBeDefined();
      expect(JSON.parse(chatCall[1].body).messages).toContainEqual({
        role: 'user',
        content: 'Which projects has Gireesh built?',
      });
    });
    expect(await screen.findByText('Here is the answer from the assistant.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: "Gireesh's AI Assistant" })).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText('Ask Gireesh anything');
    fireEvent.change(input, { target: { value: 'What have you built?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message to Gireesh' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' })));
  });

  it('offers feedback once after five answered questions and submits one rating', async () => {
    const { container } = render(<ChatClient />);
    const input = screen.getByPlaceholderText('Ask Gireesh anything');
    const feed = container.querySelector('.overflow-y-auto') as HTMLElement;
    Object.defineProperties(feed, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 400 },
    });
    const chatRequestCount = () => (global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url) === '/api/chat').length;

    for (let index = 1; index <= 5; index += 1) {
      if (index === 5) {
        // A visitor reading older messages should still see the automatic prompt.
        feed.scrollTop = 0;
        fireEvent.scroll(feed);
      }
      fireEvent.change(input, { target: { value: `Question ${index}` } });
      fireEvent.click(screen.getByRole('button', { name: 'Send message to Gireesh' }));
      await waitFor(() => expect(chatRequestCount()).toBe(index));
      await waitFor(() => expect(screen.getAllByText('Here is the answer from the assistant.')).toHaveLength(index));
    }

    expect(await screen.findByRole('region', { name: 'Rate this chat' })).toBeInTheDocument();
    expect(feed.scrollTo).toHaveBeenLastCalledWith({ top: 1000, behavior: 'smooth' });
    fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
    fireEvent.change(screen.getByLabelText('Optional comment'), { target: { value: 'Very helpful.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));

    expect(await screen.findByText('Thanks for your feedback.')).toBeInTheDocument();
    const feedbackCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url) === '/api/chat/feedback');
    expect(feedbackCall).toBeDefined();
    expect(JSON.parse(feedbackCall[1].body)).toEqual(expect.objectContaining({ rating: 5, comment: 'Very helpful.' }));
    expect(JSON.parse(feedbackCall[1].body).conversationId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(screen.queryByRole('region', { name: 'Rate this chat' })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Question 6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message to Gireesh' }));
    await waitFor(() => expect(chatRequestCount()).toBe(6));
    await waitFor(() => expect(screen.getAllByText('Here is the answer from the assistant.')).toHaveLength(6));
    expect(screen.queryByRole('region', { name: 'Rate this chat' })).not.toBeInTheDocument();
  });
});
