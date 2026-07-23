"use client"; // Required for usePathname hook

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/lib/stores/layoutStore";
import { LayoutGrid, PlusCircle, Users, Menu } from "lucide-react";

/**
 * Mobile bottom navigation component following Thumb Zone pattern.
 *
 * Features:
 * - 4 critical icons: Catálogo, Publicar, Leads, Más
 * - Fixed position at bottom with 44x44px touch targets (Fitts's Law)
 * - Hidden on desktop (md:hidden)
 * - Active route highlighting
 * - Más opens drawer (placeholder for later implementation)
 *
 * Thumb Zone: Money-generating actions one thumb away for mobile users.
 */
export function MobileNav() {
  const pathname = usePathname();
  const toggleMobileDrawer = useLayoutStore(
    (state) => state.toggleMobileDrawer,
  );

  const navItems = [
    {
      label: "Catálogo",
      href: "/catalog",
      icon: LayoutGrid,
      active: pathname === "/catalog" || pathname.startsWith("/catalog/"),
    },
    {
      label: "Publicar",
      href: "/publish",
      icon: PlusCircle,
      active: pathname === "/publish" || pathname.startsWith("/publish/"),
    },
    {
      label: "Leads",
      href: "/leads",
      icon: Users,
      active: pathname === "/leads" || pathname.startsWith("/leads/"),
    },
    {
      label: "Más",
      href: "#",
      icon: Menu,
      active: false,
      isDrawerToggle: true,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden pb-safe">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isDrawerToggle =
            "isDrawerToggle" in item && item.isDrawerToggle;

          if (isDrawerToggle) {
            return (
              <button
                key={item.label}
                onClick={toggleMobileDrawer}
                className="flex flex-1 flex-col items-center justify-center gap-0.5"
              >
                <div
                  className={cn(
                    "h-11 w-11 rounded-full transition-colors inline-flex items-center justify-center",
                    "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5"
            >
              <div
                className={cn(
                  "h-11 w-11 rounded-full transition-colors inline-flex items-center justify-center",
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  item.active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
