import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { makeMoney } from './receipt-shared';
import { PAY_NAME, PAY_NUMBER, type InvoiceView } from './billing-shared';

export type BillingDoc = {
  type: 'invoice' | 'receipt';
  invoice: InvoiceView;
  issuer: { name: string; email: string; phone: string; address: string; taxPin: string };
  customer: { name: string; email: string; phone: string | null; address: string | null };
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  muted: { color: '#6b7280' },
  bold: { fontFamily: 'Helvetica-Bold' },
  right: { textAlign: 'right' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  box: { width: '48%' },
  label: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 },
  th: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 6, fontFamily: 'Helvetica-Bold' },
  tr: { flexDirection: 'row', padding: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  c1: { flex: 1 }, c2: { width: 130 }, c3: { width: 90, textAlign: 'right' },
  totals: { alignSelf: 'flex-end', width: 200, marginTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  stamp: { alignSelf: 'flex-start', borderWidth: 2, borderColor: '#16a34a', color: '#16a34a', paddingHorizontal: 10, paddingVertical: 3, fontFamily: 'Helvetica-Bold', fontSize: 14, marginBottom: 16 },
  pay: { marginTop: 28, padding: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  foot: { position: 'absolute', bottom: 28, left: 40, right: 40, textAlign: 'center', color: '#9ca3af', fontSize: 8 },
});

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-KE', { dateStyle: 'medium', timeZone: 'Africa/Nairobi' }) : '—');

export function BillingPdf({ doc }: { doc: BillingDoc }) {
  const { invoice: i, issuer, customer, type } = doc;
  const money = makeMoney(i.currency);
  const isReceipt = type === 'receipt';
  const number = isReceipt ? i.receiptNumber! : i.number;

  return (
    <Document title={`${isReceipt ? 'Receipt' : 'Invoice'} ${number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.top}>
          <View>
            <Text style={s.brand}>{issuer.name}</Text>
            {issuer.address ? <Text style={s.muted}>{issuer.address}</Text> : null}
            {issuer.email ? <Text style={s.muted}>{issuer.email}</Text> : null}
            {issuer.phone ? <Text style={s.muted}>{issuer.phone}</Text> : null}
            {issuer.taxPin ? <Text style={s.muted}>PIN: {issuer.taxPin}</Text> : null}
          </View>
          <View>
            <Text style={s.title}>{isReceipt ? 'RECEIPT' : 'INVOICE'}</Text>
            <Text style={[s.right, s.bold]}>{number}</Text>
            {isReceipt && <Text style={[s.right, s.muted]}>For invoice {i.number}</Text>}
          </View>
        </View>

        {isReceipt && <Text style={s.stamp}>PAID</Text>}

        <View style={s.grid}>
          <View style={s.box}>
            <Text style={s.label}>Billed to</Text>
            <Text style={s.bold}>{customer.name}</Text>
            <Text style={s.muted}>{customer.email}</Text>
            {customer.phone ? <Text style={s.muted}>{customer.phone}</Text> : null}
            {customer.address ? <Text style={s.muted}>{customer.address}</Text> : null}
          </View>
          <View style={s.box}>
            <Text style={s.label}>Details</Text>
            {isReceipt ? (
              <>
                <Text>Payment date: {fmt(i.paidAt)}</Text>
                {i.paymentRef ? <Text>M-Pesa reference: {i.paymentRef}</Text> : null}
              </>
            ) : (
              <>
                <Text>Issued: {fmt(i.issuedAt)}</Text>
                <Text>Due: {fmt(i.dueAt)}</Text>
                <Text>Status: {i.status === 'PAID' ? 'Paid' : i.status === 'VOID' ? 'Void' : 'Awaiting payment'}</Text>
              </>
            )}
          </View>
        </View>

        <View style={s.th}>
          <Text style={s.c1}>Description</Text>
          <Text style={s.c2}>{isReceipt ? 'Period covered' : 'Period'}</Text>
          <Text style={s.c3}>Amount</Text>
        </View>
        <View style={s.tr}>
          <Text style={s.c1}>{i.description}</Text>
          <Text style={s.c2}>
            {isReceipt && i.periodStart && i.periodEnd ? `${fmt(i.periodStart)} – ${fmt(i.periodEnd)}` : `${i.periodMonths} ${i.periodMonths === 1 ? 'month' : 'months'}`}
          </Text>
          <Text style={s.c3}>{money(i.amount)}</Text>
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}><Text style={s.bold}>{isReceipt ? 'Amount paid' : 'Total due'}</Text><Text style={s.bold}>{money(i.amount)}</Text></View>
        </View>

        {!isReceipt && i.status === 'OPEN' && (
          <View style={s.pay}>
            <Text style={[s.bold, { marginBottom: 4 }]}>How to pay</Text>
            <Text>Send {money(i.amount)} by M-Pesa to {PAY_NUMBER} ({PAY_NAME}).</Text>
            <Text>Then enter the M-Pesa confirmation code under Billing in the app. Quote {i.number} if asked for a reference.</Text>
          </View>
        )}

        <Text style={s.foot}>
          {isReceipt ? 'Thank you for your payment.' : `Payment is due by ${fmt(i.dueAt)}.`} Generated by {issuer.name}.
        </Text>
      </Page>
    </Document>
  );
}
