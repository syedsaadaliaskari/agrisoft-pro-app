import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { radius, tokens } from '@/constants/theme';

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
      ? tokens.successSoft
      : tone === 'error'
        ? tokens.dangerSoft
        : tone === 'warn'
          ? tokens.dueSoft
          : colors.card;
  const icon =
    tone === 'ok' ? 'checkmark-circle' : tone === 'error' ? 'alert-circle' : tone === 'warn' ? 'warning' : 'information-circle';

  return (
    <View style={[styles.wrap, { backgroundColor: background, borderColor: colors.border }]}>
      {loading ? (
        <ActivityIndicator color={colors.tint} />
      ) : (
        <Ionicons name={icon} size={22} color={tone === 'error' ? colors.danger : tone === 'ok' ? colors.success : colors.tint} />
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
    borderRadius: radius['2xl'],
    borderWidth: 1,
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
