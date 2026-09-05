import { tokens } from '@/constants/theme';

const light = {
  text: tokens.text,
  muted: tokens.textMuted,
  background: tokens.bg,
  card: tokens.bgElevated,
  soft: tokens.bgSoft,
  border: tokens.border,
  borderStrong: tokens.borderStrong,
  tint: tokens.accent,
  tintHover: tokens.accentHover,
  tintSoft: tokens.accentSoft,
  logoInk: tokens.logoInk,
  tabIconDefault: tokens.textMuted,
  tabIconSelected: tokens.accent,
  success: tokens.success,
  danger: tokens.danger,
  info: tokens.info,
  warning: tokens.due,
  header: tokens.bgElevated,
};

export default {
  light,
  /** Light theme only — same tokens. Do not invent a dark palette. */
  dark: light,
};
