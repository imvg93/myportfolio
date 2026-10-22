'use client';

import { useCallback, useEffect, useState } from 'react';

type View = 'stats' | 'otp' | 'email' | 'conversations' | 'timeline' | 'spellings' | 'feedback';
type Row = Record<string, unknown>;
type Filters = { query: string; from: string; to: string; sort: 'recent' | 'oldest' };
type Conversation = {
  conversation_id: string;
  user_id: string | null;
  visitor_email: string;
  started_at: string;
  last_activity_at: string;
  total_messages: number;
  first_message: string | null;
  conversation_status: string;
  ai_provider: string | null;
  ai_model: string | null;
};
type ChatMessage = {
  message_id: string;
  request_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  generation_status: 'received' | 'succeeded' | 'failed';
  has_assistant_reply: boolean | null;
  error_code: string | null;
  response_duration_ms: number | null;
};

const PAGE_SIZE = 25;
const MESSAGE_PAGE_SIZE = 100;
const tabs: { id: View; label: string }[] = [
  { id: 'conversations', label: 'AI conversations' },
  { id: 'stats', label: 'Overview' },
  { id: 'otp', label: 'OTP activity' },
  { id: 'email', label: 'Email activity' },
  { id: 'timeline', label: 'User timeline' },
  { id: 'spellings', label: 'Name spellings' },
  { id: 'feedback', label: 'Chat feedback' },
];
const labels: Record<string, string> = {
  email: 'Email', visitor_email: 'Email', recipient_email: 'Recipient', purpose: 'Purpose',
  requested_at: 'Requested', initiated_at: 'Started', verified_at: 'Verified', email_status: 'Email status',
  verification_status: 'Verification', verification_attempts: 'Attempts', failed_verification_attempts: 'Failed attempts',
  delivery_status: 'Status', provider: 'Provider', failure_code: 'Failure', conversation_id: 'Conversation ID',
  started_at: 'Started', last_activity_at: 'Last activity', total_messages: 'Messages', conversation_status: 'Status',
  request_status: 'Request status', user_id: 'User ID', ai_model: 'Model', type: 'Activity', at: 'Time',
};
const statLabels: Record<string, string> = {
  otpRequests: 'OTP requests', verifiedOtp: 'Verified OTPs', failedOtp: 'Failed verification attempts', emailFailures: 'Email failures',
  conversations: 'Conversations', activeConversations: 'Active conversations', userMessages: 'Visitor messages',
  assistantMessages: 'Assistant replies', failedChats: 'Failed replies',
};

function humanize(key: string) { return labels[key] || key.replaceAll('_', ' '); }
function isValidEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function formatDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}
function formatValue(value: unknown, key = '') {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && (/_at$/.test(key) || key === 'at')) return formatDate(value);
  return String(value);
}
function statusStyle(status: string) {
  if (status === 'failed' || status === 'bounced' || status === 'expired') return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (status === 'completed' || status === 'verified' || status === 'delivered' || status === 'accepted') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  return 'bg-amber-50 text-amber-800 ring-amber-200';
}

export default function MonitoringDashboard() {
  const [view, setView] = useState<View>('conversations');
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Row | null>(null);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<'recent' | 'oldest'>('recent');
  const [filters, setFilters] = useState<Filters>({ query: '', from: '', to: '', sort: 'recent' });
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagePage, setMessagePage] = useState(1);
  const [messageCount, setMessageCount] = useState(0);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [spellingDrafts, setSpellingDrafts] = useState<Record<string, string>>({});
  const [savingSpelling, setSavingSpelling] = useState<string | null>(null);
  const [spellingNotice, setSpellingNotice] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setRefreshTick((tick) => tick + 1);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(async (activeView: View, activePage: number, backgroundRefresh = false) => {
    if (activeView === 'timeline' && !isValidEmail(filters.query)) {
      setRows([]);
      setCount(0);
      setError(filters.query.trim() ? 'Enter a valid visitor email address to search the timeline.' : '');
      setLoading(false);
      return;
    }
    if (!backgroundRefresh) {
      setLoading(true);
      setError('');
    }
    try {
      const params = new URLSearchParams({ view: activeView, page: String(activePage), pageSize: String(PAGE_SIZE) });
      if (activeView === 'conversations') params.set('sort', filters.sort);
      if (filters.query.trim()) params.set(activeView === 'timeline' ? 'email' : 'q', filters.query.trim());
      if (filters.from) params.set('from', new Date(`${filters.from}T00:00:00.000Z`).toISOString());
      if (filters.to) params.set('to', new Date(`${filters.to}T23:59:59.999Z`).toISOString());
      const response = await fetch(`/api/admin/monitoring?${params}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Monitoring records could not be loaded.');
      setError('');
      if (activeView === 'stats') setStats(result.data || {});
      else { setRows(result.data || []); setCount(result.count || 0); }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Monitoring records could not be loaded.');
      if (!backgroundRefresh) setRows([]);
    } finally { if (!backgroundRefresh) setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(view, page, refreshTick > 0); }, [view, page, load, refreshTick]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailError('');
      try {
        const params = new URLSearchParams({
          view: 'messages', conversationId: selected,
          page: String(messagePage), pageSize: String(MESSAGE_PAGE_SIZE),
        });
        const response = await fetch(`/api/admin/monitoring?${params}`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || 'Conversation could not be loaded.');
        if (cancelled) return;
        setConversation(result.conversation);
        setMessages(result.data || []);
        setMessageCount(result.count || 0);
      } catch (loadError) {
        if (!cancelled) setDetailError(loadError instanceof Error ? loadError.message : 'Conversation could not be loaded.');
      } finally { if (!cancelled) setDetailLoading(false); }
    };
    void loadDetail();
    return () => { cancelled = true; };
  }, [selected, messagePage, refreshTick]);

  const changeView = (nextView: View) => {
    setView(nextView);
    setPage(1);
    setSelected(null);
    setConversation(null);
  };
  const applyFilters = () => {
    setPage(1);
    setSelected(null);
    setError('');
    if (view === 'timeline' && !isValidEmail(query)) {
      setRows([]);
      setCount(0);
      setError('Enter a valid visitor email address to search the timeline.');
      return;
    }
    setFilters({ query, from, to, sort });
  };
  const openConversation = (id: string) => {
    setMessagePage(1);
    setConversation(null);
    setMessages([]);
    setSelected(id);
  };

  const saveSpelling = async (row: Row) => {
    const id = String(row.id || '');
    const correctedSpelling = (spellingDrafts[id] ?? String(row.corrected_spelling || row.visitor_spelling || '')).trim();
    if (!id || !correctedSpelling) return;
    setSavingSpelling(id);
    setSpellingNotice('');
    try {
      const response = await fetch('/api/admin/monitoring', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'spelling', id, correctedSpelling, status: 'reviewed' }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not save spelling.');
      setRows((current) => current.map((item) => item.id === id ? { ...item, ...result.data } : item));
      setSpellingDrafts((current) => ({ ...current, [id]: correctedSpelling }));
      setSpellingNotice('Spelling saved.');
    } catch (saveError) {
      setSpellingNotice(saveError instanceof Error ? saveError.message : 'Could not save spelling.');
    } finally { setSavingSpelling(null); }
  };

  const markFeedbackReviewed = async (row: Row) => {
    const id = String(row.id || '');
    if (!id) return;
    setSavingSpelling(id);
    setSpellingNotice('');
    try {
      const response = await fetch('/api/admin/monitoring', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'feedback', id, reviewStatus: 'reviewed' }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not update feedback.');
      setRows((current) => current.map((item) => item.id === id ? { ...item, ...result.data } : item));
      setSpellingNotice('Feedback marked as reviewed.');
    } catch (saveError) {
      setSpellingNotice(saveError instanceof Error ? saveError.message : 'Could not update feedback.');
    } finally { setSavingSpelling(null); }
  };

  const renderConversationList = () => (
    <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
        <div><h2 className="font-semibold text-slate-900">Conversations</h2><p className="mt-0.5 text-xs text-slate-500">Most recently active first</p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{count} total</span>
      </div>
      {error && <p role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="max-h-[65vh] min-h-[40vh] flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
        {loading ? Array.from({ length: 5 }, (_, index) => <div key={index} className="animate-pulse px-5 py-5"><div className="h-3 w-44 rounded bg-slate-200" /><div className="mt-3 h-3 w-4/5 rounded bg-slate-100" /></div>) : null}
        {!loading && view === 'conversations' && rows.map((row, index) => {
          const id = typeof row.conversation_id === 'string' ? row.conversation_id : '';
          const visitorLabel = String(row.visitor_email || 'unknown visitor');
          return <button key={`${id || 'missing-conversation'}-${index}`} disabled={!id} onClick={() => { if (id) openConversation(id); }} className={`block w-full px-5 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-700 disabled:cursor-not-allowed disabled:opacity-70 ${selected === id && id ? 'bg-cyan-50/70' : ''}`} aria-label={id ? `Open conversation with ${visitorLabel}` : `Conversation with ${visitorLabel} has no conversation ID`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="break-all font-semibold text-slate-900">{String(row.visitor_email || 'Email unavailable')}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${statusStyle(String(row.conversation_status || 'active'))}`}>{String(row.conversation_status || 'active')}</span>
            </div>
            <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-600">{String(row.first_message || 'No visitor message recorded yet.')}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>{Number(row.total_messages || 0)} messages</span><span>Started {formatDate(row.started_at)}</span><span>Active {formatDate(row.last_activity_at)}</span>
            </div>
            <p className="mt-2 truncate font-mono text-[10px] text-slate-400">{id || 'Conversation ID unavailable'}</p>
          </button>;
        })}
        {!loading && view !== 'conversations' && rows.map((row, index) => <article key={String(row.request_id || row.id || row.conversation_id || index)} className="grid gap-2 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(row).filter(([key]) => !['provider_message_id', 'id', 'otp_request_id', 'request_id', 'email_failure_code', 'total_count'].includes(key)).map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{humanize(key)}</dt><dd className="mt-1 break-words text-sm text-slate-700">{formatValue(value, key)}</dd></div>)}
        </article>)}
        {!loading && !rows.length && <div className="px-5 py-14 text-center"><p className="font-medium text-slate-700">{view === 'timeline' && !filters.query.trim() ? 'Search a visitor timeline' : 'No records found'}</p><p className="mt-1 text-sm text-slate-500">{view === 'timeline' && !filters.query.trim() ? 'Enter the visitor’s email address above, then apply filters to see their OTP, email, and chat activity.' : 'Try a different email, phrase, or date range.'}</p></div>}
      </div>
      {view !== 'stats' && <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500"><span>{count} records · page {page}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Previous</button><button disabled={page * PAGE_SIZE >= count || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next</button></div></footer>}
    </section>
  );

  const renderConversationDetail = () => (
    <section className="flex min-h-[60vh] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {detailLoading && !conversation ? <div className="space-y-4 overflow-y-auto p-6" aria-live="polite"><div className="h-5 w-52 animate-pulse rounded bg-slate-200" /><div className="h-16 animate-pulse rounded-xl bg-slate-100" /><div className="h-20 animate-pulse rounded-xl bg-slate-100" /></div> : null}
      {detailError && <p role="alert" className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{detailError}</p>}
      {conversation && <>
        <header className="shrink-0 border-b border-slate-100 p-5">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Conversation transcript</p><h2 className="mt-1 break-all text-lg font-semibold text-slate-900">{conversation.visitor_email}</h2><p className="mt-1 break-all font-mono text-[11px] text-slate-500">{conversation.conversation_id}</p></div><button onClick={() => { setSelected(null); setConversation(null); }} className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to list</button></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {[['Started', conversation.started_at], ['Last activity', conversation.last_activity_at], ['Messages', conversation.total_messages], ['Status', conversation.conversation_status]].map(([label, value]) => <div key={String(label)} className="min-w-0 rounded-xl bg-slate-50 p-3"><p className="text-slate-500">{label}</p><p className="mt-1 break-words font-semibold capitalize text-slate-800">{label === 'Started' || label === 'Last activity' ? formatDate(value) : String(value ?? '—')}</p></div>)}
          </div>
        </header>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3 text-xs text-slate-500"><span>{messageCount} messages · page {messagePage}</span><span>{conversation.ai_model || conversation.ai_provider || 'Model unavailable'}</span></div>
        <div className="max-h-[65vh] min-h-[40vh] flex-1 space-y-4 overflow-y-auto overscroll-contain bg-slate-50/70 p-4 sm:p-5" aria-live="polite">
          {messages.map((message) => <article key={message.message_id} className={`w-full max-w-[88%] rounded-xl border p-3 sm:max-w-[76%] ${message.role === 'user' ? 'ml-auto border-cyan-200 bg-cyan-50' : 'mr-auto border-slate-200 bg-white'}`}>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2"><span className={`text-[10px] font-bold uppercase tracking-wide ${message.role === 'user' ? 'text-cyan-800' : 'text-slate-600'}`}>{message.role === 'user' ? 'Visitor' : 'AI assistant'}{message.generation_status === 'failed' && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">Failed</span>}{message.role === 'user' && message.has_assistant_reply === false && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">No reply saved</span>}</span><time className="text-[10px] text-slate-500">{formatDate(message.created_at)}</time></div>
            <p className="break-words whitespace-pre-wrap text-[13px] leading-5 text-slate-800">{message.content}</p>
            {message.error_code && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">Recorded error: {message.error_code}</p>}
            {message.response_duration_ms !== null && <p className="mt-2 text-right text-[10px] text-slate-400">Reply time {message.response_duration_ms} ms</p>}
          </article>)}
          {!messages.length && !detailLoading && !detailError && <div className="py-12 text-center text-sm text-slate-500">No messages were recorded for this conversation.</div>}
        </div>
        <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 px-4 py-3 text-sm"><button disabled={messagePage <= 1 || detailLoading} onClick={() => setMessagePage((value) => value - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 disabled:opacity-40">Earlier messages</button><span className="text-xs text-slate-500">{Math.max(1, Math.ceil(messageCount / MESSAGE_PAGE_SIZE))} pages</span><button disabled={messagePage * MESSAGE_PAGE_SIZE >= messageCount || detailLoading} onClick={() => setMessagePage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 disabled:opacity-40">Later messages</button></footer>
      </>}
    </section>
  );

  return (
    <main className="min-h-screen min-h-[100dvh] overflow-y-auto overscroll-y-contain bg-[#f5f7fb] px-3 py-3 text-slate-900 sm:px-6 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1500px] flex-col sm:min-h-[calc(100dvh-2.5rem)]">
        {!selected && <header className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-5 sm:p-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Private admin workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Activity monitoring</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review verified visitor activity and read the exact messages and replies recorded by the chatbot.</p><p className="mt-1 text-xs font-medium text-emerald-700">Live updates every 5 seconds while this tab is open.</p></div>
          <a href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">View portfolio</a>
        </header>}

        {!selected && <nav className="mb-4 flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm sm:mb-5" aria-label="Monitoring views">
          {tabs.map((tab) => <button key={tab.id} onClick={() => changeView(tab.id)} aria-current={view === tab.id ? 'page' : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${view === tab.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>{tab.label}</button>)}
        </nav>}

        {!selected && view === 'stats' && <section className="mb-4 grid shrink-0 gap-3 sm:mb-5 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(statLabels).map(([key, label]) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{String(stats?.[key] ?? (loading ? '…' : '0'))}</p></article>)}
        </section>}

        {!selected && <section className="mb-4 grid shrink-0 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-5 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_12rem_auto] lg:items-end">
          <label className="text-xs font-semibold text-slate-600">{view === 'timeline' ? 'Search by email' : view === 'conversations' ? 'Search email, conversation ID, or message' : view === 'spellings' ? 'Search email or name' : view === 'feedback' ? 'Search comment or conversation ID' : 'Search email'}<input type={view === 'timeline' ? 'email' : 'text'} aria-label="Search monitoring records" className="mt-1.5 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100" value={query} onChange={(event) => { setQuery(event.target.value); if (error) setError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }} placeholder={view === 'conversations' ? 'visitor@example.com or a phrase' : view === 'spellings' ? 'name or visitor@example.com' : view === 'feedback' ? 'comment text or conversation UUID' : 'visitor@example.com'} /></label>
          <label className="text-xs font-semibold text-slate-600">From<input type="date" className="mt-1.5 block min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-900" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="text-xs font-semibold text-slate-600">To<input type="date" className="mt-1.5 block min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-900" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          {view === 'conversations' && <label className="text-xs font-semibold text-slate-600">Sort by<select className="mt-1.5 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900" value={sort} onChange={(event) => setSort(event.target.value as 'recent' | 'oldest')}><option value="recent">Recent activity</option><option value="oldest">Oldest activity</option></select></label>}
          <button onClick={applyFilters} className="min-h-10 rounded-lg bg-cyan-800 px-5 text-sm font-semibold text-white hover:bg-cyan-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2">Apply filters</button>
        </section>}

        {view === 'conversations' && <div className="min-h-[60vh] flex-1">
          <div className={selected ? 'grid min-h-[60vh] gap-4 lg:grid-cols-[minmax(19rem,0.85fr)_minmax(0,1.35fr)]' : 'min-h-[60vh]'}>
            <div className={selected ? 'hidden min-h-[60vh] lg:block' : 'min-h-[60vh]'}>{renderConversationList()}</div>
            {selected && <div className="min-h-[60vh] min-w-0">{renderConversationDetail()}</div>}
          </div>
        </div>}
        {view === 'spellings' && <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Name spelling review</h2><p className="mt-1 text-xs leading-5 text-slate-500">When the assistant asks a visitor to clarify a name, the spelling and the name context are saved here for your review.</p>{spellingNotice && <p role="status" className="mt-2 text-sm font-medium text-cyan-800">{spellingNotice}</p>}</header>
          {error && <p role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {loading ? <p className="p-6 text-sm text-slate-500">Loading spelling records…</p> : rows.length ? <div className="divide-y divide-slate-100">{rows.map((row) => {
            const id = String(row.id || '');
            const draft = spellingDrafts[id] ?? String(row.corrected_spelling || row.visitor_spelling || '');
            return <article key={id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)_auto] lg:items-start">
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Visitor spelling</p><p className="mt-1 break-words font-semibold text-slate-900">{String(row.visitor_spelling || '—')}</p><p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Name context</p><p className="mt-1 break-words whitespace-pre-wrap text-sm leading-5 text-slate-700">{String(row.mentioned_name_context || 'No prior name context recorded.')}</p><p className="mt-3 text-xs text-slate-500">{String(row.visitor_email || 'Email unavailable')} · {formatDate(row.created_at)}</p></div>
              <label className="text-xs font-semibold text-slate-600">Canonical spelling<input aria-label={`Canonical spelling for ${String(row.visitor_spelling || 'name')}`} className="mt-1.5 block min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-900" value={draft} onChange={(event) => setSpellingDrafts((current) => ({ ...current, [id]: event.target.value }))} /></label>
              <div className="flex items-center gap-3 lg:pt-5"><button disabled={savingSpelling === id || !draft.trim()} onClick={() => void saveSpelling(row)} className="rounded-lg bg-cyan-800 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-900 disabled:opacity-50">{savingSpelling === id ? 'Saving…' : row.status === 'reviewed' ? 'Update' : 'Save'}</button><span className="text-xs capitalize text-slate-500">{String(row.status || 'pending')}</span></div>
            </article>;
          })}</div> : <p className="px-5 py-14 text-center text-sm text-slate-500">No name spelling records yet.</p>}
          <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500"><span>{count} records · page {page}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 disabled:opacity-40">Previous</button><button disabled={page * PAGE_SIZE >= count || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 disabled:opacity-40">Next</button></div></footer>
        </section>}
        {view === 'feedback' && <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Visitor chat feedback</h2><p className="mt-1 text-xs leading-5 text-slate-500">Ratings and optional comments submitted at the end of a chat conversation.</p>{spellingNotice && <p role="status" className="mt-2 text-sm font-medium text-cyan-800">{spellingNotice}</p>}</header>
          {error && <p role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {loading ? <p className="p-6 text-sm text-slate-500">Loading feedback…</p> : rows.length ? <div className="divide-y divide-slate-100">{rows.map((row) => {
            const id = String(row.id || '');
            const rating = Number(row.rating || 0);
            return <article key={id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><p className="font-semibold text-slate-900" aria-label={`Rating: ${rating} out of 5`}>{'★'.repeat(Math.max(0, Math.min(5, rating)))}<span className="ml-2 text-sm text-slate-600">{rating}/5</span></p><p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-slate-700">{String(row.comment || 'No written comment was provided.')}</p><p className="mt-3 break-all text-xs text-slate-500">{String(row.visitor_email || 'Email unavailable')} · {formatDate(row.created_at)}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-400">Conversation {String(row.conversation_id || '—')}</p></div>
              <div className="flex shrink-0 items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyle(String(row.review_status || 'pending'))}`}>{String(row.review_status || 'pending')}</span>{row.review_status !== 'reviewed' && <button disabled={savingSpelling === id} onClick={() => void markFeedbackReviewed(row)} className="rounded-lg bg-cyan-800 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-900 disabled:opacity-50">{savingSpelling === id ? 'Saving…' : 'Mark reviewed'}</button>}</div>
            </article>;
          })}</div> : <p className="px-5 py-14 text-center text-sm text-slate-500">No feedback records found.</p>}
          <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500"><span>{count} records · page {page}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 disabled:opacity-40">Previous</button><button disabled={page * PAGE_SIZE >= count || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 disabled:opacity-40">Next</button></div></footer>
        </section>}
        {view !== 'conversations' && view !== 'spellings' && view !== 'feedback' && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {view !== 'stats' && renderConversationList()}
          {view === 'stats' && <div className="grid gap-4 pb-2 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Chat monitoring</h2><p className="mt-2 text-sm leading-6 text-slate-600">Open AI conversations to search by visitor email, review each transcript, and check recorded failures. The transcript contains real stored messages; older interactions that were not logged cannot be reconstructed.</p><button onClick={() => changeView('conversations')} className="mt-4 rounded-lg bg-cyan-800 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-900">Review conversations</button></section><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Retention and privacy</h2><p className="mt-2 text-sm leading-6 text-slate-600">Monitoring records are retained for up to 180 days. OTP values, passwords, session tokens, and API keys are not shown here.</p></section></div>}
          <p className="mt-5 pb-2 text-xs leading-5 text-slate-500">Private monitoring data is available only to configured administrators. Records are automatically pruned after 180 days.</p>
        </div>}
      </div>
    </main>
  );
}
