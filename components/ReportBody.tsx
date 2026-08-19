import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { fetchProducts, fetchSales } from '@/lib/api';
import { formatMoney, toNumber } from '@/lib/format';
import { fetchDeletedSales, fetchPurchases, stockValue } from '@/lib/shopData';

type Kind = 'sales' | 'purchases' | 'profit' | 'stock' | 'tax' | 'deleted';

export function ReportBody({ kind }: { kind: Kind }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [lines, setLines] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (kind === 'sales') {
        const sales = await fetchSales();
        const total = sales.reduce((sum, sale) => sum + toNumber(sale.grand_total), 0);
        setLines([
          { label: 'Invoices', value: String(sales.length) },
          { label: 'Sales total', value: formatMoney(total) },
        ]);
      } else if (kind === 'purchases') {
        const rows = await fetchPurchases();
        const total = rows.reduce((sum, row) => sum + toNumber(row.grand_total), 0);
        setLines([
          { label: 'Bills', value: String(rows.length) },
          { label: 'Purchase total', value: formatMoney(total) },
        ]);
      } else if (kind === 'profit') {
        const [sales, purchases] = await Promise.all([fetchSales(), fetchPurchases()]);
        const income = sales.reduce((sum, sale) => sum + toNumber(sale.grand_total), 0);
        const cost = purchases.reduce((sum, row) => sum + toNumber(row.grand_total), 0);
        setLines([
          { label: 'Sales', value: formatMoney(income) },
          { label: 'Purchases', value: formatMoney(cost) },
          { label: 'Profit / loss', value: formatMoney(income - cost) },
        ]);
      } else if (kind === 'stock') {
        const products = await fetchProducts();
        setLines([
          { label: 'Products', value: String(products.length) },
          { label: 'Stock value', value: formatMoney(stockValue(products)) },
        ]);
      } else if (kind === 'tax') {
        const sales = await fetchSales();
        setLines([{ label: 'Tax on listed sales', value: formatMoney(0) }, { label: 'Invoices', value: String(sales.length) }]);
      } else {
        const rows = await fetchDeletedSales();
        setLines([{ label: 'Deleted sales', value: String(rows.length) }]);
      }
    } catch {
      setLines([{ label: 'Status', value: 'No data' }]);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenGate permission="reports.view">
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
          {loading ? <Text style={{ color: colors.muted }}>Loading…</Text> : null}
          {lines.map((line) => (
            <View key={line.label} style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.muted }]}>{line.label}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{line.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16 },
  card: { borderRadius: cardRadius, padding: 16 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 20, fontWeight: '800', marginTop: 4 },
});
