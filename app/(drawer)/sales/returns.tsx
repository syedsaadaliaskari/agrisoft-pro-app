import { Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '@/components/ActionBar';
import { EmptyState } from '@/components/EmptyState';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { listSaleReturns, listSales, money, subscribeErp } from '@/lib/erp';
import { askPrint } from '@/lib/exportShare';
import { printHtml, returnPrintHtml } from '@/lib/print';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export default function SaleReturnsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const rows = listSaleReturns();
  const sales = listSales().filter((s) => s.status === 'posted');
  const can = hasPermission(getSession(), 'sales.return');

  return (
    <ScreenGate permission="sales.return">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            can ? (
              <View style={{ gap: 8, marginBottom: 12 }}>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>Return against a sale</Text>
                {sales.slice(0, 20).map((sale) => (
                  <Pressable
                    key={sale.id}
                    onPress={() => router.push(`/return/sale/${sale.id}` as Href)}
                    style={[styles.row, { backgroundColor: colors.tintSoft }]}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {sale.invoiceNo} · {sale.customerName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={rows.length ? null : <EmptyState title="No sale returns" />}
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
                    onPress: () => askPrint((size) => void printHtml(returnPrintHtml(item, 'sale', size), item.returnNo)),
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
