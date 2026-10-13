export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = 'frigo_theme';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}
