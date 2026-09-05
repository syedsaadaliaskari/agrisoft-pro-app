import { Alert } from 'react-native';

import { showActionSheet } from '@/lib/actionSheet';
import { tablePrintHtml, type ReceiptSize } from '@/lib/print';
import { safeFilename, sharePdfFromHtml, shareTextOrFile, showShareError } from '@/lib/shareOut';

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
  const base = safeFilename(opts.filename || opts.title, opts.kind === 'excel' ? 'csv' : opts.kind);
  if (opts.kind === 'json') {
    await shareTextOrFile({
      filename: base.replace(/\.json$/i, '') + '.json',
      mime: 'application/json',
      uti: 'public.json',
      contents: JSON.stringify(opts.rows, null, 2),
      title: opts.title,
    });
    return;
  }
  if (opts.kind === 'excel') {
    await shareTextOrFile({
      filename: base.replace(/\.csv$/i, '') + '.csv',
      mime: 'text/csv',
      uti: 'public.comma-separated-values-text',
      contents: toCsv(opts.columns, opts.rows),
      title: opts.title,
    });
    return;
  }
  const html = tablePrintHtml(
    opts.title,
    opts.columns.map((c) => c.label),
    opts.rows.map((row) => opts.columns.map((col) => cell(col, row))),
    'a4',
  );
  await sharePdfFromHtml(html, opts.title);
}

function runExport<T>(
  opts: { filename: string; title: string; columns: ExportColumn<T>[]; rows: T[] },
  kind: 'json' | 'excel' | 'pdf',
) {
  void exportRows({ ...opts, kind }).catch(showShareError);
}

export function askExport<T>(opts: {
  filename: string;
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  if (!opts.rows.length) {
    Alert.alert('Nothing to export', 'This list is empty.');
    return;
  }
  showActionSheet({
    title: 'Export',
    message: opts.title,
    options: [
      { label: 'JSON', onPress: () => runExport(opts, 'json') },
      { label: 'Excel (CSV)', onPress: () => runExport(opts, 'excel') },
      { label: 'PDF', onPress: () => runExport(opts, 'pdf') },
    ],
  });
}

export function askPrint(run: (size: ReceiptSize) => void) {
  showActionSheet({
    title: 'Print',
    message: 'Choose a size',
    options: [
      { label: 'Thermal', onPress: () => run('thermal') },
      { label: 'A4', onPress: () => run('a4') },
    ],
  });
}
