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
  Sun,
  Moon,
  FolderKanban,
  BrainCircuit,
  Layers3,
  BriefcaseBusiness,
  Code2,
  ContactRound,
  Star,
} from 'lucide-react';
import { useTheme } from '@/lib/use-theme';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  modelUsed?: string;
  suggestions?: string[];
  imageUrl?: string;
  nameSpellingCheck?: boolean;
};

type StarterQuestion = { label: string; question: string };

const STARTER_CATEGORIES = [
  { label: 'Explore My Projects', icon: FolderKanban, accent: 'border-blue-300/20 bg-blue-400/10 text-blue-200' },
  { label: 'Discover My AI Work', icon: BrainCircuit, accent: 'border-amber-300/20 bg-amber-400/10 text-amber-200' },
  { label: 'Understand My Technical Architecture', icon: Layers3, accent: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-200' },
  { label: 'Learn About My Experience', icon: BriefcaseBusiness, accent: 'border-rose-300/20 bg-rose-400/10 text-rose-200' },
  { label: 'Explore My Technical Skills', icon: Code2, accent: 'border-violet-300/20 bg-violet-400/10 text-violet-200' },
  { label: 'Get My Contact Information', icon: ContactRound, accent: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' },
];

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
              className="askme-code-card my-2 overflow-hidden rounded-xl border border-slate-800 bg-[#0c1220] text-slate-100 shadow-lg sm:my-3 sm:rounded-2xl"
            >
              <div className="askme-code-header flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400 sm:px-4 sm:py-2">
                <span className="font-mono tracking-wider uppercase text-cyan-400 font-semibold">
                  {language || 'code'}
                </span>
                <button
                  onClick={() => copyCode(codeBody, idx)}
                  className="askme-copy-button flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-slate-300 hover:bg-slate-800 hover:text-white transition"
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
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return escapedText
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '<a class="text-cyan-300 underline underline-offset-2 hover:text-cyan-200" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-slate-800 text-cyan-200 font-mono text-xs sm:text-sm border border-slate-700 font-medium">$1</code>')
    .replace(/\n/g, '<br/>');
}

function ThinkingOrb() {
  return (
    <div className="flex items-center gap-3 py-2 pl-1 sm:gap-4 sm:py-3 sm:pl-14" role="status" aria-live="polite">
      <div className="askme-thinking-orb" aria-hidden="true">
        <span className="askme-thinking-orb__core" />
        <span className="askme-thinking-orb__ring askme-thinking-orb__ring--one" />
        <span className="askme-thinking-orb__ring askme-thinking-orb__ring--two" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">Gireesh is thinking</p>
        <p className="mt-0.5 text-xs text-slate-400">Preparing a reply…</p>
      </div>
    </div>
  );
}

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [starterQuestions, setStarterQuestions] = useState<StarterQuestion[]>([]);
  const [starterQuestionsLoading, setStarterQuestionsLoading] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackPromptDismissed, setFeedbackPromptDismissed] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [nameCorrectionOpen, setNameCorrectionOpen] = useState(false);
  const [correctedName, setCorrectedName] = useState('');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const shouldAutoScrollRef = useRef(true);
  const starterQuestionsRequestedRef = useRef(false);

  const loadStarterQuestions = async () => {
    if (starterQuestionsRequestedRef.current) return;
    starterQuestionsRequestedRef.current = true;
    setStarterQuestionsLoading(true);
    try {
      const response = await fetch('/api/chat/suggestions', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok === true && Array.isArray(data.suggestions)) {
        const parsedQuestions = data.suggestions
          .filter((item: unknown): item is StarterQuestion => Boolean(
            item && typeof item === 'object'
            && typeof (item as StarterQuestion).label === 'string'
            && typeof (item as StarterQuestion).question === 'string',
          ))
          .map((item: StarterQuestion) => ({ label: item.label.trim(), question: item.question.trim() }))
          .filter((item: StarterQuestion) => item.label && item.question);
        setStarterQuestions(Array.from(new Map<string, StarterQuestion>(
          parsedQuestions.map((item: StarterQuestion): [string, StarterQuestion] => [item.label, item]),
        ).values()).slice(0, 6));
      }
    } catch {
      // The chat remains usable if optional starter question generation fails.
    } finally {
      setStarterQuestionsLoading(false);
    }
  };

  useEffect(() => {
    void loadStarterQuestions();
  }, []);

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
      colorScheme: html.style.colorScheme,
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    const background = theme === 'dark' ? '#030712' : '#f8fafc';
    html.style.backgroundColor = background;
    body.style.backgroundColor = background;
    html.style.colorScheme = theme;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    return () => {
      html.style.backgroundColor = previousStyles.htmlBackground;
      body.style.backgroundColor = previousStyles.bodyBackground;
      html.style.colorScheme = previousStyles.colorScheme;
      html.style.overflow = previousStyles.htmlOverflow;
      body.style.overflow = previousStyles.bodyOverflow;
      html.style.overscrollBehavior = previousStyles.htmlOverscroll;
      body.style.overscrollBehavior = previousStyles.bodyOverscroll;
    };
  }, [theme]);

  // Keep the fixed chat shell aligned to Safari's visible viewport when the
  // keyboard opens. iOS can both resize and pan the visual viewport on focus.
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;

    const syncVisibleViewport = () => {
      if (!viewport) return;

      const keyboardIsOpen = window.innerHeight - viewport.height > 120;
      root.style.setProperty('--askme-viewport-height', `${viewport.height}px`);
      root.style.setProperty('--askme-viewport-offset-top', `${viewport.offsetTop}px`);
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
      root.style.removeProperty('--askme-viewport-offset-top');
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

  const handleSend = async (textToSend?: string, spellingCorrection?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;
    const activeConversationId = conversationId || createUuid();
    if (!conversationId) setConversationId(activeConversationId);

    const userMsg: Message = {
      id: createMessageId(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Sending begins a read phase on mobile: dismiss the software keyboard and
    // keep the feed pinned to the newest message and reply.
    shouldAutoScrollRef.current = true;
    textareaRef.current?.blur();
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
          conversationId: activeConversationId,
          requestId: createUuid(),
          ...(spellingCorrection ? { nameSpellingCorrection: { correctedSpelling: spellingCorrection } } : {}),
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        }),
      });

      const json = await res.json().catch(() => null);
      const reply = res.status === 401
        ? 'Your chat session has expired. Please sign in again to continue.'
        : res.status === 503
          ? 'The chat service is temporarily unavailable. Please try again shortly.'
          : res.status === 400
            ? 'I could not process that message. It may be too long; please shorten it and try again.'
            : res.ok && json?.ok === true && typeof json.reply === 'string' && json.reply.trim()
              ? json.reply
              : 'I could not get a reply from the chat service. Please try again.';
      const assistantMsg: Message = {
        id: createMessageId(),
        role: 'assistant',
        content: reply,
        modelUsed: json.model_used || 'GPT-4o RAG',
        imageUrl: typeof json?.image_url === 'string' && json.image_url.trim() ? json.image_url.trim() : undefined,
        suggestions: Array.isArray(json?.suggestions)
          ? Array.from(new Set<string>(json.suggestions
            .filter((suggestion: unknown): suggestion is string => typeof suggestion === 'string')
            .map((suggestion: string) => suggestion.trim())
            .filter((suggestion: string) => suggestion.length > 0))).slice(0, 4)
          : [],
        nameSpellingCheck: json?.name_spelling_check === true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: 'The connection ended before I received a reply. Your message may appear in the transcript without an assistant answer. Please retry your question.',
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
    setMenuOpen(false);
    setFeedbackOpen(false);
    setFeedbackPromptDismissed(false);
    setFeedbackSubmitted(false);
    setFeedbackRating(0);
    setFeedbackComment('');
    setFeedbackError('');
    setNameCorrectionOpen(false);
    setCorrectedName('');
    shouldAutoScrollRef.current = true;
    feedRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    starterQuestionsRequestedRef.current = false;
    setStarterQuestions([]);
    void loadStarterQuestions();
  };

  const submitFeedback = async () => {
    if (feedbackSubmitting || feedbackSubmitted || feedbackRating < 1 || !conversationId) return;
    setFeedbackSubmitting(true);
    setFeedbackError('');
    try {
      const response = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          rating: feedbackRating,
          ...(feedbackComment.trim() ? { comment: feedbackComment.trim() } : {}),
        }),
      });
      const result = await response.json().catch(() => null);
      if (response.ok || response.status === 409) {
        setFeedbackSubmitted(true);
        setFeedbackOpen(false);
        return;
      }
      setFeedbackError(typeof result?.error === 'string' ? result.error : 'Feedback could not be saved. Please try again.');
    } catch {
      setFeedbackError('Connection problem. Your feedback was not submitted. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
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

  const latestAssistantMessageId = [...messages].reverse().find((message) => message.role === 'assistant')?.id;
  const answeredQuestionCount = Math.min(
    messages.filter((message) => message.role === 'user').length,
    messages.filter((message) => message.role === 'assistant').length,
  );

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (
      answeredQuestionCount >= 5
      && latestMessage?.role === 'assistant'
      && !loading
      && !feedbackPromptDismissed
      && !feedbackSubmitted
    ) {
      setFeedbackOpen(true);
    }
  }, [answeredQuestionCount, feedbackPromptDismissed, feedbackSubmitted, loading, messages]);

  useEffect(() => {
    if (!feedbackOpen) return;
    const feed = feedRef.current;
    // The prompt is triggered by the fifth answered question and sits after
    // the transcript. Bring it into view even when the visitor had scrolled
    // up to read an earlier message; otherwise it can appear to never open.
    shouldAutoScrollRef.current = true;
    feed?.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
  }, [feedbackOpen]);

  return (
    <div
      className={`askme-shell theme-${theme} font-plus-jakarta fixed left-0 right-0 top-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-slate-50 font-sans text-slate-900 dark:bg-[#030712] dark:text-slate-100`}
      style={{
        height: 'var(--askme-viewport-height, 100dvh)',
        top: 'var(--askme-viewport-offset-top, 0px)',
      }}
    >
      {/* Bright, full-page neural mind backdrop */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-0 ${messages.length === 0 ? 'block' : 'hidden sm:block'}`}
        style={{
          backgroundImage:
            `${theme === 'dark' ? 'linear-gradient(rgba(3,7,18,0.3), rgba(3,7,18,0.48))' : 'linear-gradient(rgba(248,250,252,0.25), rgba(248,250,252,0.65))'}, url('/gireesh-brain-cutout.png')`,
          backgroundSize: 'cover, clamp(200px, 55vw, 360px) auto',
          backgroundPosition: 'center, center 35%',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Mobile-only wallpaper from the supplied iPhone mockup demo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 sm:hidden"
        style={{
          backgroundImage:
            theme === 'dark'
              ? "linear-gradient(rgba(3, 7, 18, 0.58), rgba(3, 7, 18, 0.76)), url('https://cdn.21st.dev/assets/mirror/fe/fe93bc0812d60130c9eef6d68e02fa99ded883248049a9107bfb64dbd37fae34.jpg')"
              : 'radial-gradient(ellipse at 18% 18%, rgba(125, 211, 252, 0.30), transparent 42%), radial-gradient(ellipse at 88% 68%, rgba(196, 181, 253, 0.24), transparent 42%), linear-gradient(155deg, #f8fafc 0%, #eef5f8 52%, #f6f3fb 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* 1. TOP HEADER (BRIGHT, CRISP, FROSTED GLASS) */}
      <header className="askme-header relative z-30 flex min-h-14 w-full shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/80 px-2 pb-1 pt-[calc(env(safe-area-inset-top)+0.25rem)] backdrop-blur-2xl shadow-lg shadow-black/20 sm:h-16 sm:px-6 sm:py-0">
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
                  Gireesh AI Intelligence
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
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
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
              className="askme-dropdown absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl shadow-black/40"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleClearChat}
                className="askme-dropdown-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                <MessageSquarePlus className="h-4 w-4 text-slate-400" />
                New chat
              </button>
              {messages.length > 0 && !feedbackSubmitted && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setFeedbackError('');
                    setFeedbackOpen(true);
                  }}
                  className="askme-dropdown-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white"
                >
                  <Star className="h-4 w-4 text-amber-300" />
                  Rate this chat
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/');
                }}
                className="askme-dropdown-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                <UserRound className="h-4 w-4 text-slate-400" />
                My profile
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="askme-dropdown-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-rose-300 transition hover:bg-rose-950/50 hover:text-rose-200"
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
              <h1 className="askme-welcome-title text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Gireesh&apos;s AI Assistant
              </h1>
              <p className="askme-muted mt-2 text-xs text-slate-400 sm:mt-3 sm:text-sm">
                Your guide to my technical work, projects, skills, and engineering experience. Ask me anything to explore my professional background.
              </p>
              <div className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 sm:mt-8 sm:grid-cols-3 sm:gap-3" aria-label="Suggested questions" aria-busy={starterQuestionsLoading}>
                  {STARTER_CATEGORIES.map(({ label, icon: SuggestionIcon, accent }) => {
                    const question = starterQuestions.find((item) => item.label === label)?.question || label;
                    return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleSend(question)}
                      aria-label={`Ask: ${label}`}
                      className="askme-starter-card group flex min-h-[58px] items-center gap-2.5 rounded-2xl border border-slate-700/70 bg-slate-950/55 p-3 text-left text-xs font-medium leading-snug text-slate-100 shadow-sm shadow-black/10 backdrop-blur-sm transition-colors hover:border-slate-500/80 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 sm:min-h-[64px] sm:gap-3 sm:p-3.5 sm:text-sm"
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${accent}`}>
                        <SuggestionIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span>{label}</span>
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
                      ? 'askme-user-bubble px-2.5 py-1.5 sm:px-5 sm:py-3.5 rounded-tr-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-blue-500/20'
                      : 'askme-assistant-bubble w-full px-0 py-0 text-slate-100 sm:w-auto sm:px-5 sm:py-3.5 rounded-tl-sm border-0 bg-transparent shadow-none sm:border sm:border-slate-700/90 sm:bg-slate-950/90 sm:backdrop-blur-xl sm:shadow-lg sm:shadow-black/25'
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
                    <>
                      <FormattedContent content={m.content} />
                      {m.imageUrl && (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 shadow-lg shadow-black/30">
                          <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/70 px-4 py-2.5">
                            <Layers3 className="h-4 w-4 text-cyan-400" />
                            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                              System Architecture
                            </span>
                          </div>
                          <a
                            href={m.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block"
                            title="Click to view full size"
                          >
                            <div className="relative">
                              <img
                                src={m.imageUrl}
                                alt="Gireesh Portfolio Architecture Diagram"
                                className="w-full object-contain transition-opacity group-hover:opacity-90"
                                loading="lazy"
                              />
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                                <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                                  Open full size ↗
                                </span>
                              </div>
                            </div>
                          </a>
                        </div>
                      )}
                      {m.nameSpellingCheck && m.id === latestAssistantMessageId && !loading && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800/70 pt-3" aria-label="Confirm the name spelling">
                          <button type="button" onClick={() => handleSend('Yes, that spelling is correct.')} className="min-h-9 rounded-lg border border-emerald-700/70 bg-emerald-950/50 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/60">Yes, it is correct</button>
                          <button type="button" onClick={() => { setCorrectedName(''); setNameCorrectionOpen(true); }} className="min-h-9 rounded-lg border border-cyan-700/70 bg-cyan-950/50 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/60">No, correct spelling</button>
                        </div>
                      )}
                    </>
                  )}

                  {m.role === 'assistant' && m.id === latestAssistantMessageId && !loading && !!m.suggestions?.length && (
                    <div className="mt-3 border-t border-slate-800/70 pt-2.5" aria-label="Suggested follow-up questions">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">You could also ask</p>
                      <div className="flex flex-wrap gap-2">
                        {m.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSend(suggestion)}
                            className="askme-suggestion min-h-8 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-left text-[11px] font-medium text-slate-300 transition hover:border-cyan-500/60 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 sm:text-xs"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assistant Message Actions */}
                  {m.role === 'assistant' && (
                    <div className="mt-0 flex items-center justify-end border-t-0 pt-0 text-xs sm:mt-3 sm:justify-between sm:border-t sm:border-slate-800 sm:pt-2">
                      <span className="hidden text-[10px] text-slate-400 sm:inline">
                        Authentic response • {m.modelUsed || 'GPT-4o RAG'}
                      </span>
                      <button
                        onClick={() => copyMessage(m.content, m.id)}
                        className="askme-copy-button flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white transition sm:px-2.5"
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

          {/* Thinking orb stays inside the conversation feed, after prior messages. */}
          {loading && <ThinkingOrb />}

          {feedbackOpen && messages.length > 0 && !feedbackSubmitted && (
            <section
              aria-label="Rate this chat"
              className={`mx-auto w-full max-w-2xl rounded-2xl border p-4 shadow-lg sm:p-5 ${theme === 'dark'
                ? 'border-cyan-900/70 bg-slate-950/95 text-slate-100 shadow-black/20'
                : 'border-cyan-200 bg-white/95 text-slate-900 shadow-slate-900/10 backdrop-blur-xl'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold sm:text-base">How was this chat?</h2>
                  <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Your rating helps improve the assistant. Feedback is stored for review.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackOpen(false);
                    setFeedbackPromptDismissed(true);
                  }}
                  className={`rounded-lg px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                >
                  Not now
                </button>
              </div>

              <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    role="radio"
                    aria-checked={feedbackRating === rating}
                    aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                    onClick={() => setFeedbackRating(rating)}
                    className={`rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${theme === 'dark' ? 'text-amber-300 hover:bg-slate-800' : 'text-amber-500 hover:bg-amber-50'}`}
                  >
                    <Star className={`h-6 w-6 ${feedbackRating >= rating ? 'fill-current' : ''}`} />
                  </button>
                ))}
                <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{feedbackRating ? `${feedbackRating} / 5` : 'Choose a rating'}</span>
              </div>

              <label className={`mt-3 block text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="chat-feedback-comment">
                Optional comment
              </label>
              <textarea
                id="chat-feedback-comment"
                value={feedbackComment}
                onChange={(event) => setFeedbackComment(event.target.value.slice(0, 2000))}
                maxLength={2000}
                rows={2}
                placeholder="Anything you’d like me to know?"
                className={`mt-1.5 w-full resize-y rounded-xl border px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${theme === 'dark'
                  ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500'
                  : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'}`}
              />

              {feedbackError && <p className="mt-2 text-xs text-rose-300" role="alert">{feedbackError}</p>}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={submitFeedback}
                  disabled={feedbackRating < 1 || feedbackSubmitting}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {feedbackSubmitting ? 'Submitting…' : 'Submit rating'}
                </button>
              </div>
            </section>
          )}
          {feedbackSubmitted && messages.length > 0 && (
            <p className={`mx-auto w-fit rounded-full border px-4 py-2 text-xs ${theme === 'dark'
              ? 'border-emerald-800 bg-emerald-950/80 text-emerald-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role="status">
              Thanks for your feedback.
            </p>
          )}

          {nameCorrectionOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setNameCorrectionOpen(false); }}>
              <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="name-correction-title"
                onSubmit={(event) => {
                  event.preventDefault();
                  const spelling = correctedName.trim();
                  if (!spelling || loading) return;
                  setNameCorrectionOpen(false);
                  handleSend(`The correct spelling is ${spelling}.`, spelling);
                }}
                className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${theme === 'dark' ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-500">Name spelling</p>
                <h2 id="name-correction-title" className="mt-2 text-lg font-semibold">What is the correct spelling?</h2>
                <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Type the person’s name as it should appear. We’ll save it for admin review.</p>
                <label className="mt-4 block text-sm font-medium" htmlFor="correct-person-name">Correct name</label>
                <input
                  id="correct-person-name"
                  autoFocus
                  required
                  maxLength={200}
                  value={correctedName}
                  onChange={(event) => setCorrectedName(event.target.value)}
                  className={`mt-1.5 min-h-11 w-full rounded-xl border px-3 text-base outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                  placeholder="Type the correct name"
                />
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setNameCorrectionOpen(false)} className={`min-h-10 rounded-lg px-4 text-sm font-medium ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>Cancel</button>
                  <button type="submit" disabled={!correctedName.trim() || loading} className="min-h-10 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50">Send correction</button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* 3. BOTTOM FLOATING PROMPT CAPSULE */}
      <footer
        className="askme-footer relative z-30 w-full shrink-0 border-t border-slate-800/80 bg-slate-950/85 px-2 pt-1.5 backdrop-blur-2xl sm:px-6 sm:pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.45)]"
        style={{
          paddingBottom: 'calc(var(--askme-footer-safe-bottom, env(safe-area-inset-bottom)) + 6px)',
        }}
      >
        <div className="mx-auto max-w-3xl">
          {/* Input Box */}
          <div className="askme-composer relative flex items-end gap-1.5 rounded-2xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-lg shadow-black/30 transition-all focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 sm:gap-2 sm:p-2.5">
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
              className="askme-textarea max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-base text-white placeholder-slate-500 outline-none no-scrollbar sm:max-h-36 sm:min-h-[44px] sm:px-3"
            />

            <button
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`askme-send-button flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl font-medium transition-all duration-200 ${
                input.trim() && !loading
                  ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 hover:scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-70'
              }`}
              aria-label={loading ? 'Waiting for Gireesh’s reply' : 'Send message to Gireesh'}
            >
              <ArrowUp className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>


        </div>
      </footer>
    </div>
  );
}
