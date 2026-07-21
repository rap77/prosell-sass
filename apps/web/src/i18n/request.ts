import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "./config";

export default getRequestConfig(async () => {
  // 1. Check cookie first (user preference)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value as
    Locale | undefined;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return {
      locale: cookieLocale,
      messages: (await import(`../../messages/${cookieLocale}.json`)).default,
    };
  }

  // 2. Check Accept-Language header
  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  if (acceptLanguage) {
    // Simple parsing: take first language that matches our locales
    const preferred = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim().split("-")[0])
      .find((lang) => locales.includes(lang as Locale)) as Locale | undefined;

    if (preferred) {
      return {
        locale: preferred,
        messages: (await import(`../../messages/${preferred}.json`)).default,
      };
    }
  }

  // 3. Default to English
  return {
    locale: defaultLocale,
    messages: (await import(`../../messages/${defaultLocale}.json`)).default,
  };
});
