import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  accountLedger,
  listAccounts,
  listCustomers,
  listVendors,
  money,
  partyLedger,
  subscribeErp,
  type Account,
  type Party,
} from '@/lib/erp';

type Kind = 'accounts' | 'customers' | 'vendors' | 'expenses' | 'income';

export function LedgerInquiry({ kind }: { kind: Kind }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);

  const items: { id: string; name: string; hint?: string }[] =
    kind === 'customers'
      ? listCustomers().map((r) => ({ id: r.id, name: r.name, hint: r.city }))
      : kind === 'vendors'
        ? listVendors().map((r) => ({ id: r.id, name: r.name, hint: r.city }))
        : listAccounts({
            accountType: kind === 'expenses' ? 'expense' : kind === 'income' ? 'income' : undefined,
          }).map((r) => ({ id: r.id, name: `${r.code} ${r.name}`, hint: r.accountType }));

  const [id, setId] = useState(items[0]?.id ?? '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pick, setPick] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; closing: number; lines: { date: string; voucherNo: string; narration: string; debit: number; credit: number; balance: number }[] } | null>(null);

  const load = () => {
    setError(null);
    try {
      if (kind === 'customers' || kind === 'vendors') {
        const data = partyLedger(kind === 'customers' ? 'customer' : 'vendor', id, from || undefined, to || undefined);
        setResult({
          title: data.party.name,
          closing: data.closing,
          lines: data.lines,
        });
      } else {
        const data = accountLedger(id, from || undefined, to || undefined);
        setResult({
          title: data.account.name,
          closing: data.closing,
          lines: data.lines,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load ledger.");
      setResult(null);
    }
  };

  return (
    <ScreenGate permission="ledgers.view">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Card title="Statement">
          <Pressable onPress={() => setPick(true)} style={[styles.pick, { borderColor: colors.border }]}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Choose</Text>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{items.find((i) => i.id === id)?.name || '—'}</Text>
          </Pressable>
          <Field label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" />
          <Field label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" />
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          <PrimaryButton label="Show ledger" color={colors.tint} onPress={load} />
        </Card>
        {pick ? (
          <Card title="Choose">
            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setId(item.id);
                  setPick(false);
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
                {item.hint ? <Text style={{ color: colors.muted }}>{item.hint}</Text> : null}
              </Pressable>
            ))}
          </Card>
        ) : null}
        {result ? (
          <Card title={result.title}>
            <Text style={{ color: colors.muted, fontWeight: '700' }}>Closing {money(result.closing)}</Text>
            {result.lines.length ? (
              result.lines.map((line, i) => (
                <View key={`${line.voucherNo}-${i}`} style={[styles.line, { borderBottomColor: colors.border }]}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>
                    {line.date} · {line.voucherNo}
                  </Text>
                  <Text style={{ color: colors.muted }}>{line.narration || line.voucherNo}</Text>
                  <Text style={{ color: colors.text }}>
                    Dr {money(line.debit)} · Cr {money(line.credit)} · Bal {money(line.balance)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.muted }}>No movements in this period.</Text>
            )}
          </Card>
        ) : null}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  pick: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center' },
  line: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
});
