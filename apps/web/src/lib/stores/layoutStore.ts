import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Layout store for managing UI state across the application.
 *
 * This store manages client-side layout preferences that persist across sessions:
 * - Sidebar collapse state (desktop)
 * - Mobile drawer state (mobile, NOT persisted - temporary UI state)
 *
 * IMPORTANT: Auth tokens are NOT stored here (SC-01 anti-pattern).
 * Tokens use httpOnly cookies via AuthProvider for security.
 */
interface LayoutState {
  /** Whether the sidebar is collapsed (narrow) or expanded */
  sidebarCollapsed: boolean;

  /** Toggle sidebar between collapsed and expanded states */
  toggleSidebar: () => void;

  /** Set sidebar to a specific state */
  setSidebarCollapsed: (collapsed: boolean) => void;

  /** Whether the mobile drawer is open (mobile only, NOT persisted) */
  mobileDrawerOpen: boolean;

  /** Toggle mobile drawer */
  toggleMobileDrawer: () => void;

  /** Set mobile drawer to specific state */
  setMobileDrawerOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileDrawerOpen: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleMobileDrawer: () =>
        set((state) => ({ mobileDrawerOpen: !state.mobileDrawerOpen })),

      setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
    }),
    {
      name: "prosell-layout",
      // Only persist sidebarCollapsed, NOT mobileDrawerOpen (temporary state)
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
