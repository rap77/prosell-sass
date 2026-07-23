"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";

export function LandingNav() {
  const t = useTranslations("landing.nav");

  return (
    <header className="sticky top-0 z-50 min-h-[72px] md:h-[72px] flex items-center bg-ps-nav-bg backdrop-blur-[20px] border-b border-ps-border-subtle">
      <div className="flex items-center gap-3 md:gap-10 w-full max-w-[1280px] mx-auto px-4 md:px-8 py-3 md:py-0">
        <Link
          href="/"
          className="flex items-center gap-2 md:gap-2.5 no-underline shrink-0"
        >
          <Image
            src="/logo-mark.png"
            alt="ProSell"
            width={271}
            height={294}
            className="h-[28px] md:h-[34px] w-auto shrink-0"
          />
          <span className="text-[15px] md:text-[17px] font-bold tracking-[-0.02em] text-ps-text-primary">
            ProSell
          </span>
        </Link>

        {/* Nav links - hidden on mobile */}
        <nav className="hidden md:flex ps-nav-links gap-8 flex-1 justify-center">
          <a href="#producto" className="ps-nav-link">
            {t("features")}
          </a>
          <a href="#precios" className="ps-nav-link">
            {t("pricing")}
          </a>
          <a href="#testimonios" className="ps-nav-link">
            {t("testimonials")}
          </a>
          <a href="#faq" className="ps-nav-link">
            {t("faq")}
          </a>
        </nav>

        {/* Spacer for mobile */}
        <div className="flex-1 md:hidden" />

        {/* Actions - mobile: 2 rows (buttons → selectors), desktop: 1 row, all right-aligned */}
        <div className="flex flex-wrap gap-1.5 md:gap-2.5 items-center justify-end">
          {/* Row 1 mobile: Main CTAs (order-1) */}
          <Link
            href="/auth/login"
            className="order-1 hidden sm:block ps-btn-ghost py-[9px] px-3 md:px-4 text-[13px]"
          >
            {t("login")}
          </Link>
          <Link
            href="/auth/register"
            className="order-1 ps-btn-primary py-2 sm:py-[9px] px-2.5 sm:px-3 md:px-4 text-[12px] sm:text-[13px] whitespace-nowrap"
          >
            {t("getStarted")}
          </Link>

          {/* Row 2 mobile: Secondary controls (order-2, full width) */}
          <div className="order-2 w-full sm:w-auto flex gap-1.5 justify-end">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
