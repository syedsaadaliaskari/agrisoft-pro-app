import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnalyticsChart } from '@/components/AnalyticsChart';
import { ScreenGate } from '@/components/ScreenGate';
import { VendorDashboard } from '@/components/VendorDashboard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow, pagePadding } from '@/constants/layout';
import { moneyText, overline } from '@/constants/theme';
import { dashboardSummary, money, subscribeErp } from '@/lib/erp';
import { formatWhen } from '@/lib/format';
import { getSyncStatus, subscribeSyncStatus } from '@/lib/syncStatus';
import { isSuperAdminUser } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

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
  const [, tick] = useState(0);
  useEffect(() => {
    const a = subscribeErp(() => tick((n) => n + 1));
    const b = subscribeSyncStatus(() => tick((n) => n + 1));
    return () => {
      a();
      b();
    };
  }, []);
  const dash = dashboardSummary();
  const sync = getSyncStatus();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const cardBase = [cardShadow, { backgroundColor: colors.card, borderRadius: cardRadius }];

  return (
    <ScreenGate permission="dashboard.view">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Text style={{ color: colors.muted, fontWeight: '700' }}>
          Cloud {sync.lastError ? sync.lastError : `synced ${formatWhen(sync.lastRefreshAt)}`}
        </Text>
        <View style={[styles.analytics, cardBase]}>
          <Text style={[styles.metricName, { color: colors.muted }]}>Sales</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{money(dash.monthSales)}</Text>
          <Text style={{ color: colors.muted }}>This month</Text>
          <AnalyticsChart
            points={dash.points}
            tint={colors.tint}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
        </View>
        <View style={styles.grid}>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Today sales</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{money(dash.todaySalesTotal)}</Text>
            <Text style={{ color: colors.muted }}>{dash.todaySalesCount} invoices</Text>
          </View>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Today purchases</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{money(dash.todayPurchasesTotal)}</Text>
            <Text style={{ color: colors.muted }}>{dash.todayPurchasesCount} bills</Text>
          </View>
        </View>
        <View style={styles.grid}>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Month profit est.</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{money(dash.monthProfit)}</Text>
          </View>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Low stock</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{dash.lowStockCount}</Text>
          </View>
        </View>
        <View style={styles.grid}>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Customers</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{dash.customerCount}</Text>
          </View>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Vendors</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{dash.vendorCount}</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: pagePadding, gap: 12, paddingBottom: 40 },
  analytics: { padding: 16 },
  metricName: { ...overline },
  metricValue: { ...moneyText, fontSize: 34, fontWeight: '700' },
  grid: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 16, minHeight: 88, justifyContent: 'center' },
  cardLabel: { ...overline, marginBottom: 6 },
  statValue: { ...moneyText, fontSize: 20, fontWeight: '700' },
});
