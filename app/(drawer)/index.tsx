import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HomeCharts } from '@/components/HubCharts';
import { ScreenGate } from '@/components/ScreenGate';
import { ShopNavGroups } from '@/components/ShopNavGroups';
import { ShopPulse } from '@/components/ShopPulse';
import { VendorDashboard } from '@/components/VendorDashboard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { pagePadding } from '@/constants/layout';
import { expiringBatches, getSettings, subscribeErp } from '@/lib/erp';
import { isSuperAdminUser } from '@/lib/permissions';
import { getSession, subscribeSession } from '@/lib/rbac';
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
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const shopName = getSettings().shop_name?.trim() || 'Agri Soft Pro';
  const expiring = useMemo(() => expiringBatches(), [tick]);

  return (
    <ScreenGate permission="dashboard.view">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Text style={[styles.shop, { color: colors.text }]}>{shopName}</Text>
        <ShopPulse />
        <View style={styles.expiry}>
          <Text style={styles.expiryTitle}>⚠ Expiring in 30 days</Text>
          {expiring.length ? (
            expiring.map((row) => (
              <Text key={row.id} style={styles.expiryLine}>
                {row.product} · Batch {row.batchNo}
                {row.manufacturedDate ? ` · Made ${row.manufacturedDate}` : ''} · Expires {row.expiryDate} · Qty {row.qty}
                {row.unit ? ` ${row.unit}` : ''}
              </Text>
            ))
          ) : (
            <Text style={styles.expiryEmpty}>No products are close to expiry.</Text>
          )}
        </View>
        <HomeCharts />
        <ShopNavGroups />
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: pagePadding, gap: 12, paddingBottom: 24 },
  shop: { fontSize: 18, fontWeight: '600' },
  expiry: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, gap: 6 },
  expiryTitle: { color: '#991b1b', fontWeight: '700' },
  expiryLine: { color: '#7f1d1d', fontWeight: '600' },
  expiryEmpty: { color: '#991b1b' },
});
