import { Image, type ImageStyle, type StyleProp } from 'react-native';

export const appLogo = require('@/assets/images/brand-logo.png');

export function AppLogo({
  size = 40,
  variant = 'mark',
  style,
}: {
  size?: number;
  variant?: 'mark' | 'lockup';
  style?: StyleProp<ImageStyle>;
}) {
  const width = variant === 'lockup' ? size : size;
  const height = variant === 'lockup' ? Math.round(size * 1.05) : size;
  return (
    <Image
      source={appLogo}
      resizeMode="contain"
      accessibilityLabel="Agri Soft Pro"
      style={[{ width, height, borderRadius: variant === 'mark' ? 8 : 0 }, style]}
    />
  );
}
