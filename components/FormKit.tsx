import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  editable?: boolean;
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
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, opacity: editable ? 1 : 0.7 },
        ]}
      />
    </View>
  );
}

export function Chips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={styles.chips}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[
            styles.chip,
            {
              borderColor: colors.border,
              backgroundColor: value === opt.value ? colors.tint : colors.card,
            },
          ]}>
          <Text style={{ color: value === opt.value ? '#fff' : colors.text, fontWeight: '700' }}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Card({ children, title }: { children: ReactNode; title?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={[styles.card, cardShadow, { backgroundColor: colors.card }]}>
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
    <Pressable onPress={onPress} style={[styles.pick, { borderColor: colors.border }]}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{selected || 'Choose…'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  card: { borderRadius: cardRadius, padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: '800' },
  pick: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center' },
});
