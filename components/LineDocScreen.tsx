import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Card, Chips, Field, PickRow } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  computeDocTotals,
  createPurchase,
  createSale,
  getPurchase,
  getSale,
  inventoryRows,
  listAdditions,
  listCustomers,
  listDiscounts,
  listTaxes,
  listVendors,
  money,
  subscribeErp,
  updatePurchase,
  updateSale,
  type PaymentMode,
} from '@/lib/erp';

function today() {
  return new Date().toISOString().slice(0, 10);
}

type Cart = { variantId: string; name: string; quantity: number; unitPrice: number };

export function LineDocScreen({ kind, editId }: { kind: 'sale' | 'purchase'; editId?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const parties = kind === 'sale' ? listCustomers() : listVendors();
  const stock = inventoryRows();
  const taxes = listTaxes();
  const discounts = listDiscounts();
  const additions = listAdditions();
  const existing = kind === 'sale' ? (editId ? getSale(editId) : null) : editId ? getPurchase(editId) : null;

  const [date, setDate] = useState(existing?.invoiceDate ?? today());
  const [partyId, setPartyId] = useState(
    kind === 'sale'
      ? ((existing && 'customerId' in existing ? existing.customerId : '') ?? '')
      : ((existing && 'vendorId' in existing ? existing.vendorId : '') ?? ''),
  );
  const [mode, setMode] = useState<PaymentMode>(existing?.paymentMode ?? (kind === 'sale' ? 'cash' : 'credit'));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [discount, setDiscount] = useState(String(existing?.discountAmount ?? 0));
  const [addition, setAddition] = useState(String(existing?.additionAmount ?? 0));
  const [tax, setTax] = useState(String(existing?.taxAmount ?? 0));
  const [paid, setPaid] = useState(existing ? String(existing.paidAmount) : '');
  const [cart, setCart] = useState<Cart[]>(
    existing?.items.map((line) => ({
      variantId: line.variantId,
      name: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })) ?? [],
  );
  const [pick, setPick] = useState<'party' | 'item' | 'tax' | 'discount' | 'addition' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subtotal = cart.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totals = useMemo(
    () =>
      computeDocTotals(subtotal, {
        discountAmount: Number(discount) || 0,
        additionAmount: Number(addition) || 0,
        taxAmount: Number(tax) || 0,
        paidAmount: paid === '' ? undefined : Number(paid) || 0,
        paymentMode: mode,
      }),
    [subtotal, discount, addition, tax, paid, mode],
  );

  const add = (row: (typeof stock)[number]) => {
    setCart((cur) => {
      const found = cur.find((l) => l.variantId === row.variantId);
      if (found) return cur.map((l) => (l.variantId === row.variantId ? { ...l, quantity: l.quantity + 1 } : l));
      return [...cur, { variantId: row.variantId, name: row.name, quantity: 1, unitPrice: kind === 'sale' ? row.salePrice : row.costPrice }];
    });
    setPick(null);
  };

  const applyNamed = (which: 'tax' | 'discount' | 'addition', id: string) => {
    if (which === 'tax') {
      const row = taxes.find((t) => t.id === id);
      const rate = row?.rate ?? 0;
      const base = Math.max(0, subtotal - (Number(discount) || 0) + (Number(addition) || 0));
      setTax(String(Math.round(base * rate) / 100));
    } else if (which === 'discount') {
      const row = discounts.find((t) => t.id === id);
      if (!row) return;
      setDiscount(String(row.type === 'percent' ? Math.round(subtotal * (row.value ?? 0)) / 100 : row.value ?? 0));
    } else {
      const row = additions.find((t) => t.id === id);
      if (!row) return;
      setAddition(String(row.type === 'percent' ? Math.round(subtotal * (row.value ?? 0)) / 100 : row.value ?? 0));
    }
    setPick(null);
  };

  const payload = {
    invoiceDate: date,
    paymentMode: mode,
    notes,
    discountAmount: totals.discountAmount,
    additionAmount: totals.additionAmount,
    taxAmount: totals.taxAmount,
    paidAmount: totals.paidAmount,
    items: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })),
  };

  return (
    <>
      <Stack.Screen
        options={{ title: editId ? (kind === 'sale' ? 'Edit sale' : 'Edit purchase') : kind === 'sale' ? 'New sale' : 'New purchase' }}
      />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <PickRow
            label={kind === 'sale' ? 'Customer' : 'Vendor'}
            selected={parties.find((p) => p.id === partyId)?.name ?? (kind === 'sale' ? 'Walk-in' : '')}
            onPress={() => setPick('party')}
          />
          <Chips
            value={mode}
            onChange={setMode}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'bank', label: 'Bank' },
              { value: 'credit', label: 'Credit' },
            ]}
          />
          <PrimaryButton label="Add item" tone="ghost" color={colors.tint} onPress={() => setPick('item')} />
          {cart.map((line) => (
            <View key={line.variantId} style={styles.line}>
              <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>{line.name}</Text>
              <Pressable onPress={() => setCart((cur) => cur.map((l) => (l.variantId === line.variantId ? { ...l, quantity: Math.max(1, l.quantity - 1) } : l)))}>
                <Text style={{ color: colors.tint, fontWeight: '800' }}>−</Text>
              </Pressable>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{line.quantity}</Text>
              <Pressable onPress={() => setCart((cur) => cur.map((l) => (l.variantId === line.variantId ? { ...l, quantity: l.quantity + 1 } : l)))}>
                <Text style={{ color: colors.tint, fontWeight: '800' }}>+</Text>
              </Pressable>
              <Pressable onPress={() => setCart((cur) => cur.filter((l) => l.variantId !== line.variantId))}>
                <Text style={{ color: colors.danger, fontWeight: '800' }}>×</Text>
              </Pressable>
              <Text style={{ color: colors.muted }}>{money(line.quantity * line.unitPrice)}</Text>
            </View>
          ))}
          <Text style={{ color: colors.muted }}>Subtotal {money(totals.subtotal)}</Text>
          <PickRow label="Discount" selected={money(totals.discountAmount)} onPress={() => setPick('discount')} />
          <Field label="Discount amount" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
          <PickRow label="Addition" selected={money(totals.additionAmount)} onPress={() => setPick('addition')} />
          <Field label="Addition amount" value={addition} onChangeText={setAddition} keyboardType="decimal-pad" />
          <PickRow label="Tax" selected={money(totals.taxAmount)} onPress={() => setPick('tax')} />
          <Field label="Tax amount" value={tax} onChangeText={setTax} keyboardType="decimal-pad" />
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>Grand total {money(totals.grandTotal)}</Text>
          <Field label="Paid" value={paid} onChangeText={setPaid} keyboardType="decimal-pad" placeholder={String(totals.paidAmount)} />
          <Text style={{ color: colors.muted }}>Balance {money(totals.grandTotal - totals.paidAmount)}</Text>
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
          {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
          <PrimaryButton
            label={editId ? 'Save changes' : kind === 'sale' ? 'Save sale' : 'Save purchase'}
            color={colors.tint}
            onPress={async () => {
              setError(null);
              try {
                if (kind === 'sale') {
                  if (editId) await updateSale(editId, { ...payload, customerId: partyId || null });
                  else await createSale({ ...payload, customerId: partyId || null });
                } else if (editId) {
                  await updatePurchase(editId, { ...payload, vendorId: partyId || null });
                } else {
                  await createPurchase({ ...payload, vendorId: partyId || null });
                }
                router.back();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't save.");
              }
            }}
          />
        </Card>
        {pick === 'party' ? (
          <Card title={kind === 'sale' ? 'Customer' : 'Vendor'}>
            {kind === 'sale' ? (
              <Pressable
                onPress={() => {
                  setPartyId('');
                  setPick(null);
                }}
                style={{ minHeight: 44 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Walk-in</Text>
              </Pressable>
            ) : null}
            {parties.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  setPartyId(p.id);
                  setPick(null);
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{p.name}</Text>
                <Text style={{ color: colors.muted }}>{p.code}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
        {pick === 'item' ? (
          <Card title="Items">
            {stock.map((row) => (
              <Pressable key={row.variantId} onPress={() => add(row)} style={{ minHeight: 48, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{row.name}</Text>
                <Text style={{ color: colors.muted }}>
                  {row.detail || 'Default'} · Stock {row.stockQty} · {money(kind === 'sale' ? row.salePrice : row.costPrice)}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
        {pick === 'tax' ? (
          <Card title="Tax">
            {taxes.map((row) => (
              <Pressable key={row.id} onPress={() => applyNamed('tax', row.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {row.name} · {row.rate ?? 0}%
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
        {pick === 'discount' ? (
          <Card title="Discount">
            {discounts.length ? (
              discounts.map((row) => (
                <Pressable key={row.id} onPress={() => applyNamed('discount', row.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {row.name} · {row.type === 'percent' ? `${row.value}%` : money(row.value ?? 0)}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={{ color: colors.muted }}>No discount masters. Type an amount above.</Text>
            )}
          </Card>
        ) : null}
        {pick === 'addition' ? (
          <Card title="Addition">
            {additions.length ? (
              additions.map((row) => (
                <Pressable key={row.id} onPress={() => applyNamed('addition', row.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {row.name} · {row.type === 'percent' ? `${row.value}%` : money(row.value ?? 0)}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={{ color: colors.muted }}>No addition masters. Type an amount above.</Text>
            )}
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
});
