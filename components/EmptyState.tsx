import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
};

export function EmptyState({ icon = 'leaf-outline', title, detail }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={36} color={colors.tint} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {detail ? <Text style={[styles.detail, { color: colors.muted }]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  detail: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
