// app/(auth)/login/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function LoginPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<{ id: string; email: string } | null>(null);
  const [code, setCode] = useState('');
  const [businessCode, setBusinessCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [welcome, setWelcome] = useState(false);

  // Business code: from the sign-up link (?business=), else the one used last time on this browser
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const fromLink = q.get('business');
    const saved = (() => { try { return localStorage.getItem('pos-business-code'); } catch { return null; } })();
    const initial = fromLink || saved || '';
    if (initial) { setBusinessCode(initial); setShowCode(true); }
    setWelcome(q.get('welcome') === '1');
  }, []);

  function done(data: { passwordChangeRequired?: boolean }) {
    queryClient.clear();
    router.push(data.passwordChangeRequired ? '/change-password?required=1' : '/');
    router.refresh();
  }


  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/auth/verify-2fa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: challenge!.id, code }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Verification failed'); setLoading(false); return; }
    done(data);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, businessCode: businessCode.trim().toLowerCase() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }
      if (data.twoFactorRequired) {
        setChallenge({ id: data.challengeId, email: data.maskedEmail });
        setLoading(false);
        return;
      }
      try { if (businessCode.trim()) localStorage.setItem('pos-business-code', businessCode.trim().toLowerCase()); } catch { /* private mode */ }
      done(data); // goes to /change-password when the password must be replaced, otherwise to the dashboard
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-light flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Stock POS</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {challenge ? (
            <form onSubmit={handleVerify} className="space-y-6">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <p className="text-sm text-gray-600">We emailed a 6-digit code to {challenge.email}.</p>
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" autoComplete="one-time-code" autoFocus required
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white text-gray-900 text-center text-2xl tracking-[0.5em]"
                placeholder="000000" />
              <button type="submit" disabled={loading || code.length !== 6}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400">
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <button type="button" onClick={() => { setChallenge(null); setCode(''); setError(''); }}
                className="w-full text-sm text-gray-600 hover:text-gray-900">Back to sign in</button>
            </form>) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {welcome && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                  Your account is ready. Sign in with the email and password you chose.
                </div>
              )}

              {showCode ? (
                <div>
                  <label htmlFor="business" className="block text-sm font-semibold text-gray-800 mb-2">Business code</label>
                  <input
                    id="business" value={businessCode} onChange={(e) => setBusinessCode(e.target.value)}
                    autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. acme-shop (leave empty for the default)"
                  />
                </div>
              ) : (
                <button type="button" onClick={() => setShowCode(true)} className="text-sm text-gray-700 hover:text-gray-900">
                  Signing in to a different business? <span className="text-blue-600 font-medium">Enter a business code</span>
                </button>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white text-gray-900 
             placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border bg-white text-gray-900 placeholder-gray-500 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
              <div className="text-center">
                <Link
                  href={businessCode.trim() ? `/forgot-password?business=${encodeURIComponent(businessCode.trim().toLowerCase())}` : '/forgot-password'}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          New here?{' '}
          <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">Create an account</Link>
        </p>
        <p className="text-center text-sm text-gray-600 mt-2">
          Need help?{' '}
          <Link href="/support" className="text-blue-600 hover:text-blue-700 font-medium">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}