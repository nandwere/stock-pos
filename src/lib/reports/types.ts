export type ColType = 'text' | 'money' | 'int' | 'qty' | 'percent';
export type Cell = string | number | null;
export type Group = 'day' | 'week' | 'month';

export type ReportColumn = { key: string; header: string; type?: ColType; width?: number };

export type ReportTable = {
  name: string;   // used by ?table= for CSV export
  title: string;
  columns: ReportColumn[];
  rows: Record<string, Cell>[];
  totals?: Record<string, Cell>;
};

export type ReportCard = {
  label: string;
  value: number;
  type: 'money' | 'int' | 'percent';
  tone?: 'good' | 'warn' | 'bad';
};

export type ReportResult = {
  report: 'sales-summary' | 'cash-collected';
  title: string;
  merchantName: string;
  currency: string;
  range: { from: string; to: string; tz: string; group: Group };
  cards: ReportCard[];
  tables: ReportTable[];
  notes: string[];
};