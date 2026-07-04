/**
 * i18n configuration for next-intl.
 * Default: English (USA market primary)
 * Secondary: Spanish (Latino market in USA)
 */

export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Labels for locale switcher UI
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
};
