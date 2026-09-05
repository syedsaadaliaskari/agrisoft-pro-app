import { Image } from 'react-native';

export const appLogo = require('@/assets/images/icon.png');

export function AppLogo({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={appLogo}
      style={{ width: size, height: size, borderRadius: 8 }}
    />
  );
}
