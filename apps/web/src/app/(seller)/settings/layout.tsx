"use client";

/**
 * SettingsLayout — ProSell settings shell.
 * Tab nav (Perfil / Notificaciones / Seguridad) + content card.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground leading-tight">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestioná tu perfil, preferencias y seguridad desde un solo lugar.
        </p>
      </div>

      {/* Tab bar */}
      <div className="inline-flex self-start gap-0.5 p-1 bg-ps-elevated border border-ps-border-subtle rounded-[10px]">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center px-[18px] py-[7px] rounded-lg text-[13px] no-underline whitespace-nowrap transition-all",
                isActive
                  ? "font-semibold bg-card text-foreground shadow-sm"
                  : "font-medium bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Content card */}
      <div className="bg-card border border-border rounded-xl px-8 py-7">
        {children}
      </div>
    </div>
  );
}
