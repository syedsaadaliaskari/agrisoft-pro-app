import { Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '@/components/ActionBar';
import { EmptyState } from '@/components/EmptyState';
import { ScreenGate } from '@/components/ScreenGate';
import { SearchBar } from '@/components/SearchBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { cancelSale, listSales, money, subscribeErp } from '@/lib/erp';
import { askExport, askPrint } from '@/lib/exportShare';
import { printHtml, salePrintHtml, saleReceiptText } from '@/lib/print';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export default function SalesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const [query, setQuery] = useState('');
  const canCreate = hasPermission(getSession(), 'sales.create');
  const rows = listSales();
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.invoiceNo} ${r.customerName} ${r.paymentMode}`.toLowerCase().includes(q));
  }, [query, rows]);

  return (
    <ScreenGate permission="sales.view">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={{ padding: 16, gap: 10, paddingBottom: 0 }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search invoice, customer" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canCreate ? (
              <View style={{ flex: 1 }}>
                <PrimaryButton label="New sale" color={colors.tint} onPress={() => router.push('/sale/new' as Href)} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Export"
                tone="ghost"
                color={colors.tint}
                onPress={() =>
                  askExport({
                    filename: 'sales',
                    title: 'Sales',
                    columns: [
                      { key: 'invoiceNo', label: 'Invoice' },
                      { key: 'invoiceDate', label: 'Date' },
                      { key: 'customerName', label: 'Customer' },
                      { key: 'paymentMode', label: 'Payment' },
                      { key: 'grandTotal', label: 'Total' },
                      { key: 'paidAmount', label: 'Paid' },
                    ],
                    rows: visible,
                  })
                }
              />
            </View>
          </View>
        </View>
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState title="No sales" />}
          renderItem={({ item }) => (
            <View style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
              <Pressable onPress={() => router.push(`/sale/${item.id}` as Href)}>
                <Text style={[styles.name, { color: colors.text }]}>{item.invoiceNo}</Text>
                <Text style={{ color: colors.muted }}>
                  {item.invoiceDate} · {item.customerName} · {item.paymentMode} · {money(item.grandTotal)}
                </Text>
              </Pressable>
              <ActionBar
                actions={[
                  { label: 'View', onPress: () => router.push(`/sale/${item.id}` as Href) },
                  {
                    label: 'Edit',
                    hidden: !canCreate || item.status !== 'posted',
                    onPress: () => router.push(`/sale/edit/${item.id}` as Href),
                  },
                  {
                    label: 'Print',
                    onPress: () =>
                      askPrint((size) => {
                        if (size === 'thermal') void Share.share({ message: saleReceiptText(item) });
                        else void printHtml(salePrintHtml(item, size), item.invoiceNo);
                      }),
                  },
                  {
                    label: 'Delete',
                    danger: true,
                    hidden: !canCreate || item.status !== 'posted',
                    onPress: () =>
                      Alert.alert('Delete sale', item.invoiceNo, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => void cancelSale(item.id) },
                      ]),
                  },
                ]}
              />
            </View>
          )}
        />
      </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16, paddingBottom: 40 },
  row: { borderRadius: cardRadius, padding: 14, gap: 10 },
  name: { fontSize: 16, fontWeight: '800' },
});
