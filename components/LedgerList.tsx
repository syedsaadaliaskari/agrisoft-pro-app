import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { fetchCustomers } from '@/lib/api';
import { formatMoney, toNumber } from '@/lib/format';
import { fetchAccounts, fetchVendors } from '@/lib/shopData';

type Kind = 'accounts' | 'customers' | 'vendors' | 'expenses' | 'income';

export function LedgerList({ kind }: { kind: Kind }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [rows, setRows] = useState<{ id: string; title: string; meta: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (kind === 'accounts' || kind === 'expenses' || kind === 'income') {
        const accounts = await fetchAccounts();
        const filtered =
          kind === 'accounts'
            ? accounts
            : accounts.filter((row) =>
                kind === 'expenses' ? row.account_type === 'expense' : row.account_type === 'income',
              );
        setRows(
          filtered.map((row) => ({
            id: row.id,
            title: `${row.code}  ${row.name}`,
            meta: formatMoney(row.opening_balance),
          })),
        );
      } else if (kind === 'customers') {
        const customers = await fetchCustomers();
        setRows(
          customers.map((row) => ({
            id: row.id,
            title: row.name,
            meta: formatMoney(toNumber(row.opening_balance)),
          })),
        );
      } else {
        const vendors = await fetchVendors();
        setRows(vendors.map((row) => ({ id: row.id, title: row.name, meta: row.phone || '' })));
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenGate permission="ledgers.view">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={() => void load()}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={loading ? null : <EmptyState title="No ledger rows" />}
          renderItem={({ item }) => (
            <View style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.text }]}>{item.title}</Text>
              {item.meta ? <Text style={[styles.meta, { color: colors.muted }]}>{item.meta}</Text> : null}
            </View>
          )}
        />
      </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16 },
  row: { borderRadius: cardRadius, padding: 16, minHeight: 64, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { marginTop: 4, fontSize: 13 },
});
