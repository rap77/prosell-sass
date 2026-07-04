"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";

export function LandingNav() {
  const t = useTranslations("landing.nav");

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: 72,
        display: "flex",
        alignItems: "center",
        background: "var(--ps-nav-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--ps-border-subtle)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 32px",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <Image
            src="/logo-mark.png"
            alt="ProSell"
            width={271}
            height={294}
            style={{ height: 34, width: "auto", flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ps-text-primary)",
            }}
          >
            ProSell
          </span>
        </Link>

        <nav
          className="ps-nav-links"
          style={{
            display: "flex",
            gap: 32,
            flex: 1,
            justifyContent: "center",
          }}
        >
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

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginLeft: "auto",
          }}
        >
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href="/auth/login"
            className="ps-btn-ghost"
            style={{ padding: "9px 16px", fontSize: 13 }}
          >
            {t("login")}
          </Link>
          <Link
            href="/auth/register"
            className="ps-btn-primary"
            style={{ padding: "9px 16px", fontSize: 13 }}
          >
            {t("getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}
