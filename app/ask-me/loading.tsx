import { LoaderCircle } from 'lucide-react';

export default function AskMeLoading() {
  return (
    <main
      className="flex min-h-screen min-h-[100svh] items-center justify-center bg-slate-950 px-6 text-white"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-cyan-400" aria-hidden="true" />
        <p className="text-base font-medium">Getting your AI chat ready…</p>
        <span className="sr-only">Loading chat</span>
      </div>
    </main>
  );
}
