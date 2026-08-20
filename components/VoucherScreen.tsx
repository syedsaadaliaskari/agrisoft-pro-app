import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '@/components/ActionBar';
import { Card, Field, PickRow } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
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
  receivePayment,
  subscribeErp,
  type Account,
  type Party,
  type Voucher,
  type VoucherType,
} from '@/lib/erp';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { askPrint } from '@/lib/exportShare';
import { printHtml, voucherPrintHtml } from '@/lib/print';

type Kind = 'receipt' | 'payment' | 'expense' | 'income';

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
  const cash = listAccounts({ cashBankOnly: true });
  const special =
    kind === 'expense' ? listAccounts({ accountType: 'expense' }) : kind === 'income' ? listAccounts({ accountType: 'income' }) : [];
  const [date, setDate] = useState(today());
  const [partyId, setPartyId] = useState(parties[0]?.id ?? '');
  const [accountId, setAccountId] = useState(cash[0]?.id ?? '');
  const [specialId, setSpecialId] = useState(special[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [pick, setPick] = useState<'party' | 'cash' | 'special' | null>(null);
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
    kind === 'receipt' ? 'Receive payment' : kind === 'payment' ? 'Make payment' : kind === 'expense' ? 'Expense' : 'Income';

  const save = async () => {
    setError(null);
    try {
      const n = Number(amount);
      if (kind === 'receipt') {
        await receivePayment({ voucherDate: date, customerId: partyId, accountId, amount: n, notes });
      } else if (kind === 'payment') {
        await makePayment({ voucherDate: date, vendorId: partyId, accountId, amount: n, notes });
      } else if (kind === 'expense') {
        await postExpense({ voucherDate: date, expenseAccountId: specialId, accountId, amount: n, notes });
      } else {
        await postIncome({ voucherDate: date, incomeAccountId: specialId, accountId, amount: n, notes });
      }
      setAmount('');
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
            ) : (
              <PickRow
                label={kind === 'expense' ? 'Expense account' : 'Income account'}
                selected={partyName(specialId, special)}
                onPress={() => setPick('special')}
              />
            )}
            <PickRow label="Cash / bank" selected={partyName(accountId, cash)} onPress={() => setPick('cash')} />
            <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <Field label="Notes" value={notes} onChangeText={setNotes} />
            {error ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{error}</Text> : null}
            <PrimaryButton label="Save" color={colors.tint} onPress={() => void save()} />
          </Card>
        ) : null}
        {pick ? (
          <Card title="Choose">
            {(pick === 'party' ? parties : pick === 'cash' ? cash : special).map((row: Account | Party) => (
              <Pressable
                key={row.id}
                onPress={() => {
                  if (pick === 'party') setPartyId(row.id);
                  if (pick === 'cash') setAccountId(row.id);
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
                  label: 'Print',
                  onPress: () => askPrint((size) => void printHtml(voucherPrintHtml(row, size), row.voucherNo)),
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
