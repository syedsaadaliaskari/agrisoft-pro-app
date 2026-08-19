import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ScreenGate } from '@/components/ScreenGate';
import { SearchBar } from '@/components/SearchBar';
import { StatusBanner } from '@/components/StatusBanner';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { fetchProducts, matchesProductSearch, productStockQty } from '@/lib/api';
import { getAppConfig } from '@/lib/config';
import { formatMoney, formatQty } from '@/lib/format';
import { markRefreshError, markRefreshSuccess } from '@/lib/syncStatus';
import type { Product } from '@/types/models';

export default function ProductsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const config = getAppConfig();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(config.isReady);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!config.isReady) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchProducts();
      setProducts(rows);
      markRefreshSuccess({ productCount: rows.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load products.';
      setError(message);
      markRefreshError(message);
    } finally {
      setLoading(false);
    }
  }, [config.isReady]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => products.filter((product) => matchesProductSearch(product, query)),
    [products, query],
  );

  return (
    <ScreenGate permission="products.view">
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name or brand" />
        {hasPermission(getSession(), 'products.manage') ? (
          <Pressable
            onPress={() => router.push('/product/new' as Href)}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Text style={styles.addText}>Add product</Text>
          </Pressable>
        ) : null}
        {error ? <StatusBanner tone="error" title="Couldn't load products" /> : null}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.tint} />
        }
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="cube-outline"
              title={query ? 'No matching products' : 'No products'}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/product/${item.id}` as Href)}
            style={({ pressed }) => [
              styles.row,
              cardShadow,
              {
                backgroundColor: colors.card,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                Stock {formatQty(productStockQty(item))}
                {item.brand ? `  ·  ${item.brand}` : ''}
                {`  ·  ${formatMoney(item.sale_price)}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        )}
      />
    </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  addBtn: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  row: {
    minHeight: 72,
    borderRadius: cardRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
  },
  meta: {
    marginTop: 4,
    fontSize: 14,
  },
});
