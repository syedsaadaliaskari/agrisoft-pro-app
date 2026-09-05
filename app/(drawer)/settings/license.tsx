import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenGate } from '@/components/ScreenGate';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import type { LicensePlan } from '@/lib/activation';
import { shareTextOrFile, showShareError } from '@/lib/shareOut';
import { createLicense } from '@/lib/vendor';

const PLANS: { value: LicensePlan; label: string }[] = [
  { value: 'forever', label: 'Forever' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function LicenseScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [name, setName] = useState('');
  const [installId, setInstallId] = useState('');
  const [plan, setPlan] = useState<LicensePlan>('forever');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [lastCode, setLastCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <ScreenGate permission="license.manage">
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.heading, { color: colors.text }]}>Activate a company</Text>
          <Text style={[styles.hint, { color: colors.muted }]}>
            Paste their Install ID from the shop PC, choose a plan, then share the activation code.
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Company / name"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TextInput
            value={installId}
            onChangeText={setInstallId}
            autoCapitalize="characters"
            placeholder="Install ID"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <View style={styles.roles}>
            {PLANS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setPlan(item.value)}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.border,
                    backgroundColor: plan === item.value ? colors.tint : colors.card,
                  },
                ]}>
                <Text style={{ color: plan === item.value ? '#fff' : colors.text, fontWeight: '700' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Customer phone (optional)"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          {error ? <Text style={{ color: colors.danger, fontWeight: '600' }}>{error}</Text> : null}
          {okMsg ? <Text style={{ color: colors.tint, fontWeight: '600' }}>{okMsg}</Text> : null}
          <PrimaryButton
            label={busy ? 'Activating…' : 'Activate Pro'}
            color={colors.tint}
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setError(null);
              setOkMsg(null);
              setLastCode('');
              try {
                const row = await createLicense({
                  name,
                  installId,
                  plan,
                  notes: notes || null,
                  phone: phone || null,
                });
                setLastCode(row.activationCode);
                setOkMsg(`Activated ${row.plan} for ${row.name}. Share the code.`);
                setName('');
                setInstallId('');
                setNotes('');
                setPhone('');
                setPlan('forever');
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't activate.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>

        {lastCode ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.tint }]}>
            <Text style={[styles.heading, { color: colors.text }]}>Activation code</Text>
            <Text style={[styles.hint, { color: colors.muted }]}>
              Customer pastes this on their Activate Pro screen.
            </Text>
            <Text selectable style={[styles.code, { color: colors.text, backgroundColor: colors.tintSoft }]}>
              {lastCode}
            </Text>
            <PrimaryButton
              label="Share code"
              color={colors.tint}
              onPress={() =>
                void shareTextOrFile({
                  filename: 'activation-code.txt',
                  mime: 'text/plain',
                  contents: lastCode,
                  title: 'Activation code',
                }).catch(showShareError)
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </ScreenGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderRadius: cardRadius, padding: 16, gap: 10, ...cardShadow },
  heading: { fontSize: 18, fontWeight: '800' },
  hint: { fontSize: 13, lineHeight: 18 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  code: { fontSize: 12, lineHeight: 18, padding: 12, borderRadius: 12 },
});
