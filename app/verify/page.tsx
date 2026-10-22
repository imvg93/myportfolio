'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Mail,
  User,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [returnTo, setReturnTo] = useState('/ask-me');

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('returnTo');
    if (requested?.startsWith('/') && !requested.startsWith('//')) setReturnTo(requested);
  }, []);

  const sendOtp = async () => {
    try {
      setLoading(true);
      setMessage(null);
      setDevOtp(null);
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to send code');
      setStep('otp');
      if (json.devOtp) {
        setDevOtp(json.devOtp);
      } else {
        setMessage('Code sent! Please check your inbox.');
      }
      setResendIn(30);
      setOtp('');
      setOtpDigits(Array(6).fill(''));
      if (window.matchMedia('(pointer: fine)').matches) {
        requestAnimationFrame(() => otpRefs.current[0]?.focus());
      }
    } catch (e: any) {
      setMessage(e?.message || 'Something went wrong while sending code');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Invalid or expired code');
      router.replace(returnTo);
    } catch (e: any) {
      setMessage(e?.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  // Keep otp string in sync with per-box inputs
  useEffect(() => {
    setOtp(otpDigits.join(''));
  }, [otpDigits]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const handleOtpChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    setOtpDigits((d) => {
      const next = [...d];
      next[i] = digit;
      return next;
    });
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
      setOtpDigits((d) => {
        const next = [...d];
        next[i - 1] = '';
        return next;
      });
    }
    if (e.key === 'ArrowLeft' && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const arr = Array(6).fill('');
    for (let i = 0; i < text.length; i++) arr[i] = text[i];
    setOtpDigits(arr);
    const nextIndex = Math.min(text.length, 5);
    requestAnimationFrame(() => otpRefs.current[nextIndex]?.focus());
  };

  const autoFillDevOtp = () => {
    if (!devOtp) return;
    const arr = devOtp.split('').slice(0, 6);
    setOtpDigits(arr);
    setOtp(devOtp);
  };

  return (
    <div className="font-plus-jakarta relative flex min-h-[100svh] w-full items-start justify-center overflow-x-clip bg-gradient-to-b from-[#eef6ff] via-[#f8fafc] to-[#ffffff] px-3 pb-6 pt-20 font-sans text-slate-800 sm:min-h-[100dvh] sm:items-center sm:px-4 sm:py-12">
      <AnimatePresence>
        {welcomeOpen && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 sm:bg-slate-950/70 sm:backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setWelcomeOpen(false);
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="welcome-title"
              aria-describedby="welcome-description"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-cyan-300/20 bg-slate-950 text-white shadow-[0_24px_100px_rgba(8,145,178,0.22)]"
            >
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent" aria-hidden="true" />
              <div className="relative p-6 sm:p-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200 shadow-inner shadow-cyan-300/10">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Gireesh AI Intelligence</p>
                <h2 id="welcome-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Let’s talk</h2>
                <p id="welcome-description" className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                  Talk to me even when I’m not around. Ask about my work, projects, and ambitions—or get to know the personal stories, experiences, and lessons behind them. Pick a question and see where the conversation takes you.
                </p>
                <div className="mt-5 flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                  <p className="text-xs leading-5 text-slate-300 sm:text-sm">
                    Your conversation won’t be available to revisit after you log out. Come back anytime to start fresh.
                  </p>
                </div>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setWelcomeOpen(false)}
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-950/40 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Start exploring <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LUMINOUS BRIGHT AURA BACKGROUND LIGHTING */}
      <div className="pointer-events-none absolute -top-24 left-1/4 -z-10 h-72 w-72 rounded-full bg-blue-300/35 blur-[64px] sm:h-[500px] sm:w-[500px] sm:blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-20 -z-10 h-72 w-72 rounded-full bg-cyan-200/40 blur-[64px] sm:h-[450px] sm:w-[450px] sm:blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 -z-10 h-72 w-72 rounded-full bg-indigo-200/30 blur-[64px] sm:h-[450px] sm:w-[450px] sm:blur-[130px]" />

      {/* DELICATE DOT TEXTURE */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage: `radial-gradient(rgba(14, 116, 144, 0.16) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* TOP BACK TO PORTFOLIO BUTTON */}
      <button
        onClick={() => router.push('/')}
        className="fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 group inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:border-blue-400 hover:bg-white hover:text-slate-900 sm:left-4 sm:top-4 sm:bg-white/90 sm:backdrop-blur-md sm:text-sm"
      >
        <ArrowLeft className="h-4 w-4 text-slate-500 transition-transform group-hover:-translate-x-1" />
        <span>Portfolio</span>
      </button>

      {/* MAIN ANIMATED CARD CONTAINER */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-2xl sm:bg-white/90 sm:p-8 sm:backdrop-blur-2xl"
      >
        {/* Glowing Neural Brain Floating Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex items-center justify-center">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-400 to-indigo-300 opacity-40 blur-lg animate-pulse" />
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-full border-4 border-white bg-white p-0.5 shadow-xl shadow-cyan-500/20"
            >
              <Image
                src="/gireesh-brain-cutout.png"
                alt="Gireesh Mind"
                width={80}
                height={80}
                className="h-full w-full object-cover rounded-full"
                priority
              />
            </motion.div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
            <Sparkles className="h-3 w-3 text-blue-600" />
            <span>Interactive Twin Access</span>
          </div>

          <h1 className="mt-3 font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {step === 'form' ? 'Talk to Gireesh' : 'Enter One-Time Passcode'}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-xs">
            {step === 'form'
              ? 'Sign in with email to continue your conversation.'
              : `We sent a 6-digit verification code to ${email}`}
          </p>
        </div>

        {/* STEP 1 & STEP 2 FORM SLIDE */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div
                key="step-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      autoComplete="name"
                      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white/90 pl-10 pr-4 py-3 text-base text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white/90 pl-10 pr-4 py-3 text-base text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={sendOtp}
                  disabled={loading || !email.trim() || !name.trim()}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sending passcode…</span>
                    </div>
                  ) : (
                    <>
                      <span>Continue to Chat</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="step-otp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* DEV MODE PROMINENT HELPER BANNER */}
                {devOtp && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 shadow-sm"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5 text-amber-800">
                        <Zap className="h-3.5 w-3.5 text-amber-600" />
                        Dev Mode Active:
                      </span>
                      <button
                        type="button"
                        onClick={autoFillDevOtp}
                        className="font-bold text-blue-700 underline hover:text-blue-900 transition"
                      >
                        Auto-fill {devOtp}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                      Your local development passcode is <strong>{devOtp}</strong>. It is not written to server logs.
                    </p>
                  </motion.div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      6-Digit Passcode
                    </label>
                    <button
                      onClick={() => setStep('form')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                    >
                      Change email
                    </button>
                  </div>

                  {/* 6 INDIVIDUAL DIGIT INPUT BOXES */}
                  <div className="flex items-center justify-between gap-1 sm:gap-2">
                    {otpDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpRefs.current[i] = el;
                        }}
                        value={d}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={handleOtpPaste}
                        aria-label={`Passcode digit ${i + 1}`}
                        inputMode="numeric"
                        autoComplete={i === 0 ? 'one-time-code' : 'off'}
                        maxLength={1}
                        className="h-12 w-10 min-w-0 max-w-12 flex-1 text-center font-mono text-xl font-bold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 sm:h-14 sm:max-w-14 sm:rounded-2xl"
                      />
                    ))}
                  </div>

                  {/* Resend Action */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Didn’t get the code?</span>
                    <button
                      onClick={sendOtp}
                      disabled={resendIn > 0 || loading}
                      className="font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 transition"
                    >
                      {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={verifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Verifying passcode…</span>
                    </div>
                  ) : (
                    <>
                      <span>Verify & Enter Chat</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ERROR OR STATUS MESSAGE */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-blue-600" />
              <span>{message}</span>
            </motion.div>
          )}
        </div>

        {/* FOOTER DISCLAIMER */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">
          <span>Protected access to Gireesh Veeranki’s personal AI model.</span>
        </div>
      </motion.div>
    </div>
  );
}
