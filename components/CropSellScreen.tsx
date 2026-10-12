import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Card, Field, PickRow, TotalRow } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import { SettlementPad } from '@/components/SettlementPad';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { createCropSale, cropProducts, listCustomers, money, subscribeErp } from '@/lib/erp';
import { cropSalePrintHtml, printHtml } from '@/lib/print';
import { moneyRound } from '@/lib/settlement';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function CropSellScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const buyers = listCustomers();
  const crops = cropProducts();
  const [date, setDate] = useState(today());
  const [customerId, setCustomerId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [weight, setWeight] = useState('');
  const [rate, setRate] = useState('');
  const [cashPaid, setCashPaid] = useState('');
  const [bankPaid, setBankPaid] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [pick, setPick] = useState<'buyer' | 'crop' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = crops.find((row) => row.variantId === variantId);
  const amount = useMemo(() => moneyRound((Number(weight) || 0) * (Number(rate) || 0)), [weight, rate]);

  const save = async (andShare: boolean) => {
    setError(null);
    try {
      const doc = await createCropSale({
        docDate: date,
        customerId,
        variantId,
        weight: Number(weight) || 0,
        rate: Number(rate) || 0,
        cashPaid: Number(cashPaid || 0),
        bankPaid: Number(bankPaid || 0),
        remarks,
      });
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
        <Text style={{ color: colors.muted }}>Fertilizer sales stay on the normal sale.</Text>
        {!crops.length ? (
          <Card>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Mark a product as a crop on the product page.</Text>
          </Card>
        ) : (
          <Card>
            <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            <PickRow label="Buyer" selected={buyers.find((row) => row.id === customerId)?.name ?? ''} onPress={() => setPick('buyer')} />
            <PickRow label="Crop" selected={selected?.name ?? ''} onPress={() => setPick('crop')} />
            {selected ? <Text style={{ color: colors.muted }}>In stock {selected.stockQty}</Text> : null}
            <Field label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
            <Field label="Rate" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
            <TotalRow label="Amount" value={money(amount)} strong />
            <SettlementPad
              grandTotal={amount}
              cashPaid={cashPaid}
              bankPaid={bankPaid}
              onCashPaid={setCashPaid}
              onBankPaid={setBankPaid}
              defaultHow="cash"
              dueLabel="Left on khata"
            />
            <Field label="Remarks" value={remarks} onChangeText={setRemarks} multiline />
            {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
            <PrimaryButton label="Save" color={colors.tint} onPress={() => void save(false)} />
            <PrimaryButton label="Save & share" tone="secondary" color={colors.tint} onPress={() => void save(true)} />
          </Card>
        )}
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
      </ScrollView>
    </ScreenGate>
  );
}
