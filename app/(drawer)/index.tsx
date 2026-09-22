import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HomeTiles } from '@/components/HomeTiles';
import { ScreenGate } from '@/components/ScreenGate';
import { VendorDashboard } from '@/components/VendorDashboard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow, pagePadding } from '@/constants/layout';
import { moneyText, overline } from '@/constants/theme';
import { dashboardSummary, getSettings, money, subscribeErp } from '@/lib/erp';
import { formatWhen } from '@/lib/format';
import { getSyncStatus, subscribeSyncStatus } from '@/lib/syncStatus';
import { isSuperAdminUser } from '@/lib/permissions';
import { getSession, subscribeSession } from '@/lib/rbac';
import { subscribeLocale, t } from '@/lib/i18n';
import { subscribeVendorUnlock } from '@/lib/vendorUnlock';

export default function HomeScreen() {
  const [, tick] = useState(0);
  useEffect(() => {
    const a = subscribeSession(() => tick((n) => n + 1));
    const b = subscribeVendorUnlock(() => tick((n) => n + 1));
    return () => {
      a();
      b();
    };
  }, []);
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
    const c = subscribeLocale(() => tick((n) => n + 1));
    return () => {
      a();
      b();
      c();
    };
  }, []);
  const dash = dashboardSummary();
  const sync = getSyncStatus();
  const shopName = getSettings().shop_name?.trim() || 'Agri Soft Pro';
  const cardBase = [cardShadow, { backgroundColor: colors.card, borderRadius: cardRadius }];

  return (
    <ScreenGate permission="dashboard.view">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Text style={[styles.shop, { color: colors.text }]}>{shopName}</Text>
        {sync.isOffline ? (
          <Text style={{ color: colors.muted }}>{t('home.offline')}</Text>
        ) : sync.pendingPush ? (
          <Text style={{ color: colors.warning }}>{t('home.pending')}</Text>
        ) : sync.lastError ? (
          <Text style={{ color: colors.danger }}>{sync.lastError}</Text>
        ) : sync.lastRefreshAt ? (
          <Text style={{ color: colors.muted }}>
            {t('home.synced')} {formatWhen(sync.lastRefreshAt)}
          </Text>
        ) : null}
        <HomeTiles />
        <View style={styles.grid}>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>{t('home.cash')}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{money(dash.cashBalance)}</Text>
          </View>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>{t('home.bank')}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{money(dash.bankBalance)}</Text>
          </View>
        </View>
        <View style={styles.grid}>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>{t('home.todaySales')}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{money(dash.todaySalesTotal)}</Text>
            <Text style={{ color: colors.muted }}>
              {dash.todaySalesCount} {t('home.invoices')}
            </Text>
          </View>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>{t('home.todayPurchases')}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{money(dash.todayPurchasesTotal)}</Text>
            <Text style={{ color: colors.muted }}>
              {dash.todayPurchasesCount} {t('home.bills')}
            </Text>
          </View>
        </View>
        <View style={styles.grid}>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>{t('home.customers')}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{dash.customerCount}</Text>
          </View>
          <View style={[styles.stat, cardBase]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>{t('home.lowStock')}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{dash.lowStockCount}</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: pagePadding, gap: 12, paddingBottom: 40 },
  shop: { fontSize: 18, fontWeight: '600' },
  grid: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 16, minHeight: 88, justifyContent: 'center' },
  cardLabel: { ...overline, marginBottom: 6 },
  statValue: { ...moneyText, fontSize: 20, fontWeight: '700' },
});
