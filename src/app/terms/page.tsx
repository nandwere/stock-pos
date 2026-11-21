import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/PublicShell';
import { platformDetails } from '@/lib/billing.server';
import { GRACE_DAYS } from '@/lib/billing-shared';
import { TERMS_UPDATED_LABEL, TERMS_VERSION } from '@/lib/legal';

export const metadata: Metadata = { title: 'Terms and Conditions' };
export const dynamic = 'force-dynamic'; // operator details come from the server environment

type Section = { id: string; title: string; body: React.ReactNode };

const P = ({ children }: { children: React.ReactNode }) => <p className="text-gray-800 leading-relaxed">{children}</p>;
const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc pl-6 space-y-1.5 text-gray-800 leading-relaxed marker:text-gray-500">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
);

export default function TermsPage() {
  const p = platformDetails();
  const us = p.name;
  const contactEmail = process.env.SUPPORT_EMAIL || p.email;

  const sections: Section[] = [
    {
      id: 'about', title: 'About these terms',
      body: (
        <>
          <P>These Terms and Conditions (&ldquo;Terms&rdquo;) are an agreement between you and <strong>{us}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;). They cover your use of {us}, our service for point of sale, stock control, reports and an online store (the &ldquo;Service&rdquo;).</P>
          <P>By creating an account or using the Service you accept these Terms. If you do this for a business, you confirm that you are allowed to bind that business, and &ldquo;you&rdquo; includes it. If you do not agree, please do not use the Service.</P>
        </>
      ),
    },
    {
      id: 'account', title: 'Your account',
      body: (
        <UL items={[
          'You must be at least 18 and able to enter into a binding contract.',
          'You sign up with an email address and confirm it with a code we send. The information you give must be true and kept up to date.',
          'Your business code and password are how you sign in. Keep your password secret and tell us straight away if you think someone else has used your account.',
          'You can add staff and decide what each person may do. You are responsible for what they do in the Service and for removing access when someone leaves.',
        ]} />
      ),
    },
    {
      id: 'plans', title: 'Plans, trials and payment',
      body: (
        <>
          <UL items={[
            'Each plan has its own features and limits, shown on the Upgrade page. We may change plans and prices; a change will not affect a period you have already paid for.',
            'Prices are in Kenyan shillings per month. If you buy several months, the price is the monthly price multiplied by the number of months. If we are required to charge tax on our fees, it will be shown on your invoice.',
            'To buy a plan you choose it and we issue an invoice. You pay by M-Pesa as shown on the invoice and enter the M-Pesa confirmation code in the app. Your plan starts once we have confirmed the payment, and we then issue a receipt.',
            'If you renew the plan you are already on, the new period starts when the current one ends. If you switch to a different plan, the new period starts when we confirm the payment and the earlier plan ends.',
            'If we offer a free trial, it lasts for the time shown to you and needs no payment. When it ends your account moves to the Free plan unless you buy a plan.',
          ]} />
          <P><strong>When a paid plan ends.</strong> You keep full access for {GRACE_DAYS} days after the end date. After that your account moves to the Free plan. We do not delete your data because a plan ended, but the Free plan has lower limits and fewer features, so you may be unable to add more items or use some pages until you renew.</P>
          <P><strong>Refunds.</strong> Fees are not refundable except where the law requires it or where we agree otherwise in writing.</P>
        </>
      ),
    },
    {
      id: 'data', title: 'Your data and privacy',
      body: (
        <>
          <UL items={[
            'You own the information you put into the Service, such as products, prices, sales, customers, staff and images. You allow us to store, process and display it only as needed to run the Service for you.',
            'You are responsible for having the right to use that information. If it includes personal data about your customers, you must handle it lawfully, including under the Data Protection Act, 2019 (Kenya).',
            'For the personal data of your customers and staff that you enter, you decide why and how it is used and we process it for you. For your own account and billing details, such as your name, email and payment records, we decide how it is used, and we use it to provide the Service, send you messages about your account, bill you and keep the Service secure.',
            'We use reasonable technical and organisational measures to protect data. No system is completely secure, so please also keep your own copies of anything you cannot afford to lose; reports and receipts can be downloaded for this.',
            'You can ask us to delete your account and data through Contact Support. We may keep records we are required by law to keep, such as invoices and receipts.',
          ]} />
        </>
      ),
    },
    {
      id: 'use', title: 'Acceptable use',
      body: (
        <>
          <P>You agree not to:</P>
          <UL items={[
            'use the Service for anything unlawful, fraudulent or misleading;',
            'upload images, logos or other content you do not have the right to use, or content that is harmful or infringes someone else\u2019s rights;',
            'try to get into other merchants\u2019 data, test the security of the Service without our written permission, or interfere with how it runs;',
            'get around plan limits or sign up repeatedly to keep getting free trials;',
            'copy, resell or provide the Service to others unless we have agreed to it.',
          ]} />
        </>
      ),
    },
    {
      id: 'business', title: 'Your business and your customers',
      body: (
        <>
          <P>You run your own business. You are responsible for your sales, prices, stock, deliveries, refunds and the receipts and invoices you issue, and for your tax and licensing obligations, including to the Kenya Revenue Authority where they apply. The Service gives you tools; it is not legal, tax or accounting advice.</P>
          <P>If you use the online store, you are the seller and any contract is between you and your customer. The Service records the payments you tell it about. Unless we tell you otherwise, we do not collect money from your customers on your behalf.</P>
        </>
      ),
    },
    {
      id: 'service', title: 'Availability and support',
      body: (
        <>
          <P>We work to keep the Service running and to fix problems quickly, but we cannot promise it will always be available or free of errors. We may carry out maintenance and change or improve features from time to time.</P>
          <P>The Service relies on other providers, for example for hosting, email, image storage and M-Pesa. Problems on their side are outside our control. For help, use our <Link href="/support" className="text-blue-700 underline underline-offset-4 font-medium">Contact Support</Link> page.</P>
        </>
      ),
    },
    {
      id: 'ending', title: 'Suspension and ending',
      body: (
        <UL items={[
          'You can stop using the Service at any time. Closing your account does not by itself entitle you to a refund.',
          'We may suspend or close an account that breaks these Terms, is used unlawfully, or puts the Service or other users at risk. Where we reasonably can, we will tell you why and give you a chance to fix the problem first.',
          'After an account is closed we may delete its data after a reasonable period. Ask us before closing if you need a copy.',
        ]} />
      ),
    },
    {
      id: 'liability', title: 'Our responsibility',
      body: (
        <>
          <P>The Service is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for indirect or consequential loss, or for lost profits, sales or data, and our total liability for any claim is limited to the fees you paid us in the 12 months before the event that caused the claim.</P>
          <P>Nothing in these Terms limits liability that cannot be limited by law, or any rights you have as a consumer that cannot be waived.</P>
        </>
      ),
    },
    {
      id: 'changes', title: 'Changes to these terms',
      body: (
        <P>We may update these Terms. If a change matters, we will tell you by email or inside the app before it takes effect. If you keep using the Service after that date, you accept the new Terms. The version you accepted when you signed up is recorded with your account. This is version <strong>{TERMS_VERSION}</strong>.</P>
      ),
    },
    {
      id: 'law', title: 'Governing law',
      body: (
        <P>These Terms are governed by the laws of Kenya, and the courts of Kenya may hear any dispute. Before going to court, please contact us so that we can try to sort it out.</P>
      ),
    },
    {
      id: 'contact', title: 'Contact us',
      body: (
        <>
          <P>Questions about these Terms? Use our <Link href="/support" className="text-blue-700 underline underline-offset-4 font-medium">Contact Support</Link> page{contactEmail ? <> or write to <a href={`mailto:${contactEmail}`} className="text-blue-700 underline underline-offset-4 font-medium">{contactEmail}</a></> : null}.</P>
          {(p.address || p.name) && (
            <P>{us}{p.address ? `, ${p.address}` : ''}</P>
          )}
        </>
      ),
    },
  ];

  return (
    <PublicShell>
      <div className="max-w-6xl mx-auto px-5 py-10 lg:py-14">
        <header className="mb-10 max-w-3xl">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Terms and Conditions</h1>
          <p className="text-gray-700 mt-2">Last updated {TERMS_UPDATED_LABEL}</p>
          <p className="text-gray-800 mt-4 text-lg">The short version: you own your data, you are responsible for your business, and we keep the service running as well as we can. The details are below.</p>
        </header>

        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-10 items-start">
          <nav aria-label="Contents" className="lg:sticky lg:top-6 rounded-xl bg-white border border-gray-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Contents</p>
            <ol className="space-y-1.5 text-[15px]">
              {sections.map((s, i) => (
                <li key={s.id}><a href={`#${s.id}`} className="text-gray-800 hover:text-blue-700">{i + 1}. {s.title}</a></li>
              ))}
            </ol>
          </nav>

          <article className="space-y-10 max-w-3xl">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-6 space-y-3">
                <h2 className="text-xl font-bold text-gray-900">{i + 1}. {s.title}</h2>
                {s.body}
              </section>
            ))}
          </article>
        </div>
      </div>
    </PublicShell>
  );
}
