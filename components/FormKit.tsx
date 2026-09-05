import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius } from '@/constants/layout';
import { font, moneyText, radius, typeScale } from '@/constants/theme';

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  editable = true,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  editable?: boolean;
  error?: string;
  hint?: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline ? { minHeight: 88, paddingVertical: 12 } : null,
          {
            color: colors.text,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.background,
            opacity: editable ? 1 : 0.5,
          },
        ]}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {hint && !error ? <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text> : null}
    </View>
  );
}

export function Chips<T extends string>({
  value,
  onChange,
  options,
  pad,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  pad?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const columns = options.length === 4 ? 2 : options.length === 3 ? 3 : undefined;
  return (
    <View style={[styles.chips, pad && columns ? { gap: 8 } : null]}>
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              pad ? styles.pad : styles.chip,
              columns ? { flexBasis: columns === 2 ? '47%' : '30%', flexGrow: 1 } : null,
              {
                borderColor: on ? colors.tint : colors.border,
                backgroundColor: on ? colors.tintSoft : pad ? colors.background : colors.soft,
              },
            ]}>
            <Text
              style={{
                color: on ? colors.tint : colors.text,
                fontWeight: '600',
                fontSize: pad ? typeScale.section : typeScale.body,
                fontFamily: font.fontFamily,
              }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children, title }: { children: ReactNode; title?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function PickRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: string;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <Pressable onPress={onPress} style={[styles.pick, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.pickValue, { color: colors.text }]}>{selected || 'Choose…'}</Text>
    </Pressable>
  );
}

export function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={styles.total}>
      <Text style={{ color: strong ? colors.text : colors.muted, fontWeight: strong ? '600' : '500', fontSize: strong ? typeScale.section : typeScale.body }}>
        {label}
      </Text>
      <Text
        style={[
          moneyText,
          { color: colors.text, fontWeight: strong ? '700' : '600', fontSize: strong ? typeScale.section : typeScale.body },
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...font, fontSize: typeScale.label, fontWeight: '500' },
  input: {
    ...font,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: typeScale.body,
  },
  error: { ...font, fontSize: typeScale.label },
  hint: { ...font, fontSize: typeScale.overline },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg, borderWidth: 1 },
  pad: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: { borderRadius: cardRadius, padding: 16, gap: 10, borderWidth: 1 },
  title: { ...font, fontSize: typeScale.section, fontWeight: '600' },
  pick: { minHeight: 52, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 12, justifyContent: 'center' },
  pickValue: { ...font, fontSize: typeScale.section, fontWeight: '600' },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
});
