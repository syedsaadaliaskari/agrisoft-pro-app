import { Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ScreenGate } from '@/components/ScreenGate';
import { SearchBar } from '@/components/SearchBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { listCustomers, listVendors, subscribeErp } from '@/lib/erp';
import { askExport } from '@/lib/exportShare';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export function PartyList({ kind }: { kind: 'customers' | 'vendors' }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const [query, setQuery] = useState('');
  const rows = kind === 'customers' ? listCustomers() : listVendors();
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.name} ${r.phone} ${r.city}`.toLowerCase().includes(q));
  }, [query, rows]);
  const manage = kind === 'customers' ? 'customers.manage' : 'vendors.manage';
  const view = kind === 'customers' ? 'customers.view' : 'vendors.view';
  const hrefNew = kind === 'customers' ? '/customer/new' : '/vendor/new';

  return (
    <ScreenGate permission={view}>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={{ padding: 16, gap: 10 }}>
          <SearchBar value={query} onChangeText={setQuery} />
          {hasPermission(getSession(), manage) ? (
            <PrimaryButton
              label={kind === 'customers' ? 'Add customer' : 'Add vendor'}
              color={colors.tint}
              onPress={() => router.push(hrefNew as Href)}
            />
          ) : null}
          <PrimaryButton
            label="Export"
            tone="ghost"
            color={colors.tint}
            onPress={() =>
              askExport({
                filename: kind,
                title: kind === 'customers' ? 'Customers' : 'Vendors',
                columns: [
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'email', label: 'Email' },
                  { key: 'city', label: 'City' },
                  { key: 'openingBalance', label: 'Opening' },
                ],
                rows: visible,
              })
            }
          />
        </View>
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState title={kind === 'customers' ? 'No customers' : 'No vendors'} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push((kind === 'customers' ? `/customer/${item.id}` : `/vendor/${item.id}`) as Href)}
              style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={{ color: colors.muted }}>{[item.code, item.phone, item.city].filter(Boolean).join(' · ') || '—'}</Text>
            </Pressable>
          )}
        />
      </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { borderRadius: cardRadius, padding: 14, gap: 4 },
  name: { fontSize: 16, fontWeight: '800' },
});
