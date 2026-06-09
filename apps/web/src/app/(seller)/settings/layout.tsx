"use client";

/**
 * SettingsLayout — ProSell settings shell.
 *
 * Tab nav (Perfil / Notificaciones / Seguridad) + content card.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings/profile", label: "Perfil" },
  { href: "/settings/notifications", label: "Notificaciones" },
  { href: "/settings/security", label: "Seguridad" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--ps-text-primary)",
            lineHeight: 1.2,
          }}
        >
          Configuración
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "var(--ps-text-secondary)",
          }}
        >
          Gestioná tu perfil, preferencias y seguridad desde un solo lugar.
        </p>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          gap: 2,
          padding: 4,
          background: "var(--ps-bg-elevated)",
          border: "1px solid var(--ps-border-subtle)",
          borderRadius: 10,
        }}
      >
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "7px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                textDecoration: "none",
                background: isActive ? "var(--ps-bg-surface)" : "transparent",
                color: isActive
                  ? "var(--ps-text-primary)"
                  : "var(--ps-text-secondary)",
                boxShadow: isActive ? "0 1px 4px rgba(6,13,36,0.3)" : "none",
                transition: "all 150ms",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Content card */}
      <div
        style={{
          background: "var(--ps-bg-surface)",
          border: "1px solid var(--ps-border-default)",
          borderRadius: 12,
          padding: "28px 32px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
