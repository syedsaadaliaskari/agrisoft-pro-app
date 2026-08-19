import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnalyticsChart } from '@/components/AnalyticsChart';
import { ScreenGate } from '@/components/ScreenGate';
import { VendorDashboard } from '@/components/VendorDashboard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { fetchCustomers, fetchProducts, fetchSales } from '@/lib/api';
import { getAppConfig } from '@/lib/config';
import { buildDashboardLite, type DashboardLite, type RangeKey } from '@/lib/dashboard';
import { formatMoney } from '@/lib/format';
import { isSuperAdminUser } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { markRefreshSuccess } from '@/lib/syncStatus';

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function HomeScreen() {
  if (isSuperAdminUser(getSession())) {
    return (
      <ScreenGate permission="dashboard.view">
        <VendorDashboard />
      </ScreenGate>
    );
  }
  return <ShopHomeScreen />;
}

function ShopHomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const config = getAppConfig();
  const [customerCount, setCustomerCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(config.isReady);
  const [dash, setDash] = useState<DashboardLite | null>(null);
  const [range, setRange] = useState<RangeKey>('7d');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!config.isReady) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const customers = await fetchCustomers();
      setCustomerCount(customers.length);
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
      setProductCount(products.length);
      setDash(buildDashboardLite(sales, products));
      markRefreshSuccess({
        customerCount: customers.length,
        productCount: products.length,
        saleCount: sales.length,
      });
    } catch {
      /* keep last good numbers */
    } finally {
      setLoading(false);
    }
  }, [config.isReady]);

  useEffect(() => {
    load();
  }, [load]);

  const hasMix = (dash?.salesByPaymentMode.length ?? 0) > 0;
  const hasTop = (dash?.topProducts.length ?? 0) > 0;
  const cardBase = [cardShadow, { backgroundColor: colors.card, borderRadius: cardRadius }];
  const total = dash?.rangeTotal(range) ?? 0;
  const change = dash?.rangeChange(range) ?? null;
  const points = dash?.rangePoints(range) ?? [];
  const prevPoints = dash?.prevPoints(range) ?? [];
  const changeUp = change != null && change >= 0;

  return (
    <ScreenGate permission="dashboard.view">
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.tint} />
      }>
      <View style={[styles.analytics, cardBase]}>
        <View style={styles.analyticsHead}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.metricName, { color: colors.muted }]}>Sales</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{formatMoney(total)}</Text>
            {change == null ? (
              <Text style={[styles.change, { color: colors.muted }]}>No prior period yet</Text>
            ) : (
              <Text style={[styles.change, { color: changeUp ? colors.tint : colors.danger }]}>
                {changeUp ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs previous {range === '7d' ? '7 days' : '28 days'}
              </Text>
            )}
          </View>
          <View style={[styles.rangeWrap, { backgroundColor: colors.tintSoft }]}>
            {(['7d', '28d'] as RangeKey[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => {
                  setRange(key);
                  setSelectedIndex(null);
                }}
                style={[
                  styles.rangeChip,
                  range === key && { backgroundColor: colors.card, shadowOpacity: 0.08, elevation: 2 },
                ]}>
                <Text style={[styles.rangeLabel, { color: range === key ? colors.text : colors.muted }]}>
                  {key === '7d' ? '7 days' : '28 days'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <AnalyticsChart
          points={points}
          compare={prevPoints}
          tint={colors.tint}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
        <Text style={[styles.legend, { color: colors.muted }]}>Solid line is this period · dashed is the previous one</Text>
      </View>

      <View style={styles.grid}>
        <View style={[styles.stat, cardBase]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Today</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatMoney(dash?.todaySalesTotal ?? 0)}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>{dash?.todaySalesCount ?? 0} invoices</Text>
        </View>
        <View style={[styles.stat, cardBase]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Low stock</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{dash?.lowStockCount ?? 0}</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <View style={[styles.stat, cardBase]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Customers</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{customerCount}</Text>
        </View>
        <View style={[styles.stat, cardBase]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Products</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{productCount}</Text>
        </View>
      </View>

      {hasMix ? (
        <View style={[styles.block, cardBase]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Payment mix</Text>
          {dash?.salesByPaymentMode.map((slice) => (
            <View key={slice.mode} style={styles.mixRow}>
              <View style={styles.mixHead}>
                <Text style={[styles.mixLabel, { color: colors.text }]}>{titleCase(slice.mode)}</Text>
                <Text style={[styles.mixValue, { color: colors.muted }]}>{formatMoney(slice.total)}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.tintSoft }]}>
                <View style={[styles.fill, { width: `${Math.max(6, slice.share * 100)}%`, backgroundColor: colors.tint }]} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {hasTop ? (
        <View style={[styles.block, cardBase]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Top products</Text>
          {dash?.topProducts.map((row, index) => (
            <View key={row.name} style={styles.mixRow}>
              <View style={styles.mixHead}>
                <Text style={[styles.mixLabel, { color: colors.text }]} numberOfLines={1}>
                  {index + 1}. {row.name}
                </Text>
                <Text style={[styles.mixValue, { color: colors.muted }]}>{formatMoney(row.revenue)}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.tintSoft }]}>
                <View style={[styles.fill, { width: `${Math.max(6, row.share * 100)}%`, backgroundColor: colors.tint }]} />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  analytics: { padding: 16, paddingBottom: 14 },
  analyticsHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 8 },
  metricName: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  metricValue: { fontSize: 34, fontWeight: '800', marginTop: 2, letterSpacing: -0.6 },
  change: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  rangeWrap: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  rangeChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  rangeLabel: { fontSize: 12, fontWeight: '700' },
  legend: { fontSize: 11, marginTop: 4 },
  grid: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 14, minHeight: 88, justifyContent: 'center' },
  cardLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 4 },
  block: { padding: 16, gap: 12 },
  blockTitle: { fontSize: 16, fontWeight: '700' },
  mixRow: { gap: 6 },
  mixHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  mixLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  mixValue: { fontSize: 14, fontWeight: '600' },
  track: { height: 8, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
});
