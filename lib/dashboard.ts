import { toNumber } from '@/lib/format';
import { productStockQty } from '@/lib/api';
import type { Product, Sale } from '@/types/models';

export type DayPoint = { date: string; label: string; total: number };
export type MixSlice = { mode: string; total: number };
export type TopProduct = { name: string; revenue: number };

export type DashboardLite = {
  todaySalesTotal: number;
  todaySalesCount: number;
  last7Days: DayPoint[];
  salesByPaymentMode: MixSlice[];
  topProducts: TopProduct[];
  lowStockCount: number;
};

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function buildDashboardLite(sales: Sale[], products: Product[]): DashboardLite {
  const today = todayStamp();
  const todaySales = sales.filter((sale) => sale.invoice_date === today);
  const todaySalesTotal = todaySales.reduce((sum, sale) => sum + toNumber(sale.grand_total), 0);

  const last7Days: DayPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = daysAgo(i);
    const total = sales
      .filter((sale) => sale.invoice_date === date)
      .reduce((sum, sale) => sum + toNumber(sale.grand_total), 0);
    last7Days.push({ date, label: date.slice(5), total });
  }

  const mix = new Map<string, number>();
  for (const sale of sales) {
    const mode = (sale.payment_mode || 'cash').toLowerCase();
    mix.set(mode, (mix.get(mode) ?? 0) + toNumber(sale.grand_total));
  }

  const productRev = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.sale_items ?? []) {
      const name = item.product_name || 'Product';
      productRev.set(name, (productRev.get(name) ?? 0) + toNumber(item.line_total));
    }
  }

  const topProducts = [...productRev.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, revenue]) => ({ name, revenue }));

  const lowStockCount = products.filter((product) => productStockQty(product) <= 0).length;

  return {
    todaySalesTotal,
    todaySalesCount: todaySales.length,
    last7Days,
    salesByPaymentMode: [...mix.entries()].map(([mode, total]) => ({ mode, total })),
    topProducts,
    lowStockCount,
  };
}
