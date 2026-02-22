/**
 * Feature Flag Store - Zustand store for runtime feature flags
 *
 * Enables runtime toggling of optimizations without deployment.
 * Persists to localStorage with in-memory fallback.
 *
 * Usage:
 * ```ts
 * import { useFeatureFlagStore } from '@/stores';
 *
 * const enabled = useFeatureFlagStore((s) => s.get('auth-init-fix', true));
 * ```
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export interface FeatureFlagState {
  flags: Record<string, boolean>;
  get: (flag: string, defaultValue?: boolean) => boolean;
  set: (flag: string, value: boolean) => void;
  reset: () => void;
}

// ============================================
// DEFAULT FLAGS
// ============================================

/**
 * Default feature flags for Phase 1, 2, and 3 optimizations
 *
 * All enabled by default. Can be disabled via admin panel
 * if issues arise in production.
 */
export const DEFAULT_FLAGS: Record<string, boolean> = {
  'auth-init-fix': true,        // F1-001: Prevent duplicate initializeAuth calls
  'oauth-preload': true,        // F1-001: Preload OAuth providers on hover
  'svg-wrapper': true,          // F1-001: Use AnimatedSvgWrapper for SVGs
  'content-visibility': true,   // F3: Use content-visibility for long lists
};

// ============================================
// STORAGE WITH FALLBACK
// ============================================

/**
 * Custom storage that falls back to memory if localStorage unavailable
 * (e.g., private browsing, storage disabled, quota exceeded)
 */
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch {
      // localStorage unavailable, return null (uses in-memory state)
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // localStorage unavailable, silently ignore (in-memory state still works)
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch {
      // localStorage unavailable, silently ignore
    }
  },
};

// ============================================
// STORE
// ============================================

export const useFeatureFlagStore = create<FeatureFlagState>()(
  persist(
    (set, get) => ({
      // Initial state with default flags
      flags: DEFAULT_FLAGS,

      /**
       * Get flag value with optional default
       * @param flag - Flag name
       * @param defaultValue - Default value if flag doesn't exist (default: false)
       * @returns Flag value or default
       */
      get: (flag: string, defaultValue = false) => {
        return get().flags[flag] ?? defaultValue;
      },

      /**
       * Set flag value and persist to storage
       * @param flag - Flag name
       * @param value - New flag value
       */
      set: (flag: string, value: boolean) => {
        set((state) => ({
          flags: { ...state.flags, [flag]: value },
        }));
      },

      /**
       * Reset all flags to defaults
       */
      reset: () => {
        set({ flags: DEFAULT_FLAGS });
      },
    }),
    {
      name: 'feature-flags',
      storage: createJSONStorage(() => safeStorage as Storage),
      // Only persist flags, not methods
      partialize: (state) => ({ flags: state.flags }),
    }
  )
);
