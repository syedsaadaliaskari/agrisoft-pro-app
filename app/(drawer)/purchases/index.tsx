import { Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '@/components/ActionBar';
import { EmptyState } from '@/components/EmptyState';
import { Chips } from '@/components/FormKit';
import { ListRow } from '@/components/ListRow';
import { ScreenGate } from '@/components/ScreenGate';
import { SearchBar } from '@/components/SearchBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { overline, moneyText } from '@/constants/theme';
import { cancelPurchase, listPurchases, money, subscribeErp } from '@/lib/erp';
import { askExport, askPrint } from '@/lib/exportShare';
import {
  matchesDocFilter,
  paymentLabel,
  remainingDue,
  todayStamp,
  type DocListFilter,
} from '@/lib/format';
import { printHtml, purchasePrintHtml } from '@/lib/print';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export default function PurchasesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DocListFilter>('all');
  const canCreate = hasPermission(getSession(), 'purchases.create');
  const rows = listPurchases();
  const stats = useMemo(() => {
    const t = todayStamp();
    const posted = rows.filter((r) => r.status === 'posted');
    const todayRows = posted.filter((r) => r.invoiceDate === t);
    return {
      today: todayRows.reduce((s, r) => s + r.grandTotal, 0),
      payable: posted.reduce((s, r) => s + remainingDue(r.grandTotal, r.paidAmount), 0),
    };
  }, [rows]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matchesDocFilter(r, filter)) return false;
      if (!q) return true;
      return `${r.invoiceNo} ${r.vendorName} ${r.paymentMode}`.toLowerCase().includes(q);
    });
  }, [query, rows, filter]);

  return (
    <ScreenGate permission="purchases.view">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={{ padding: 16, gap: 10, paddingBottom: 0 }}>
          <View style={styles.stats}>
            <View style={[styles.stat, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Today</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{money(stats.today)}</Text>
            </View>
            <View style={[styles.stat, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Payable</Text>
              <Text style={[styles.statValue, { color: stats.payable > 0 ? colors.warning : colors.text }]}>
                {money(stats.payable)}
              </Text>
            </View>
          </View>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search by vendor" />
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'today', label: 'Today' },
              { value: 'cash', label: 'Cash' },
              { value: 'bank', label: 'Bank' },
              { value: 'credit', label: 'Credit' },
              { value: 'split', label: 'Cash + Bank' },
            ]}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canCreate ? (
              <View style={{ flex: 1 }}>
                <PrimaryButton label="New purchase" color={colors.tint} onPress={() => router.push('/purchase/new' as Href)} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Export"
                tone="ghost"
                color={colors.tint}
                onPress={() =>
                  askExport({
                    filename: 'purchases',
                    title: 'Purchases',
                    columns: [
                      { key: 'invoiceNo', label: 'Invoice' },
                      { key: 'invoiceDate', label: 'Date' },
                      { key: 'vendorName', label: 'Vendor' },
                      { key: 'paymentMode', label: 'Payment' },
                      { key: 'grandTotal', label: 'Total' },
                      { key: 'paidAmount', label: 'Paid' },
                      { key: 'due', label: 'Payable', get: (row) => remainingDue(row.grandTotal, row.paidAmount) },
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
          ListEmptyComponent={<EmptyState title="No purchases" />}
          renderItem={({ item }) => {
            const due = remainingDue(item.grandTotal, item.paidAmount);
            return (
              <ListRow
                title={item.vendorName}
                subtitle={`${item.invoiceDate} · ${money(item.grandTotal)} · ${paymentLabel(item.paymentMode)}`}
                status={due > 0 ? `Due ${money(due)}` : 'Settled'}
                statusTone={due > 0 ? 'due' : 'ok'}
                onPress={() => router.push(`/purchase/${item.id}` as Href)}>
                <ActionBar
                  actions={[
                    { label: 'View', onPress: () => router.push(`/purchase/${item.id}` as Href) },
                    {
                      label: 'Edit',
                      hidden: !canCreate || item.status !== 'posted',
                      onPress: () => router.push(`/purchase/edit/${item.id}` as Href),
                    },
                    {
                      label: 'Share',
                      onPress: () => askPrint((size) => void printHtml(purchasePrintHtml(item, size), item.invoiceNo)),
                    },
                    {
                      label: 'Delete',
                      danger: true,
                      hidden: !canCreate || item.status !== 'posted',
                      onPress: () =>
                        Alert.alert('Delete purchase', item.vendorName, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => void cancelPurchase(item.id) },
                        ]),
                    },
                  ]}
                />
              </ListRow>
            );
          }}
        />
      </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16, paddingBottom: 40 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: cardRadius, padding: 12, gap: 4 },
  statLabel: { ...overline },
  statValue: { ...moneyText, fontSize: 16, fontWeight: '700' },
});
