import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Href, Stack, useRouter } from 'expo-router';

import { CatalogPickField } from '@/components/CatalogPickField';
import { Card, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  batchesForProduct,
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
  const [equalsKg, setEqualsKg] = useState(() => {
    const unit = units.find((row) => row.id === existing?.unitId);
    return unit?.equalsKg == null ? '' : String(unit.equalsKg);
  });
  const [taxId, setTaxId] = useState(existing?.taxId ?? '');
  const [salePrice, setSalePrice] = useState(String(existing?.salePrice ?? ''));
  const [costPrice, setCostPrice] = useState(String(existing?.costPrice ?? ''));
  const [reorder, setReorder] = useState(String(existing?.reorderLevel ?? 5));
  const [initialStock, setInitialStock] = useState('0');
  const soonest = productId
    ? [...batchesForProduct(productId)].sort((a, b) => (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999'))[0]
    : undefined;
  const [isCrop, setIsCrop] = useState(existing?.isCrop ?? false);
  const [trackBatch, setTrackBatch] = useState(existing?.isCrop ? false : (existing?.trackBatch ?? false));
  const [batchId] = useState(soonest?.id ?? '');
  const [batchNo, setBatchNo] = useState(soonest?.batchNo ?? '');
  const [manufacturedDate, setManufacturedDate] = useState(soonest?.manufacturedDate ?? '');
  const [expiryDate, setExpiryDate] = useState(soonest?.expiryDate ?? '');
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
            selected={(() => {
              const unit = units.find((c) => c.id === unitId);
              if (!unit) return '';
              const label = `${unit.name}${unit.shortName ? ` (${unit.shortName})` : ''}`;
              return unit.equalsKg ? `${label} = ${unit.equalsKg} kg` : label;
            })()}
            options={units.map((u) => ({
              id: u.id,
              name: u.equalsKg
                ? `${u.name}${u.shortName ? ` (${u.shortName})` : ''} = ${u.equalsKg} kg`
                : `${u.name}${u.shortName ? ` (${u.shortName})` : ''}`,
            }))}
            onSelect={(id) => {
              setUnitId(id);
              const unit = units.find((row) => row.id === id);
              setEqualsKg(unit?.equalsKg == null ? '' : String(unit.equalsKg));
            }}
            canManage={canManage}
            extraFields={[
              { key: 'shortName', label: 'Short name' },
              { key: 'equalsKg', label: 'Equals kg', keyboardType: 'decimal-pad' },
            ]}
            onCreate={async (value, extra) => {
              const parsed = extra?.equalsKg?.trim() ? Number(extra.equalsKg) : null;
              if (parsed != null && (!(parsed > 0) || Number.isNaN(parsed))) throw new Error('Equals kg must be greater than 0');
              const row = await upsertNamed('units', {
                name: value,
                shortName: extra?.shortName?.trim() || value.slice(0, 6),
                equalsKg: parsed,
              });
              setEqualsKg(parsed == null ? '' : String(parsed));
              return row.id;
            }}
          />
          <Field label="Equals kg" value={equalsKg} onChangeText={setEqualsKg} keyboardType="decimal-pad" />
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
          <Pressable
            onPress={() => {
              setIsCrop((on) => !on);
              setTrackBatch(false);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: colors.tint,
                backgroundColor: isCrop ? colors.tint : 'transparent',
              }}
            />
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>
              This is a crop (wheat, cotton, and other weighed crops)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setTrackBatch((on) => !on);
              setIsCrop(false);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: colors.tint,
                backgroundColor: !isCrop && trackBatch ? colors.tint : 'transparent',
              }}
            />
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>Track batch number and expiry</Text>
          </Pressable>
          {trackBatch && !isCrop ? (
            <>
              <Field
                label="Batch number"
                value={batchNo}
                onChangeText={setBatchNo}
                placeholder="Leave blank to make one"
              />
              <Field
                label="Manufactured date"
                value={manufacturedDate}
                onChangeText={setManufacturedDate}
                placeholder="YYYY-MM-DD"
              />
              <Field label="Expiry date" value={expiryDate} onChangeText={setExpiryDate} placeholder="YYYY-MM-DD" />
            </>
          ) : null}
          <Text style={{ color: colors.muted }}>
            {isCrop
              ? 'A crop opens its own slip: vehicles, kaat, then commission, brokerage, mazdoori, fees, and bardana.'
              : trackBatch
                ? 'Leave the batch number empty and the software writes one. Manufactured date and expiry date are required. The product turns red when expiry is inside 30 days.'
                : 'Tick this for a packed item such as fertilizer or pesticide. A crop does not use it.'}
          </Text>
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
              if (unitId) {
                const unit = units.find((row) => row.id === unitId);
                const parsed = equalsKg.trim() ? Number(equalsKg) : null;
                if (parsed != null && (!(parsed > 0) || Number.isNaN(parsed))) {
                  throw new Error('Equals kg must be greater than 0');
                }
                if (unit && (parsed ?? null) !== (unit.equalsKg ?? null)) {
                  await upsertNamed('units', {
                    id: unit.id,
                    name: unit.name,
                    shortName: unit.shortName,
                    equalsKg: parsed,
                  });
                }
              }
              await saveProduct({
                id: productId,
                name,
                categoryId: categoryId || null,
                unitId: unitId || null,
                taxId: taxId || null,
                salePrice: Number(salePrice) || 0,
                costPrice: Number(costPrice) || 0,
                reorderLevel: Number(reorder) || 0,
                isCrop,
                trackBatch: isCrop ? false : trackBatch,
                ...(trackBatch && !isCrop
                  ? { batchId, batchNo, manufacturedDate, expiryDate }
                  : {}),
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
