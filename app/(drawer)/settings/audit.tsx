import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { listAudit, subscribeErp } from '@/lib/erp';

export default function AuditScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const rows = listAudit();

  return (
    <ScreenGate permission="settings.manage">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        {rows.length ? (
          rows.map((row) => (
            <View key={row.id} style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                {row.module} · {row.action}
              </Text>
              <Text style={{ color: colors.muted }}>{row.details}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(row.at).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <Text style={{ color: colors.muted }}>No activity yet.</Text>
        )}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  row: { borderRadius: cardRadius, padding: 14, gap: 4 },
});
