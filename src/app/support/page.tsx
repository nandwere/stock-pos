import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, LifeBuoy, Mail, MessageCircle, Phone } from 'lucide-react';
import { PublicShell } from '@/components/PublicShell';
import { SupportForm } from '@/components/SupportForm';
import { platformDetails } from '@/lib/billing.server';
import { PAY_NUMBER } from '@/lib/billing-shared';

export const metadata: Metadata = { title: 'Contact Support' };
export const dynamic = 'force-dynamic'; // contact details come from the server environment

const FAQ = [
  {
    q: 'I cannot sign in',
    a: 'Check that your business code is right (it is the one you chose when you signed up; tap "Enter a business code" on the sign-in page). If you forgot your password, use "Forgot your password?" with the same business code.',
  },
  {
    q: 'I did not get my confirmation code',
    a: 'Look in your spam folder first. Codes expire after 30 minutes. On the sign-up page, tap "Resend code" (you can ask for a new one once a minute). If the email address was a typo, go back and register again with the right one.',
  },
  {
    q: 'I paid for a plan but nothing changed',
    a: 'After you pay by M-Pesa, enter the confirmation code on the invoice. Our team confirms the payment and your plan updates, and you get a receipt by email. If it is taking longer than you expect, send us your invoice number (it starts with INV-) and the M-Pesa code.',
  },
  {
    q: 'Where are my invoices and receipts?',
    a: 'Open Billing in the menu (account owners and admins). Every invoice and, once paid, its receipt can be downloaded as a PDF.',
  },
  {
    q: 'What happens when my plan expires?',
    a: 'You keep full access for 7 days after the end date. After that your account moves to the Free plan. Nothing is deleted, but you may be unable to add more items than the Free plan allows until you renew.',
  },
];

export default function SupportPage() {
  const p = platformDetails();
  const email = process.env.SUPPORT_EMAIL || '';
  const phone = process.env.SUPPORT_PHONE || PAY_NUMBER;
  const whatsapp = (process.env.SUPPORT_WHATSAPP || '').replace(/[^\d]/g, ''); // international format, e.g. 254712345678
  const hours = process.env.SUPPORT_HOURS || '';

  const cards = [
    email && { icon: Mail, title: 'Email', text: email, href: `mailto:${email}` },
    phone && { icon: Phone, title: 'Call us', text: phone, href: `tel:${phone.replace(/\s/g, '')}` },
    whatsapp && { icon: MessageCircle, title: 'WhatsApp', text: `+${whatsapp}`, href: `https://wa.me/${whatsapp}` },
    hours && { icon: Clock, title: 'Hours', text: hours },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; title: string; text: string; href?: string }[];

  return (
    <PublicShell>
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-5 py-12 lg:py-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium"><LifeBuoy className="w-4 h-4" /> Support</span>
          <h1 className="text-3xl lg:text-4xl font-bold mt-4">How can we help?</h1>
          <p className="text-blue-100 text-lg mt-2 max-w-2xl">Send us a message and we will get back to you by email. Many questions are answered below.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 py-10 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 items-start">
        <div className="space-y-8">
          {cards.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              {cards.map(({ icon: Icon, title, text, href }) => {
                const body = (
                  <>
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Icon className="w-5 h-5" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-700">{title}</span>
                      <span className="block text-gray-900 font-medium break-words">{text}</span>
                    </span>
                  </>
                );
                const cls = 'flex items-center gap-3 rounded-xl bg-white border border-gray-200 p-4';
                return href
                  ? <a key={title} href={href} className={`${cls} hover:border-blue-400`}>{body}</a>
                  : <div key={title} className={cls}>{body}</div>;
              })}
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Quick answers</h2>
            <div className="space-y-3">
              {FAQ.map((item) => (
                <details key={item.q} className="group rounded-xl bg-white border border-gray-200 open:border-blue-300">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 px-4 py-3.5 font-semibold text-gray-900">
                    {item.q}
                    <span className="text-blue-700 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="px-4 pb-4 text-gray-800 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
            <p className="text-sm text-gray-700 mt-4">
              Using {p.name} means you accept our <Link href="/terms" className="text-blue-700 underline underline-offset-4 font-medium">Terms and Conditions</Link>.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 shadow-xl shadow-blue-900/5 p-6 sm:p-8 lg:sticky lg:top-6">
          <SupportForm />
        </div>
      </div>
    </PublicShell>
  );
}
