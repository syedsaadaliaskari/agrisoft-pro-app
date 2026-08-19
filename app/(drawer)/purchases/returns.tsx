import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { formatMoney } from '@/lib/format';
import { fetchPurchaseReturns } from '@/lib/shopData';
import type { PurchaseReturn } from '@/types/models';

export default function PurchaseReturnsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [rows, setRows] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchPurchaseReturns());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenGate permission="purchases.return">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={() => void load()}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={loading ? null : <EmptyState title="No purchase returns" />}
          renderItem={({ item }) => (
            <View style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.text }]}>{item.return_no}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {item.return_date}  ·  {formatMoney(item.grand_total)}
              </Text>
            </View>
          )}
        />
      </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16 },
  row: { borderRadius: cardRadius, padding: 16, minHeight: 64, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { marginTop: 4, fontSize: 13 },
});
