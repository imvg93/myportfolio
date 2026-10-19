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
  Ellipsis,
  LogOut,
  UserRound,
  MessageSquarePlus,
  GraduationCap,
  Flame,
  Code2,
  Heart,
} from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  modelUsed?: string;
};

function createUuid() {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error('Secure random number generation is unavailable in this browser.');
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function createMessageId() {
  return createUuid();
}

const STARTER_PROMPTS = [
  {
    category: 'College & learning',
    question: 'What was college like for you?',
    prompt: 'What was your college journey like, and how did you get started with coding?',
    icon: GraduationCap,
    accent: 'border-blue-300/20 bg-blue-400/10 text-blue-200',
  },
  {
    category: 'Challenges & growth',
    question: 'What challenges shaped you?',
    prompt: 'What challenges shaped you the most, and how did you work through them?',
    icon: Flame,
    accent: 'border-amber-300/20 bg-amber-400/10 text-amber-200',
  },
  {
    category: 'Goals & creativity',
    question: 'What are you building now?',
    prompt: 'What are you building now, and what are you excited to create next?',
    icon: Code2,
    accent: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-200',
  },
  {
    category: 'Love & connection',
    question: 'What matters in a relationship?',
    prompt: 'What do you value most in a relationship and emotional connection?',
    icon: Heart,
    accent: 'border-rose-300/20 bg-rose-400/10 text-rose-200',
  },
];

const FOLLOW_UP_PROMPTS = [
  ...STARTER_PROMPTS,
  {
    category: 'Personal life',
    question: 'What do you enjoy outside work?',
    prompt: 'What do you enjoy doing outside of work and coding?',
  },
  {
    category: 'Growing up',
    question: 'What were you like growing up?',
    prompt: 'What were you like growing up, and what experiences shaped you?',
  },
  {
    category: 'Studies',
    question: 'Which subject did you enjoy most?',
    prompt: 'Which subjects or college projects did you enjoy most, and why?',
  },
  {
    category: 'Career',
    question: 'How did you get your start in tech?',
    prompt: 'How did you get your start in tech, and what was your first role like?',
  },
  {
    category: 'Daily life',
    question: 'What does a typical day look like?',
    prompt: 'What does a typical day look like for you these days?',
  },
  {
    category: 'Personal values',
    question: 'What values matter most to you?',
    prompt: 'What personal values matter most to you, and how do they guide your choices?',
  },
  {
    category: 'Future plans',
    question: 'What are you hoping to do next?',
    prompt: 'What are you hoping to learn, build, or achieve next?',
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
    <div className="space-y-1.5 text-[13px] leading-[1.45] sm:space-y-3 sm:text-base sm:leading-relaxed font-sans text-slate-100">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const language = lines[0]?.match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
          const codeBody = language ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div
              key={idx}
              className="my-2 overflow-hidden rounded-xl border border-slate-800 bg-[#0c1220] text-slate-100 shadow-lg sm:my-3 sm:rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400 sm:px-4 sm:py-2">
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
              <pre className="overflow-x-auto p-3 font-mono text-xs sm:p-4 sm:text-sm text-cyan-200 no-scrollbar">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        const paragraphs = part.split(/\n\n+/);
        return (
          <div key={idx} className="space-y-1 sm:space-y-2.5">
            {paragraphs.map((p, pIdx) => {
              const trimmed = p.trim();
              if (!trimmed) return null;

              if (trimmed.includes('\n- ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const listItems = trimmed
                  .split(/\n(?=[-*\u2022]\s)/)
                  .map((li) => li.replace(/^[-*\u2022]\s+/, '').trim())
                  .filter(Boolean);

                return (
                  <ul key={pIdx} className="my-1 space-y-1 pl-1 sm:my-2 sm:space-y-2">
                    {listItems.map((item, lIdx) => (
                      <li key={lIdx} className="flex items-start gap-1.5 sm:gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-600 shrink-0 shadow-sm sm:mt-2" />
                        <span dangerouslySetInnerHTML={{ __html: renderInlineFormatting(item) }} />
                      </li>
                    ))}
                  </ul>
                );
              }

              return (
                <p
                  key={pIdx}
                  className="leading-[1.45] sm:leading-relaxed"
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
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-slate-800 text-cyan-200 font-mono text-xs sm:text-sm border border-slate-700 font-medium">$1</code>')
    .replace(/\n/g, '<br/>');
}

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [askedSuggestionCategories, setAskedSuggestionCategories] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    setConversationId(createUuid());
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenuOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeMenuOutside);
    document.addEventListener('keydown', closeMenuOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenuOutside);
      document.removeEventListener('keydown', closeMenuOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousStyles = {
      htmlBackground: html.style.backgroundColor,
      bodyBackground: body.style.backgroundColor,
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    html.style.backgroundColor = '#030712';
    body.style.backgroundColor = '#030712';
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    return () => {
      html.style.backgroundColor = previousStyles.htmlBackground;
      body.style.backgroundColor = previousStyles.bodyBackground;
      html.style.overflow = previousStyles.htmlOverflow;
      body.style.overflow = previousStyles.bodyOverflow;
      html.style.overscrollBehavior = previousStyles.htmlOverscroll;
      body.style.overscrollBehavior = previousStyles.bodyOverscroll;
    };
  }, []);

  // Keep the chat app inside the visible mobile viewport while the software
  // keyboard is open. The message feed can then scroll without moving the composer.
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;

    const syncVisibleViewport = () => {
      if (!viewport) return;

      const keyboardIsOpen = window.innerHeight - viewport.height > 120;
      root.style.setProperty('--askme-viewport-height', `${viewport.height}px`);
      root.style.setProperty(
        '--askme-viewport-top',
        `${keyboardIsOpen ? viewport.offsetTop : 0}px`,
      );
      root.style.setProperty(
        '--askme-footer-safe-bottom',
        keyboardIsOpen ? '0px' : 'env(safe-area-inset-bottom)',
      );
    };

    syncVisibleViewport();
    viewport?.addEventListener('resize', syncVisibleViewport);
    viewport?.addEventListener('scroll', syncVisibleViewport);
    window.addEventListener('resize', syncVisibleViewport);

    return () => {
      viewport?.removeEventListener('resize', syncVisibleViewport);
      viewport?.removeEventListener('scroll', syncVisibleViewport);
      window.removeEventListener('resize', syncVisibleViewport);
      root.style.removeProperty('--askme-viewport-height');
      root.style.removeProperty('--askme-viewport-top');
      root.style.removeProperty('--askme-footer-safe-bottom');
    };
  }, []);

  const handleFeedScroll = () => {
    const el = feedRef.current;
    if (!el) return;

    const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    shouldAutoScrollRef.current = distanceToBottom < 120;
  };

  // Scroll to bottom smoothly only when the user is already near the latest message
  useEffect(() => {
    if (messages.length === 0) return;
    if (!shouldAutoScrollRef.current) return;
    const feed = feedRef.current;
    feed?.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
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
      const maxInputHeight = window.innerWidth < 640 ? 96 : 160;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxInputHeight)}px`;
    }
  }, [input]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;
    const activeConversationId = conversationId || createUuid();
    if (!conversationId) setConversationId(activeConversationId);

    const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedText = normalize(text);
    const askedSuggestion = FOLLOW_UP_PROMPTS.find((suggestion) =>
      [suggestion.question, suggestion.prompt].some((question) => normalize(question) === normalizedText),
    );
    if (askedSuggestion) {
      setAskedSuggestionCategories((previous) =>
        previous.includes(askedSuggestion.category) ? previous : [...previous, askedSuggestion.category],
      );
    }

    const userMsg: Message = {
      id: createMessageId(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Keep mobile Safari/Chrome's keyboard open after the send tap or Enter.
      // Starter prompt buttons pass textToSend and should not open the keyboard.
      if (textToSend === undefined) {
        textareaRef.current.focus({ preventScroll: true });
      }
    }
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        }),
      });

      const json = await res.json();
      const assistantMsg: Message = {
        id: createMessageId(),
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
          id: createMessageId(),
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
    setConversationId(createUuid());
    setInput('');
    setAskedSuggestionCategories([]);
    setMenuOpen(false);
    shouldAutoScrollRef.current = true;
    feedRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await fetch('/api/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/verify');
  };

  const displayName = useMemo(() => {
    if (userName) return userName;
    if (!email) return 'Friend';
    const local = email.split('@')[0] || 'Friend';
    return local.charAt(0).toUpperCase() + local.slice(1);
  }, [userName, email]);

  return (
    <div
      className="font-plus-jakarta fixed left-0 right-0 top-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-[#030712] font-sans text-slate-100"
      style={{
        height: 'var(--askme-viewport-height, 100dvh)',
        top: 'var(--askme-viewport-top, 0px)',
      }}
    >
      {/* Bright, full-page neural mind backdrop */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-0 ${messages.length === 0 ? 'block' : 'hidden sm:block'}`}
        style={{
          backgroundImage:
            "linear-gradient(rgba(3,7,18,0.3), rgba(3,7,18,0.48)), url('/gireesh-brain-cutout.png')",
          backgroundSize: 'cover, clamp(200px, 55vw, 360px) auto',
          backgroundPosition: 'center, center 35%',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* 1. TOP HEADER (BRIGHT, CRISP, FROSTED GLASS) */}
      <header className="relative z-30 flex min-h-14 w-full shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/80 px-2 pb-1 pt-[calc(env(safe-area-inset-top)+0.25rem)] backdrop-blur-2xl shadow-lg shadow-black/20 sm:h-16 sm:px-6 sm:py-0">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <button
            onClick={() => router.back()}
            className="group hidden shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs font-medium text-slate-200 shadow-sm transition-all hover:border-blue-400 hover:bg-slate-800 hover:text-white sm:flex sm:px-3 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 text-slate-300" />
            <span className="hidden sm:inline">Portfolio</span>
          </button>

          {/* Gireesh Brain Persona Badge */}
          <div className="flex min-w-0 items-center gap-1.5 pl-1 sm:gap-3 sm:pl-2">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-slate-900 p-0.5 shadow-md shadow-cyan-500/20 sm:h-10 sm:w-10">
              <Image
                src="/gireesh-brain-cutout.png"
                alt="Gireesh Neural Mind"
                width={40}
                height={40}
                className="h-full w-full object-cover rounded-full"
                priority
              />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="font-sans text-sm font-bold leading-tight tracking-tight text-white sm:hidden">Gireesh</span>
                <span className="hidden whitespace-nowrap font-sans text-base font-bold leading-tight tracking-tight text-white sm:inline">
                  Gireesh’s Digital Mind
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-950/70 border border-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online • Open Book
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                Ask about my life, studies, struggles & code
              </p>
            </div>
          </div>
        </div>

        <div ref={menuRef} className="relative flex shrink-0 items-center gap-1.5 sm:gap-3">
          <span className="hidden max-w-[160px] truncate text-xs font-medium text-slate-300 sm:inline">
            {displayName}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Open chat options"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Ellipsis className="h-5 w-5" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Chat options"
              className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl shadow-black/40"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleClearChat}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                <MessageSquarePlus className="h-4 w-4 text-slate-400" />
                New chat
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/');
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                <UserRound className="h-4 w-4 text-slate-400" />
                My profile
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-rose-300 transition hover:bg-rose-950/50 hover:text-rose-200"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. CHAT STREAM / FEED */}
      <div
        ref={feedRef}
        onScroll={handleFeedScroll}
        className="relative z-10 min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-2 pt-2 pb-2 sm:px-6 sm:pt-8 sm:pb-12 no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col space-y-2 sm:space-y-6">
          {/* Minimal empty state keeps the page focused on conversation */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col px-1 pb-4 pt-5 text-center sm:px-3 sm:pb-8 sm:pt-10"
            >
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Hi {displayName}, welcome!
              </h1>
              <p className="mt-2 text-xs text-slate-400 sm:mt-3 sm:text-sm">
                Ask me anything, or choose a question below.
              </p>
              <div className="mx-auto mt-auto grid w-full max-w-xl grid-cols-1 gap-2.5 pt-16 min-[360px]:grid-cols-2 sm:mt-5 sm:gap-3 sm:pt-0">
                {STARTER_PROMPTS.map((suggestion) => {
                  const SuggestionIcon = suggestion.icon;

                  return (
                    <button
                      key={suggestion.category}
                      onClick={() => handleSend(suggestion.prompt)}
                      className="group flex min-h-[92px] items-start gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3 text-left shadow-sm shadow-black/10 backdrop-blur-sm transition-colors hover:border-slate-500/80 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 sm:p-3.5"
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${suggestion.accent}`}>
                        <SuggestionIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                          {suggestion.category}
                        </span>
                        <span className="mt-1 block text-xs font-medium leading-snug text-slate-100 sm:text-sm">
                          {suggestion.question}
                        </span>
                      </span>
                    </button>
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex w-full gap-1 sm:gap-4 ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Brain Avatar */}
                {m.role === 'assistant' && (
                  <div className="relative hidden h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-slate-950 p-0.5 shadow-md shadow-cyan-500/15 sm:block">
                    <Image
                      src="/gireesh-brain-cutout.png"
                      alt="Gireesh Mind"
                      width={40}
                      height={40}
                      className="h-full w-full object-cover rounded-full"
                    />
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  className={`relative max-w-[86%] rounded-2xl shadow-sm sm:max-w-[80%] ${
                    m.role === 'user'
                      ? 'px-2.5 py-1.5 sm:px-5 sm:py-3.5 rounded-tr-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-blue-500/20'
                      : 'w-full px-0 py-0 text-slate-100 sm:w-auto sm:px-5 sm:py-3.5 rounded-tl-sm border-0 bg-transparent shadow-none sm:border sm:border-slate-700/90 sm:bg-slate-950/90 sm:backdrop-blur-xl sm:shadow-lg sm:shadow-black/25'
                  }`}
                >
                  {/* Header Tag for Assistant */}
                  {m.role === 'assistant' && (
                    <div className="mb-0 hidden items-center justify-between border-b-0 pb-0 text-[10px] text-slate-400 sm:mb-2 sm:flex sm:border-b sm:border-slate-800 sm:pb-1.5 sm:text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold text-blue-300">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                        <span>Gireesh</span>
                      </div>
                      {m.timestamp && <span className="hidden sm:inline">{m.timestamp}</span>}
                    </div>
                  )}

                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-[13px] leading-[1.45] sm:text-base sm:leading-relaxed">
                      {m.content}
                    </p>
                  ) : (
                    <FormattedContent content={m.content} />
                  )}

                  {/* Assistant Message Actions */}
                  {m.role === 'assistant' && (
                    <div className="mt-0 flex items-center justify-end border-t-0 pt-0 text-xs sm:mt-3 sm:justify-between sm:border-t sm:border-slate-800 sm:pt-2">
                      <span className="hidden text-[10px] text-slate-400 sm:inline">
                        Authentic response • {m.modelUsed || 'GPT-4o RAG'}
                      </span>
                      <button
                        onClick={() => copyMessage(m.content, m.id)}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white transition sm:px-2.5"
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
                            <span className="hidden sm:inline">Copy answer</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {m.role === 'user' && (
                  <div className="hidden h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-md sm:flex">
                    {displayName.charAt(0)}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* REAL-TIME HUMANIZED TYPING INDICATOR */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2 sm:gap-4"
            >
              <div className="relative hidden h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-cyan-400/80 bg-slate-900 p-0.5 animate-pulse shadow-md sm:block">
                <Image
                  src="/gireesh-brain-cutout.png"
                  alt="Gireesh Mind"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 shadow-md">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-300">
                  Gireesh is reflecting & writing back...
                </span>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* 3. BOTTOM FLOATING PROMPT CAPSULE */}
      <footer
        className="relative z-30 w-full shrink-0 border-t border-slate-800/80 bg-slate-950/85 px-2 pt-1.5 backdrop-blur-2xl sm:px-6 sm:pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.45)]"
        style={{
          paddingBottom: 'calc(var(--askme-footer-safe-bottom, env(safe-area-inset-bottom)) + 6px)',
        }}
      >
        <div className="mx-auto max-w-3xl">
          {messages.length > 0 && !loading && (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Suggested questions">
              {FOLLOW_UP_PROMPTS.filter(
                (suggestion) => !askedSuggestionCategories.includes(suggestion.category),
              ).map((suggestion) => (
                <button
                  key={suggestion.category}
                  onClick={() => handleSend(suggestion.prompt)}
                  className="min-h-8 shrink-0 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-cyan-500/60 hover:bg-slate-800 hover:text-white sm:text-xs"
                >
                  {suggestion.question}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div className="relative flex items-end gap-1.5 rounded-2xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-lg shadow-black/30 transition-all focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 sm:gap-2 sm:p-2.5">
            <textarea
              ref={textareaRef}
              rows={1}
              enterKeyHint="send"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Gireesh anything"
              className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-base text-white placeholder-slate-500 outline-none no-scrollbar sm:max-h-36 sm:min-h-[44px] sm:px-3"
            />

            <button
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl font-medium transition-all duration-200 ${
                input.trim() && !loading
                  ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 hover:scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-70'
              }`}
              aria-label={loading ? 'Waiting for Gireesh’s reply' : 'Send message to Gireesh'}
            >
              <ArrowUp className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>
          <p className="mt-2 px-2 text-xs text-slate-500">
            Your conversation and the email you provided may be stored for private review and deleted after 180 days.
          </p>

        </div>
      </footer>
    </div>
  );
}
