import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { font, radius, tokens, typeScale } from '@/constants/theme';

type Props = PressableProps & {
  label: string;
  tone?: 'primary' | 'ghost' | 'secondary' | 'danger';
  color: string;
  textColor?: string;
};

export function PrimaryButton({ label, tone = 'primary', color, textColor, disabled, style: _style, ...rest }: Props) {
  const hover = color === tokens.accent ? tokens.accentHover : color;
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        tone === 'primary'
          ? { backgroundColor: pressed ? hover : color }
          : tone === 'danger'
            ? {
                backgroundColor: tokens.dangerFill,
                borderWidth: 1,
                borderColor: tokens.dangerBorder,
              }
            : tone === 'secondary'
              ? { backgroundColor: tokens.bgSoft, borderWidth: 1, borderColor: pressed ? tokens.borderStrong : tokens.border }
              : { backgroundColor: pressed ? tokens.bgSoft : 'transparent', borderWidth: 1, borderColor: color },
        { opacity: disabled ? 0.5 : 1 },
      ]}
      {...rest}>
      <Text
        style={[
          styles.label,
          {
            color:
              tone === 'primary'
                ? textColor ?? tokens.logoInk
                : tone === 'danger'
                  ? tokens.danger
                  : tone === 'ghost'
                    ? tokens.textMuted
                    : tokens.text,
          },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: {
    ...font,
    fontSize: typeScale.body,
    fontWeight: '600',
  },
});
