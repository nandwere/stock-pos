'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { addDays, todayIn } from '@/lib/reports/dates';
import type { Cell, ColType, Group, ReportCard, ReportResult, ReportTable } from '@/lib/reports/types';

type Tab = 'sales-summary' | 'cash-collected';
const TABS: { id: Tab; label: string }[] = [
  { id: 'sales-summary', label: 'Sales summary' },
  { id: 'cash-collected', label: 'Cash collected' },
];

function presets(tz: string) {
  const today = todayIn(tz);
  const monthStart = `${today.slice(0, 8)}01`;
  const lastMonthEnd = addDays(monthStart, -1);
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: addDays(today, -1), to: addDays(today, -1) },
    { label: 'Last 7 days', from: addDays(today, -6), to: today },
    { label: 'Last 30 days', from: addDays(today, -29), to: today },
    { label: 'This month', from: monthStart, to: today },
    { label: 'Last month', from: `${lastMonthEnd.slice(0, 8)}01`, to: lastMonthEnd },
  ];
}

function fmt(v: Cell, type: ColType = 'text') {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') return v;
  switch (type) {
    case 'money': return v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'int': return v.toLocaleString('en-KE');
    case 'qty': return v.toLocaleString('en-KE', { maximumFractionDigits: 3 });
    case 'percent': return `${(v * 100).toFixed(1)}%`;
    default: return String(v);
  }
}

const cardValue = (c: ReportCard) =>
  c.type === 'money' ? formatCurrency(c.value)
  : c.type === 'percent' ? `${(c.value * 100).toFixed(1)}%`
  : c.value.toLocaleString('en-KE');

const TONE = {
  good: 'bg-green-50 border-green-200 text-green-700',
  warn: 'bg-amber-50 border-amber-200 text-amber-700',
  bad: 'bg-red-50 border-red-200 text-red-700',
  none: 'bg-white border-gray-200 text-gray-900',
} as const;

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales-summary');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [group, setGroup] = useState<Group>('day');

  const qs = new URLSearchParams({ ...(range ?? {}), group }).toString();

  const { data, isLoading, isFetching, error } = useQuery<ReportResult>({
    queryKey: ['report', tab, qs],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${tab}?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load report');
      return json;
    },
    placeholderData: (prev) => prev, // keep showing the old report while the new one loads
  });

  const from = range?.from ?? data?.range.from ?? '';
  const to = range?.to ?? data?.range.to ?? '';
  const exportQs = new URLSearchParams({ report: tab, from, to, group });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
        {data && (
          <a
            href={`/api/reports/export?${exportQs}&format=xlsx`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Download className="w-4 h-4" /> Export to Excel
          </a>
        )}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border ${
              tab === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {presets(data?.range.tz ?? 'Africa/Nairobi').map((p) => {
            const active = p.from === from && p.to === to;
            return (
              <button
                key={p.label}
                onClick={() => setRange({ from: p.from, to: p.to })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  active ? 'bg-blue-50 border-blue-600 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">From</span>
            <input type="date" value={from} max={to}
              onChange={(e) => e.target.value && setRange({ from: e.target.value, to })}
              className="px-3 py-2 border rounded-lg" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">To</span>
            <input type="date" value={to} min={from}
              onChange={(e) => e.target.value && setRange({ from, to: e.target.value })}
              className="px-3 py-2 border rounded-lg" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Group by</span>
            <select value={group} onChange={(e) => setGroup(e.target.value as Group)} className="px-3 py-2 border rounded-lg bg-white">
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>
          {isFetching && <span className="text-xs text-gray-400 pb-2">Updating…</span>}
        </div>
      </div>

      {isLoading && <div className="p-6 text-gray-500">Loading…</div>}
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{(error as Error).message}</div>}

      {data && (
        <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {data.cards.map((c) => (
              <div key={c.label} className={`border rounded-lg p-4 ${TONE[c.tone ?? 'none']}`}>
                <div className="text-xs sm:text-sm opacity-80">{c.label}</div>
                <div className="text-lg sm:text-2xl font-bold break-words">{cardValue(c)}</div>
              </div>
            ))}
          </div>

          {data.tables.map((t) => (
            <TableSection key={t.name} table={t} exportQs={exportQs} />
          ))}

          <ul className="mt-2 space-y-1 text-xs text-gray-500 list-disc pl-5">
            {data.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function TableSection({ table, exportQs }: { table: ReportTable; exportQs: URLSearchParams }) {
  const csv = new URLSearchParams(exportQs);
  csv.set('format', 'csv');
  csv.set('table', table.name);

  const numeric = (type?: ColType) => type && type !== 'text';

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">{table.title}</h2>
        <a href={`/api/reports/export?${csv}`} className="text-xs text-blue-600 hover:underline">CSV</a>
      </div>
      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {table.columns.map((c) => (
                <th key={c.key} className={`p-3 font-medium ${numeric(c.type) ? 'text-right' : 'text-left'}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 && (
              <tr><td colSpan={table.columns.length} className="p-6 text-center text-gray-400">No data for this period.</td></tr>
            )}
            {table.rows.map((r, i) => (
              <tr key={i} className="border-t">
                {table.columns.map((c) => (
                  <td key={c.key} className={`p-3 ${numeric(c.type) ? 'text-right tabular-nums' : ''}`}>
                    {fmt(r[c.key] ?? null, c.type)}
                  </td>
                ))}
              </tr>
            ))}
            {table.totals && (
              <tr className="border-t-2 bg-gray-50 font-semibold">
                {table.columns.map((c) => (
                  <td key={c.key} className={`p-3 ${numeric(c.type) ? 'text-right tabular-nums' : ''}`}>
                    {fmt(table.totals![c.key] ?? null, c.type)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}