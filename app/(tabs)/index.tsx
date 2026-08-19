import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { StatusBanner } from '@/components/StatusBanner';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchCustomers, fetchTenant } from '@/lib/api';
import { getAppConfig } from '@/lib/config';
import { formatWhen } from '@/lib/format';
import { getSyncStatus, markRefreshError, markRefreshSuccess, subscribeSyncStatus } from '@/lib/syncStatus';
import type { Tenant } from '@/types/models';

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const config = getAppConfig();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(config.isReady);
  const [error, setError] = useState<string | null>(null);
  const [sync, setSync] = useState(getSyncStatus());

  useEffect(() => subscribeSyncStatus(() => setSync(getSyncStatus())), []);

  const load = useCallback(async () => {
    if (!config.isReady) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextTenant, customers] = await Promise.all([fetchTenant(), fetchCustomers()]);
      setTenant(nextTenant);
      markRefreshSuccess(customers.length);
      setSync(getSyncStatus());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not reach the cloud.';
      setError(message);
      markRefreshError(message);
      setSync(getSyncStatus());
    } finally {
      setLoading(false);
    }
  }, [config.isReady]);

  useEffect(() => {
    load();
  }, [load]);

  const shopName = tenant?.name ?? (config.isReady ? 'Shop' : 'Agri Soft Pro Dev Shop');

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.tint} />
      }>
      <Text style={[styles.brand, { color: colors.tint }]}>Agri Soft Pro</Text>
      <Text style={[styles.shop, { color: colors.text }]}>{shopName}</Text>
      <Text style={[styles.hint, { color: colors.muted }]}>Mobile companion · cloud sync when online</Text>

      {!config.isReady ? (
        <StatusBanner
          tone="warn"
          title="Waiting for cloud keys"
          detail="The shell is ready. Add EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then restart Expo."
        />
      ) : error ? (
        <StatusBanner tone="error" title="Could not reach the cloud" detail={error} />
      ) : loading && !tenant ? (
        <StatusBanner loading title="Checking the shop…" detail="Reading tenant and customers from Supabase." />
      ) : tenant ? (
        <StatusBanner
          tone="ok"
          title="Connected"
          detail={`${tenant.name} · ${tenant.id}`}
        />
      ) : (
        <StatusBanner
          tone="warn"
          title="Keys work, shop data is hidden"
          detail="The anon key connected, but tenant-dev-001 is not visible. Either desktop has not synced yet, or a dev RLS policy is needed (see docs/dev-rls.sql)."
        />
      )}

      <View style={styles.grid}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Customers</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>
            {sync.customerCount ?? (config.isReady ? '—' : '—')}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Last refresh</Text>
          <Text style={[styles.cardValueSmall, { color: colors.text }]}>{formatWhen(sync.lastRefreshAt)}</Text>
        </View>
      </View>

      {!config.isReady ? (
        <EmptyState
          title="Shell is ready"
          detail="Open Settings to see the URL and tenant. Paste the anon key later — never the service role key."
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  brand: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  shop: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: -8,
  },
  hint: {
    fontSize: 15,
    marginTop: -8,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 96,
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  cardValueSmall: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
});
