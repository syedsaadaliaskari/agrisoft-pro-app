import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chips, Field, TotalRow } from '@/components/FormKit';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, moneyText, radius, tokens, typeScale } from '@/constants/theme';
import { money } from '@/lib/erp';
import { inferPayHow, moneyRound, type PaymentMode } from '@/lib/settlement';

type Props = {
  grandTotal: number;
  cashPaid: string;
  bankPaid: string;
  onCashPaid: (value: string) => void;
  onBankPaid: (value: string) => void;
  allowCredit?: boolean;
  dueLabel?: string;
  defaultHow?: PaymentMode;
};

function totalText(n: number) {
  return String(moneyRound(n));
}

export function SettlementPad({
  grandTotal,
  cashPaid,
  bankPaid,
  onCashPaid,
  onBankPaid,
  allowCredit = true,
  dueLabel = 'Receivable',
  defaultHow,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const cash = Number(cashPaid || 0);
  const bank = Number(bankPaid || 0);
  const paid = moneyRound(cash + bank);
  const due = Math.max(0, moneyRound(grandTotal - paid));
  const over = paid > grandTotal + 0.001;
  const [how, setHow] = useState<PaymentMode>(
    () => defaultHow ?? inferPayHow(cash, bank, grandTotal, allowCredit),
  );
  const autoFill = useRef(true);

  const fillMode = (mode: PaymentMode, total: number) => {
    const s = totalText(total);
    if (mode === 'cash') {
      onCashPaid(s);
      onBankPaid('0');
    } else if (mode === 'bank') {
      onCashPaid('0');
      onBankPaid(s);
    } else if (mode === 'credit') {
      onCashPaid('0');
      onBankPaid('0');
    }
  };

  useEffect(() => {
    if (how === 'split' || !autoFill.current) return;
    fillMode(how, grandTotal);
    // how + grandTotal drive auto-fill; fillMode is stable enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grandTotal, how]);

  const pick = (next: PaymentMode) => {
    autoFill.current = true;
    setHow(next);
    fillMode(next, grandTotal);
  };

  const options: { value: PaymentMode; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank' },
    ...(allowCredit ? [{ value: 'credit' as const, label: 'Credit' }] : []),
    { value: 'split', label: 'Cash + Bank' },
  ];

  const showCash = how === 'cash' || how === 'split';
  const showBank = how === 'bank' || how === 'split';
  const boxTone = over ? tokens.dangerSoft : due > 0 ? tokens.dueSoft : tokens.successSoft;
  const boxBorder = over ? tokens.dangerBorder : due > 0 ? tokens.due : tokens.success;

  return (
    <View style={{ gap: 10 }}>
      <Chips pad value={how} onChange={pick} options={options} />
      {showCash ? (
        <Field
          label="Cash"
          value={cashPaid}
          onChangeText={(v) => {
            autoFill.current = false;
            onCashPaid(v);
            if (how === 'cash') onBankPaid('0');
          }}
          keyboardType="decimal-pad"
        />
      ) : null}
      {showBank ? (
        <Field
          label="Bank"
          value={bankPaid}
          onChangeText={(v) => {
            autoFill.current = false;
            onBankPaid(v);
            if (how === 'bank') onCashPaid('0');
          }}
          keyboardType="decimal-pad"
        />
      ) : null}
      <View style={[styles.box, { backgroundColor: boxTone, borderColor: boxBorder }]}>
        <TotalRow label={allowCredit ? 'Paid now' : 'Paid'} value={money(paid)} />
        <View style={styles.dueRow}>
          <Text style={[styles.dueLabel, { color: colors.muted }]}>{allowCredit ? dueLabel : 'Left'}</Text>
          <Text
            style={[
              styles.dueValue,
              { color: over ? colors.danger : due > 0 ? tokens.due : colors.success },
            ]}>
            {over ? `Too much ${money(paid - grandTotal)}` : money(due)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  dueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  dueLabel: { ...font, fontSize: typeScale.body },
  dueValue: { ...moneyText, fontSize: typeScale.section, fontWeight: '700' },
});
