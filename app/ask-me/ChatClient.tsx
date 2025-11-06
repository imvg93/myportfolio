'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Globe, Paperclip, Mic, ArrowUp, ArrowLeft } from 'lucide-react';
import { PromptInputBox } from '../../src/components/ui/ai-prompt-box';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [heroInput, setHeroInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const displayName = useMemo(() => {
    if (!email) return '';
    const local = String(email).split('@')[0] || '';
    const parts = local.split(/[._-]+/).filter(Boolean);
    if (parts.length === 0) return local;
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }, [email]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        const data = await res.json();
        if (data?.email) {
          setEmail(String(data.email));
          if (data?.name) setUserName(String(data.name));
        } else {
          router.replace('/verify');
        }
      } catch {
        router.replace('/verify');
      }
    })();
  }, [router]);

  async function handleSend(message: string, files?: File[]) {
    const text = message.trim();
    if (!text) return;
    
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })) }),
      });
      const json = await res.json();
      const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: json.reply || '…' };
      setMessages((m) => [...m, assistantMsg]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-6 pb-8 px-3 sm:pt-8 sm:px-4">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="fixed top-3 left-3 sm:top-4 sm:left-4 z-20 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/90 hover:bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      {/* HERO INPUT (Perplexity-like) */}
      {messages.length === 0 && (
        <div className="w-full max-w-3xl flex flex-col items-center gap-6 sm:gap-8">
         
            {(userName || email || displayName) && (
             <div className="text-3xl sm:text-4xl font-Italic tracking-tight text-slate-800 select-none">Hi, {userName || displayName || email} — Welcome To <span className="underline underline-offset-4 decoration-2 decoration-[#18D696]">Gireesh Insight</span></div>
            )}

          <div className="w-full">
            <div className="w-full rounded-xl sm:rounded-2xl border-2 border-black bg-white shadow-sm">
              <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3">
                {/* Left controls */}
                <div className="hidden sm:flex items-center gap-2">
                  
                </div>

                {/* Input */}
                <input
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(heroInput);
                      setHeroInput('');
                    }
                  }}
                  placeholder="Ask anything. About Me"
                  className="flex-1 bg-transparent outline-none text-black italic placeholder:text-slate-400 px-1 py-2 caret-black text-sm sm:text-base"
                  style={{ fontFamily: 'Lucida Sans, Lucida Sans Regular, Lucida Grande, Lucida Sans Unicode, Geneva, Verdana, sans-serif' }}
                />

                {/* Right controls */}
                <div className="hidden sm:flex items-center gap-3 text-slate-500">
                 
                  <button
                    onClick={() => {
                      if (heroInput.trim()) {
                        handleSend(heroInput);
                        setHeroInput('');
                      }
                    }}
                    className="h-10 w-10 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-xl bg-teal-700 hover:bg-teal-600 text-white"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHAT VIEW */}
      {messages.length > 0 && (
      <div className="w-full max-w-3xl flex flex-col gap-4">
        {/* Messages - free and stretched */}
        <div ref={listRef} className="overflow-y-auto h-[50vh] sm:h-[400px] space-y-3 w-full no-scrollbar">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={
                  m.role === 'user'
                    ? 'flex justify-end'
                    : 'flex justify-start'
                }
              >
                <div
                  className={
                    'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ' +
                    (m.role === 'user'
                      ?  'text-black'
                      : ' text-slate-800')
                  }
                >
                  {m.content}
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300/70 animate-bounce [animation-delay:-.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-slate-300/70 animate-bounce [animation-delay:-.1s]"></span>
                    <span className="w-2 h-2 rounded-full bg-slate-300/70 animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Input - Outside the box (Follow-up bar) */}
        <div className="w-full">
          <PromptInputBox
            onSend={handleSend}
            isLoading={loading}
            placeholder="Ask a follow-up"
            className="w-full bg-white border-2 border-black shadow-md rounded-2xl"
          />
        </div>
      </div>
      )}
    </div>
  );
}


