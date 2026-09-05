import { Platform, type TextStyle } from 'react-native';

/** Shared light-theme tokens. Source: DESIGN.md. Do not invent colors. */
export const tokens = {
  bg: '#f3f5f8',
  bgElevated: '#ffffff',
  bgSoft: '#e9eef3',
  border: '#d3dae3',
  borderStrong: '#b5c0ce',
  text: '#1a2330',
  textMuted: '#5c6b7d',
  accent: '#2a8f9a',
  accentHover: '#237a83',
  accentSoft: 'rgba(42, 143, 154, 0.12)',
  success: '#2f7d55',
  successSoft: 'rgba(47, 125, 85, 0.15)',
  danger: '#c43d3d',
  dangerSoft: 'rgba(196, 61, 61, 0.15)',
  dangerFill: 'rgba(196, 61, 61, 0.1)',
  dangerBorder: 'rgba(196, 61, 61, 0.4)',
  info: '#3a79b8',
  logoInk: '#f4fbfc',
  due: '#d97706',
  dueSoft: 'rgba(217, 119, 6, 0.15)',
  atmosphere1: 'rgba(42, 143, 154, 0.09)',
  atmosphere2: 'rgba(58, 121, 184, 0.06)',
} as const;

export const space = {
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  page: 24,
  card: 16,
  topbar: 64,
  sidebar: 260,
} as const;

export const radius = {
  lg: 8,
  xl: 12,
  '2xl': 16,
  full: 999,
} as const;

export const typeScale = {
  overline: 11,
  label: 12,
  body: 14,
  section: 16,
  title: 18,
} as const;

export const fontFamily = Platform.select<string>({
  web: '"Segoe UI", "Segoe UI Variable", system-ui, sans-serif',
  windows: 'Segoe UI',
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const font: TextStyle = {
  fontFamily,
};

export const moneyText: TextStyle = {
  fontFamily,
  fontVariant: ['tabular-nums'],
};

export const overline: TextStyle = {
  fontFamily,
  fontSize: typeScale.overline,
  fontWeight: '500',
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color: tokens.textMuted,
};
