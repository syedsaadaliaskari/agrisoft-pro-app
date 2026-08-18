import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getAppConfig } from '@/lib/config';
import { formatWhen } from '@/lib/format';
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

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const config = getAppConfig();
  const [sync, setSync] = useState(getSyncStatus());

  useEffect(() => subscribeSyncStatus(() => setSync(getSyncStatus())), []);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Cloud</Text>
        <Row label="Shop tenant" value={config.tenantId} />
        <Row label="Supabase URL" value={config.supabaseUrl} />
        <Row label="Anon key" value={config.hasAnonKey ? 'Set (hidden)' : 'Not set yet'} />
        <Row label="Last refresh" value={formatWhen(sync.lastRefreshAt)} />
        <Row label="Last error" value={sync.lastError ?? 'None'} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>How to add keys</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Copy .env.example to .env. Paste EXPO_PUBLIC_SUPABASE_ANON_KEY from the desktop .env
          (NEXT_PUBLIC_SUPABASE_ANON_KEY) or from Supabase → Project Settings → API. Restart Expo
          after saving. Never put SUPABASE_SERVICE_ROLE_KEY in this app.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>This app</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Companion for the Agri Soft Pro desktop ERP. Desktop remains the full shop system.
          This phone app reads the same Supabase shop data. Offline outbox comes later.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    lineHeight: 22,
  },
});
