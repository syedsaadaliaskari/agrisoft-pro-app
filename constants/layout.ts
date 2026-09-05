import { radius, space, tokens } from '@/constants/theme';

/** Cards use a 1px border, not a drop shadow (DESIGN.md). */
export const cardShadow = {
  borderWidth: 1,
  borderColor: tokens.border,
};

export const cardRadius = radius['2xl'];
export const inputRadius = radius.lg;
export const pagePadding = space.page;
export const sidebarWidth = space.sidebar;
export const topbarHeight = space.topbar;
