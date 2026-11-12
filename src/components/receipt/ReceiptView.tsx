'use client';

import { ReceiptData, METHOD_LABELS, makeMoney, fmtDateTime, fmtDate } from '@/lib/receipt-shared';

export function ReceiptView({
  data,
  paper,
  onLogoDone,
}: {
  data: ReceiptData;
  paper: '80' | '58';
  onLogoDone?: () => void;
}) {
  const m = makeMoney(data.merchant.currency);
  const tz = data.merchant.timezone;
  const { sale, payment } = data;
  const isPayment = data.kind === 'PAYMENT' && payment;

  const Line = ({ l, r, bold }: { l: string; r: string; bold?: boolean }) => (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold' : ''}`}>
      <span>{l}</span>
      <span className="text-right">{r}</span>
    </div>
  );
  const Rule = () => <div className="border-t border-dashed border-black my-2" />;

  return (
    <div
      className="bg-white text-black font-mono mx-auto shadow print:shadow-none"
      style={{ width: `${paper}mm`, padding: '4mm 3mm', fontSize: paper === '58' ? 11 : 12, lineHeight: 1.35 }}
    >
      <div className="text-center">
        {data.merchant.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.merchant.logoUrl}
            alt=""
            onLoad={onLogoDone}
            onError={onLogoDone}
            className="mx-auto mb-1 max-h-14 object-contain grayscale"
          />
        )}
        <div className="font-bold text-sm uppercase">{data.merchant.name}</div>
        {data.merchant.address && <div>{data.merchant.address}</div>}
        {data.merchant.phone && <div>Tel: {data.merchant.phone}</div>}
      </div>

      <Rule />
      <div className="text-center font-bold">{isPayment ? 'PAYMENT RECEIPT' : 'SALES RECEIPT'}</div>
      <Line l="Sale no." r={sale.saleNumber} />
      <Line l="Date" r={fmtDateTime(isPayment ? payment!.createdAt : sale.createdAt, tz)} />
      {sale.customerName && <Line l="Customer" r={sale.customerName} />}
      {(isPayment ? payment!.receivedBy : sale.cashier) && (
        <Line l={isPayment ? 'Received by' : 'Served by'} r={(isPayment ? payment!.receivedBy : sale.cashier)!} />
      )}
      <Rule />

      {isPayment ? (
        <>
          <Line l="Sale total" r={m(sale.total)} />
          <Line l="Amount received" r={m(payment!.amount)} bold />
          <Line l="Method" r={METHOD_LABELS[payment!.method]} />
          {payment!.reference && <Line l="Ref" r={payment!.reference} />}
          <Rule />
          <Line l="Balance remaining" r={m(payment!.balanceAfter)} bold />
        </>
      ) : (
        <>
          {data.items.map((i, idx) => (
            <div key={idx} className="mb-1">
              <div className="font-semibold break-words">{i.name}</div>
              <div className="flex justify-between">
                <span>{i.quantity} {i.unit} × {m(i.unitPrice)}</span>
                <span>{m(i.quantity * i.unitPrice)}</span>
              </div>
              {i.discount > 0 && <Line l="  Discount" r={`-${m(i.discount)}`} />}
            </div>
          ))}
          <Rule />
          <Line l="Subtotal" r={m(sale.subtotal)} />
          {sale.discount > 0 && <Line l="Discount" r={`-${m(sale.discount)}`} />}
          {sale.tax > 0 && <Line l="Tax" r={m(sale.tax)} />}
          <div className="text-sm"><Line l="TOTAL" r={m(sale.total)} bold /></div>
          <Rule />
          {sale.paymentMethod === 'CREDIT' ? (
            <>
              <Line l="Payment" r="ON CREDIT" />
              <Line l="Paid" r={m(sale.amountPaid)} />
              <Line l="Balance due" r={m(sale.balance)} bold />
              {sale.dueDate && <Line l="Due date" r={fmtDate(sale.dueDate, tz)} />}
            </>
          ) : (
            <>
              <Line l="Payment" r={METHOD_LABELS[sale.paymentMethod]} />
              {sale.paymentMethod === 'CASH' && sale.change > 0 && (
                <>
                  <Line l="Cash tendered" r={m(sale.total + sale.change)} />
                  <Line l="Change" r={m(sale.change)} />
                </>
              )}
            </>
          )}
        </>
      )}

      <Rule />
      <div className="text-center">Thank you for your business!</div>
    </div>
  );
}