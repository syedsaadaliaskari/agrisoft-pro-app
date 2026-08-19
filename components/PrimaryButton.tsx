import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

type Props = PressableProps & {
  label: string;
  tone?: 'primary' | 'ghost';
  color: string;
  textColor?: string;
};

export function PrimaryButton({ label, tone = 'primary', color, textColor, disabled, style, ...rest }: Props) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        tone === 'primary' ? { backgroundColor: color } : { backgroundColor: 'transparent', borderWidth: 1, borderColor: color },
        { opacity: disabled ? 0.45 : pressed ? 0.82 : 1 },
        style,
      ]}
      {...rest}>
      <Text style={[styles.label, { color: tone === 'primary' ? textColor ?? '#fff' : color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
