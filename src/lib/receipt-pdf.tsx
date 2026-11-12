import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReceiptData, METHOD_LABELS, makeMoney, fmtDateTime, fmtDate } from './receipt-shared';

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  center: { textAlign: 'center' },
  muted: { color: '#555' },
  bold: { fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  hr: { borderBottomWidth: 1, borderBottomColor: '#999', borderBottomStyle: 'dashed', marginVertical: 8 },
  th: { flexDirection: 'row', marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  name: { flex: 1 },
  qty: { width: 60, textAlign: 'right' },
  price: { width: 70, textAlign: 'right' },
  amt: { width: 75, textAlign: 'right' },
});

const Row = ({ l, r, bold }: { l: string; r: string; bold?: boolean }) => (
  <View style={s.row}>
    <Text style={bold ? s.bold : undefined}>{l}</Text>
    <Text style={bold ? s.bold : undefined}>{r}</Text>
  </View>
);

export function ReceiptPdf({ data }: { data: ReceiptData }) {
  const m = makeMoney(data.merchant.currency);
  const tz = data.merchant.timezone;
  const { sale, payment } = data;
  const isPayment = data.kind === 'PAYMENT' && payment;

  return (
    <Document title={`Receipt ${sale.saleNumber}`}>
      <Page size="A5" style={s.page}>
        <Text style={s.title}>{data.merchant.name}</Text>
        {data.merchant.address && <Text style={[s.center, s.muted]}>{data.merchant.address}</Text>}
        {data.merchant.phone && <Text style={[s.center, s.muted]}>Tel: {data.merchant.phone}</Text>}

        <View style={s.hr} />
        <Text style={[s.center, s.bold]}>{isPayment ? 'PAYMENT RECEIPT' : 'SALES RECEIPT'}</Text>
        <View style={{ height: 6 }} />
        <Row l="Sale no." r={sale.saleNumber} />
        <Row l="Date" r={fmtDateTime(isPayment ? payment!.createdAt : sale.createdAt, tz)} />
        {sale.customerName && <Row l="Customer" r={sale.customerName} />}
        {(isPayment ? payment!.receivedBy : sale.cashier) && (
          <Row l={isPayment ? 'Received by' : 'Served by'} r={(isPayment ? payment!.receivedBy : sale.cashier)!} />
        )}
        <View style={s.hr} />

        {isPayment ? (
          <>
            <Row l="Sale total" r={m(sale.total)} />
            <Row l="Amount received" r={m(payment!.amount)} bold />
            <Row l="Method" r={METHOD_LABELS[payment!.method]} />
            {payment!.reference && <Row l="Reference" r={payment!.reference} />}
            <View style={s.hr} />
            <Row l="Balance remaining" r={m(payment!.balanceAfter)} bold />
          </>
        ) : (
          <>
            <View style={s.th}>
              <Text style={s.name}>Item</Text>
              <Text style={s.qty}>Qty</Text>
              <Text style={s.price}>Price</Text>
              <Text style={s.amt}>Amount</Text>
            </View>
            {data.items.map((i, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 3 }}>
                <Text style={s.name}>{i.name}</Text>
                <Text style={s.qty}>{i.quantity} {i.unit}</Text>
                <Text style={s.price}>{m(i.unitPrice)}</Text>
                <Text style={s.amt}>{m(i.quantity * i.unitPrice)}</Text>
              </View>
            ))}
            <View style={s.hr} />
            <Row l="Subtotal" r={m(sale.subtotal)} />
            {sale.discount > 0 && <Row l="Discount" r={`-${m(sale.discount)}`} />}
            {sale.tax > 0 && <Row l="Tax" r={m(sale.tax)} />}
            <Row l="TOTAL" r={m(sale.total)} bold />
            <View style={s.hr} />
            {sale.paymentMethod === 'CREDIT' ? (
              <>
                <Row l="Payment" r="On credit" />
                <Row l="Paid" r={m(sale.amountPaid)} />
                <Row l="Balance due" r={m(sale.balance)} bold />
                {sale.dueDate && <Row l="Due date" r={fmtDate(sale.dueDate, tz)} />}
              </>
            ) : (
              <>
                <Row l="Payment" r={METHOD_LABELS[sale.paymentMethod]} />
                {sale.paymentMethod === 'CASH' && sale.change > 0 && (
                  <>
                    <Row l="Cash tendered" r={m(sale.total + sale.change)} />
                    <Row l="Change" r={m(sale.change)} />
                  </>
                )}
              </>
            )}
          </>
        )}

        <View style={s.hr} />
        <Text style={[s.center, s.muted]}>Thank you for your business!</Text>
      </Page>
    </Document>
  );
}