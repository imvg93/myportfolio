'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [resendIn, setResendIn] = useState(0);

  const sendOtp = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to send code');
      setStep('otp');
      setMessage('Code sent! Check your inbox.');
      setResendIn(30);
      setOtp('');
      setOtpDigits(Array(6).fill(''));
      requestAnimationFrame(() => otpRefs.current[0]?.focus());
    } catch (e: any) {
      setMessage(e?.message || 'Something went wrong');
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
      if (!res.ok || !json.ok) throw new Error(json.error || 'Invalid code');
      router.replace('/ask-me');
    } catch (e: any) {
      setMessage(e?.message || 'Verification failed');
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
    const digit = v.replace(/\D/g, '').slice(0, 1);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-xl p-5 sm:p-6 relative">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <div className="mb-5 sm:mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-xs">Secure Access</div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Verify to continue</h1>
          <p className="text-gray-600 text-sm mt-1">We’ll send a one‑time code to your email</p>
        </div>

        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              />
            </div>
            <button
              onClick={sendOtp}
              disabled={loading || !email || !name}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium transition"
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-5">
            <div>
              <label className="block text-gray-700 text-sm mb-2">Enter 6‑digit code</label>
              <div className="flex items-center justify-between gap-2">
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    inputMode="numeric"
                    maxLength={1}
                    className="w-12 h-12 sm:w-12 sm:h-12 text-center text-lg rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                  />
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-600 flex items-center justify-between">
                <span>Sending to {email}</span>
                <button
                  onClick={sendOtp}
                  disabled={resendIn > 0}
                  className="text-emerald-700 hover:text-emerald-600 disabled:opacity-50"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </button>
              </div>
            </div>
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium transition"
            >
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button
              onClick={() => setStep('form')}
              className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition"
            >
              Change email
            </button>
          </div>
        )}

        {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}
      </div>
    </div>
  );
}


