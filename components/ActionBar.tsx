import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { font, radius, tokens, typeScale } from '@/constants/theme';

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
            action.danger
              ? { borderColor: tokens.dangerBorder, backgroundColor: tokens.dangerFill }
              : { borderColor: colors.border, backgroundColor: colors.soft },
          ]}>
          <Text style={{ color: action.danger ? colors.danger : colors.tint, fontWeight: '600', fontSize: typeScale.label, fontFamily: font.fontFamily }}>
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
