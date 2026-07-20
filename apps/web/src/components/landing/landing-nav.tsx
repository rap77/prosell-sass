"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";

export function LandingNav() {
  const t = useTranslations("landing.nav");

  return (
    <header className="sticky top-0 z-50 h-[72px] flex items-center bg-ps-nav-bg backdrop-blur-[20px] border-b border-ps-border-subtle">
      <div className="flex items-center gap-10 w-full max-w-[1280px] mx-auto px-8">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Image
            src="/logo-mark.png"
            alt="ProSell"
            width={271}
            height={294}
            className="h-[34px] w-auto shrink-0"
          />
          <span className="text-[17px] font-bold tracking-[-0.02em] text-ps-text-primary">
            ProSell
          </span>
        </Link>

        <nav className="ps-nav-links flex gap-8 flex-1 justify-center">
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

        <div className="flex gap-2.5 items-center ml-auto">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href="/auth/login"
            className="ps-btn-ghost py-[9px] px-4 text-[13px]"
          >
            {t("login")}
          </Link>
          <Link
            href="/auth/register"
            className="ps-btn-primary py-[9px] px-4 text-[13px]"
          >
            {t("getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}
