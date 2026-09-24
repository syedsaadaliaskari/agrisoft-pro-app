import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Href, Stack, useRouter } from 'expo-router';

import { CatalogPickField } from '@/components/CatalogPickField';
import { Card, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  getProduct,
  listCategories,
  listTaxes,
  listUnits,
  money,
  removeProduct,
  saveProduct,
  subscribeErp,
  upsertNamed,
} from '@/lib/erp';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

type Pack = { id?: string; size: string; color: string; stockQty: string };

export function ProductForm({ productId }: { productId?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const existing = productId ? getProduct(productId) : null;
  const canManage = hasPermission(getSession(), 'products.manage');
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const categories = listCategories();
  const units = listUnits();
  const taxes = listTaxes();
  const [name, setName] = useState(existing?.name ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [unitId, setUnitId] = useState(existing?.unitId ?? '');
  const [taxId, setTaxId] = useState(existing?.taxId ?? '');
  const [salePrice, setSalePrice] = useState(String(existing?.salePrice ?? ''));
  const [costPrice, setCostPrice] = useState(String(existing?.costPrice ?? ''));
  const [reorder, setReorder] = useState(String(existing?.reorderLevel ?? 5));
  const [initialStock, setInitialStock] = useState('0');
  const [packs, setPacks] = useState<Pack[]>(
    existing?.variants.length
      ? existing.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          stockQty: String(v.stockQty),
        }))
      : [{ size: '', color: '', stockQty: '0' }],
  );
  const [error, setError] = useState<string | null>(null);

  const goToBooks = () => router.replace('/catalog/products' as Href);

  return (
    <>
      <Stack.Screen options={{ title: existing ? existing.name : 'New product' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Card>
          <Field label="Name" value={name} onChangeText={setName} />
          <CatalogPickField
            label="Category"
            selected={categories.find((c) => c.id === categoryId)?.name ?? ''}
            options={categories}
            onSelect={setCategoryId}
            canManage={canManage}
            onCreate={async (value) => {
              const row = await upsertNamed('categories', { name: value });
              return row.id;
            }}
          />
          <CatalogPickField
            label="Unit"
            selected={units.find((c) => c.id === unitId)?.name ?? ''}
            options={units.map((u) => ({ id: u.id, name: `${u.name}${u.shortName ? ` (${u.shortName})` : ''}` }))}
            onSelect={setUnitId}
            canManage={canManage}
            extraFields={[{ key: 'shortName', label: 'Short name' }]}
            onCreate={async (value, extra) => {
              const row = await upsertNamed('units', {
                name: value,
                shortName: extra?.shortName?.trim() || value.slice(0, 6),
              });
              return row.id;
            }}
          />
          <CatalogPickField
            label="Tax"
            selected={taxes.find((c) => c.id === taxId)?.name ?? ''}
            options={taxes.map((t) => ({ id: t.id, name: `${t.name}${t.rate != null ? ` (${t.rate}%)` : ''}` }))}
            onSelect={setTaxId}
            canManage={canManage}
            extraFields={[{ key: 'rate', label: 'Rate %', keyboardType: 'decimal-pad' }]}
            onCreate={async (value, extra) => {
              const row = await upsertNamed('taxes', { name: value, rate: Number(extra?.rate) || 0 });
              return row.id;
            }}
          />
          <Field label="Cost price" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" />
          <Field label="Sale price" value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" />
          <Field label="Reorder level" value={reorder} onChangeText={setReorder} keyboardType="decimal-pad" />
          {!existing ? (
            <Field
              label="Initial stock"
              value={initialStock}
              onChangeText={setInitialStock}
              keyboardType="decimal-pad"
              hint="Qty already on the shelf for the first pack"
            />
          ) : null}
          {Number(costPrice) > 0 && Number(salePrice) >= 0 && Number(salePrice) < Number(costPrice) ? (
            <Text style={{ color: colors.danger, fontWeight: '700' }}>
              Sale price is below cost by {money(Number(costPrice) - Number(salePrice))} per unit.
            </Text>
          ) : null}
        </Card>
        <Card title="Packs">
          {packs.map((pack, index) => (
            <View key={pack.id ?? String(index)} style={{ gap: 8, paddingBottom: 12 }}>
              <Field
                label="Pack"
                value={pack.size}
                onChangeText={(v) => setPacks((cur) => cur.map((p, i) => (i === index ? { ...p, size: v } : p)))}
              />
              <Field
                label="Grade"
                value={pack.color}
                onChangeText={(v) => setPacks((cur) => cur.map((p, i) => (i === index ? { ...p, color: v } : p)))}
              />
              {existing || index > 0 ? (
                <Field
                  label="Stock"
                  value={pack.stockQty}
                  onChangeText={(v) => setPacks((cur) => cur.map((p, i) => (i === index ? { ...p, stockQty: v } : p)))}
                  keyboardType="decimal-pad"
                />
              ) : null}
              {packs.length > 1 ? (
                <Pressable onPress={() => setPacks((cur) => cur.filter((_, i) => i !== index))}>
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>Remove pack</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          <PrimaryButton
            label="Add pack"
            tone="ghost"
            color={colors.tint}
            onPress={() => setPacks((cur) => [...cur, { size: '', color: '', stockQty: '0' }])}
          />
        </Card>
        {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
        <PrimaryButton
          label="Save product"
          color={colors.tint}
          textColor={colors.logoInk}
          onPress={async () => {
            setError(null);
            try {
              await saveProduct({
                id: productId,
                name,
                categoryId: categoryId || null,
                unitId: unitId || null,
                taxId: taxId || null,
                salePrice: Number(salePrice) || 0,
                costPrice: Number(costPrice) || 0,
                reorderLevel: Number(reorder) || 0,
                initialStock: existing ? undefined : Number(initialStock),
                variants: packs.map((pack, index) => ({
                  id: pack.id,
                  size: pack.size,
                  color: pack.color,
                  stockQty: !existing && index === 0 ? Number(initialStock) : Number(pack.stockQty) || 0,
                  salePrice: Number(salePrice) || 0,
                  costPrice: Number(costPrice) || 0,
                })),
              });
              goToBooks();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't save.");
            }
          }}
        />
        {existing ? (
          <PrimaryButton
            label="Delete product"
            color={colors.danger}
            onPress={() =>
              Alert.alert('Delete product', existing.name, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => void removeProduct(existing.id).then(goToBooks),
                },
              ])
            }
          />
        ) : null}
      </ScrollView>
    </>
  );
}
