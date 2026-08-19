import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Tone = 'info' | 'ok' | 'warn' | 'error';

type Props = {
  title: string;
  detail?: string;
  tone?: Tone;
  loading?: boolean;
};

export function StatusBanner({ title, detail, tone = 'info', loading }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const background =
    tone === 'ok'
      ? scheme === 'dark'
        ? '#1A3324'
        : '#E7F5EC'
      : tone === 'error'
        ? scheme === 'dark'
          ? '#3A1C1A'
          : '#FCEBEA'
        : tone === 'warn'
          ? scheme === 'dark'
            ? '#3A2A12'
            : '#FFF4E5'
          : colors.card;
  const icon =
    tone === 'ok' ? 'checkmark-circle' : tone === 'error' ? 'alert-circle' : tone === 'warn' ? 'warning' : 'information-circle';

  return (
    <View style={[styles.wrap, { backgroundColor: background }]}>
      {loading ? (
        <ActivityIndicator color={colors.tint} />
      ) : (
        <Ionicons name={icon} size={22} color={tone === 'error' ? colors.danger : colors.tint} />
      )}
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {detail ? <Text style={[styles.detail, { color: colors.muted }]}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  detail: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
});
