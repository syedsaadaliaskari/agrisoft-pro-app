import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Card, Field, PickRow, TotalRow } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import { SettlementPad } from '@/components/SettlementPad';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { createCropSale, cropProducts, deleteCropSale, listCropSales, listCustomers, listUnits, money, subscribeErp, updateCropSale } from '@/lib/erp';
import { cropSalePrintHtml, printHtml } from '@/lib/print';
import { moneyRound } from '@/lib/settlement';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function kilograms(unit?: { equalsKg?: number | null; shortName?: string; name: string }) {
  if (!unit) return null;
  if (unit.equalsKg != null && unit.equalsKg > 0) return unit.equalsKg;
  const label = `${unit.shortName ?? ''} ${unit.name}`.toLowerCase();
  if (label.includes('kg') || label.includes('kilogram')) return 1;
  return null;
}

export function CropSellScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const buyers = listCustomers();
  const crops = cropProducts();
  const units = listUnits();
  const [date, setDate] = useState(today());
  const [customerId, setCustomerId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [weighUnitId, setWeighUnitId] = useState('');
  const [bags, setBags] = useState('');
  const [perBag, setPerBag] = useState('');
  const [weight, setWeight] = useState('');
  const [rate, setRate] = useState('');
  const [commission, setCommission] = useState('0');
  const [brokerage, setBrokerage] = useState('0');
  const [mazdoori, setMazdoori] = useState('0');
  const [fees, setFees] = useState('0');
  const [bardana, setBardana] = useState('0');
  const [cashPaid, setCashPaid] = useState('');
  const [bankPaid, setBankPaid] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pick, setPick] = useState<'buyer' | 'crop' | 'unit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = crops.find((row) => row.variantId === variantId);
  const productUnit = units.find((unit) => unit.id === selected?.unitId);
  const weighChoices = units.filter((unit) => unit.id === productUnit?.id || kilograms(unit) != null);
  const chosenUnit = units.find((unit) => unit.id === weighUnitId) ?? productUnit;
  const unit = chosenUnit?.shortName || selected?.unit || 'qty';
  const chosenKg = kilograms(chosenUnit);
  const productKg = kilograms(productUnit);
  const factor =
    chosenUnit && productUnit && chosenUnit.id !== productUnit.id && chosenKg && productKg ? chosenKg / productKg : 1;
  const usePerBag = unit.toLowerCase() !== 'bag';
  const quantity = usePerBag && (Number(bags) || 0) > 0 && (Number(perBag) || 0) > 0 ? (Number(bags) || 0) * (Number(perBag) || 0) : Number(weight) || 0;
  const amount = useMemo(() => moneyRound(quantity * (Number(rate) || 0)), [quantity, rate]);
  const deductions = (Number(commission) || 0) + (Number(brokerage) || 0) + (Number(mazdoori) || 0) + (Number(fees) || 0) + (Number(bardana) || 0);
  const net = moneyRound(amount - deductions);
  const slips = listCropSales();

  const save = async (andShare: boolean) => {
    setError(null);
    try {
      const payload = {
        docDate: date,
        customerId,
        variantId,
        weight: quantity,
        rate: Number(rate) || 0,
        commission: Number(commission) || 0,
        brokerage: Number(brokerage) || 0,
        mazdoori: Number(mazdoori) || 0,
        fees: Number(fees) || 0,
        bardana: Number(bardana) || 0,
        cashPaid: Number(cashPaid || 0),
        bankPaid: Number(bankPaid || 0),
        remarks,
        weighUnitId: weighUnitId || null,
      };
      const doc = editingId ? await updateCropSale(editingId, payload) : await createCropSale(payload);
      if (andShare) await printHtml(cropSalePrintHtml(doc, 'thermal'), doc.docNo);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  };

  return (
    <ScreenGate permission="sales.view">
      <Stack.Screen options={{ title: 'Sell crop' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        {!crops.length ? (
          <Card>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Mark a product as a crop on the product page.</Text>
          </Card>
        ) : (
          <Card>
            <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            <PickRow label="Buyer" selected={buyers.find((row) => row.id === customerId)?.name ?? ''} onPress={() => setPick('buyer')} />
            <PickRow label="Crop" selected={selected?.name ?? ''} onPress={() => setPick('crop')} />
            <PickRow
              label="Unit"
              selected={chosenUnit ? (chosenUnit.equalsKg ? `${chosenUnit.shortName || chosenUnit.name} = ${chosenUnit.equalsKg} kg` : chosenUnit.shortName || chosenUnit.name) : ''}
              onPress={() => setPick('unit')}
            />
            {selected ? <Text style={{ color: colors.muted }}>In stock {selected.stockQty} {selected.unit}</Text> : null}
            {usePerBag ? (
              <>
                <Field label="Bags" value={bags} onChangeText={setBags} keyboardType="decimal-pad" />
                <Field label={`${unit} / bag`} value={perBag} onChangeText={setPerBag} keyboardType="decimal-pad" />
              </>
            ) : null}
            <Field
              label={`Quantity (${unit})`}
              value={usePerBag && (Number(bags) || 0) > 0 && (Number(perBag) || 0) > 0 ? String(quantity) : weight}
              onChangeText={(value) => {
                setWeight(value);
                setBags('');
                setPerBag('');
              }}
              keyboardType="decimal-pad"
            />
            <Field label={`Rate / ${unit}`} value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
            {factor !== 1 ? (
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {quantity} {unit} = {Math.round(quantity * factor * 1000) / 1000} {productUnit?.shortName || 'kg'}
              </Text>
            ) : null}
            <Field label="Commission" value={commission} onChangeText={setCommission} keyboardType="decimal-pad" />
            <Field label="Brokerage" value={brokerage} onChangeText={setBrokerage} keyboardType="decimal-pad" />
            <Field label="Mazdoori" value={mazdoori} onChangeText={setMazdoori} keyboardType="decimal-pad" />
            <Field label="Fees" value={fees} onChangeText={setFees} keyboardType="decimal-pad" />
            <Field label="Bardana" value={bardana} onChangeText={setBardana} keyboardType="decimal-pad" />
            <TotalRow label="Amount" value={money(amount)} />
            <TotalRow label="Net" value={money(Math.max(0, net))} strong />
            <SettlementPad
              grandTotal={Math.max(0, net)}
              cashPaid={cashPaid}
              bankPaid={bankPaid}
              onCashPaid={setCashPaid}
              onBankPaid={setBankPaid}
              defaultHow="cash"
              dueLabel="Left on khata"
            />
            <Field label="Remarks" value={remarks} onChangeText={setRemarks} multiline />
            {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
            <PrimaryButton label={editingId ? 'Update' : 'Save'} color={colors.tint} onPress={() => void save(false)} />
            {!editingId ? <PrimaryButton label="Save & share" tone="secondary" color={colors.tint} onPress={() => void save(true)} /> : null}
          </Card>
        )}
        {slips.length ? (
          <Card title="Recent crop sales">
            {slips.map((row) => (
              <View key={row.id} style={{ paddingVertical: 8, gap: 4 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {row.docNo} · {row.customerName} · {money(row.netAmount || row.amount)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Pressable
                    onPress={() => {
                      setEditingId(row.id);
                      setDate(row.docDate);
                      setCustomerId(row.customerId);
                      setVariantId(row.variantId);
                      setWeighUnitId(units.find((unit) => (unit.shortName || unit.name) === row.weighUnit)?.id ?? '');
                      setBags('');
                      setPerBag('');
                      setWeight(String(row.weight));
                      setRate(String(row.rate));
                      setCommission(String(row.commission || 0));
                      setBrokerage(String(row.brokerage || 0));
                      setMazdoori(String(row.mazdoori || 0));
                      setFees(String(row.fees || 0));
                      setBardana(String(row.bardana || 0));
                      setCashPaid(String(row.paidAmount));
                      setBankPaid('0');
                      setRemarks(row.remarks || '');
                    }}
                    style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: colors.tint, fontWeight: '800' }}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Reverse slip', `Reverse ${row.docNo}? The quantity goes back into stock and the khata entry is removed.`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reverse',
                          style: 'destructive',
                          onPress: () =>
                            void deleteCropSale(row.id).catch((err) => setError(err instanceof Error ? err.message : "Couldn't reverse.")),
                        },
                      ])
                    }
                    style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: colors.danger, fontWeight: '800' }}>Reverse</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        ) : null}
        {pick === 'buyer' ? (
          <Card title="Buyer">
            {buyers.map((row) => (
              <Pressable
                key={row.id}
                onPress={() => {
                  setCustomerId(row.id);
                  setPick(null);
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{row.name}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
        {pick === 'crop' ? (
          <Card title="Crop">
            {crops.map((row) => (
              <Pressable
                key={row.variantId}
                onPress={() => {
                  setVariantId(row.variantId);
                  setPick(null);
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{row.name}</Text>
                <Text style={{ color: colors.muted }}>{row.detail || 'Default'} · Stock {row.stockQty}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
        {pick === 'unit' ? (
          <Card title="Unit">
            {weighChoices.map((row) => (
              <Pressable
                key={row.id}
                onPress={() => {
                  setWeighUnitId(row.id);
                  setPick(null);
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {row.shortName || row.name}
                  {row.equalsKg ? ` = ${row.equalsKg} kg` : ''}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </ScreenGate>
  );
}
