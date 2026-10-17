import ChatClient from './ChatClient';

export const metadata = {
  title: 'Gireesh Insight | The Open Mind',
  description: 'An open, honest conversation with Gireesh Veeranki about love life, college days, struggles, tech, and ambitions.',
};

export default function AskMePage() {
  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-[#f0f7ff] via-[#f8fafc] to-[#ffffff] text-slate-900 antialiased selection:bg-cyan-500/20 selection:text-cyan-900">
      <ChatClient />
    </main>
  );
}
