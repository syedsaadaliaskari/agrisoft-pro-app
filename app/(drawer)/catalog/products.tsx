import { Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { ScreenGate } from '@/components/ScreenGate';
import { SearchBar } from '@/components/SearchBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { listProducts, money, subscribeErp } from '@/lib/erp';
import { askExport } from '@/lib/exportShare';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export default function ProductsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const [query, setQuery] = useState('');
  const rows = listProducts();
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.name} ${r.sku} ${r.brand}`.toLowerCase().includes(q));
  }, [query, rows]);

  return (
    <ScreenGate permission="products.view">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={{ padding: 16, gap: 10 }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name" />
          {hasPermission(getSession(), 'products.manage') ? (
            <PrimaryButton label="Add product" color={colors.tint} onPress={() => router.push('/product/new' as Href)} />
          ) : null}
          <PrimaryButton
            label="Export"
            tone="ghost"
            color={colors.tint}
            onPress={() =>
              askExport({
                filename: 'products',
                title: 'Products',
                columns: [
                  { key: 'sku', label: 'SKU' },
                  { key: 'name', label: 'Name' },
                  { key: 'brand', label: 'Brand' },
                  { key: 'salePrice', label: 'Sale' },
                  { key: 'costPrice', label: 'Cost' },
                ],
                rows: visible,
              })
            }
          />
        </View>
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState title="No products" />}
          renderItem={({ item }) => (
            <ListRow
              title={item.name}
              subtitle={`${money(item.salePrice)} · stock ${item.variants.reduce((s, v) => s + v.stockQty, 0)}`}
              onPress={() => router.push(`/product/${item.id}` as Href)}
            />
          )}
        />
      </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
