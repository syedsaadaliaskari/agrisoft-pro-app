import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Card, Field, PickRow, TotalRow } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import { SettlementPad } from '@/components/SettlementPad';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  createCropPurchase,
  cropProducts,
  deleteCropPurchase,
  listCropPurchases,
  listCustomers,
  listUnits,
  listVendors,
  money,
  subscribeErp,
  updateCropPurchase,
} from '@/lib/erp';
import { cropPurchasePrintHtml, printHtml } from '@/lib/print';
import { newId } from '@/lib/id';
import { moneyRound } from '@/lib/settlement';

function today() {
  return new Date().toISOString().slice(0, 10);
}

type Vehicle = { key: string; vehicleNo: string; bags: string; perBag: string; totalWeight: string; kaat: string; rate: string };

function blankVehicle(): Vehicle {
  return { key: newId(), vehicleNo: '', bags: '', perBag: '', totalWeight: '', kaat: '', rate: '' };
}

function kilograms(unit?: { equalsKg?: number | null; shortName?: string; name: string }) {
  if (!unit) return null;
  if (unit.equalsKg != null && unit.equalsKg > 0) return unit.equalsKg;
  const label = `${unit.shortName ?? ''} ${unit.name}`.toLowerCase();
  if (label.includes('kg') || label.includes('kilogram')) return 1;
  return null;
}

function lineMath(vehicle: Vehicle, usePerBag: boolean) {
  const bags = Number(vehicle.bags) || 0;
  const perBag = Number(vehicle.perBag) || 0;
  const typed = Number(vehicle.totalWeight) || 0;
  const total = usePerBag && bags > 0 && perBag > 0 ? bags * perBag : typed;
  const kaat = Number(vehicle.kaat) || 0;
  const rate = Number(vehicle.rate) || 0;
  const safi = moneyRound(Math.max(0, total - kaat));
  return { total, safi, amount: moneyRound(total * rate) };
}

export function CropBuyScreen({ partyType }: { partyType: 'customer' | 'vendor' }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const parties = partyType === 'customer' ? listCustomers() : listVendors();
  const crops = cropProducts();
  const units = listUnits();
  const [date, setDate] = useState(today());
  const [partyId, setPartyId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [weighUnitId, setWeighUnitId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([blankVehicle()]);
  const [commission, setCommission] = useState('0');
  const [brokerage, setBrokerage] = useState('0');
  const [mazdoori, setMazdoori] = useState('0');
  const [fees, setFees] = useState('0');
  const [bardana, setBardana] = useState('0');
  const [cashPaid, setCashPaid] = useState('0');
  const [bankPaid, setBankPaid] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [pick, setPick] = useState<'party' | 'crop' | 'unit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const title = partyType === 'customer' ? 'Buy from farmer' : 'Buy from supplier';
  const partyLabel = partyType === 'customer' ? 'Farmer' : 'Supplier';
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
  const slips = listCropPurchases(partyType);

  const totals = useMemo(() => {
    const lines = vehicles.map((vehicle) => lineMath(vehicle, usePerBag));
    const gross = moneyRound(lines.reduce((sum, line) => sum + line.amount, 0));
    const charges = moneyRound(
      (Number(commission) || 0) + (Number(brokerage) || 0) + (Number(mazdoori) || 0) + (Number(fees) || 0) + (Number(bardana) || 0),
    );
    return { lines, gross, net: moneyRound(gross - charges) };
  }, [vehicles, commission, brokerage, mazdoori, fees, bardana, usePerBag]);

  const save = async (andShare: boolean) => {
    setError(null);
    try {
      const payload = {
        docDate: date,
        partyType,
        partyId,
        variantId,
        vehicles: vehicles.map((vehicle, index) => ({
          vehicleNo: vehicle.vehicleNo,
          bags: Number(vehicle.bags) || 0,
          totalWeight: totals.lines[index]?.total || 0,
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
        weighUnitId: weighUnitId || null,
      };
      const doc = editingId ? await updateCropPurchase(editingId, payload) : await createCropPurchase(payload);
      if (andShare) await printHtml(cropPurchasePrintHtml(doc, 'thermal'), doc.docNo);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  };

  return (
    <ScreenGate permission="purchases.view">
      <Stack.Screen options={{ title }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
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
            <PickRow
              label="Unit"
              selected={chosenUnit ? (chosenUnit.equalsKg ? `${chosenUnit.shortName || chosenUnit.name} = ${chosenUnit.equalsKg} kg` : chosenUnit.shortName || chosenUnit.name) : ''}
              onPress={() => setPick('unit')}
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
                  {usePerBag ? (
                    <Field
                      label={`${unit} / bag`}
                      value={vehicle.perBag}
                      onChangeText={(value) => setVehicles((cur) => cur.map((row) => (row.key === vehicle.key ? { ...row, perBag: value } : row)))}
                      keyboardType="decimal-pad"
                    />
                  ) : null}
                  <Field
                    label={`Total ${unit}`}
                    value={usePerBag && (Number(vehicle.bags) || 0) > 0 && (Number(vehicle.perBag) || 0) > 0 ? String(math?.total ?? '') : vehicle.totalWeight}
                    onChangeText={(value) =>
                      setVehicles((cur) => cur.map((row) => (row.key === vehicle.key ? { ...row, totalWeight: value, perBag: '' } : row)))
                    }
                    keyboardType="decimal-pad"
                  />
                  <Field
                    label={`Kaat ${unit}`}
                    value={vehicle.kaat}
                    onChangeText={(value) => setVehicles((cur) => cur.map((row) => (row.key === vehicle.key ? { ...row, kaat: value } : row)))}
                    keyboardType="decimal-pad"
                  />
                  <Field
                    label={`Rate / ${unit}`}
                    value={vehicle.rate}
                    onChangeText={(value) => setVehicles((cur) => cur.map((row) => (row.key === vehicle.key ? { ...row, rate: value } : row)))}
                    keyboardType="decimal-pad"
                  />
                  <TotalRow
                    label="Safi"
                    value={
                      factor !== 1
                        ? `${math?.safi ?? 0} = ${Math.round((math?.safi ?? 0) * factor * 1000) / 1000} ${productUnit?.shortName || 'kg'}`
                        : String(math?.safi ?? 0)
                    }
                  />
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
            <PrimaryButton label={editingId ? 'Update' : 'Save'} color={colors.tint} onPress={() => void save(false)} />
            {!editingId ? <PrimaryButton label="Save & share" tone="secondary" color={colors.tint} onPress={() => void save(true)} /> : null}
          </Card>
        )}
        {slips.length ? (
          <Card title="Recent slips">
            {slips.map((row) => (
              <View key={row.id} style={{ paddingVertical: 8, gap: 4 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {row.docNo} · {row.partyName} · {money(row.netPayable)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Pressable
                    onPress={() => {
                      setEditingId(row.id);
                      setDate(row.docDate);
                      setPartyId(row.partyId);
                      setVariantId(row.variantId);
                      setWeighUnitId(units.find((unit) => (unit.shortName || unit.name) === row.vehicles[0]?.weighUnit)?.id ?? '');
                      setVehicles(
                        row.vehicles.map((vehicle) => ({
                          key: vehicle.id,
                          vehicleNo: vehicle.vehicleNo,
                          bags: String(vehicle.bags || ''),
                          perBag: '',
                          totalWeight: String(vehicle.totalWeight),
                          kaat: String(vehicle.kaat),
                          rate: String(vehicle.rate),
                        })),
                      );
                      setCommission(String(row.commission));
                      setBrokerage(String(row.brokerage));
                      setMazdoori(String(row.mazdoori));
                      setFees(String(row.fees));
                      setBardana(String(row.bardana));
                      setCashPaid(String(row.paidAmount));
                      setBankPaid('0');
                      setRemarks(row.remarks || '');
                    }}
                    style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: colors.tint, fontWeight: '800' }}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Reverse slip', `Reverse ${row.docNo}? Safi leaves stock and the khata entry is removed.`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reverse',
                          style: 'destructive',
                          onPress: () =>
                            void deleteCropPurchase(row.id).catch((err) =>
                              setError(err instanceof Error ? err.message : "Couldn't reverse."),
                            ),
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
