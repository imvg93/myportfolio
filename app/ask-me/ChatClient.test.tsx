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
      if (String(input) === '/api/chat') {
        return { json: async () => ({ ok: true, reply: 'Here is the answer from the assistant.' }) };
      }
      return { json: async () => ({}) };
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the reply returned by the chat API', async () => {
    render(<ChatClient />);

    const input = screen.getByPlaceholderText('Ask Gireesh anything');
    fireEvent.change(input, { target: { value: 'What have you built?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message to Gireesh' }));

    expect(await screen.findByText('Here is the answer from the assistant.')).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' })));
    expect(screen.getByText('Messages stay on this page while it is open and are not saved for later.')).toBeInTheDocument();
  });
});
