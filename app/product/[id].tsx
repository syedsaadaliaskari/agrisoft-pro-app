import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { StatusBanner } from '@/components/StatusBanner';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchProduct, productStockQty } from '@/lib/api';
import { displayOrDash, formatMoney, formatQty } from '@/lib/format';
import type { Product } from '@/types/models';

function Field({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={[styles.field, { borderBottomColor: colors.border }]}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchProduct(id);
      setProduct(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this product.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const variants = product?.product_variants ?? [];

  return (
    <>
      <Stack.Screen options={{ title: product?.name ?? 'Product' }} />
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.tint} />
        }>
        {error ? <StatusBanner tone="error" title="Could not load product" detail={error} /> : null}

        {!loading && !error && !product ? (
          <EmptyState title="Product not found" detail="It may have been removed, or it belongs to another shop." />
        ) : null}

        {product ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>
            <Text style={[styles.status, { color: product.is_active === false ? colors.warning : colors.tint }]}>
              {product.is_active === false ? 'Inactive' : 'Active'}
            </Text>
            <Field label="Brand" value={displayOrDash(product.brand)} />
            <Field label="Sale price" value={formatMoney(product.sale_price)} />
            <Field label="Stock" value={formatQty(productStockQty(product))} />
            <Field label="SKU" value={displayOrDash(product.sku)} />
          </View>
        ) : null}

        {product ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.heading, { color: colors.text }]}>Sizes</Text>
            {variants.length === 0 ? (
              <Text style={[styles.empty, { color: colors.muted }]}>No sizes on this product.</Text>
            ) : (
              variants.map((variant) => (
                <View key={variant.id} style={[styles.variant, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.variantName, { color: colors.text }]}>
                    {[variant.size, variant.color].filter(Boolean).join(' · ') || 'Default'}
                  </Text>
                  <Text style={[styles.variantMeta, { color: colors.muted }]}>
                    Stock {formatQty(variant.stock_qty)}
                    {variant.sale_price != null && variant.sale_price !== ''
                      ? `  ·  ${formatMoney(variant.sale_price)}`
                      : ''}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  status: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  empty: {
    fontSize: 15,
    paddingVertical: 12,
  },
  field: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  variant: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    justifyContent: 'center',
  },
  variantName: {
    fontSize: 16,
    fontWeight: '600',
  },
  variantMeta: {
    marginTop: 4,
    fontSize: 14,
  },
});
