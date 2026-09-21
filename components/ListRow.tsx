import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cardRadius, cardShadow } from '@/constants/layout';
import { font, typeScale } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  status?: string;
  statusTone?: 'due' | 'ok';
  onPress?: () => void;
  children?: ReactNode;
};

export function ListRow({ title, subtitle, status, statusTone, onPress, children }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const heading = (
    <>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      {status ? (
        <Text
          style={[
            styles.status,
            { color: statusTone === 'due' ? colors.warning : statusTone === 'ok' ? colors.success : colors.muted },
          ]}>
          {status}
        </Text>
      ) : null}
    </>
  );

  return (
    <View style={[styles.row, cardShadow, { backgroundColor: colors.card }]}>
      {onPress ? (
        <Pressable onPress={onPress} style={styles.head}>
          {heading}
        </Pressable>
      ) : (
        <View style={styles.head}>{heading}</View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: cardRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    minHeight: 64,
    justifyContent: 'center',
  },
  head: { gap: 4 },
  title: { ...font, fontSize: typeScale.section, fontWeight: '600' },
  subtitle: { ...font, fontSize: typeScale.body },
  status: { ...font, fontSize: typeScale.label, fontWeight: '700' },
});
