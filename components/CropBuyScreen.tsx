import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Card, Field, PickRow, TotalRow } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import { SettlementPad } from '@/components/SettlementPad';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { createCropPurchase, cropProducts, listCustomers, listVendors, money, subscribeErp } from '@/lib/erp';
import { newId } from '@/lib/id';
import { moneyRound } from '@/lib/settlement';

function today() {
  return new Date().toISOString().slice(0, 10);
}

type Vehicle = { key: string; vehicleNo: string; bags: string; totalWeight: string; kaat: string; rate: string };

function blankVehicle(): Vehicle {
  return { key: newId(), vehicleNo: '', bags: '', totalWeight: '', kaat: '', rate: '' };
}

function lineMath(vehicle: Vehicle) {
  const totalWeight = Number(vehicle.totalWeight) || 0;
  const kaat = Number(vehicle.kaat) || 0;
  const rate = Number(vehicle.rate) || 0;
  const safi = moneyRound(totalWeight - kaat);
  return { safi, amount: moneyRound(safi * rate) };
}

export function CropBuyScreen({ partyType }: { partyType: 'customer' | 'vendor' }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const parties = partyType === 'customer' ? listCustomers() : listVendors();
  const crops = cropProducts();
  const [date, setDate] = useState(today());
  const [partyId, setPartyId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([blankVehicle()]);
  const [commission, setCommission] = useState('0');
  const [brokerage, setBrokerage] = useState('0');
  const [mazdoori, setMazdoori] = useState('0');
  const [fees, setFees] = useState('0');
  const [bardana, setBardana] = useState('0');
  const [cashPaid, setCashPaid] = useState('0');
  const [bankPaid, setBankPaid] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [pick, setPick] = useState<'party' | 'crop' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const title = partyType === 'customer' ? 'Buy from farmer' : 'Buy from supplier';
  const partyLabel = partyType === 'customer' ? 'Farmer' : 'Supplier';

  const totals = useMemo(() => {
    const lines = vehicles.map(lineMath);
    const gross = moneyRound(lines.reduce((sum, line) => sum + line.amount, 0));
    const charges = moneyRound(
      (Number(commission) || 0) + (Number(brokerage) || 0) + (Number(mazdoori) || 0) + (Number(fees) || 0) + (Number(bardana) || 0),
    );
    return { lines, gross, net: moneyRound(gross - charges) };
  }, [vehicles, commission, brokerage, mazdoori, fees, bardana]);

  const save = async () => {
    setError(null);
    try {
      await createCropPurchase({
        docDate: date,
        partyType,
        partyId,
        variantId,
        vehicles: vehicles.map((vehicle) => ({
          vehicleNo: vehicle.vehicleNo,
          bags: Number(vehicle.bags) || 0,
          totalWeight: Number(vehicle.totalWeight) || 0,
          kaat: Number(vehicle.kaat) || 0,
          rate: Number(vehicle.rate) || 0,
        })),
        commission: Number(commission) || 0,
        brokerage: Number(brokerage) || 0,
        mazdoori: Number(mazdoori) || 0,
        fees: Number(fees) || 0,
        bardana: Number(bardana) || 0,
        cashPaid: Number(cashPaid || 0),
        bankPaid: Number(bankPaid || 0),
        remarks,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  };

  return (
    <ScreenGate permission="purchases.view">
      <Stack.Screen options={{ title }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.muted }}>Fertilizer bags stay on the normal purchase.</Text>
        {!crops.length ? (
          <Card>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Mark a product as a crop on the product page.</Text>
          </Card>
        ) : (
          <Card>
            <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            <PickRow label={partyLabel} selected={parties.find((row) => row.id === partyId)?.name ?? ''} onPress={() => setPick('party')} />
            <PickRow
              label="Crop"
              selected={crops.find((row) => row.variantId === variantId)?.name ?? ''}
              onPress={() => setPick('crop')}
            />
            {vehicles.map((vehicle, index) => {
              const math = totals.lines[index];
              return (
                <View key={vehicle.key} style={{ gap: 8, paddingTop: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>Vehicle {index + 1}</Text>
                  <Field
                    label="Vehicle number"
                    value={vehicle.vehicleNo}
                    onChangeText={(value) => setVehicles((cur) => cur.map((row) => (row.key === vehicle.key ? { ...row, vehicleNo: value } : row)))}
                  />
                  <Field
                    label="Bags"
                    value={vehicle.bags}
                    onChangeText={(value) => setVehicles((cur) => cur.map((row) => (row.key === vehicle.key ? { ...row, bags: value } : row)))}
                    keyboardType="decimal-pad"
                  />
                  <Field
                    label="Total weight"
                    value={vehicle.totalWeight}
                    onChangeText={(value) => setVehicles((cur) => cur.map((row) => (row.key === vehicle.key ? { ...row, totalWeight: value } : row)))}
                    keyboardType="decimal-pad"
                  />
                  <Field
                    label="Kaat"
                    value={vehicle.kaat}
                    onChangeText={(value) => setVehicles((cur) => cur.map((row) => (row.key === vehicle.key ? { ...row, kaat: value } : row)))}
                    keyboardType="decimal-pad"
                  />
                  <Field
                    label="Rate"
                    value={vehicle.rate}
                    onChangeText={(value) => setVehicles((cur) => cur.map((row) => (row.key === vehicle.key ? { ...row, rate: value } : row)))}
                    keyboardType="decimal-pad"
                  />
                  <TotalRow label="Safi" value={String(math?.safi ?? 0)} />
                  <TotalRow label="Amount" value={money(math?.amount ?? 0)} />
                  {vehicles.length > 1 ? (
                    <Pressable onPress={() => setVehicles((cur) => cur.filter((row) => row.key !== vehicle.key))} style={{ minHeight: 44, justifyContent: 'center' }}>
                      <Text style={{ color: colors.danger, fontWeight: '800' }}>Remove vehicle</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
            <PrimaryButton label="Add vehicle" tone="ghost" color={colors.tint} onPress={() => setVehicles((cur) => [...cur, blankVehicle()])} />
            <Field label="Commission" value={commission} onChangeText={setCommission} keyboardType="decimal-pad" />
            <Field label="Brokerage" value={brokerage} onChangeText={setBrokerage} keyboardType="decimal-pad" />
            <Field label="Mazdoori" value={mazdoori} onChangeText={setMazdoori} keyboardType="decimal-pad" />
            <Field label="Fees" value={fees} onChangeText={setFees} keyboardType="decimal-pad" />
            <Field label="Bardana" value={bardana} onChangeText={setBardana} keyboardType="decimal-pad" />
            <TotalRow label="Gross" value={money(totals.gross)} />
            <TotalRow label="Net" value={money(totals.net)} strong />
            <SettlementPad
              grandTotal={Math.max(0, totals.net)}
              cashPaid={cashPaid}
              bankPaid={bankPaid}
              onCashPaid={setCashPaid}
              onBankPaid={setBankPaid}
              defaultHow="credit"
              dueLabel="Left on khata"
            />
            <Field label="Remarks" value={remarks} onChangeText={setRemarks} multiline />
            {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
            <PrimaryButton label="Save" color={colors.tint} onPress={() => void save()} />
          </Card>
        )}
        {pick === 'party' ? (
          <Card title={partyLabel}>
            {parties.map((row) => (
              <Pressable
                key={row.id}
                onPress={() => {
                  setPartyId(row.id);
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
