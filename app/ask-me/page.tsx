import ChatClient from './ChatClient';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthSession, getSessionToken } from '@/lib/auth-session';

export const metadata = {
  title: 'Gireesh Insight | The Open Mind',
  description: 'An open, honest conversation with Gireesh Veeranki about love life, college days, struggles, tech, and ambitions.',
};

export default async function AskMePage() {
  const requestHeaders = await headers();
  const request = new Request('http://localhost/ask-me', {
    headers: { cookie: requestHeaders.get('cookie') ?? '' },
  });
  const session = await getAuthSession(getSessionToken(request));
  if (!session) redirect('/verify');

  return (
    <main className="fixed inset-0 h-[100dvh] w-full overflow-hidden overscroll-none bg-[#030712] text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-900">
      <ChatClient />
    </main>
  );
}
