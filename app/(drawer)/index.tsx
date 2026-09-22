import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { HomeCharts } from '@/components/HubCharts';
import { ScreenGate } from '@/components/ScreenGate';
import { ShopNavGroups } from '@/components/ShopNavGroups';
import { ShopPulse } from '@/components/ShopPulse';
import { VendorDashboard } from '@/components/VendorDashboard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { pagePadding } from '@/constants/layout';
import { getSettings } from '@/lib/erp';
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
  const shopName = getSettings().shop_name?.trim() || 'Agri Soft Pro';

  return (
    <ScreenGate permission="dashboard.view">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Text style={[styles.shop, { color: colors.text }]}>{shopName}</Text>
        <ShopPulse />
        <HomeCharts />
        <ShopNavGroups />
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: pagePadding, gap: 12, paddingBottom: 24 },
  shop: { fontSize: 18, fontWeight: '600' },
});
