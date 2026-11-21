// app/(auth)/signup/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, BarChart3, Check, CheckCircle2, Eye, EyeOff, Globe, Link2, Loader2, Lock, Mail,
  Package, Phone, ShoppingBag, Store, User, Users, Wallet, X,
} from 'lucide-react';
import { slugify, validateSignup, validateSlug } from '@/lib/signup';

// Strong contrast on purpose: dark labels, mid-grey (not light-grey) placeholders, visible borders.
const inputCls =
  'w-full h-12 pl-11 pr-4 text-base text-gray-900 placeholder-gray-500 bg-white border border-gray-400 rounded-xl ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-shadow';

type SlugState = { status: 'idle' | 'checking' | 'ok' | 'bad'; message?: string };

const FEATURES = [
  { icon: ShoppingBag, text: 'A point of sale that is quick at the counter' },
  { icon: Package, text: 'Stock tracking with low-stock alerts' },
  { icon: Wallet, text: 'Credit sales and customer balances' },
  { icon: BarChart3, text: 'Daily sales and cash-collected reports' },
  { icon: Globe, text: 'Your own online store, ready to share' },
  { icon: Users, text: 'Staff accounts with their own permissions' },
];

function strength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];
  const colors = ['bg-gray-300', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-green-600'];
  return { score, label: pw ? labels[score] : '', color: colors[score] };
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [f, setF] = useState({ businessName: '', slug: '', email: '', phone: '', ownerName: '', password: '', confirm: '', website: '', acceptTerms: false });
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>({ status: 'idle' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [info, setInfo] = useState<{ planName: string; trialDays: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const code = digits.join('');
  const pw = strength(f.password);

  useEffect(() => {
    fetch('/api/auth/signup/info').then((r) => (r.ok ? r.json() : null)).then(setInfo).catch(() => {});
  }, []);

  // Suggest a business code from the name until the person edits it themselves
  useEffect(() => {
    if (!slugEdited) setF((p) => ({ ...p, slug: slugify(p.businessName) }));
  }, [f.businessName, slugEdited]);

  // Check availability as they type
  useEffect(() => {
    clearTimeout(timer.current);
    if (!f.slug) return setSlugState({ status: 'idle' });
    const local = validateSlug(f.slug);
    if (local) return setSlugState({ status: 'bad', message: local });
    setSlugState({ status: 'checking' });
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/signup/slug?slug=${encodeURIComponent(f.slug)}`);
        const d = await res.json();
        setSlugState(d.available ? { status: 'ok', message: 'Available' } : { status: 'bad', message: d.reason ?? 'Not available' });
      } catch {
        setSlugState({ status: 'idle' });
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [f.slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const problem = validateSignup({ ...f, email: f.email.trim().toLowerCase() });
    if (problem) return setError(problem);
    if (f.password !== f.confirm) return setError('Passwords do not match');
    if (slugState.status === 'bad') return setError(slugState.message ?? 'Choose a different business code');
    if (!f.acceptTerms) return setError('Please accept the terms to continue');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, confirm: undefined }),
      });
      const d = await res.json();
      if (res.status === 409 && d.code === 'PENDING_VERIFICATION') { setStep('verify'); return setNotice(d.error); }
      if (!res.ok) return setError(d.error ?? 'Could not create your account');
      setNotice(d.emailSent === false ? 'We could not send the email yet. Tap "Resend code".' : `We emailed a 6-digit code to ${f.email}.`);
      setStep('verify');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    if (code.length !== 6 || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: f.slug, email: f.email.trim().toLowerCase(), code }),
      });
      const d = await res.json();
      if (!res.ok) { setDigits(['', '', '', '', '', '']); boxes.current[0]?.focus(); return setError(d.error ?? 'Verification failed'); }
      try { localStorage.setItem('pos-business-code', d.slug); } catch { /* private mode */ }
      router.push(`/login?business=${encodeURIComponent(d.slug)}&welcome=1`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError(''); setNotice('');
    const res = await fetch('/api/auth/signup/resend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: f.slug, email: f.email.trim().toLowerCase() }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error ?? 'Could not resend the code');
    setNotice('A new code is on its way.');
  }

  // 6 separate boxes: type, paste, backspace
  function onDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, '');
    if (!clean) { setDigits((d) => d.map((x, j) => (j === i ? '' : x))); return; }
    setDigits((d) => {
      const next = [...d];
      clean.slice(0, 6 - i).split('').forEach((ch, k) => { next[i + k] = ch; });
      return next;
    });
    boxes.current[Math.min(i + clean.length, 5)]?.focus();
  }
  function onKey(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === 'Enter') verify();
  }
  useEffect(() => { if (step === 'verify' && code.length === 6) verify(); /* auto-submit when complete */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] bg-white">
      {/* ───────── Brand panel ───────── */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white px-6 py-8 lg:px-12 lg:py-14 flex flex-col">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-indigo-400/20" />

        <div className="relative flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/30">
            <ShoppingBag className="w-6 h-6" />
          </span>
          <span className="text-xl font-bold tracking-tight">Stock POS</span>
        </div>

        <div className="relative mt-8 lg:mt-20">
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">Run your whole shop from one place</h1>
          <p className="mt-3 text-blue-100 text-base lg:text-lg max-w-md">
            Sell, track stock and see how your business is doing, on any phone or computer.
          </p>

          {info && info.trialDays > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white text-blue-800 font-semibold text-sm px-4 py-2 shadow">
              <CheckCircle2 className="w-4 h-4" /> {info.trialDays}-day free {info.planName} trial, no card needed
            </div>
          )}

          <ul className="mt-8 space-y-3.5 hidden sm:block">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-blue-50">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 shrink-0"><Icon className="w-4 h-4" /></span>
                <span className="text-[15px]">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-auto pt-10 text-sm text-blue-100 hidden lg:block">
          Already using Stock POS?{' '}
          <Link href="/login" className="font-semibold text-white underline underline-offset-4">Sign in</Link>
        </p>
      </aside>

      {/* ───────── Form ───────── */}
      <main className="flex items-start lg:items-center justify-center px-5 py-8 lg:px-12 bg-gray-50 lg:bg-white">
        <div className="w-full max-w-xl">
          {/* Steps */}
          <ol className="flex items-center gap-3 mb-8" aria-label="Progress">
            {[{ n: 1, t: 'Your details', active: step === 'form', done: step === 'verify' }, { n: 2, t: 'Confirm email', active: step === 'verify', done: false }].map((s, i) => (
              <li key={s.n} className="flex items-center gap-3">
                {i > 0 && <span className={`h-0.5 w-10 sm:w-16 rounded ${step === 'verify' ? 'bg-blue-600' : 'bg-gray-300'}`} />}
                <span className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${s.done ? 'bg-green-600 text-white' : s.active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {s.done ? <Check className="w-4 h-4" /> : s.n}
                  </span>
                  <span className={`text-sm font-semibold ${s.active || s.done ? 'text-gray-900' : 'text-gray-600'}`}>{s.t}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-200 p-6 sm:p-8">
            {error && <div role="alert" className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl text-sm font-medium mb-5">{error}</div>}
            {notice && <div className="bg-blue-50 border border-blue-300 text-blue-900 px-4 py-3 rounded-xl text-sm font-medium mb-5">{notice}</div>}

            {step === 'form' ? (
              <form onSubmit={submit} className="space-y-6" noValidate>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
                  <p className="text-gray-700 mt-1">It takes about two minutes.</p>
                </div>

                <fieldset className="space-y-5">
                  <legend className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Your business</legend>

                  <Field label="Business name" icon={Store}>
                    <input className={inputCls} value={f.businessName} onChange={(e) => set('businessName', e.target.value)} required placeholder="e.g. Mama Njeri Shop" autoComplete="organization" />
                  </Field>

                  <Field label="Business code" icon={Link2} hint={
                    slugState.status === 'ok' || slugState.status === 'bad'
                      ? <span className={`font-semibold ${slugState.status === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{slugState.message}</span>
                      : 'You use this code to sign in. Letters, numbers and hyphens.'
                  }>
                    <input className={`${inputCls} pr-11`} value={f.slug} required autoCapitalize="none" spellCheck={false}
                      onChange={(e) => { setSlugEdited(true); set('slug', e.target.value.toLowerCase()); }} placeholder="e.g. mama-njeri" />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {slugState.status === 'checking' && <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />}
                      {slugState.status === 'ok' && <Check className="w-5 h-5 text-green-600" />}
                      {slugState.status === 'bad' && <X className="w-5 h-5 text-red-600" />}
                    </span>
                  </Field>
                </fieldset>

                <fieldset className="space-y-5 pt-2">
                  <legend className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Your account</legend>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Your name" icon={User}>
                      <input className={inputCls} value={f.ownerName} onChange={(e) => set('ownerName', e.target.value)} required placeholder="Full name" autoComplete="name" />
                    </Field>
                    <Field label="Phone" optional icon={Phone}>
                      <input className={inputCls} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0712 345 678" autoComplete="tel" inputMode="tel" />
                    </Field>
                  </div>

                  <Field label="Email" icon={Mail} hint="We send a confirmation code to this address.">
                    <input type="email" className={inputCls} value={f.email} onChange={(e) => set('email', e.target.value)} required placeholder="you@example.com" autoComplete="email" />
                  </Field>

                  <Field label="Password" icon={Lock}>
                    <input type={showPw ? 'text' : 'password'} className={`${inputCls} pr-12`} value={f.password} onChange={(e) => set('password', e.target.value)} required placeholder="At least 8 characters" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-600 hover:text-gray-900">
                      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </Field>
                  {f.password && (
                    <div className="-mt-2" aria-live="polite">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${pw.score >= n ? pw.color : 'bg-gray-200'}`} />)}
                      </div>
                      <p className="text-sm text-gray-700 mt-1.5">{pw.label}. Use 8+ characters with a letter and a number.</p>
                    </div>
                  )}

                  <Field label="Confirm password" icon={Lock}>
                    <input type={showPw ? 'text' : 'password'} className={`${inputCls} pr-11`} value={f.confirm} onChange={(e) => set('confirm', e.target.value)} required placeholder="Type it again" autoComplete="new-password" />
                    {f.confirm && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        {f.confirm === f.password ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                      </span>
                    )}
                  </Field>
                </fieldset>

                {/* Honeypot: hidden from people, filled in by bots */}
                <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={(e) => set('website', e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }} name="website" />

                <label className="flex items-start gap-3 text-[15px] text-gray-800 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-5 h-5 accent-blue-600" checked={f.acceptTerms} onChange={(e) => set('acceptTerms', e.target.checked)} />
                  <span>I agree to the <Link href="/terms" target="_blank" className="text-blue-700 font-semibold underline underline-offset-4 hover:text-blue-900">Terms and Conditions</Link>.</span>
                </label>

                <button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base shadow-md shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating your account…</> : <>Create account <ArrowRight className="w-5 h-5" /></>}
                </button>
              </form>
            ) : (
              <form onSubmit={verify} className="space-y-6">
                <div className="text-center">
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 text-blue-700 mb-3"><Mail className="w-7 h-7" /></span>
                  <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
                  <p className="text-gray-700 mt-1">Enter the 6-digit code sent to <strong className="text-gray-900">{f.email}</strong></p>
                </div>

                <div className="flex justify-center gap-2 sm:gap-3">
                  {digits.map((d, i) => (
                    <input key={i} ref={(el) => { boxes.current[i] = el; }} value={d}
                      onChange={(e) => onDigit(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} onFocus={(e) => e.target.select()}
                      inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6} autoFocus={i === 0}
                      aria-label={`Digit ${i + 1}`}
                      className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold text-gray-900 bg-white border-2 border-gray-400 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30" />
                  ))}
                </div>

                <button type="submit" disabled={loading || code.length !== 6}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base shadow-md shadow-blue-600/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying…</> : 'Confirm and continue'}
                </button>
                <div className="flex justify-between text-sm font-medium">
                  <button type="button" onClick={resend} className="text-blue-700 hover:text-blue-900 underline underline-offset-4">Resend code</button>
                  <button type="button" onClick={() => { setStep('form'); setError(''); setNotice(''); setDigits(['', '', '', '', '', '']); }} className="text-gray-700 hover:text-gray-900">Change details</button>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-[15px] text-gray-700 mt-6 lg:hidden">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-700 hover:text-blue-900 font-semibold underline underline-offset-4">Sign in</Link>
          </p>
          <p className="text-center text-sm text-gray-700 mt-3">
            Need help? <Link href="/support" className="text-blue-700 font-semibold underline underline-offset-4">Contact Support</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({ label, hint, optional, icon: Icon, children }: {
  label: string; hint?: React.ReactNode; optional?: boolean; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[15px] font-semibold text-gray-900 mb-1.5">
        {label}{optional && <span className="ml-2 text-sm font-normal text-gray-600">(optional)</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none" />
        {children}
      </div>
      {hint && <p className="text-sm text-gray-700 mt-1.5">{hint}</p>}
    </div>
  );
}
