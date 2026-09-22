import { ScrollView, StyleSheet, Text } from 'react-native';

import { ShopNavGroups } from '@/components/ShopNavGroups';
import { ShopPulse } from '@/components/ShopPulse';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, typeScale } from '@/constants/theme';
import { getSession } from '@/lib/rbac';

export function VendorDashboard() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const user = getSession();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Activated companies</Text>
      <Text style={[styles.sub, { color: colors.muted }]}>
        {user?.fullName ? `${user.fullName} · ` : ''}Live list from desktop upload
      </Text>
      <ShopPulse />
      <ShopNavGroups />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  title: { ...font, fontSize: 22, fontWeight: '600' },
  sub: { ...font, fontSize: typeScale.body, marginTop: -4 },
});
