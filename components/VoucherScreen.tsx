import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '@/components/ActionBar';
import { Card, Field, PickRow } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import { SettlementPad } from '@/components/SettlementPad';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import {
  cancelVoucher,
  listAccounts,
  listCustomers,
  listVendors,
  listVouchers,
  makePayment,
  money,
  postExpense,
  postIncome,
  postOwnerDraw,
  receivePayment,
  subscribeErp,
  type Account,
  type Party,
  type Voucher,
  type VoucherType,
} from '@/lib/erp';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { printHtml, voucherPrintHtml } from '@/lib/print';

type Kind = 'receipt' | 'payment' | 'expense' | 'income' | 'owner_draw';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function VoucherScreen({ kind }: { kind: Kind }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const canCreate = hasPermission(getSession(), 'transactions.create');
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const rows = listVouchers(kind as VoucherType);
  const parties: Party[] = kind === 'receipt' ? listCustomers() : kind === 'payment' ? listVendors() : [];
  const special =
    kind === 'expense' ? listAccounts({ accountType: 'expense' }) : kind === 'income' ? listAccounts({ accountType: 'income' }) : [];
  const [date, setDate] = useState(today());
  const [partyId, setPartyId] = useState(parties[0]?.id ?? '');
  const [specialId, setSpecialId] = useState(special[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [cashPaid, setCashPaid] = useState('');
  const [bankPaid, setBankPaid] = useState('0');
  const [notes, setNotes] = useState('');
  const [pick, setPick] = useState<'party' | 'special' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status !== 'cancelled');
    const t = today();
    const todayRows = active.filter((r) => r.voucherDate === t);
    return {
      count: active.length,
      today: todayRows.reduce((s, r) => s + r.grandTotal, 0),
      total: active.reduce((s, r) => s + r.grandTotal, 0),
    };
  }, [rows]);

  const title =
    kind === 'receipt'
      ? 'Receive payment'
      : kind === 'payment'
        ? 'Make payment'
        : kind === 'expense'
          ? 'Expense'
          : kind === 'income'
            ? 'Income'
            : 'Owner draw';

  const save = async (andShare: boolean) => {
    setError(null);
    try {
      const n = Number(amount) || Number(cashPaid || 0) + Number(bankPaid || 0);
      const bits = {
        voucherDate: date,
        amount: n,
        cashPaid: Number(cashPaid || 0),
        bankPaid: Number(bankPaid || 0),
        notes,
      };
      const voucher =
        kind === 'receipt'
          ? await receivePayment({ ...bits, customerId: partyId })
          : kind === 'payment'
            ? await makePayment({ ...bits, vendorId: partyId })
            : kind === 'expense'
              ? await postExpense({ ...bits, expenseAccountId: specialId })
              : kind === 'income'
                ? await postIncome({ ...bits, incomeAccountId: specialId })
                : await postOwnerDraw(bits);
      if (andShare) await printHtml(voucherPrintHtml(voucher, 'thermal'), voucher.voucherNo);
      setAmount('');
      setCashPaid('');
      setBankPaid('0');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  };

  const partyName = (id: string, list: { id: string; name: string }[]) => list.find((r) => r.id === id)?.name ?? '';

  return (
    <ScreenGate permission="transactions.view">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <View style={styles.stats}>
          <Stat label="Vouchers" value={String(stats.count)} />
          <Stat label="Today" value={money(stats.today)} />
          <Stat label="Total" value={money(stats.total)} />
        </View>
        {canCreate ? (
          <Card title={title}>
            <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            {kind === 'receipt' || kind === 'payment' ? (
              <PickRow
                label={kind === 'receipt' ? 'Customer' : 'Vendor'}
                selected={partyName(partyId, parties)}
                onPress={() => setPick('party')}
              />
            ) : kind === 'expense' || kind === 'income' ? (
              <PickRow
                label={kind === 'expense' ? 'Expense account' : 'Income account'}
                selected={partyName(specialId, special)}
                onPress={() => setPick('special')}
              />
            ) : null}
            <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <SettlementPad
              grandTotal={Number(amount) || 0}
              cashPaid={cashPaid}
              bankPaid={bankPaid}
              onCashPaid={setCashPaid}
              onBankPaid={setBankPaid}
              allowCredit={false}
              defaultHow="cash"
            />
            <Field label="Notes" value={notes} onChangeText={setNotes} />
            {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
            <PrimaryButton label="Save" color={colors.tint} onPress={() => void save(false)} />
            <PrimaryButton label="Save & share" tone="secondary" color={colors.tint} onPress={() => void save(true)} />
          </Card>
        ) : null}
        {pick ? (
          <Card title="Choose">
            {(pick === 'party' ? parties : special).map((row: Account | Party) => (
              <Pressable
                key={row.id}
                onPress={() => {
                  if (pick === 'party') setPartyId(row.id);
                  if (pick === 'special') setSpecialId(row.id);
                  setPick(null);
                }}
                style={styles.opt}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{row.name}</Text>
              </Pressable>
            ))}
            <PrimaryButton label="Close" tone="ghost" color={colors.muted} onPress={() => setPick(null)} />
          </Card>
        ) : null}
        {rows.map((row: Voucher) => (
          <View key={row.id} style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>
                {row.voucherNo} · {row.partyName || '—'}
              </Text>
              <Text style={{ color: colors.muted }}>
                {row.voucherDate} · {money(row.grandTotal)} · {row.status}
              </Text>
            </View>
            <ActionBar
              actions={[
                {
                  label: 'Share',
                  onPress: () => void printHtml(voucherPrintHtml(row, 'thermal'), row.voucherNo),
                },
                {
                  label: 'Cancel',
                  danger: true,
                  hidden: row.status === 'cancelled' || !canCreate,
                  onPress: () =>
                    Alert.alert('Cancel voucher', row.voucherNo, [
                      { text: 'No', style: 'cancel' },
                      { text: 'Cancel', style: 'destructive', onPress: () => void cancelVoucher(row.id) },
                    ]),
                },
              ]}
            />
          </View>
        ))}
      </ScrollView>
    </ScreenGate>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={[styles.stat, cardShadow, { backgroundColor: colors.card }]}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: cardRadius, padding: 12, gap: 4 },
  row: { borderRadius: cardRadius, padding: 14, gap: 10 },
  name: { fontSize: 15, fontWeight: '800' },
  opt: { minHeight: 44, justifyContent: 'center' },
});
