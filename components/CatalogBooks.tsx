import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Href, useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius } from '@/constants/layout';
import { font, moneyText, overline, radius, typeScale } from '@/constants/theme';
import {
  adjustStock,
  inventoryRows,
  listCategories,
  listProducts,
  listUnits,
  money,
} from '@/lib/erp';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

type InventoryItem = ReturnType<typeof inventoryRows>[number];

function Cell({
  text,
  width,
  muted,
  last,
}: {
  text: string;
  width: number;
  muted?: boolean;
  last?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.cell,
        moneyText,
        { width, color: muted ? colors.muted : colors.text, borderColor: colors.border },
        last ? styles.cellLast : null,
      ]}>
      {text}
    </Text>
  );
}

function Head({ text, width, last }: { text: string; width: number; last?: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.headCell,
        overline,
        { width, color: colors.muted, borderColor: colors.border, backgroundColor: colors.soft },
        last ? styles.cellLast : null,
      ]}>
      {text}
    </Text>
  );
}

export function InventoryBooksTable({
  query,
  onAdjust,
}: {
  query?: string;
  onAdjust?: (row: InventoryItem) => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const can = hasPermission(getSession(), 'inventory.manage');
  const rows = useMemo(() => {
    const q = query?.trim().toLowerCase() ?? '';
    return inventoryRows().filter((row) => {
      if (!q) return true;
      return `${row.name} ${row.pack} ${row.grade}`.toLowerCase().includes(q);
    });
  }, [query]);

  return (
    <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.section, { color: colors.text }]}>Inventory</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.row}>
            <Head text="Product" width={140} />
            <Head text="Pack" width={80} />
            <Head text="Grade" width={80} />
            <Head text="Stock" width={70} />
            <Head text="Reorder" width={70} />
            <Head text="Cost" width={90} />
            <Head text="Sale" width={90} />
            <Head text="Status" width={80} />
            <Head text="Actions" width={80} last />
          </View>
          {rows.length === 0 ? (
            <View style={{ width: 780 }}>
              <EmptyState title="No inventory" />
            </View>
          ) : (
            rows.map((row) => (
              <View key={row.variantId} style={[styles.row, { backgroundColor: colors.card }]}>
                <Cell text={row.name} width={140} />
                <Cell text={row.pack || '—'} width={80} />
                <Cell text={row.grade || '—'} width={80} />
                <Cell text={String(row.stockQty)} width={70} />
                <Cell text={String(row.reorderLevel)} width={70} />
                <Cell text={money(row.costPrice)} width={90} />
                <Cell text={money(row.salePrice)} width={90} />
                <Cell text={row.isActive ? 'Active' : 'Inactive'} width={80} />
                <View style={[styles.actionCell, { width: 80, borderColor: colors.border }]}>
                  {can ? (
                    <Pressable
                      onPress={() => onAdjust?.(row)}
                      hitSlop={8}>
                      <Text style={[styles.action, { color: colors.tint }]}>Adjust</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.action, { color: colors.muted }]}>—</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export function ProductBooksTable({ query }: { query?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const can = hasPermission(getSession(), 'products.manage');
  const categories = listCategories();
  const units = listUnits();
  const rows = useMemo(() => {
    const q = query?.trim().toLowerCase() ?? '';
    return listProducts()
      .map((product) => ({
        ...product,
        categoryName: categories.find((c) => c.id === product.categoryId)?.name ?? '—',
        unitName: units.find((u) => u.id === product.unitId)?.name ?? '—',
        stock: product.variants.reduce((sum, variant) => sum + variant.stockQty, 0),
        packs: product.variants.length,
      }))
      .filter((row) => {
        if (!q) return true;
        return `${row.name} ${row.categoryName} ${row.unitName}`.toLowerCase().includes(q);
      });
  }, [query, categories, units]);

  return (
    <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.section, { color: colors.text }]}>Products</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.row}>
            <Head text="Name" width={140} />
            <Head text="Category" width={100} />
            <Head text="Unit" width={80} />
            <Head text="Cost" width={90} />
            <Head text="Sale" width={90} />
            <Head text="Stock" width={70} />
            <Head text="Packs" width={60} />
            <Head text="Status" width={80} />
            <Head text="Actions" width={70} last />
          </View>
          {rows.length === 0 ? (
            <View style={{ width: 780 }}>
              <EmptyState title="No products" />
            </View>
          ) : (
            rows.map((row) => (
              <View key={row.id} style={styles.row}>
                <Cell text={row.name} width={140} />
                <Cell text={row.categoryName} width={100} />
                <Cell text={row.unitName} width={80} />
                <Cell text={money(row.costPrice)} width={90} />
                <Cell text={money(row.salePrice)} width={90} />
                <Cell text={String(row.stock)} width={70} />
                <Cell text={String(row.packs)} width={60} />
                <Cell text={row.isActive ? 'Active' : 'Inactive'} width={80} />
                <View style={[styles.actionCell, { width: 70, borderColor: colors.border }]}>
                  {can ? (
                    <Pressable onPress={() => router.push(`/product/${row.id}` as Href)} hitSlop={8}>
                      <Text style={[styles.action, { color: colors.tint }]}>Edit</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.action, { color: colors.muted }]}>—</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export function CatalogBooks({ query, showProducts = true }: { query?: string; showProducts?: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [edit, setEdit] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState('');

  return (
    <View style={styles.books}>
      <InventoryBooksTable
        query={query}
        onAdjust={(row) => {
          setEdit(row);
          setQty(String(row.stockQty));
        }}
      />
      {showProducts ? <ProductBooksTable query={query} /> : null}
      <Modal visible={!!edit} transparent animationType="fade" onRequestClose={() => setEdit(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEdit(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{edit?.name}</Text>
            <Text style={[styles.sheetMeta, { color: colors.muted }]}>
              Pack {edit?.pack || '—'} · Grade {edit?.grade || '—'}
            </Text>
            <TextInput
              value={qty}
              onChangeText={setQty}
              keyboardType="decimal-pad"
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <PrimaryButton
              label="Save stock"
              color={colors.tint}
              textColor={colors.logoInk}
              onPress={async () => {
                if (!edit) return;
                try {
                  await adjustStock(edit.variantId, Number(qty) || 0);
                  setEdit(null);
                } catch (err) {
                  Alert.alert(err instanceof Error ? err.message : "Couldn't save.");
                }
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  books: { gap: 16 },
  table: { borderWidth: 1, borderRadius: cardRadius, overflow: 'hidden' },
  section: { ...font, fontSize: typeScale.section, fontWeight: '600', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row: { flexDirection: 'row' },
  headCell: {
    ...overline,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRightWidth: 1,
  },
  cell: {
    ...font,
    fontSize: typeScale.body,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  cellLast: { borderRightWidth: 0 },
  actionCell: {
    borderTopWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  action: { ...font, fontSize: typeScale.label, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 12, borderWidth: 1 },
  sheetTitle: { ...font, fontSize: typeScale.section, fontWeight: '600' },
  sheetMeta: { ...font, fontSize: typeScale.body },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 12 },
});
