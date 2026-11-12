export type ReceiptPayment = {
  id: string;
  kind: 'SALE' | 'DEPOSIT' | 'REPAYMENT';
  method: 'CASH' | 'CARD' | 'MOBILE_MONEY';
  amount: number;
  balanceAfter: number;
  reference: string | null;
  createdAt: string;
  receivedBy: string | null;
};

export type ReceiptData = {
  kind: 'SALE' | 'PAYMENT';
  merchant: {
    name: string;
    phone: string | null;
    address: string | null;
    logoUrl: string | null;
    currency: string;
    timezone: string;
  };
  sale: {
    id: string;
    saleNumber: string;
    createdAt: string;
    cashier: string | null;
    customerName: string | null;
    customerPhone: string | null;
    paymentMethod: 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'CREDIT';
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    amountPaid: number;
    change: number;
    balance: number;
    dueDate: string | null;
    notes: string | null;
  };
  items: { name: string; unit: string; quantity: number; unitPrice: number; discount: number; subtotal: number }[];
  payments: ReceiptPayment[];
  payment: ReceiptPayment | null; // set when kind === 'PAYMENT'
};

export const METHOD_LABELS = { CASH: 'Cash', MOBILE_MONEY: 'M-Pesa', CARD: 'Card', CREDIT: 'Credit' } as const;

export const makeMoney = (currency: string) => {
  const f = new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 2 });
  return (n: number) => f.format(n);
};

export const fmtDateTime = (iso: string, timeZone: string) =>
  new Date(iso).toLocaleString('en-KE', { timeZone, dateStyle: 'medium', timeStyle: 'short' });

export const fmtDate = (iso: string, timeZone: string) =>
  new Date(iso).toLocaleDateString('en-KE', { timeZone, dateStyle: 'medium' });

/** "0712 345 678" / "+254712345678" / "712345678" → "254712345678" for wa.me */
export function toWhatsAppNumber(phone: string | null, defaultCc = '254') {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return defaultCc + digits.slice(1);
  if (digits.length === 9) return defaultCc + digits;
  return digits;
}

export function buildReceiptText(d: ReceiptData) {
  const m = makeMoney(d.merchant.currency);
  const tz = d.merchant.timezone;
  const lines: string[] = [`*${d.merchant.name}*`];

  if (d.kind === 'PAYMENT' && d.payment) {
    lines.push(
      `Payment receipt for ${d.sale.saleNumber}`,
      fmtDateTime(d.payment.createdAt, tz),
      '',
      `Amount received: *${m(d.payment.amount)}* (${METHOD_LABELS[d.payment.method]}${d.payment.reference ? ` ${d.payment.reference}` : ''})`,
      `Balance remaining: ${m(d.payment.balanceAfter)}`
    );
  } else {
    lines.push(`Receipt ${d.sale.saleNumber}`, fmtDateTime(d.sale.createdAt, tz), '');
    d.items.forEach((i) => lines.push(`${i.quantity} ${i.unit} ${i.name} — ${m(i.subtotal)}`));
    lines.push('', `Total: *${m(d.sale.total)}*`, `Paid: ${m(d.sale.amountPaid)}`);
    if (d.sale.paymentMethod === 'CREDIT' && d.sale.balance > 0) {
      lines.push(`Balance due: *${m(d.sale.balance)}*${d.sale.dueDate ? ` by ${fmtDate(d.sale.dueDate, tz)}` : ''}`);
    }
  }
  lines.push('', 'Thank you!');
  return lines.join('\n');
}