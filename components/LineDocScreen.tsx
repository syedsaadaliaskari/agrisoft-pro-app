import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Card, Field, PickRow, TotalRow } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SettlementPad } from '@/components/SettlementPad';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  computeDocTotals,
  createPurchase,
  createSale,
  getPurchase,
  getSale,
  batchesForVariant,
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
import { newId } from '@/lib/id';
import { moneyRound } from '@/lib/settlement';
import { printHtml, purchasePrintHtml, salePrintHtml } from '@/lib/print';

function today() {
  return new Date().toISOString().slice(0, 10);
}

type Cart = {
  key: string;
  variantId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  trackBatch: boolean;
  batchNo: string;
  expiryDate: string;
  batchQty: number | null;
  batches: { batchNo: string; expiryDate: string; qty: number }[];
};

function seedPay(existing: { cashPaid?: number; bankPaid?: number; paidAmount: number; paymentMode: PaymentMode } | null, kind: 'sale' | 'purchase') {
  if (!existing) {
    return kind === 'sale'
      ? { cash: '', bank: '0', how: 'cash' as PaymentMode }
      : { cash: '0', bank: '0', how: 'credit' as PaymentMode };
  }
  return {
    cash: String(existing.cashPaid ?? (existing.paymentMode === 'bank' || existing.paymentMode === 'credit' ? 0 : existing.paidAmount)),
    bank: String(existing.bankPaid ?? (existing.paymentMode === 'bank' ? existing.paidAmount : 0)),
    how: existing.paymentMode,
  };
}

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
  const [mode] = useState<PaymentMode>(existing?.paymentMode ?? (kind === 'sale' ? 'cash' : 'credit'));
  const seeded = seedPay(existing, kind);
  const [cashPaid, setCashPaid] = useState(seeded.cash);
  const [bankPaid, setBankPaid] = useState(seeded.bank);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [discount, setDiscount] = useState(String(existing?.discountAmount ?? 0));
  const [addition, setAddition] = useState(String(existing?.additionAmount ?? 0));
  const [tax, setTax] = useState(String(existing?.taxAmount ?? 0));
  const [cart, setCart] = useState<Cart[]>(
    existing?.items.map((line) => ({
      key: line.id,
      variantId: line.variantId,
      name: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      trackBatch: false,
      batchNo: '',
      expiryDate: '',
      batchQty: null,
      batches: [],
    })) ?? [],
  );
  const [pick, setPick] = useState<'party' | 'item' | 'tax' | 'discount' | 'addition' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subtotal = cart.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totals = useMemo(() => {
    const extra = {
      discountAmount: Number(discount) || 0,
      additionAmount: Number(addition) || 0,
      taxAmount: Number(tax) || 0,
      cashPaid: Number(cashPaid || 0),
      bankPaid: Number(bankPaid || 0),
    };
    try {
      return computeDocTotals(subtotal, extra);
    } catch {
      const grandTotal = Math.max(
        0,
        moneyRound(subtotal - extra.discountAmount + extra.additionAmount + extra.taxAmount),
      );
      return {
        subtotal,
        ...extra,
        grandTotal,
        paidAmount: extra.cashPaid + extra.bankPaid,
        due: Math.max(0, moneyRound(grandTotal - extra.cashPaid - extra.bankPaid)),
        paymentMode: mode,
      };
    }
  }, [subtotal, discount, addition, tax, cashPaid, bankPaid, mode]);

  const add = (row: (typeof stock)[number]) => {
    setCart((cur) => {
      const price = kind === 'sale' ? row.salePrice : row.costPrice;
      if (!editId && row.trackBatch && kind === 'sale') {
        const batches = batchesForVariant(row.variantId);
        const first = batches[0];
        const batchNo = first?.batchNo ?? '';
        const found = cur.find((line) => line.variantId === row.variantId && line.batchNo === batchNo);
        if (found) {
          const cap = found.batchQty;
          return cur.map((line) =>
            line.key === found.key ? { ...line, quantity: cap == null ? line.quantity + 1 : Math.min(cap, line.quantity + 1) } : line,
          );
        }
        return [
          ...cur,
          {
            key: newId(),
            variantId: row.variantId,
            name: row.name,
            quantity: first && first.qty < 1 ? first.qty : 1,
            unitPrice: price,
            trackBatch: true,
            batchNo,
            expiryDate: first?.expiryDate ?? '',
            batchQty: first ? first.qty : null,
            batches,
          },
        ];
      }
      if (!editId && row.trackBatch && kind === 'purchase') {
        return [
          ...cur,
          {
            key: newId(),
            variantId: row.variantId,
            name: row.name,
            quantity: 1,
            unitPrice: price,
            trackBatch: true,
            batchNo: '',
            expiryDate: '',
            batchQty: null,
            batches: [],
          },
        ];
      }
      const found = cur.find((line) => line.variantId === row.variantId && !line.trackBatch);
      if (found) return cur.map((line) => (line.key === found.key ? { ...line, quantity: line.quantity + 1 } : line));
      return [
        ...cur,
        {
          key: row.variantId,
          variantId: row.variantId,
          name: row.name,
          quantity: 1,
          unitPrice: price,
          trackBatch: false,
          batchNo: '',
          expiryDate: '',
          batchQty: null,
          batches: [],
        },
      ];
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
    notes,
    discountAmount: totals.discountAmount,
    additionAmount: totals.additionAmount,
    taxAmount: totals.taxAmount,
    cashPaid: Number(cashPaid || 0),
    bankPaid: Number(bankPaid || 0),
    items: cart.map((l) => ({
      variantId: l.variantId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      ...(editId ? {} : { batchNo: l.batchNo, expiryDate: l.expiryDate }),
    })),
  };

  const save = async (andShare: boolean) => {
    setError(null);
    try {
      if (kind === 'sale') {
        const doc = editId
          ? await updateSale(editId, { ...payload, customerId: partyId || null })
          : await createSale({ ...payload, customerId: partyId || null });
        if (andShare) await printHtml(salePrintHtml(doc, 'thermal'), doc.invoiceNo);
      } else {
        const doc = editId
          ? await updatePurchase(editId, { ...payload, vendorId: partyId || null })
          : await createPurchase({ ...payload, vendorId: partyId || null });
        if (andShare) await printHtml(purchasePrintHtml(doc, 'thermal'), doc.invoiceNo);
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
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
          <PrimaryButton label="Add item" tone="ghost" color={colors.tint} onPress={() => setPick('item')} />
          {!editId && cart.some((line) => line.trackBatch) ? (
            <View style={styles.line}>
              <Text style={{ color: colors.muted, fontWeight: '800', flex: 1 }}>Batch</Text>
              <Text style={{ color: colors.muted, fontWeight: '800' }}>Expiry</Text>
            </View>
          ) : null}
          {cart.map((line) => (
            <View key={line.key} style={{ gap: 6 }}>
              <View style={styles.line}>
                <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>{line.name}</Text>
                <Pressable
                  onPress={() =>
                    setCart((cur) =>
                      cur.map((item) => {
                        if (item.key !== line.key) return item;
                        const floor = item.batchQty != null && item.batchQty < 1 ? item.batchQty : 1;
                        return { ...item, quantity: Math.max(floor, item.quantity - 1) };
                      }),
                    )
                  }>
                  <Text style={{ color: colors.tint, fontWeight: '800' }}>−</Text>
                </Pressable>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{line.quantity}</Text>
                <Pressable
                  onPress={() =>
                    setCart((cur) =>
                      cur.map((item) => {
                        if (item.key !== line.key) return item;
                        const next = item.quantity + 1;
                        if (kind === 'sale' && item.batchQty != null && next > item.batchQty) return item;
                        return { ...item, quantity: next };
                      }),
                    )
                  }>
                  <Text style={{ color: colors.tint, fontWeight: '800' }}>+</Text>
                </Pressable>
                <Pressable onPress={() => setCart((cur) => cur.filter((item) => item.key !== line.key))}>
                  <Text style={{ color: colors.danger, fontWeight: '800' }}>×</Text>
                </Pressable>
                <Text style={{ color: colors.muted }}>{money(line.quantity * line.unitPrice)}</Text>
              </View>
              {!editId && cart.some((item) => item.trackBatch) ? (
                line.trackBatch && kind === 'purchase' ? (
                  <View style={{ gap: 8 }}>
                    <Field
                      label="Batch"
                      value={line.batchNo}
                      onChangeText={(value) => setCart((cur) => cur.map((item) => (item.key === line.key ? { ...item, batchNo: value } : item)))}
                    />
                    <Field
                      label="Expiry"
                      value={line.expiryDate}
                      onChangeText={(value) => setCart((cur) => cur.map((item) => (item.key === line.key ? { ...item, expiryDate: value } : item)))}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                ) : line.trackBatch && kind === 'sale' && line.batches.length ? (
                  <View style={{ gap: 6 }}>
                    {line.batches.map((batch) => (
                      <Pressable
                        key={batch.batchNo}
                        onPress={() =>
                          setCart((cur) =>
                            cur.map((item) =>
                              item.key === line.key
                                ? {
                                    ...item,
                                    batchNo: batch.batchNo,
                                    expiryDate: batch.expiryDate,
                                    batchQty: batch.qty,
                                    quantity: Math.min(item.quantity, batch.qty),
                                  }
                                : item,
                            ),
                          )
                        }
                        style={{ minHeight: 44, justifyContent: 'center' }}>
                        <Text style={{ color: line.batchNo === batch.batchNo ? colors.tint : colors.text, fontWeight: '800' }}>
                          {batch.batchNo} · {batch.expiryDate || '—'} · Qty {batch.qty}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : line.trackBatch && kind === 'sale' ? (
                  <Text style={{ color: colors.muted }}>No batch rows yet. This sale uses the open pile.</Text>
                ) : (
                  <Text style={{ color: colors.muted }}>Batch — · Expiry —</Text>
                )
              ) : null}
            </View>
          ))}
          <TotalRow label="Subtotal" value={money(totals.subtotal)} />
          <PickRow label="Discount" selected={money(totals.discountAmount)} onPress={() => setPick('discount')} />
          <Field label="Discount amount" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
          <PickRow label="Addition" selected={money(totals.additionAmount)} onPress={() => setPick('addition')} />
          <Field label="Addition amount" value={addition} onChangeText={setAddition} keyboardType="decimal-pad" />
          <PickRow label="Tax" selected={money(totals.taxAmount)} onPress={() => setPick('tax')} />
          <Field label="Tax amount" value={tax} onChangeText={setTax} keyboardType="decimal-pad" />
          <TotalRow label="Grand total" value={money(totals.grandTotal)} strong />
          {kind === 'sale' &&
          cart.some((line) => {
            const row = stock.find((s) => s.variantId === line.variantId);
            return !!row && row.costPrice > 0 && line.unitPrice < row.costPrice;
          }) ? (
            <Text style={{ color: colors.danger, fontWeight: '700' }}>
              One or more items are priced below cost.
            </Text>
          ) : null}
          <SettlementPad
            grandTotal={totals.grandTotal}
            cashPaid={cashPaid}
            bankPaid={bankPaid}
            onCashPaid={setCashPaid}
            onBankPaid={setBankPaid}
            defaultHow={seeded.how}
            dueLabel={kind === 'sale' ? 'Receivable' : 'Payable'}
          />
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
          {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
          <PrimaryButton
            label={editId ? 'Save changes' : kind === 'sale' ? 'Save sale' : 'Save purchase'}
            color={colors.tint}
            onPress={() => void save(false)}
          />
          <PrimaryButton
            label="Save & share"
            tone="secondary"
            color={colors.tint}
            onPress={() => void save(true)}
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
            {stock.filter((row) => !row.isCrop).map((row) => (
              <Pressable key={row.variantId} onPress={() => add(row)} style={{ minHeight: 48, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{row.name}</Text>
                <Text style={{ color: colors.muted }}>
                {row.detail || 'Default'} · Stock {row.stockQty} · {money(kind === 'sale' ? row.salePrice : row.costPrice)}
              </Text>
              {kind === 'sale' && row.costPrice > 0 && row.salePrice < row.costPrice ? (
                <Text style={{ color: colors.danger, fontWeight: '700' }}>
                  Sale price is below cost by {money(row.costPrice - row.salePrice)}
                </Text>
              ) : null}
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
  content: { padding: 24, gap: 12, paddingBottom: 40 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
});
