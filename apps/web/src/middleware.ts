import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";

export default createMiddleware({
  locales,
  defaultLocale,
  // Don't prefix default locale in URL (cleaner URLs for English)
  localePrefix: "as-needed",
  // Detect locale from Accept-Language header
  localeDetection: true,
});

export const config = {
  // Match all paths except:
  // - API routes (/api/*)
  // - Static files (_next/static/*, _next/image/*, favicon.ico, etc.)
  // - Public files (images, fonts, etc.)
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|sitemap.xml|robots.txt).*)",
  ],
};
