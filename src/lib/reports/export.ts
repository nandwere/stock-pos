import ExcelJS from 'exceljs';
import type { Cell, ColType, ReportResult, ReportTable } from './types';

// ── CSV ──────────────────────────────────────────────────────────────────
// Strings starting with = + - @ are prefixed with ' so Excel can't run them
// as formulas (CSV injection). Numbers are written raw, so negatives are safe.
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(v: Cell, type?: ColType): string {
  if (v == null) return '';
  if (typeof v === 'number') return type === 'percent' ? `${(v * 100).toFixed(1)}%` : String(v);
  const s = FORMULA_START.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function tableToCsv(t: ReportTable): string {
  const line = (row: Record<string, Cell>) => t.columns.map((c) => csvCell(row[c.key] ?? null, c.type)).join(',');
  const lines = [t.columns.map((c) => csvCell(c.header)).join(','), ...t.rows.map(line)];
  if (t.totals) lines.push(line(t.totals));
  return '\uFEFF' + lines.join('\r\n') + '\r\n'; // BOM so Excel reads UTF-8 correctly
}

// ── XLSX ─────────────────────────────────────────────────────────────────
const NUM_FMT: Partial<Record<ColType, string>> = { money: '#,##0.00', int: '#,##0', percent: '0.0%' };
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

function addTableSheet(wb: ExcelJS.Workbook, t: ReportTable) {
  const name = t.title.replace(/[\\/?*[\]:]/g, '').slice(0, 31);
  const ws = wb.addWorksheet(name);

  ws.columns = t.columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? (c.type === 'money' ? 16 : 14),
    style: { numFmt: c.type ? NUM_FMT[c.type] : undefined },
  }));

  const head = ws.getRow(1);
  head.font = { bold: true };
  head.fill = HEADER_FILL;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  if (t.rows.length > 0) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: t.columns.length } };

  t.rows.forEach((r) => ws.addRow(r));
  if (t.totals) {
    const tr = ws.addRow(t.totals);
    tr.font = { bold: true };
    tr.fill = HEADER_FILL;
  }
}

export async function reportToXlsx(r: ReportResult): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = r.merchantName;
  wb.created = new Date();

  const ws = wb.addWorksheet('Summary');
  ws.columns = [{ width: 38 }, { width: 14 }, { width: 18 }];
  ws.addRow([r.merchantName]).font = { bold: true, size: 14 };
  ws.addRow([r.title]).font = { bold: true };
  ws.addRow([`${r.range.from} to ${r.range.to} (${r.range.tz})`]);
  ws.addRow([]);
  const head = ws.addRow(['Metric', 'Count', `Amount (${r.currency})`]);
  head.font = { bold: true };
  head.fill = HEADER_FILL;

  for (const c of r.cards) {
    const row = ws.addRow([c.label, c.type === 'int' ? c.value : null, c.type === 'int' ? null : c.value]);
    if (c.type === 'int') row.getCell(2).numFmt = '#,##0';
    else row.getCell(3).numFmt = c.type === 'percent' ? '0.0%' : '#,##0.00';
  }
  ws.addRow([]);
  r.notes.forEach((n) => {
    const row = ws.addRow([n]);
    row.font = { italic: true, color: { argb: 'FF6B7280' } };
  });

  r.tables.forEach((t) => addTableSheet(wb, t));
  return Buffer.from(await wb.xlsx.writeBuffer());
}