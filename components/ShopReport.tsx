import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  deletedSales,
  money,
  profitReport,
  purchasesReport,
  salesReport,
  stockReport,
  subscribeErp,
  taxReport,
} from '@/lib/erp';
import { askExport } from '@/lib/exportShare';

type Kind = 'sales' | 'purchases' | 'profit' | 'stock' | 'tax' | 'deleted';

export function ShopReport({ kind }: { kind: Kind }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  let body: { label: string; value: string }[] = [];
  let table: { a: string; b: string; c?: string }[] = [];

  if (kind === 'sales') {
    const r = salesReport(from || undefined, to || undefined);
    body = [
      { label: 'Invoices', value: String(r.rows.length) },
      { label: 'Sales total', value: money(r.totalGrand) },
      { label: 'Paid', value: money(r.totalPaid) },
    ];
    table = r.rows.map((row) => ({ a: row.invoiceNo, b: `${row.customerName} · ${row.invoiceDate}`, c: money(row.grandTotal) }));
  } else if (kind === 'purchases') {
    const r = purchasesReport(from || undefined, to || undefined);
    body = [
      { label: 'Bills', value: String(r.rows.length) },
      { label: 'Purchase total', value: money(r.totalGrand) },
      { label: 'Paid', value: money(r.totalPaid) },
    ];
    table = r.rows.map((row) => ({ a: row.invoiceNo, b: `${row.vendorName} · ${row.invoiceDate}`, c: money(row.grandTotal) }));
  } else if (kind === 'profit') {
    const r = profitReport(from || undefined, to || undefined);
    body = [
      { label: 'Sales', value: money(r.sales) },
      { label: 'Purchases', value: money(r.purchases) },
      { label: 'Income', value: money(r.income) },
      { label: 'Expenses', value: money(r.expenses) },
      { label: 'Profit', value: money(r.profit) },
    ];
  } else if (kind === 'stock') {
    const rows = stockReport();
    body = [{ label: 'Items', value: String(rows.length) }];
    table = rows.map((row) => ({ a: row.name, b: row.detail || 'Default', c: String(row.stockQty) }));
  } else if (kind === 'tax') {
    const r = taxReport(from || undefined, to || undefined);
    body = [
      { label: 'Invoices', value: String(r.invoices) },
      { label: 'Tax total', value: money(r.totalTax) },
    ];
  } else {
    const rows = deletedSales();
    body = [{ label: 'Deleted sales', value: String(rows.length) }];
    table = rows.map((row) => ({ a: row.invoiceNo, b: row.deletedAt?.slice(0, 10) ?? '', c: money(row.grandTotal) }));
  }

  return (
    <ScreenGate permission="reports.view">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        {kind !== 'stock' && kind !== 'deleted' ? (
          <Card>
            <Field label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" />
            <Field label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" />
            <PrimaryButton label="Refresh" color={colors.tint} onPress={() => tick((n) => n + 1)} />
          </Card>
        ) : null}
        <PrimaryButton
          label="Export"
          tone="ghost"
          color={colors.tint}
          onPress={() =>
            askExport({
              filename: kind,
              title: kind[0].toUpperCase() + kind.slice(1),
              columns: [
                { key: 'a', label: 'Name' },
                { key: 'b', label: 'Detail' },
                { key: 'c', label: 'Amount' },
              ],
              rows: table.length ? table : body.map((row) => ({ a: row.label, b: '', c: row.value })),
            })
          }
        />
        <Card>
          {body.map((row) => (
            <View key={row.label} style={styles.kv}>
              <Text style={{ color: colors.muted }}>{row.label}</Text>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{row.value}</Text>
            </View>
          ))}
        </Card>
        {table.map((row) => (
          <View key={row.a + row.b} style={[styles.line, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{row.a}</Text>
            <Text style={{ color: colors.muted }}>{row.b}</Text>
            {row.c ? <Text style={{ color: colors.text }}>{row.c}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  line: { borderRadius: 16, padding: 14, gap: 4 },
});
