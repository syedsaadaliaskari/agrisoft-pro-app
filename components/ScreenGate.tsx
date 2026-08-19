import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { canAccessScreen } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export function ScreenGate({ permission, children }: { permission?: string; children: ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  if (canAccessScreen(getSession(), permission)) {
    return <>{children}</>;
  }
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Access denied</Text>
      <Text style={[styles.hint, { color: colors.muted }]}>You do not have permission</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  hint: { fontSize: 15 },
});
