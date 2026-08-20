import { Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '@/components/ActionBar';
import { EmptyState } from '@/components/EmptyState';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { listPurchaseReturns, listPurchases, money, subscribeErp } from '@/lib/erp';
import { askPrint } from '@/lib/exportShare';
import { printHtml, returnPrintHtml } from '@/lib/print';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export default function PurchaseReturnsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const rows = listPurchaseReturns();
  const bills = listPurchases().filter((s) => s.status === 'posted');
  const can = hasPermission(getSession(), 'purchases.return');

  return (
    <ScreenGate permission="purchases.return">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            can ? (
              <View style={{ gap: 8, marginBottom: 12 }}>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>Return against a purchase</Text>
                {bills.slice(0, 20).map((bill) => (
                  <Pressable
                    key={bill.id}
                    onPress={() => router.push(`/return/purchase/${bill.id}` as Href)}
                    style={[styles.row, { backgroundColor: colors.tintSoft }]}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {bill.invoiceNo} · {bill.vendorName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={rows.length ? null : <EmptyState title="No purchase returns" />}
          renderItem={({ item }) => (
            <View style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{item.returnNo}</Text>
              <Text style={{ color: colors.muted }}>
                {item.returnDate} · {item.partyName} · {money(item.grandTotal)}
              </Text>
              <ActionBar
                actions={[
                  {
                    label: 'Print',
                    onPress: () => askPrint((size) => void printHtml(returnPrintHtml(item, 'purchase', size), item.returnNo)),
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
  row: { borderRadius: cardRadius, padding: 14, gap: 4, marginBottom: 8 },
});
