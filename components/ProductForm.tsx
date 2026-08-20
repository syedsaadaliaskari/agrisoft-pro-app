import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Card, Field, PickRow } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  getProduct,
  listCategories,
  listTaxes,
  listUnits,
  removeProduct,
  saveProduct,
} from '@/lib/erp';

type Pack = { id?: string; size: string; color: string; barcode: string; stockQty: string; salePrice: string; costPrice: string };

export function ProductForm({ productId }: { productId?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const existing = productId ? getProduct(productId) : null;
  const categories = listCategories();
  const units = listUnits();
  const taxes = listTaxes();
  const [name, setName] = useState(existing?.name ?? '');
  const [barcode, setBarcode] = useState(existing?.barcode ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [gender, setGender] = useState(existing?.gender ?? '');
  const [season, setSeason] = useState(existing?.season ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [unitId, setUnitId] = useState(existing?.unitId ?? '');
  const [taxId, setTaxId] = useState(existing?.taxId ?? '');
  const [salePrice, setSalePrice] = useState(String(existing?.salePrice ?? ''));
  const [costPrice, setCostPrice] = useState(String(existing?.costPrice ?? ''));
  const [wholesale, setWholesale] = useState(String(existing?.wholesalePrice ?? ''));
  const [reorder, setReorder] = useState(String(existing?.reorderLevel ?? 5));
  const [packs, setPacks] = useState<Pack[]>(
    existing?.variants.length
      ? existing.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          barcode: v.barcode,
          stockQty: String(v.stockQty),
          salePrice: String(v.salePrice),
          costPrice: String(v.costPrice),
        }))
      : [{ size: '', color: '', barcode: '', stockQty: '0', salePrice: '', costPrice: '' }],
  );
  const [pick, setPick] = useState<'category' | 'unit' | 'tax' | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Stack.Screen options={{ title: existing ? existing.name : 'New product' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Card>
          {existing ? <Field label="SKU" value={existing.sku} onChangeText={() => {}} editable={false} /> : null}
          <Field label="Name" value={name} onChangeText={setName} />
          <Field label="Barcode" value={barcode} onChangeText={setBarcode} />
          <Field label="Brand" value={brand} onChangeText={setBrand} />
          <Field label="Description" value={description} onChangeText={setDescription} multiline />
          <PickRow label="Category" selected={categories.find((c) => c.id === categoryId)?.name ?? ''} onPress={() => setPick('category')} />
          <PickRow label="Unit" selected={units.find((c) => c.id === unitId)?.name ?? ''} onPress={() => setPick('unit')} />
          <PickRow label="Tax" selected={taxes.find((c) => c.id === taxId)?.name ?? ''} onPress={() => setPick('tax')} />
          <Field label="Gender" value={gender} onChangeText={setGender} />
          <Field label="Season" value={season} onChangeText={setSeason} />
          <Field label="Sale price" value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" />
          <Field label="Cost price" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" />
          <Field label="Wholesale price" value={wholesale} onChangeText={setWholesale} keyboardType="decimal-pad" />
          <Field label="Reorder level" value={reorder} onChangeText={setReorder} keyboardType="decimal-pad" />
        </Card>
        <Card title="Packs (size / color)">
          {packs.map((pack, index) => (
            <View key={pack.id ?? String(index)} style={{ gap: 8, paddingBottom: 12 }}>
              <Field
                label="Size"
                value={pack.size}
                onChangeText={(v) => setPacks((cur) => cur.map((p, i) => (i === index ? { ...p, size: v } : p)))}
              />
              <Field
                label="Color"
                value={pack.color}
                onChangeText={(v) => setPacks((cur) => cur.map((p, i) => (i === index ? { ...p, color: v } : p)))}
              />
              <Field
                label="Barcode"
                value={pack.barcode}
                onChangeText={(v) => setPacks((cur) => cur.map((p, i) => (i === index ? { ...p, barcode: v } : p)))}
              />
              <Field
                label="Stock"
                value={pack.stockQty}
                onChangeText={(v) => setPacks((cur) => cur.map((p, i) => (i === index ? { ...p, stockQty: v } : p)))}
                keyboardType="decimal-pad"
              />
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
            onPress={() => setPacks((cur) => [...cur, { size: '', color: '', barcode: '', stockQty: '0', salePrice: salePrice, costPrice: costPrice }])}
          />
        </Card>
        {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
        <PrimaryButton
          label="Save product"
          color={colors.tint}
          onPress={async () => {
            setError(null);
            try {
              await saveProduct({
                id: productId,
                name,
                barcode,
                description,
                brand,
                gender,
                season,
                categoryId: categoryId || null,
                unitId: unitId || null,
                taxId: taxId || null,
                salePrice: Number(salePrice) || 0,
                costPrice: Number(costPrice) || 0,
                wholesalePrice: Number(wholesale) || 0,
                reorderLevel: Number(reorder) || 0,
                variants: packs.map((pack) => ({
                  id: pack.id,
                  size: pack.size,
                  color: pack.color,
                  barcode: pack.barcode,
                  stockQty: Number(pack.stockQty) || 0,
                  salePrice: Number(salePrice) || 0,
                  costPrice: Number(costPrice) || 0,
                })),
              });
              router.back();
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
                  onPress: () => void removeProduct(existing.id).then(() => router.back()),
                },
              ])
            }
          />
        ) : null}
        {pick ? (
          <Card title={pick === 'category' ? 'Category' : pick === 'unit' ? 'Unit' : 'Tax'}>
            {(pick === 'category' ? categories : pick === 'unit' ? units : taxes).map((row) => (
              <Pressable
                key={row.id}
                onPress={() => {
                  if (pick === 'category') setCategoryId(row.id);
                  else if (pick === 'unit') setUnitId(row.id);
                  else setTaxId(row.id);
                  setPick(null);
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{row.name}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}
