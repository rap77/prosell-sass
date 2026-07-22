"use client";

import type { ReactNode } from "react";
import { useLayoutStore } from "@/lib/stores/layoutStore";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

export function MainContentWrapper({ children }: { children: ReactNode }) {
  // Zustand 5: use selectors to avoid re-renders on unrelated state changes
  const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed);
  const toggleMobileDrawer = useLayoutStore(
    (state) => state.toggleMobileDrawer,
  );

  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64",
      )}
    >
      {/* Mobile hamburger menu (top-left, z-50, 44px min) */}
      <button
        onClick={toggleMobileDrawer}
        aria-label="Open menu"
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-lg bg-background shadow-md transition-colors hover:bg-accent md:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {children}
    </div>
  );
}
