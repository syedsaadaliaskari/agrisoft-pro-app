export function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function formatMoney(value: number | string | null | undefined, symbol = 'Rs'): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${symbol} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function displayOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(n) ? 0 : n;
}

export function formatQty(value: number | string | null | undefined): string {
  const n = toNumber(value);
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export type DocListFilter = 'all' | 'today' | 'cash' | 'bank' | 'credit' | 'split';

export function paymentLabel(mode: string) {
  if (mode === 'split') return 'Cash + Bank';
  if (mode === 'bank') return 'Bank';
  if (mode === 'credit') return 'Credit';
  return 'Cash';
}

export function remainingDue(grandTotal: number, paidAmount: number) {
  return Math.max(0, Math.round((toNumber(grandTotal) - toNumber(paidAmount)) * 100) / 100);
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function matchesDocFilter(
  row: { invoiceDate: string; paymentMode: string },
  filter: DocListFilter,
) {
  if (filter === 'all') return true;
  if (filter === 'today') return row.invoiceDate === todayStamp();
  return row.paymentMode === filter;
}
