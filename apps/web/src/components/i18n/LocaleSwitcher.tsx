"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

/**
 * Simple locale switcher dropdown.
 * Sets cookie and refreshes page to apply new locale.
 */
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: Locale) => {
    // Set cookie for persistence
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    // Refresh to apply
    router.refresh();
  };

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value as Locale)}
      className="ps-locale-select"
      style={{
        background: "transparent",
        border: "1px solid var(--ps-border-subtle)",
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 13,
        color: "var(--ps-text-secondary)",
        cursor: "pointer",
      }}
      aria-label="Select language"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
