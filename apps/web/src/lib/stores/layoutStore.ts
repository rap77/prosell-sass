import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Layout store for managing UI state across the application.
 *
 * This store manages client-side layout preferences that persist across sessions:
 * - Sidebar collapse state
 *
 * IMPORTANT: Auth tokens are NOT stored here (SC-01 anti-pattern).
 * Tokens use httpOnly cookies via AuthProvider for security.
 */
interface LayoutState {
  /** Whether the sidebar is collapsed (narrow) or expanded */
  sidebarCollapsed: boolean

  /** Toggle sidebar between collapsed and expanded states */
  toggleSidebar: () => void

  /** Set sidebar to a specific state */
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'prosell-layout',
      // Only persist sidebarCollapsed, not sensitive data
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
)
