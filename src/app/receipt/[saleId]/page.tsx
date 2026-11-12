'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ReceiptView } from '@/components/receipt/ReceiptView';
import { ReceiptData, buildReceiptText, toWhatsAppNumber } from '@/lib/receipt-shared';

export default function ReceiptPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const [data, setData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState('');
  const [paper, setPaper] = useState<'80' | '58'>('80');
  const [logoReady, setLogoReady] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [autoprint, setAutoprint] = useState(false);
  const [ready, setReady] = useState(false); // query string read
  const printed = useRef(false);

  // Read query string + saved paper size on the client (avoids a Suspense boundary)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setPaymentId(q.get('paymentId'));
    setAutoprint(q.get('autoprint') === '1');
    try {
      const saved = localStorage.getItem('receipt-paper');
      if (saved === '58' || saved === '80') setPaper(saved);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const res = await fetch(`/api/sales/${saleId}/receipt${paymentId ? `?paymentId=${paymentId}` : ''}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load receipt');
        setData(json);
        if (!json.merchant.logoUrl) setLogoReady(true);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [ready, saleId, paymentId]);

  // Auto-print once the data and logo are in
  useEffect(() => {
    if (autoprint && data && logoReady && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 250);
    }
  }, [autoprint, data, logoReady]);

  const changePaper = (p: '80' | '58') => {
    setPaper(p);
    try { localStorage.setItem('receipt-paper', p); } catch {}
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-gray-500">Loading receipt…</div>;

  const pdfUrl = `/api/sales/${saleId}/receipt/pdf${paymentId ? `?paymentId=${paymentId}` : ''}`;
  const phone = toWhatsAppNumber(data.sale.customerPhone);
  const waUrl = `https://wa.me/${phone ?? ''}?text=${encodeURIComponent(buildReceiptText(data))}`;

  return (
    <div className="min-h-screen bg-gray-200 py-4 print:bg-white print:py-0">
      <style>{`@media print { @page { size: ${paper}mm auto; margin: 0; } body { background: #fff !important; } }`}</style>

      <div className="print:hidden max-w-md mx-auto mb-4 px-4 flex flex-wrap gap-2 items-center justify-center text-sm">
        <div className="flex border rounded-lg overflow-hidden bg-white">
          {(['80', '58'] as const).map((p) => (
            <button
              key={p}
              onClick={() => changePaper(p)}
              className={`px-3 py-2 ${paper === p ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
            >
              {p}mm
            </button>
          ))}
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
          Print
        </button>
        <a href={pdfUrl} className="px-4 py-2 border bg-white rounded-lg text-gray-700">PDF</a>
        <a href={waUrl} target="_blank" rel="noreferrer" className="px-4 py-2 border bg-white rounded-lg text-gray-700">
          WhatsApp
        </a>
        <button onClick={() => window.close()} className="px-4 py-2 text-gray-500">Close</button>
      </div>

      <ReceiptView data={data} paper={paper} onLogoDone={() => setLogoReady(true)} />
    </div>
  );
}