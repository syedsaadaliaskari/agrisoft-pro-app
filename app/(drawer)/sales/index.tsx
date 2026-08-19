import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ScreenGate } from '@/components/ScreenGate';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBanner } from '@/components/StatusBanner';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { fetchSales } from '@/lib/api';
import { getAppConfig } from '@/lib/config';
import { displayOrDash, formatMoney } from '@/lib/format';
import { markRefreshError, markRefreshSuccess } from '@/lib/syncStatus';
import type { Sale } from '@/types/models';

export default function SalesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
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
    <ScreenGate permission="sales.view">
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {hasPermission(getSession(), 'sales.create') ? (
        <PrimaryButton label="New sale" color={colors.tint} onPress={() => router.push('/sale/new' as Href)} />
        ) : null}
        {error ? <StatusBanner tone="error" title="Couldn't load sales" /> : null}
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
            <EmptyState icon="receipt-outline" title="No sales" />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/sale/${item.id}` as Href)}
            style={({ pressed }) => [
              styles.row,
              cardShadow,
              { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
            ]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>{item.invoice_no}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {item.invoice_date}  ·  {displayOrDash(item.payment_mode)}  ·  {formatMoney(item.grand_total)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        )}
      />
    </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 10 },
  row: {
    minHeight: 72,
    borderRadius: cardRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: { fontSize: 17, fontWeight: '600' },
  meta: { marginTop: 4, fontSize: 14 },
});
