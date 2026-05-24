'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, Loader2, ArrowLeft, Mail, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const router  = useRouter();
  const [step, setStep]         = useState<Step>('email');
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // ── Step 1: send OTP ────────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      // Always advance — don't leak whether email exists
      setStep('otp');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify OTP ──────────────────────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return setError('Enter all 6 digits');
    setError('');
    setLoading(true);
    try {
      // We verify on the reset step — just advance here
      setStep('password');
    } finally {
      setLoading(false);
    }
  }

  // OTP input box handler
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  }

  // ── Step 3: reset password ──────────────────────────────────────
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8)  return setError('Password must be at least 8 characters');
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, code: otp.join(''), password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Reset failed');
      setStep('done');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Stock POS</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">

          {/* ── Step: email ── */}
          {step === 'email' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Forgot password?</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Enter your email and we'll send a 6-digit code.
                </p>
              </div>
              <form onSubmit={handleSendOtp} className="space-y-4">
                {error && <ErrorBanner message={error} />}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="you@baraka.com"
                    />
                  </div>
                </div>
                <SubmitButton loading={loading} label="Send Code" />
              </form>
            </>
          )}

          {/* ── Step: otp ── */}
          {step === 'otp' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Enter your code</h2>
                <p className="text-gray-500 text-sm mt-1">
                  We sent a 6-digit code to <strong>{email}</strong>.
                  It expires in 15 minutes.
                </p>
              </div>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {error && <ErrorBanner message={error} />}
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg
                                 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  ))}
                </div>
                <SubmitButton loading={loading} label="Verify Code" />
                <button
                  type="button"
                  onClick={() => { setOtp(['','','','','','']); setStep('email'); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Use a different email
                </button>
              </form>
            </>
          )}

          {/* ── Step: new password ── */}
          {step === 'password' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Set new password</h2>
                <p className="text-gray-500 text-sm mt-1">Choose a strong password.</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && <ErrorBanner message={error} />}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Min. 8 characters"
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-3 text-gray-400">
                      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Repeat password"
                  />
                </div>
                <SubmitButton loading={loading} label="Reset Password" />
              </form>
            </>
          )}

          {/* ── Step: done ── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Password reset!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Your password has been updated. You can now sign in.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* Back to login link */}
          {step !== 'done' && (
            <div className="mt-6 text-center">
              <Link href="/login"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
      {message}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700
                 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {loading ? 'Please wait...' : label}
    </button>
  );
}