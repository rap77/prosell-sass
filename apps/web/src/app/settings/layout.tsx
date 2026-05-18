"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
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
    <div className="min-h-screen bg-muted/20 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Configuración</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tu perfil, preferencias y seguridad desde un solo lugar.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border bg-background p-2">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
