import { Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CatalogBooks } from '@/components/CatalogBooks';
import { ScreenGate } from '@/components/ScreenGate';
import { SearchBar } from '@/components/SearchBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { listCategories, listProducts, listUnits, subscribeErp } from '@/lib/erp';
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
  const products = listProducts();
  const categories = listCategories();
  const units = listUnits();
  const exportRows = useMemo(
    () =>
      products.map((product) => ({
        name: product.name,
        category: categories.find((c) => c.id === product.categoryId)?.name ?? '',
        unit: units.find((u) => u.id === product.unitId)?.name ?? '',
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        stock: product.variants.reduce((sum, variant) => sum + variant.stockQty, 0),
        packs: product.variants.length,
        status: product.isActive ? 'Active' : 'Inactive',
      })),
    [products, categories, units],
  );

  return (
    <ScreenGate permission="products.view">
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search products" />
          {hasPermission(getSession(), 'products.manage') ? (
            <PrimaryButton
              label="Add product"
              color={colors.tint}
              textColor={colors.logoInk}
              onPress={() => router.push('/product/new' as Href)}
            />
          ) : null}
          <PrimaryButton
            label="Export"
            tone="ghost"
            color={colors.tint}
            onPress={() =>
              askExport({
                filename: 'catalog',
                title: 'Catalog',
                columns: [
                  { key: 'name', label: 'Name' },
                  { key: 'category', label: 'Category' },
                  { key: 'unit', label: 'Unit' },
                  { key: 'costPrice', label: 'Cost' },
                  { key: 'salePrice', label: 'Sale' },
                  { key: 'stock', label: 'Stock' },
                  { key: 'packs', label: 'Packs' },
                  { key: 'status', label: 'Status' },
                ],
                rows: exportRows,
              })
            }
          />
          <CatalogBooks query={query} />
        </ScrollView>
      </View>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
