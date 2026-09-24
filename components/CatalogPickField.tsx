import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/FormKit';
import { PrimaryButton } from '@/components/PrimaryButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, radius, typeScale } from '@/constants/theme';

type Option = { id: string; name: string };

export function CatalogPickField({
  label,
  selected,
  options,
  onSelect,
  onCreate,
  extraFields,
  canManage = true,
}: {
  label: string;
  selected: string;
  options: Option[];
  onSelect: (id: string) => void;
  onCreate: (name: string, extra?: Record<string, string>) => Promise<string | void>;
  extraFields?: { key: string; label: string; keyboardType?: 'default' | 'decimal-pad' }[];
  canManage?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [pickOpen, setPickOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const closeNew = () => {
    setNewOpen(false);
    setName('');
    setExtra({});
    setError(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
        {canManage ? (
          <Pressable
            onPress={() => {
              setError(null);
              setNewOpen(true);
            }}
            hitSlop={8}>
            <Text style={[styles.newLink, { color: colors.tint }]}>New</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={() => setPickOpen(true)}
        style={[styles.pick, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[styles.pickValue, { color: selected ? colors.text : colors.muted }]}>
          {selected || 'Choose…'}
        </Text>
      </Pressable>

      <Modal visible={pickOpen} transparent animationType="fade" onRequestClose={() => setPickOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{label}</Text>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              <Pressable
                onPress={() => {
                  onSelect('');
                  setPickOpen(false);
                }}
                style={styles.option}>
                <Text style={[styles.optionText, { color: colors.muted }]}>None</Text>
              </Pressable>
              {options.map((row) => (
                <Pressable
                  key={row.id}
                  onPress={() => {
                    onSelect(row.id);
                    setPickOpen(false);
                  }}
                  style={styles.option}>
                  <Text style={[styles.optionText, { color: colors.text }]}>{row.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {canManage ? (
              <PrimaryButton
                label={`New ${label.toLowerCase()}`}
                color={colors.tint}
                textColor={colors.logoInk}
                onPress={() => {
                  setPickOpen(false);
                  setNewOpen(true);
                }}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={newOpen} transparent animationType="fade" onRequestClose={closeNew}>
        <Pressable style={styles.backdrop} onPress={closeNew}>
          <Pressable
            onPress={() => {}}
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>New {label.toLowerCase()}</Text>
            <Field label="Name" value={name} onChangeText={setName} />
            {extraFields?.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                value={extra[field.key] ?? ''}
                onChangeText={(v) => setExtra((cur) => ({ ...cur, [field.key]: v }))}
                keyboardType={field.keyboardType}
              />
            ))}
            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save'}
              color={colors.tint}
              textColor={colors.logoInk}
              disabled={saving || !name.trim()}
              onPress={async () => {
                setSaving(true);
                setError(null);
                try {
                  const id = await onCreate(name.trim(), extra);
                  if (id) onSelect(id);
                  closeNew();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Couldn't save.");
                } finally {
                  setSaving(false);
                }
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...font, fontSize: typeScale.label, fontWeight: '500' },
  newLink: { ...font, fontSize: typeScale.body, fontWeight: '700' },
  pick: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  pickValue: { ...font, fontSize: typeScale.section, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { borderRadius: radius['2xl'], padding: 16, gap: 12, borderWidth: 1, maxHeight: '80%' },
  sheetTitle: { ...font, fontSize: typeScale.section, fontWeight: '600' },
  list: { maxHeight: 280 },
  option: { minHeight: 44, justifyContent: 'center' },
  optionText: { ...font, fontSize: typeScale.body },
  error: { ...font, fontSize: typeScale.label, fontWeight: '600' },
});
