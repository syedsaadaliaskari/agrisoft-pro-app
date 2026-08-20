import { Alert, Share } from 'react-native';

import { printHtml, tablePrintHtml, type ReceiptSize } from '@/lib/print';

export type ExportColumn<T> = { key: string; label: string; get?: (row: T) => string | number };

function cell<T>(col: ExportColumn<T>, row: T) {
  if (col.get) return String(col.get(row) ?? '');
  return String((row as Record<string, unknown>)[col.key] ?? '');
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv<T>(columns: ExportColumn<T>[], rows: T[]) {
  const head = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows.map((row) => columns.map((col) => csvEscape(cell(col, row))).join(',')).join('\n');
  return `${head}\n${body}`;
}

export async function exportRows<T>(opts: {
  filename: string;
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
  kind: 'json' | 'excel' | 'pdf';
}) {
  if (!opts.rows.length) throw new Error('Nothing to export');
  if (opts.kind === 'json') {
    await Share.share({ title: opts.title, message: JSON.stringify(opts.rows, null, 2) });
    return;
  }
  if (opts.kind === 'excel') {
    await Share.share({ title: opts.title, message: toCsv(opts.columns, opts.rows) });
    return;
  }
  const html = tablePrintHtml(
    opts.title,
    opts.columns.map((c) => c.label),
    opts.rows.map((row) => opts.columns.map((col) => cell(col, row))),
    'a4',
  );
  await printHtml(html, opts.title);
}

export function askExport<T>(opts: {
  filename: string;
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  Alert.alert('Export', opts.title, [
    { text: 'JSON', onPress: () => void exportRows({ ...opts, kind: 'json' }).catch((e) => Alert.alert(e instanceof Error ? e.message : 'Export failed')) },
    { text: 'Excel', onPress: () => void exportRows({ ...opts, kind: 'excel' }).catch((e) => Alert.alert(e instanceof Error ? e.message : 'Export failed')) },
    { text: 'PDF', onPress: () => void exportRows({ ...opts, kind: 'pdf' }).catch((e) => Alert.alert(e instanceof Error ? e.message : 'Export failed')) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

export function askPrint(run: (size: ReceiptSize) => void) {
  Alert.alert('Print', 'Choose a size', [
    { text: 'Thermal', onPress: () => run('thermal') },
    { text: 'A4', onPress: () => run('a4') },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
