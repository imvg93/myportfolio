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
      requestAnimationFrame(() => otpRefs.current[0]?.focus());
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
      router.replace('/ask-me');
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
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-x-hidden bg-gradient-to-b from-[#eef6ff] via-[#f8fafc] to-[#ffffff] px-4 py-8 font-sans text-slate-800">
      {/* LUMINOUS BRIGHT AURA BACKGROUND LIGHTING */}
      <div className="pointer-events-none absolute -top-24 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-blue-300/35 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-20 -z-10 h-[450px] w-[450px] rounded-full bg-cyan-200/40 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 -z-10 h-[450px] w-[450px] rounded-full bg-indigo-200/30 blur-[130px]" />

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
        className="absolute top-4 left-4 z-20 group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all hover:border-blue-400 hover:bg-white hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 text-slate-500 transition-transform group-hover:-translate-x-1" />
        <span>Portfolio</span>
      </button>

      {/* MAIN ANIMATED CARD CONTAINER */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/85 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl"
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
                src="/gireesh-brain.jpg"
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
              ? 'Enter your name and email to unlock full, unfiltered access to my AI twin.'
              : `We sent a 6-digit verification code to ${email}`}
          </p>
        </div>

        {/* STEP 1 & STEP 2 FORM SLIDE */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div
                key="step-form"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
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
                      className="w-full rounded-2xl border border-slate-300 bg-white/90 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                      className="w-full rounded-2xl border border-slate-300 bg-white/90 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
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
                      Your test passcode is <strong>{devOtp}</strong> (also printed in your server terminal).
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
                  <div className="flex items-center justify-between gap-1.5 sm:gap-2">
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
                        inputMode="numeric"
                        maxLength={1}
                        className="h-13 w-11 sm:h-14 sm:w-13 text-center font-mono text-xl font-bold rounded-2xl border border-slate-300 bg-white text-slate-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
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
