'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { SUPPORT_TOPICS, validateSupport } from '@/lib/support';

const field =
  'w-full px-4 py-3 text-base text-gray-900 placeholder-gray-500 bg-white border border-gray-400 rounded-xl ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600';

export function SupportForm() {
  const [f, setF] = useState({ name: '', email: '', businessCode: '', topic: '', message: '', website: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ref, setRef] = useState<string | null>(null);

  // Use the business code remembered from signing in on this browser
  useEffect(() => {
    try { const c = localStorage.getItem('pos-business-code'); if (c) setF((p) => ({ ...p, businessCode: c })); } catch { /* private mode */ }
  }, []);

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const problem = validateSupport({ ...f, email: f.email.trim().toLowerCase() });
    if (problem) return setError(problem);
    setLoading(true);
    try {
      const res = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? 'We could not send your message. Please try again.');
      setRef(d.ref);
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (ref) {
    return (
      <div className="text-center py-6">
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-700 mb-4"><CheckCircle2 className="w-9 h-9" /></span>
        <h2 className="text-2xl font-bold text-gray-900">Message sent</h2>
        <p className="text-gray-800 mt-2">Thank you, we will reply to <strong>{f.email}</strong>.</p>
        <p className="mt-4 inline-block rounded-lg bg-gray-100 px-4 py-2 text-gray-900">Your reference: <strong className="font-mono">{ref}</strong></p>
        <p className="text-sm text-gray-700 mt-4">We also sent a confirmation to your email. Check your spam folder if you do not see it.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Send us a message</h2>
        <p className="text-gray-700 mt-1">We will reply by email.</p>
      </div>

      {error && <div role="alert" className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Label text="Your name"><input className={field} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" autoComplete="name" required /></Label>
        <Label text="Email"><input type="email" className={field} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" autoComplete="email" required /></Label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Label text="What is it about?">
          <select className={field} value={f.topic} onChange={(e) => set('topic', e.target.value)} required>
            <option value="">Choose a topic…</option>
            {SUPPORT_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Label>
        <Label text="Business code" optional>
          <input className={field} value={f.businessCode} onChange={(e) => set('businessCode', e.target.value.toLowerCase())} placeholder="e.g. mama-njeri" autoCapitalize="none" spellCheck={false} />
        </Label>
      </div>

      <Label text="Your message" hint="Include what you were doing and anything you saw on screen. Never send your password.">
        <textarea className={`${field} min-h-36 resize-y`} value={f.message} onChange={(e) => set('message', e.target.value)} placeholder="Tell us how we can help…" maxLength={4000} required />
      </Label>

      {/* Honeypot: hidden from people, filled in by bots */}
      <input tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={f.website} onChange={(e) => set('website', e.target.value)}
        style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }} />

      <button type="submit" disabled={loading}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base shadow-md shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</> : <>Send message <Send className="w-4 h-4" /></>}
      </button>
    </form>
  );
}

function Label({ text, hint, optional, children }: { text: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[15px] font-semibold text-gray-900 mb-1.5">
        {text}{optional && <span className="ml-2 text-sm font-normal text-gray-600">(optional)</span>}
      </span>
      {children}
      {hint && <span className="block text-sm text-gray-700 mt-1.5">{hint}</span>}
    </label>
  );
}
