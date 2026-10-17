'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUp,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Heart,
  GraduationCap,
  Flame,
  Zap,
  Send,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  Brain,
  Smile,
  Compass,
} from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  modelUsed?: string;
};

// 4 Deep-Dive Conversation Pillars (Love Life, Studies, Struggles, Ambition)
const CONVERSATION_PILLARS = [
  {
    category: 'Love Life & Heart',
    icon: Heart,
    color: 'text-rose-500',
    iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
    borderHover: 'hover:border-rose-400/60 hover:shadow-rose-500/10',
    cardBg: 'bg-gradient-to-br from-rose-50/50 via-white to-pink-50/30',
    badge: 'Raw & Honest',
    prompts: [
      {
        title: 'Perspective on Love & Relationships',
        query: 'What is your perspective on love, dating, and relationships? Have you ever had your heart broken, and what did you learn from it?',
      },
      {
        title: 'What attracts you in a partner?',
        query: 'What kind of emotional connection and personality traits truly inspire and matter to you in life and love?',
      },
    ],
  },
  {
    category: 'Studies & College Days',
    icon: GraduationCap,
    color: 'text-blue-500',
    iconBg: 'bg-blue-50 border-blue-200 text-blue-600',
    borderHover: 'hover:border-blue-400/60 hover:shadow-blue-500/10',
    cardBg: 'bg-gradient-to-br from-blue-50/50 via-white to-cyan-50/30',
    badge: 'Academics & Journey',
    prompts: [
      {
        title: 'College life & learning to code',
        query: 'How was your college journey? Was learning computer science easy or difficult for you at the beginning?',
      },
      {
        title: 'Self-study vs University',
        query: 'How did you balance academic studies with self-taught engineering, AI projects, and practical skills?',
      },
    ],
  },
  {
    category: 'Struggles, Doubts & Grit',
    icon: Flame,
    color: 'text-amber-500',
    iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
    borderHover: 'hover:border-amber-400/60 hover:shadow-amber-500/10',
    cardBg: 'bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30',
    badge: 'Real Struggles',
    prompts: [
      {
        title: 'The hardest phase in your life',
        query: 'What was the toughest personal or career struggle you went through, and how did you overcome the self-doubt?',
      },
      {
        title: 'Dealing with failure and burnout',
        query: 'Have you ever felt lost, burnt out, or like an imposter? What is your mental toolkit to bounce back?',
      },
    ],
  },
  {
    category: 'Ambitions, Dreams & Code',
    icon: Zap,
    color: 'text-indigo-500',
    iconBg: 'bg-indigo-50 border-indigo-200 text-indigo-600',
    borderHover: 'hover:border-indigo-400/60 hover:shadow-indigo-500/10',
    cardBg: 'bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30',
    badge: 'Vision & Tech',
    prompts: [
      {
        title: 'What keeps you coding at 3 AM?',
        query: 'What is your core drive? What are your biggest dreams and goals for the next 5 years in engineering and life?',
      },
      {
        title: 'Tech stack & engineering philosophy',
        query: 'What are your favorite tech stacks (Next.js, FastAPI, AI RAG) and how do you approach building robust software?',
      },
    ],
  },
];

// Rich text formatter for assistant replies with code block & copy support
function FormattedContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-[15px] sm:text-base font-sans text-slate-800">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const language = lines[0]?.match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
          const codeBody = language ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div
              key={idx}
              className="my-3 overflow-hidden rounded-2xl border border-slate-800 bg-[#0c1220] text-slate-100 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-xs text-slate-400">
                <span className="font-mono tracking-wider uppercase text-cyan-400 font-semibold">
                  {language || 'code'}
                </span>
                <button
                  onClick={() => copyCode(codeBody, idx)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs sm:text-sm text-cyan-200 no-scrollbar">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        const paragraphs = part.split(/\n\n+/);
        return (
          <div key={idx} className="space-y-2.5">
            {paragraphs.map((p, pIdx) => {
              const trimmed = p.trim();
              if (!trimmed) return null;

              if (trimmed.includes('\n- ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const listItems = trimmed
                  .split(/\n(?=[-*\u2022]\s)/)
                  .map((li) => li.replace(/^[-*\u2022]\s+/, '').trim())
                  .filter(Boolean);

                return (
                  <ul key={pIdx} className="space-y-2 my-2 pl-1">
                    {listItems.map((item, lIdx) => (
                      <li key={lIdx} className="flex items-start gap-2.5">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-600 shrink-0 shadow-sm" />
                        <span dangerouslySetInnerHTML={{ __html: renderInlineFormatting(item) }} />
                      </li>
                    ))}
                  </ul>
                );
              }

              return (
                <p
                  key={pIdx}
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderInlineFormatting(trimmed) }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-950">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-slate-100 text-cyan-700 font-mono text-xs sm:text-sm border border-slate-200/80 font-medium">$1</code>')
    .replace(/\n/g, '<br/>');
}

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const listEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Scroll to bottom smoothly
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auth check
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        }),
      });

      const json = await res.json();
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: json.reply || 'I am right here with you. Feel free to ask me anything about my journey!',
        modelUsed: json.model_used || 'GPT-4o RAG',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Hey, I hit a brief connection hiccup retrieving my memory. Please ask again in just a moment!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput('');
  };

  const displayName = useMemo(() => {
    if (userName) return userName;
    if (!email) return 'Friend';
    const local = email.split('@')[0] || 'Friend';
    return local.charAt(0).toUpperCase() + local.slice(1);
  }, [userName, email]);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-b from-[#eef6ff] via-[#f8fafc] to-[#ffffff] font-sans text-slate-800">
      {/* LUMINOUS BRIGHT AURA BACKGROUND LIGHTING */}
      <div className="pointer-events-none absolute -top-32 left-1/4 -z-10 h-[520px] w-[520px] rounded-full bg-blue-300/35 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/4 -right-24 -z-10 h-[480px] w-[480px] rounded-full bg-cyan-200/40 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-[450px] w-[450px] rounded-full bg-indigo-200/30 blur-[130px]" />

      {/* DELICATE GEOMETRIC DOT TEXTURE */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage: `radial-gradient(rgba(14, 116, 144, 0.18) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* 1. TOP HEADER (BRIGHT, CRISP, FROSTED GLASS) */}
      <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/75 px-4 backdrop-blur-2xl sm:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 transition-all hover:border-blue-400 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 text-slate-600" />
            <span className="hidden sm:inline">Portfolio</span>
          </button>

          {/* Gireesh Brain Persona Badge */}
          <div className="flex items-center gap-3 pl-1 sm:pl-2">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-white p-0.5 shadow-md shadow-cyan-500/20">
              <Image
                src="/gireesh-brain.jpg"
                alt="Gireesh Neural Mind"
                width={40}
                height={40}
                className="h-full w-full object-cover rounded-full"
                priority
              />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold tracking-tight text-slate-900 text-sm sm:text-base">
                  Gireesh’s Digital Mind
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online • Open Book
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Ask about my love life, studies, struggles & code
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
              title="Start a fresh conversation"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}

          {/* User Badge */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-sm">
              {displayName.charAt(0)}
            </div>
            <span className="max-w-[100px] truncate text-xs font-medium text-slate-700 sm:max-w-[160px]">
              {displayName}
            </span>
          </div>
        </div>
      </header>

      {/* 2. CHAT STREAM / FEED */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-12 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="mx-auto max-w-3xl space-y-6">
          {/* WELCOME HERO / CONVERSATION INTRO */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center pt-4 sm:pt-8 pb-8 text-center"
            >
              {/* Glowing Neural Brain Showcase (Clear of top boundary) */}
              <div className="relative mb-6 mt-1 flex items-center justify-center shrink-0">
                <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-400 to-indigo-300 opacity-40 blur-xl animate-pulse" />
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-4 border-white bg-white p-1 shadow-2xl shadow-cyan-500/25">
                  <Image
                    src="/gireesh-brain.jpg"
                    alt="Gireesh Neural Brain"
                    width={112}
                    height={112}
                    className="h-full w-full object-cover rounded-full"
                    priority
                  />
                </div>
              </div>

              {/* Status Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>Zero filters • Talk to me like a real person</span>
              </div>

              <h1 className="mt-4 font-sans text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                Hey {displayName}, I’m{' '}
                <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                  Gireesh’s Mind
                </span>
                .
              </h1>

              <p className="mt-3 max-w-xl text-sm sm:text-base text-slate-600 leading-relaxed">
                This is an honest, personal space. You can ask me about my <strong>love life</strong>, the{' '}
                <strong>darkest struggles I fought through</strong>, my <strong>college & studies journey</strong>, or what
                drives me to engineer high-scale AI systems at 3 AM.
              </p>

              {/* 4 CONVERSATION PILLARS (LOVE, STUDIES, STRUGGLES, AMBITION) */}
              <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 text-left">
                {CONVERSATION_PILLARS.map((topic, tIdx) => {
                  const TopicIcon = topic.icon;
                  return (
                    <div
                      key={tIdx}
                      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 ${topic.cardBg} p-4 sm:p-5 backdrop-blur-md transition-all duration-300 ${topic.borderHover} shadow-sm hover:shadow-md`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${topic.iconBg}`}>
                            <TopicIcon className="h-3.5 w-3.5" />
                            {topic.category}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">{topic.badge}</span>
                        </div>

                        <div className="mt-3.5 space-y-2">
                          {topic.prompts.map((p, pIdx) => (
                            <button
                              key={pIdx}
                              onClick={() => handleSend(p.query)}
                              className="group flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-left text-xs sm:text-sm text-slate-700 transition-all hover:border-blue-400 hover:bg-white hover:text-slate-950 hover:shadow-sm"
                            >
                              <span className="font-medium pr-2">{p.title}</span>
                              <Send className="h-3 w-3 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ACTIVE CHAT FEED */}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex w-full gap-3 sm:gap-4 ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Brain Avatar */}
                {m.role === 'assistant' && (
                  <div className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-white p-0.5 shadow-md shadow-cyan-500/15">
                    <Image
                      src="/gireesh-brain.jpg"
                      alt="Gireesh Mind"
                      width={40}
                      height={40}
                      className="h-full w-full object-cover rounded-full"
                    />
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  className={`relative max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm ${
                    m.role === 'user'
                      ? 'rounded-tr-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-blue-500/20'
                      : 'rounded-tl-sm border border-slate-200/90 bg-white text-slate-800 backdrop-blur-xl shadow-md'
                  }`}
                >
                  {/* Header Tag for Assistant */}
                  {m.role === 'assistant' && (
                    <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 font-semibold text-blue-600">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
                        <span>Gireesh</span>
                      </div>
                      {m.timestamp && <span>{m.timestamp}</span>}
                    </div>
                  )}

                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-[15px] sm:text-base leading-relaxed">
                      {m.content}
                    </p>
                  ) : (
                    <FormattedContent content={m.content} />
                  )}

                  {/* Assistant Message Actions */}
                  {m.role === 'assistant' && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                      <span className="text-[10px] text-slate-400">
                        Authentic response • {m.modelUsed || 'GPT-4o RAG'}
                      </span>
                      <button
                        onClick={() => copyMessage(m.content, m.id)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                        title="Copy answer"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy answer</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {m.role === 'user' && (
                  <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-md">
                    {displayName.charAt(0)}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* REAL-TIME HUMANIZED TYPING INDICATOR */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 sm:gap-4"
            >
              <div className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-white p-0.5 animate-pulse shadow-md">
                <Image
                  src="/gireesh-brain.jpg"
                  alt="Gireesh Mind"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-md">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-600">
                  Gireesh is reflecting & writing back...
                </span>
              </div>
            </motion.div>
          )}

          <div ref={listEndRef} />
        </div>
      </div>

      {/* 3. BOTTOM FLOATING PROMPT CAPSULE */}
      <footer className="sticky bottom-0 z-30 w-full border-t border-slate-200/80 bg-white/85 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-2xl sm:px-6 shadow-[0_-8px_30px_rgba(0,0,0,0.03)]">
        <div className="mx-auto max-w-3xl">
          {/* Quick Idea Chips */}
          {messages.length > 0 && !loading && (
            <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-slate-400 shrink-0 text-[11px]">Explore deeper:</span>
              <button
                onClick={() => handleSend('Tell me honestly about your love life and relationships.')}
                className="shrink-0 rounded-full border border-rose-200 bg-rose-50/70 px-3 py-1 text-rose-700 hover:border-rose-400 hover:bg-rose-100 transition"
              >
                💖 Love Life & Heart
              </button>
              <button
                onClick={() => handleSend('What were your biggest struggles during studies or college?')}
                className="shrink-0 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-blue-700 hover:border-blue-400 hover:bg-blue-100 transition"
              >
                🎓 College & Studies
              </button>
              <button
                onClick={() => handleSend('What was the lowest point in your career and how did you overcome it?')}
                className="shrink-0 rounded-full border border-amber-200 bg-amber-50/70 px-3 py-1 text-amber-700 hover:border-amber-400 hover:bg-amber-100 transition"
              >
                🌪️ Toughest Struggles
              </button>
              <button
                onClick={() => handleSend('What are your biggest engineering dreams right now?')}
                className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100 transition"
              >
                ⚡ Big Dreams & Code
              </button>
            </div>
          )}

          {/* Input Box */}
          <div className="relative flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-lg transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 sm:p-2.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Gireesh anything (love life, college days, struggles, dreams, code)..."
              disabled={loading}
              className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2 text-sm sm:text-base text-slate-900 placeholder-slate-400 outline-none disabled:opacity-50 no-scrollbar"
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl font-medium transition-all duration-200 ${
                input.trim() && !loading
                  ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 hover:scale-105 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              aria-label="Send message to Gireesh"
            >
              <ArrowUp className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-slate-400">
            <span>
              Direct conversation with Gireesh Veeranki • Powered by Pinecone RAG & LLMs
            </span>
            <span className="hidden sm:inline">Press ↵ Enter to send</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
