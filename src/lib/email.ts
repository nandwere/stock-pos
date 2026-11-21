import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,  // Gmail App Password, not your login password
  },
});
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function sendLoginOtpEmail(to: string, otp: string, businessName: string) {
  await transporter.sendMail({
    from: `"${businessName}" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your sign-in code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;margin-bottom:8px;">${esc(businessName)}</h2>
        <p style="color:#374151;margin-bottom:24px;">
          Use the code below to finish signing in. It expires in <strong>10 minutes</strong>.
        </p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#111827;">${esc(otp)}</span>
        </div>
        <p style="color:#6b7280;font-size:14px;">
          If this wasn't you, someone knows your password. Please change it right away.
        </p>
      </div>
    `,
  });
}

export async function sendOtpEmail(to: string, otp: string, businessName: string) {
  await transporter.sendMail({
    from:    `"${businessName}" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your password reset code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;margin-bottom:8px;">${esc(businessName)}</h2>
        <p style="color:#374151;margin-bottom:24px;">
          You requested a password reset. Use the code below — it expires in <strong>15 minutes</strong>.
        </p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#111827;">
            ${esc(otp)}
          </span>
        </div>
        <p style="color:#6b7280;font-size:14px;">
          If you didn't request this, you can safely ignore this email.
          Your password will not be changed.
        </p>
      </div>
    `,
  });
}

interface NewOrderEmailItem {
  productName: string;
  quantity: string | number;
  subtotal: string | number;
}

interface NewOrderEmailData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNotes?: string | null;
  items: NewOrderEmailItem[];
  subtotal: string | number;
  deliveryFee: string | number;
  total: string | number;
  currency: string;
  ordersUrl: string; // link straight to the admin orders page
}

function formatMoney(amount: string | number, currency: string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(num);
}

export async function sendNewOrderEmail(to: string[], businessName: string, order: NewOrderEmailData) {
  if (to.length === 0) return; // nothing to notify — caller should have a fallback recipient

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;color:#374151;">${item.productName} × ${item.quantity}</td>
          <td style="padding:8px 0;color:#111827;text-align:right;">${formatMoney(item.subtotal, order.currency)}</td>
        </tr>`,
    )
    .join('');

  await transporter.sendMail({
    from: `"${businessName}" <${process.env.GMAIL_USER}>`,
    to: to.join(','),
    subject: `New order ${order.orderNumber} — ${formatMoney(order.total, order.currency)}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;margin-bottom:4px;">${esc(businessName)}</h2>
        <p style="color:#6b7280;font-size:14px;margin-top:0;margin-bottom:24px;">New order received — pay on delivery</p>

        <div style="background:#f3f4f6;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 4px 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Order</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:#111827;font-family:monospace;">${esc(order.orderNumber)}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr>
            <td style="color:#6b7280;font-size:14px;padding:4px 0;">Customer</td>
            <td style="color:#111827;font-size:14px;padding:4px 0;text-align:right;">${esc(order.customerName)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:14px;padding:4px 0;">Phone</td>
            <td style="color:#111827;font-size:14px;padding:4px 0;text-align:right;">${esc(order.customerPhone)}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:14px;padding:4px 0;vertical-align:top;">Deliver to</td>
            <td style="color:#111827;font-size:14px;padding:4px 0;text-align:right;">${esc(order.deliveryAddress)}</td>
          </tr>
          ${esc(order.deliveryNotes) ? `
          <tr>
            <td style="color:#6b7280;font-size:14px;padding:4px 0;vertical-align:top;">Notes</td>
            <td style="color:#111827;font-size:14px;padding:4px 0;text-align:right;">${esc(order.deliveryNotes)}</td>
          </tr>` : ''}
        </table>

        <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;padding-top:8px;margin-bottom:8px;">
          ${itemsHtml}
        </table>

        <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;padding-top:8px;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:14px;">Subtotal</td>
            <td style="padding:4px 0;color:#111827;font-size:14px;text-align:right;">${formatMoney(order.subtotal, order.currency)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:14px;">Delivery fee</td>
            <td style="padding:4px 0;color:#111827;font-size:14px;text-align:right;">${formatMoney(order.deliveryFee, order.currency)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0 0 0;color:#111827;font-size:16px;font-weight:700;border-top:1px solid #e5e7eb;">Total</td>
            <td style="padding:8px 0 0 0;color:#111827;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${formatMoney(order.total, order.currency)}</td>
          </tr>
        </table>

        <div style="text-align:center;margin-top:28px;">
          <a href="${order.ordersUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
            View &amp; confirm order
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center;">
          Pay on delivery — collect payment from the customer when the order arrives.
        </p>
      </div>
    `,
  });
}

// ── Sign-up & billing emails ────────────────────────────────────────────────

const shell = (title: string, body: string) => `
  <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
    <h2 style="color:#1d4ed8;margin-bottom:8px;">${esc(title)}</h2>
    ${body}
  </div>`;
const para = (t: string) => `<p style="color:#374151;margin:0 0 16px;line-height:1.5;">${t}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:24px 0;"><a href="${esc(href)}" style="background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">${esc(label)}</a></p>`;

export async function sendSignupCodeEmail(to: string, code: string, businessName: string) {
  await transporter.sendMail({
    from: `"Stock POS" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Confirm your email',
    html: shell('Confirm your email',
      para(`Use this code to finish creating <strong>${esc(businessName)}</strong>. It expires in <strong>30 minutes</strong>.`) +
      `<div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
         <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#111827;">${esc(code)}</span></div>` +
      para('If you did not sign up, you can ignore this email.')),
  });
}

export async function sendWelcomeEmail(to: string, businessName: string, loginUrl: string, businessCode: string, trialEnds?: Date | null) {
  await transporter.sendMail({
    from: `"Stock POS" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Welcome to Stock POS, ${businessName}`,
    html: shell(`Welcome, ${businessName}`,
      para('Your account is ready.') +
      para(`Your business code is <strong>${esc(businessCode)}</strong>. You will need it when you sign in.`) +
      (trialEnds ? para(`Your free trial runs until <strong>${esc(trialEnds.toDateString())}</strong>.`) : '') +
      button(loginUrl, 'Sign in')),
  });
}

export async function sendBillingReminderEmail(
  to: string,
  d: { businessName: string; planName: string; stage: 'T-7' | 'T-3' | 'T-1' | 'T0' | 'LAPSED'; expiresAt: Date; graceEndsAt: Date; isTrial: boolean; billingUrl: string },
) {
  const what = d.isTrial ? 'free trial' : `${d.planName} plan`;
  const subject = {
    'T-7': `Your ${what} ends in 7 days`,
    'T-3': `Your ${what} ends in 3 days`,
    'T-1': `Your ${what} ends tomorrow`,
    'T0': d.isTrial ? 'Your free trial has ended' : `Your ${d.planName} plan has expired`,
    'LAPSED': `Your account is now on the Free plan`,
  }[d.stage];
  const text = {
    'T-7': `Your ${what} ends on <strong>${esc(d.expiresAt.toDateString())}</strong>. Renew now so nothing is interrupted.`,
    'T-3': `Your ${what} ends on <strong>${esc(d.expiresAt.toDateString())}</strong>. Renew now so nothing is interrupted.`,
    'T-1': `Your ${what} ends tomorrow, <strong>${esc(d.expiresAt.toDateString())}</strong>.`,
    'T0': d.isTrial
      ? 'Your free trial has ended and your account has moved to the Free plan. Choose a plan to get your features back.'
      : `Your plan expired on ${esc(d.expiresAt.toDateString())}. Everything keeps working until <strong>${esc(d.graceEndsAt.toDateString())}</strong>; after that your account moves to the Free plan.`,
    'LAPSED': 'Your account has moved to the Free plan. Your data is safe; renew to get your features back.',
  }[d.stage];
  await transporter.sendMail({
    from: `"Stock POS" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: shell(d.businessName, para(text) + button(d.billingUrl, 'Renew now')),
  });
}

export async function sendPaymentReceivedEmail(
  to: string,
  d: { businessName: string; planName: string; amount: string; receiptNumber: string; periodEnd: Date; billingUrl: string },
) {
  await transporter.sendMail({
    from: `"Stock POS" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Payment received – ${d.receiptNumber}`,
    html: shell(d.businessName,
      para(`Thank you. We received <strong>${esc(d.amount)}</strong> for your <strong>${esc(d.planName)}</strong> plan.`) +
      para(`Receipt <strong>${esc(d.receiptNumber)}</strong>. Your plan is paid up to <strong>${esc(d.periodEnd.toDateString())}</strong>.`) +
      button(d.billingUrl, 'View invoices & receipts')),
  });
}

// ── Contact Support emails ──────────────────────────────────────────────────

export async function sendSupportRequestEmail(
  to: string,
  d: { ref: string; name: string; email: string; businessCode?: string | null; topic: string; message: string; signedIn: boolean },
) {
  await transporter.sendMail({
    from: `"Stock POS" <${process.env.GMAIL_USER}>`,
    to,
    replyTo: `"${d.name.replace(/"/g, '')}" <${d.email}>`, // hitting Reply answers the customer
    subject: `[${d.ref}] ${d.topic} – ${d.name}`,
    html: shell(`Support request ${d.ref}`,
      para(`<strong>From:</strong> ${esc(d.name)} &lt;${esc(d.email)}&gt;`) +
      para(`<strong>Business code:</strong> ${esc(d.businessCode || 'not given')}${d.signedIn ? ' (was signed in)' : ''}`) +
      para(`<strong>Topic:</strong> ${esc(d.topic)}`) +
      `<div style="white-space:pre-wrap;background:#f3f4f6;border-radius:8px;padding:16px;color:#111827;line-height:1.5;">${esc(d.message)}</div>`),
  });
}

export async function sendSupportAckEmail(to: string, d: { ref: string; name: string; topic: string }) {
  await transporter.sendMail({
    from: `"Stock POS" <${process.env.GMAIL_USER}>`,
    to,
    subject: `We received your message (${d.ref})`,
    html: shell('We got your message',
      para(`Hi ${esc(d.name)}, thanks for contacting us about <strong>${esc(d.topic)}</strong>.`) +
      para(`Your reference is <strong>${esc(d.ref)}</strong>. Quote it if you write to us again. We will reply to this email address.`)),
  });
}
