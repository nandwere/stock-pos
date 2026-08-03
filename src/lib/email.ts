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

export async function sendOtpEmail(to: string, otp: string, businessName: string) {
  await transporter.sendMail({
    from:    `"${businessName}" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your password reset code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;margin-bottom:8px;">${businessName}</h2>
        <p style="color:#374151;margin-bottom:24px;">
          You requested a password reset. Use the code below — it expires in <strong>15 minutes</strong>.
        </p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#111827;">
            ${otp}
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
        <h2 style="color:#1d4ed8;margin-bottom:4px;">${businessName}</h2>
        <p style="color:#6b7280;font-size:14px;margin-top:0;margin-bottom:24px;">New order received — pay on delivery</p>

        <div style="background:#f3f4f6;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 4px 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Order</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:#111827;font-family:monospace;">${order.orderNumber}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr>
            <td style="color:#6b7280;font-size:14px;padding:4px 0;">Customer</td>
            <td style="color:#111827;font-size:14px;padding:4px 0;text-align:right;">${order.customerName}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:14px;padding:4px 0;">Phone</td>
            <td style="color:#111827;font-size:14px;padding:4px 0;text-align:right;">${order.customerPhone}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:14px;padding:4px 0;vertical-align:top;">Deliver to</td>
            <td style="color:#111827;font-size:14px;padding:4px 0;text-align:right;">${order.deliveryAddress}</td>
          </tr>
          ${order.deliveryNotes ? `
          <tr>
            <td style="color:#6b7280;font-size:14px;padding:4px 0;vertical-align:top;">Notes</td>
            <td style="color:#111827;font-size:14px;padding:4px 0;text-align:right;">${order.deliveryNotes}</td>
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
