import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { fetchTenant } from '@/lib/api';
import { formatWhen } from '@/lib/format';
import { isSuperAdminUser } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { getSyncStatus, subscribeSyncStatus } from '@/lib/syncStatus';

function Row({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function ShopSettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [shopName, setShopName] = useState('Agri Soft Pro');
  const [sync, setSync] = useState(getSyncStatus());
  const [online, setOnline] = useState(true);
  const user = getSession();

  useEffect(() => subscribeSyncStatus(() => setSync(getSyncStatus())), []);
  useEffect(() => {
    void fetchTenant()
      .then((tenant) => {
        setOnline(true);
        if (tenant?.name) setShopName(tenant.name);
      })
      .catch(() => setOnline(false));
  }, []);

  return (
    <ScreenGate permission="settings.manage">
      <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
          <Text style={[styles.heading, { color: colors.text }]}>
            {isSuperAdminUser(user) ? 'Vendor' : 'Shop'}
          </Text>
          {isSuperAdminUser(user) ? null : <Row label="Name" value={shopName} />}
          <Row label="Signed in as" value={`${user?.fullName ?? ''} (${user?.roleName ?? ''})`} />
          <Row label="Connection" value={online ? 'Online' : 'Offline'} />
          <Row label="Last refresh" value={formatWhen(sync.lastRefreshAt)} />
        </View>
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16 },
  card: { borderRadius: cardRadius, padding: 16 },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 15 },
});
