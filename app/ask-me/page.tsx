import ChatClient from './ChatClient';

export const metadata = {
  title: 'Gireesh Insight | The Open Mind',
  description: 'An open, honest conversation with Gireesh Veeranki about love life, college days, struggles, tech, and ambitions.',
};

export default function AskMePage() {
  return (
    <main className="fixed inset-0 h-[100dvh] w-full overflow-hidden overscroll-none bg-[#030712] text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-900">
      <ChatClient />
    </main>
  );
}
