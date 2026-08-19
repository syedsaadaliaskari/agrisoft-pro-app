import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { StatusBanner } from '@/components/StatusBanner';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchCustomers, fetchProducts, fetchSales, fetchTenant } from '@/lib/api';
import { getAppConfig } from '@/lib/config';
import { buildDashboardLite, type DashboardLite } from '@/lib/dashboard';
import { formatMoney, formatWhen } from '@/lib/format';
import { getSyncStatus, markRefreshError, markRefreshSuccess, subscribeSyncStatus } from '@/lib/syncStatus';
import type { Tenant } from '@/types/models';

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const config = getAppConfig();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(config.isReady);
  const [error, setError] = useState<string | null>(null);
  const [sync, setSync] = useState(getSyncStatus());
  const [dash, setDash] = useState<DashboardLite | null>(null);

  useEffect(() => subscribeSyncStatus(() => setSync(getSyncStatus())), []);

  const load = useCallback(async () => {
    if (!config.isReady) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextTenant, customers] = await Promise.all([fetchTenant(), fetchCustomers()]);
      setTenant(nextTenant);
      let products: Awaited<ReturnType<typeof fetchProducts>> = [];
      let sales: Awaited<ReturnType<typeof fetchSales>> = [];
      try {
        products = await fetchProducts();
      } catch {
        products = [];
      }
      try {
        sales = await fetchSales();
      } catch {
        sales = [];
      }
      setDash(buildDashboardLite(sales, products));
      markRefreshSuccess({
        customerCount: customers.length,
        productCount: products.length,
        saleCount: sales.length,
      });
      setSync(getSyncStatus());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not reach the cloud.';
      setError(message);
      markRefreshError(message);
      setSync(getSyncStatus());
    } finally {
      setLoading(false);
    }
  }, [config.isReady]);

  useEffect(() => {
    load();
  }, [load]);

  const shopName = tenant?.name ?? (config.isReady ? 'Shop' : 'Agri Soft Pro Dev Shop');
  const maxDay = Math.max(1, ...(dash?.last7Days.map((d) => d.total) ?? [1]));

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.tint} />
      }>
      <Text style={[styles.brand, { color: colors.tint }]}>Agri Soft Pro</Text>
      <Text style={[styles.shop, { color: colors.text }]}>{shopName}</Text>
      <Text style={[styles.hint, { color: colors.muted }]}>Shop overview · cloud when online</Text>

      {!config.isReady ? (
        <StatusBanner
          tone="warn"
          title="Waiting for cloud keys"
          detail="The shell is ready. Add EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then restart Expo."
        />
      ) : error ? (
        <StatusBanner tone="error" title="Could not reach the cloud" detail={error} />
      ) : loading && !tenant ? (
        <StatusBanner loading title="Checking the shop…" detail="Reading shop data from Supabase." />
      ) : tenant ? (
        <StatusBanner tone="ok" title="Connected" detail={`${tenant.name} · ${tenant.id}`} />
      ) : (
        <StatusBanner
          tone="warn"
          title="Keys work, shop data is hidden"
          detail="Run the create-only RLS SQL, then pull to refresh."
        />
      )}

      <View style={styles.grid}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Today's sales</Text>
          <Text style={[styles.cardValueSmall, { color: colors.text }]}>
            {formatMoney(dash?.todaySalesTotal ?? 0)}
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]}>{dash?.todaySalesCount ?? 0} invoices</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Low stock</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>{dash?.lowStockCount ?? '—'}</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Customers</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>{sync.customerCount ?? '—'}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Products</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>{sync.productCount ?? '—'}</Text>
        </View>
      </View>

      <View style={[styles.cardWide, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.muted }]}>Last 7 days</Text>
        <View style={styles.bars}>
          {(dash?.last7Days ?? []).map((day) => (
            <View key={day.date} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(6, (day.total / maxDay) * 100)}%`,
                      backgroundColor: colors.tint,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.muted }]}>{day.label.slice(3)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.cardWide, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.muted }]}>Payment mix</Text>
        {(dash?.salesByPaymentMode.length ?? 0) === 0 ? (
          <Text style={[styles.meta, { color: colors.muted }]}>No sales in the cloud yet. Sync from desktop.</Text>
        ) : (
          dash?.salesByPaymentMode.map((slice) => (
            <Text key={slice.mode} style={[styles.rowLine, { color: colors.text }]}>
              {slice.mode}  ·  {formatMoney(slice.total)}
            </Text>
          ))
        )}
      </View>

      <View style={[styles.cardWide, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.muted }]}>Top products</Text>
        {(dash?.topProducts.length ?? 0) === 0 ? (
          <Text style={[styles.meta, { color: colors.muted }]}>Will fill after sales sync.</Text>
        ) : (
          dash?.topProducts.map((row) => (
            <Text key={row.name} style={[styles.rowLine, { color: colors.text }]}>
              {row.name}  ·  {formatMoney(row.revenue)}
            </Text>
          ))
        )}
      </View>

      <Text style={[styles.meta, { color: colors.muted }]}>Last refresh {formatWhen(sync.lastRefreshAt)}</Text>

      {!config.isReady ? (
        <EmptyState
          title="Shell is ready"
          detail="Open Settings to see the URL and tenant. Paste the anon key later — never the service role key."
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  brand: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  shop: { fontSize: 28, fontWeight: '700', marginTop: -8 },
  hint: { fontSize: 15, marginTop: -8 },
  grid: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 96,
    justifyContent: 'center',
  },
  cardWide: { borderWidth: 1, borderRadius: 16, padding: 16 },
  cardLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  cardValue: { fontSize: 32, fontWeight: '700' },
  cardValueSmall: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 4 },
  rowLine: { fontSize: 15, paddingVertical: 6 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6, marginTop: 8 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: { flex: 1, width: 14, justifyContent: 'flex-end', borderRadius: 8, overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 10, marginTop: 6 },
});
