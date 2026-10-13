export const LOCALES = ['ro', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ro';
export const LOCALE_COOKIE = 'frigo_locale';

export const LOCALE_NAMES: Record<Locale, string> = {
  ro: 'Română',
  ru: 'Русский',
  en: 'English',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
