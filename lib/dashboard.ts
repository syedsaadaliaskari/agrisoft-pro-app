import { toNumber } from '@/lib/format';
import type { Product, Sale } from '@/types/models';

export type DayPoint = { date: string; label: string; total: number };
export type MixSlice = { mode: string; total: number; share: number };
export type TopProduct = { name: string; revenue: number; share: number };
export type RangeKey = '7d' | '28d';

export type DashboardLite = {
  todaySalesTotal: number;
  todaySalesCount: number;
  last7Days: DayPoint[];
  last28Days: DayPoint[];
  prev7Days: DayPoint[];
  prev28Days: DayPoint[];
  prev7Total: number;
  prev28Total: number;
  salesByPaymentMode: MixSlice[];
  topProducts: TopProduct[];
  lowStockCount: number;
  rangeTotal: (range: RangeKey) => number;
  rangeChange: (range: RangeKey) => number | null;
  rangePoints: (range: RangeKey) => DayPoint[];
  prevPoints: (range: RangeKey) => DayPoint[];
};

function productStockQty(product: Product): number {
  const variants = (product.product_variants ?? []).filter((variant) => !variant.deleted_at);
  if (variants.length === 0) return 0;
  return variants.reduce((sum, variant) => sum + toNumber(variant.stock_qty), 0);
}

function localStamp(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return localStamp(d);
}

function weekdayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function monthDayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function series(sales: Sale[], days: number, endOffset = 0): DayPoint[] {
  const points: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = daysAgo(i + endOffset);
    const total = sales
      .filter((sale) => sale.invoice_date === date)
      .reduce((sum, sale) => sum + toNumber(sale.grand_total), 0);
    points.push({
      date,
      label: days <= 7 ? weekdayLabel(date) : monthDayLabel(date),
      total,
    });
  }
  return points;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) return 100;
  return ((current - previous) / previous) * 100;
}

export function buildDashboardLite(sales: Sale[], products: Product[]): DashboardLite {
  const today = daysAgo(0);
  const todaySales = sales.filter((sale) => sale.invoice_date === today);
  const todaySalesTotal = todaySales.reduce((sum, sale) => sum + toNumber(sale.grand_total), 0);

  const last7Days = series(sales, 7, 0);
  const last28Days = series(sales, 28, 0);
  const prev7Days = series(sales, 7, 7);
  const prev28Days = series(sales, 28, 28);
  const curr7 = last7Days.reduce((sum, d) => sum + d.total, 0);
  const curr28 = last28Days.reduce((sum, d) => sum + d.total, 0);
  const prev7Total = prev7Days.reduce((sum, d) => sum + d.total, 0);
  const prev28Total = prev28Days.reduce((sum, d) => sum + d.total, 0);

  const mix = new Map<string, number>();
  for (const sale of sales) {
    const mode = (sale.payment_mode || 'cash').toLowerCase();
    mix.set(mode, (mix.get(mode) ?? 0) + toNumber(sale.grand_total));
  }
  const mixTotal = [...mix.values()].reduce((sum, n) => sum + n, 0) || 1;
  const salesByPaymentMode = [...mix.entries()]
    .map(([mode, total]) => ({ mode, total, share: total / mixTotal }))
    .sort((a, b) => b.total - a.total);

  const productRev = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.sale_items ?? []) {
      const name = item.product_name || 'Product';
      productRev.set(name, (productRev.get(name) ?? 0) + toNumber(item.line_total));
    }
  }
  const topRaw = [...productRev.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMax = topRaw[0]?.[1] || 1;
  const topProducts = topRaw.map(([name, revenue]) => ({
    name,
    revenue,
    share: revenue / topMax,
  }));

  const lowStockCount = products.filter((product) => productStockQty(product) <= 0).length;

  return {
    todaySalesTotal,
    todaySalesCount: todaySales.length,
    last7Days,
    last28Days,
    prev7Days,
    prev28Days,
    prev7Total,
    prev28Total,
    salesByPaymentMode,
    topProducts,
    lowStockCount,
    rangeTotal: (range) => (range === '7d' ? curr7 : curr28),
    rangeChange: (range) =>
      percentChange(range === '7d' ? curr7 : curr28, range === '7d' ? prev7Total : prev28Total),
    rangePoints: (range) => (range === '7d' ? last7Days : last28Days),
    prevPoints: (range: RangeKey) => (range === '7d' ? prev7Days : prev28Days),
  };
}
