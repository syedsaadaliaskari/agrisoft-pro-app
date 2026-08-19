import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { StatusBanner } from '@/components/StatusBanner';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { fetchSale } from '@/lib/api';
import { displayOrDash, formatMoney, formatQty } from '@/lib/format';
import type { Sale } from '@/types/models';

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setSale(await fetchSale(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this sale.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ title: sale?.invoice_no ?? 'Sale' }} />
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.tint} />}>
        {error ? <StatusBanner tone="error" title="Couldn't load sale" /> : null}
        {!loading && !error && !sale ? <EmptyState title="Sale not found" /> : null}
        {sale ? (
          <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
            <Text style={[styles.name, { color: colors.text }]}>{sale.invoice_no}</Text>
            <Text style={[styles.meta, { color: colors.muted }]}>
              {sale.invoice_date}  ·  {displayOrDash(sale.payment_mode)}
            </Text>
            <Text style={[styles.total, { color: colors.text }]}>{formatMoney(sale.grand_total)}</Text>
            {(sale.sale_items ?? []).map((item) => (
              <View key={item.id} style={[styles.line, { borderBottomColor: colors.border }]}>
                <Text style={[styles.lineName, { color: colors.text }]}>{item.product_name}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {formatQty(item.quantity)}  ·  {formatMoney(item.line_total)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: cardRadius, padding: 16 },
  name: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 4 },
  total: { fontSize: 28, fontWeight: '800', marginVertical: 12 },
  line: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  lineName: { fontSize: 16, fontWeight: '600' },
});
