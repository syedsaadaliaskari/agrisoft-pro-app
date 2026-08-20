import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '@/components/ActionBar';
import { Card, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { listAccounts, listVouchers, money, postJournal, subscribeErp } from '@/lib/erp';
import { askPrint } from '@/lib/exportShare';
import { printHtml, voucherPrintHtml } from '@/lib/print';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';
import { newId } from '@/lib/id';

function today() {
  return new Date().toISOString().slice(0, 10);
}

type Line = { key: string; accountId: string; debit: string; credit: string; narration: string };

export default function JournalScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const canCreate = hasPermission(getSession(), 'transactions.create');
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const accounts = listAccounts();
  const rows = listVouchers('journal');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { key: newId(), accountId: '', debit: '', credit: '', narration: '' },
    { key: newId(), accountId: '', debit: '', credit: '', narration: '' },
  ]);
  const [pick, setPick] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const credit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const ok = Math.abs(debit - credit) < 0.01 && debit > 0;

  return (
    <ScreenGate permission="transactions.view">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        {canCreate ? (
          <Card title="Journal">
            <Field label="Date" value={date} onChangeText={setDate} />
            <Field label="Notes" value={notes} onChangeText={setNotes} />
            {lines.map((line) => (
              <View key={line.key} style={[styles.line, { borderColor: colors.border }]}>
                <Pressable onPress={() => setPick(line.key)}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {accounts.find((a) => a.id === line.accountId)?.name || 'Account'}
                  </Text>
                </Pressable>
                <Field
                  label="Debit"
                  value={line.debit}
                  onChangeText={(debit) =>
                    setLines((cur) => cur.map((r) => (r.key === line.key ? { ...r, debit, credit: debit ? '' : r.credit } : r)))
                  }
                  keyboardType="decimal-pad"
                />
                <Field
                  label="Credit"
                  value={line.credit}
                  onChangeText={(credit) =>
                    setLines((cur) => cur.map((r) => (r.key === line.key ? { ...r, credit, debit: credit ? '' : r.debit } : r)))
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
            <PrimaryButton
              label="Add line"
              tone="ghost"
              color={colors.tint}
              onPress={() => setLines((cur) => [...cur, { key: newId(), accountId: '', debit: '', credit: '', narration: '' }])}
            />
            <Text style={{ color: ok ? colors.tint : colors.danger, fontWeight: '800' }}>
              Debit {money(debit)} · Credit {money(credit)}
            </Text>
            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
            <PrimaryButton
              label="Post journal"
              color={colors.tint}
              disabled={!ok}
              onPress={async () => {
                setError(null);
                try {
                  await postJournal({
                    voucherDate: date,
                    notes,
                    entries: lines
                      .filter((l) => l.accountId && (Number(l.debit) || Number(l.credit)))
                      .map((l) => ({
                        accountId: l.accountId,
                        debit: Number(l.debit) || 0,
                        credit: Number(l.credit) || 0,
                      })),
                  });
                  setNotes('');
                  setLines([
                    { key: newId(), accountId: '', debit: '', credit: '', narration: '' },
                    { key: newId(), accountId: '', debit: '', credit: '', narration: '' },
                  ]);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Couldn't post.");
                }
              }}
            />
          </Card>
        ) : null}
        {pick ? (
          <Card title="Account">
            {accounts.map((acc) => (
              <Pressable
                key={acc.id}
                onPress={() => {
                  setLines((cur) => cur.map((r) => (r.key === pick ? { ...r, accountId: acc.id } : r)));
                  setPick(null);
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {acc.code} {acc.name}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
        {rows.map((row) => (
          <View key={row.id} style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{row.voucherNo}</Text>
            <Text style={{ color: colors.muted }}>
              {row.voucherDate} · {money(row.grandTotal)} · {row.status}
            </Text>
            <ActionBar
              actions={[
                { label: 'Print', onPress: () => askPrint((size) => void printHtml(voucherPrintHtml(row, size), row.voucherNo)) },
              ]}
            />
          </View>
        ))}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  line: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 8 },
  row: { borderRadius: cardRadius, padding: 14, gap: 4 },
});
