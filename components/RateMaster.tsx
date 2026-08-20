import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chips, Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import {
  listAdditions,
  listDiscounts,
  listTaxes,
  removeNamed,
  subscribeErp,
  upsertNamed,
  type AmountType,
  type Named,
} from '@/lib/erp';

type Kind = 'taxes' | 'discounts' | 'additions';

export function RateMaster({ kind, title }: { kind: Kind; title: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [, tick] = useState(0);
  useEffect(() => subscribeErp(() => tick((n) => n + 1)), []);
  const rows =
    kind === 'taxes' ? listTaxes() : kind === 'discounts' ? listDiscounts() : listAdditions();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Named | null>(null);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('0');
  const [type, setType] = useState<AmountType>('percent');
  const [incl, setIncl] = useState(false);

  const start = (row?: Named) => {
    setEditing(row ?? null);
    setName(row?.name ?? '');
    setRate(String(row?.rate ?? row?.value ?? 0));
    setType(row?.type ?? 'percent');
    setIncl(row?.isInclusive ?? false);
    setOpen(true);
  };

  return (
    <ScreenGate permission="settings.manage">
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <PrimaryButton label={`Add ${title.toLowerCase()}`} color={colors.tint} onPress={() => start()} />
        {rows.map((row) => (
          <View key={row.id} style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>{row.name}</Text>
              <Text style={{ color: colors.muted }}>
                {kind === 'taxes'
                  ? `${row.rate}%${row.isInclusive ? ' inclusive' : ''}`
                  : `${row.type === 'fixed' ? 'Rs' : ''} ${row.value}${row.type === 'percent' ? '%' : ''}`}
              </Text>
            </View>
            <Pressable onPress={() => start(row)}>
              <Text style={{ color: colors.tint, fontWeight: '800' }}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert('Remove', `Remove ${row.name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => void removeNamed(kind, row.id) },
                ])
              }>
              <Text style={{ color: colors.danger, fontWeight: '800' }}>Remove</Text>
            </Pressable>
          </View>
        ))}
        {open ? (
          <Card title={editing ? `Edit ${title.toLowerCase()}` : `New ${title.toLowerCase()}`}>
            <Field label="Name" value={name} onChangeText={setName} />
            <Field
              label={kind === 'taxes' ? 'Rate %' : 'Value'}
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
            />
            {kind !== 'taxes' ? (
              <Chips value={type} onChange={setType} options={[{ value: 'percent', label: 'Percent' }, { value: 'fixed', label: 'Fixed' }]} />
            ) : (
              <Chips
                value={incl ? 'yes' : 'no'}
                onChange={(v) => setIncl(v === 'yes')}
                options={[
                  { value: 'no', label: 'Exclusive' },
                  { value: 'yes', label: 'Inclusive' },
                ]}
              />
            )}
            <PrimaryButton
              label="Save"
              color={colors.tint}
              onPress={async () => {
                await upsertNamed(kind, {
                  id: editing?.id,
                  name,
                  rate: kind === 'taxes' ? Number(rate) || 0 : undefined,
                  value: kind === 'taxes' ? undefined : Number(rate) || 0,
                  type: kind === 'taxes' ? undefined : type,
                  isInclusive: kind === 'taxes' ? incl : undefined,
                });
                setOpen(false);
              }}
            />
            <PrimaryButton label="Cancel" tone="ghost" color={colors.muted} onPress={() => setOpen(false)} />
          </Card>
        ) : null}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  row: {
    borderRadius: cardRadius,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: { fontSize: 16, fontWeight: '800' },
});
