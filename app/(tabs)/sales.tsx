import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { StatusBanner } from '@/components/StatusBanner';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchSales } from '@/lib/api';
import { getAppConfig } from '@/lib/config';
import { displayOrDash, formatMoney } from '@/lib/format';
import { markRefreshError, markRefreshSuccess } from '@/lib/syncStatus';
import type { Sale } from '@/types/models';

export default function SalesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const config = getAppConfig();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(config.isReady);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!config.isReady) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSales();
      setSales(rows);
      markRefreshSuccess({ saleCount: rows.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load sales.';
      setError(message);
      markRefreshError(message);
    } finally {
      setLoading(false);
    }
  }, [config.isReady]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {error ? <StatusBanner tone="error" title="Could not load sales" detail={error} /> : null}
      </View>
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.tint} />
        }
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="receipt-outline"
              title="No sales yet"
              detail="Sync sales from the desktop (Settings → Cloud sync → Sync now), then pull to refresh. If Table Editor has sales, run docs/dev-rls-write.sql."
            />
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.name, { color: colors.text }]}>{item.invoice_no}</Text>
            <Text style={[styles.meta, { color: colors.muted }]}>
              {item.invoice_date}  ·  {displayOrDash(item.payment_mode)}  ·  {formatMoney(item.grand_total)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  name: { fontSize: 17, fontWeight: '600' },
  meta: { marginTop: 4, fontSize: 14 },
});
