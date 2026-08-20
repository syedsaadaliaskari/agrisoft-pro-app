import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type ActionItem = {
  label: string;
  onPress: () => void;
  danger?: boolean;
  hidden?: boolean;
};

export function ActionBar({ actions }: { actions: ActionItem[] }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;
  return (
    <View style={styles.wrap}>
      {visible.map((action) => (
        <Pressable
          key={action.label}
          onPress={action.onPress}
          style={[
            styles.btn,
            { borderColor: action.danger ? colors.danger : colors.border, backgroundColor: colors.card },
          ]}>
          <Text style={{ color: action.danger ? colors.danger : colors.tint, fontWeight: '800', fontSize: 13 }}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
