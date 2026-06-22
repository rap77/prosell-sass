/**
 * authStore - Zustand store for authentication
 *
 * Manages authentication state using authApi for API calls.
 * Uses localStorage for client-side persistence with versioning support.
 *
 * SECURITY:
 * - Tokens stored in httpOnly cookies (backend)
 * - localStorage only stores non-sensitive user data
 * - Middleware protects authenticated routes
 *
 * Implementation:
 * - API route /api/auth/state provides server-side auth state
 * - Client components use this store with proper hydration handling
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import { authApi, ApiError } from "@/lib/api/authApi";
import { deriveRoleFromCookieData } from "@/lib/auth/deriveRole";
import { logger } from "@/lib/logger";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================
// PERFORMANCE API HELPERS
// ============================================

/**
 * Feature detection wrapper for Performance.mark()
 * Silently skips if Performance API is unavailable
 */
const markPerformance = (name: string) => {
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(name);
  }
};

/**
 * Feature detection wrapper for Performance.measure()
 * Measures duration between two marks and logs in dev mode
 */
const measurePerformance = (
  name: string,
  startMark: string,
  endMark: string,
) => {
  if (typeof performance !== "undefined" && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);

      if (process.env.NODE_ENV === "development") {
        const measures = performance.getEntriesByName(name);
        const measure = measures[0];
        if (measure) {
          logger.info(`${name} took ${measure.duration.toFixed(2)}ms`);
        }
      }
    } catch (error) {
      // Ignore errors from performance.measure (e.g., duplicate marks)
      logger.info("Performance measure failed", error);
    }
  }
};

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_email_verified?: boolean;
  is_2fa_enabled?: boolean;
  organization_id?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

// ============================================
// SHAPE ADAPTER
// ============================================
//
// Backend responses (LoginUserResponse.user, /auth/state) may use either:
//   - New shape: { full_name, roles: string[] }
//   - Legacy shape: { first_name, last_name, role: string }
//
// The authStore User type requires the legacy shape. This adapter handles
// BOTH and applies sensible fallbacks so the header, profile page, and
// settings page don't show "??" / "Seller" / empty fields right after a
// fresh login.

/**
 * Map an API user payload (either shape) to the authStore User shape.
 *
 * - Splits `full_name` into `first_name` and `last_name` when needed.
 * - Takes `roles[0]` as `role` when roles is an array; falls back to
 *   `role` field if present; defaults to "Seller".
 * - Defaults `is_email_verified` to true and `is_2fa_enabled` to false
 *   when the backend doesn't send them.
 * - Maps `tenant_id` → `organization_id`.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mapApiUserToStoreUser(apiUser: unknown): User {
  const u = isRecord(apiUser) ? apiUser : {};

  // Derive first/last name from either full_name OR first_name+last_name
  let firstName = "";
  let lastName = "";
  if (typeof u.full_name === "string" && u.full_name.trim()) {
    const parts = u.full_name.trim().split(/\s+/);
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ");
  } else {
    firstName = typeof u.first_name === "string" ? u.first_name : "";
    lastName = typeof u.last_name === "string" ? u.last_name : "";
  }

  // Fallback for first name when nothing was derived
  if (!firstName && typeof u.email === "string") {
    firstName = u.email.split("@")[0] ?? "User";
  }
  if (!firstName) {
    firstName = "User";
  }

  // Derive role from either roles[0] or role field, defaulting to "Seller"
  const role = deriveRoleFromCookieData(u) ?? "Seller";

  return {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    first_name: firstName,
    last_name: lastName,
    role,
    is_email_verified:
      typeof u.is_email_verified === "boolean" ? u.is_email_verified : true,
    is_2fa_enabled:
      typeof u.is_2fa_enabled === "boolean" ? u.is_2fa_enabled : false,
    organization_id:
      (typeof u.tenant_id === "string" ? u.tenant_id : undefined) ??
      (typeof u.organization_id === "string" ? u.organization_id : undefined) ??
      null,
  };
}

/**
 * Shape of zustand's `persist` localStorage payload across every schema
 * version this store has ever shipped — used only by `migrate()` below to
 * validate untrusted localStorage content before reading it (it can be
 * corrupted, stale, or hand-edited in devtools). Every field optional/
 * nullable on purpose: older versions persisted a subset of these fields.
 */
const persistedAuthStateSchema = z.object({
  user: z
    .object({
      id: z.string(),
      email: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      role: z.string(),
      is_email_verified: z.boolean(),
      is_2fa_enabled: z.boolean(),
    })
    .partial()
    .nullable()
    .optional(),
  isAuthenticated: z.boolean().optional(),
});

type PersistedAuthState = z.infer<typeof persistedAuthStateSchema>;

/** Validate untrusted localStorage content before a migration branch reads it. */
function parsePersistedAuthState(persistedState: unknown): PersistedAuthState {
  const result = persistedAuthStateSchema.safeParse(persistedState);
  return result.success ? result.data : {};
}

/** Reject an incomplete persisted user rather than smuggling a Partial<User>
 * past the User | null contract — defaults `role` the same way
 * mapApiUserToStoreUser does for a freshly-fetched user missing it. */
function toMigratedUser(user: PersistedAuthState["user"]): User | null {
  if (!user || typeof user.id !== "string" || typeof user.email !== "string") {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    role: user.role ?? "Seller",
    is_email_verified: user.is_email_verified,
    is_2fa_enabled: user.is_2fa_enabled,
  };
}

// ============================================
// STORE INTERFACE
// ============================================

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  initialized: boolean; // Track if auth state has been initialized from server

  // Actions
  initializeAuth: () => Promise<void>; // Initialize auth state from server
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => Promise<void>;
}

// ============================================
// STORE
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state - hydrated from server on client mount
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start with loading state
      error: null,
      initialized: false, // Track if auth has been initialized

      // Initialize auth state from server
      initializeAuth: async () => {
        // Early exit if already initialized (when feature flag enabled)
        const { initialized } = get();
        const useOptimization = useFeatureFlagStore
          .getState()
          .get("auth-init-fix", true);

        if (useOptimization && initialized) {
          logger.info("Auth already initialized, skipping API call");
          set({ isLoading: false });
          return;
        }

        markPerformance("auth-init-start");

        try {
          // Use relative URL so Next.js rewrites proxy to the backend.
          // Hardcoded absolute URLs (NEXT_PUBLIC_API_URL) break in deployed
          // environments where the browser can't reach the host's localhost.
          // See next.config.ts rewrites() for the proxy configuration.
          const response = await fetch("/api/v1/auth/state", {
            credentials: "include", // CRITICAL: Sends httpOnly cookies
          });
          const authState = await response.json();

          // Early exit if not authenticated
          if (!authState.isAuthenticated || !authState.user) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              initialized: true, // Mark as initialized to prevent retry loop
              error: null,
            });
            return;
          }

          // Authenticated - set user state
          set({
            user: mapApiUserToStoreUser(authState.user),
            isAuthenticated: true,
            isLoading: false,
            initialized: true, // Successfully initialized
            error: null,
          });
        } catch (error) {
          logger.error("Failed to initialize auth state", error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: true, // Prevent infinite retry loop
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to check authentication status",
            },
          });
        } finally {
          markPerformance("auth-init-end");
          measurePerformance(
            "auth-init-duration",
            "auth-init-start",
            "auth-init-end",
          );
        }
      },

      login: async (credentials: LoginCredentials) => {
        // Validate email format
        if (!EMAIL_REGEX.test(credentials.email)) {
          set({
            isLoading: false,
            error: { message: "Invalid email format" },
          });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await authApi.login(
            credentials.email,
            credentials.password,
          );

          // Update state - tokens are handled by httpOnly cookies
          set({
            user: mapApiUserToStoreUser(response.user),
            isAuthenticated: true,
            isLoading: false,
            initialized: false,
            error: null,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Login failed";

          set({
            isLoading: false,
            error: { message },
          });
        }
      },

      register: async (data: RegisterData) => {
        // Validate email format
        const isEmailValid = EMAIL_REGEX.test(data.email);

        if (!isEmailValid) {
          set({
            isLoading: false,
            error: {
              message: "Invalid email format",
            },
          });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          await authApi.register(
            data.email,
            data.password,
            data.first_name,
            data.last_name,
          );

          // Registration does NOT authenticate the user — email verification required
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: false, // Not initialized — user must verify email then login
            error: null,
          });

          // Navigation to /auth/verify-email is handled by the RegisterForm component
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Registration failed";

          set({
            isLoading: false,
            error: { message },
          });
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true, initialized: false }); // Reset initialized flag on logout

          await authApi.logout();

          // Clear state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: false, // Confirm reset
            error: null,
          });

          // Delete auth cookies via the Next.js route (same-origin —
          // see initializeAuth() above for why this must stay relative).
          try {
            await fetch("/api/auth/state", {
              method: "DELETE",
              credentials: "include",
            });
          } catch (deleteError) {
            logger.error("Failed to delete auth cookies", deleteError);
          }
        } catch (unknownError) {
          // Logout locally even if API fails
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: false, // Confirm reset on error
            error: null,
          });

          // Try to delete cookies via API
          try {
            await fetch("/api/auth/state", {
              method: "DELETE",
              credentials: "include",
            });
          } catch (deleteError) {
            logger.error("Failed to delete auth cookies", deleteError);
          }
        }
      },

      updateUser: (updates: Partial<User>) => {
        const { user } = get();

        // Early exit if no user
        if (!user) {
          return;
        }

        const updatedUser = { ...user, ...updates };

        // Update state
        set({
          user: updatedUser,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      reset: async () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          initialized: false,
          error: null,
        });

        // Delete httpOnly cookies via the Next.js route (handled locally,
        // not proxied to the backend) — awaited so callers can sequence
        // navigation after this.
        try {
          await fetch("/api/auth/state", {
            method: "DELETE",
            credentials: "include",
          });
        } catch (error) {
          logger.error("Failed to delete auth cookies during reset", error);
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive user data (NO tokens - handled by httpOnly cookies)
      // Vercel best practice: Minimize serialization - only store essential fields
      partialize: (state) => ({
        user: state.user
          ? {
              id: state.user.id,
              email: state.user.email,
              first_name: state.user.first_name,
              last_name: state.user.last_name,
              is_email_verified: state.user.is_email_verified,
              is_2fa_enabled: state.user.is_2fa_enabled,
            }
          : null,
        isAuthenticated: state.isAuthenticated,
        // `initialized` is intentionally NOT persisted — must always verify with
        // the server on mount to detect expired cookies and stale localStorage state.
      }),
      version: 4,
      migrate: (persistedState: unknown, version: number) => {
        // Handle localStorage schema migrations
        // When changing the store structure, increment version and add migration logic

        // Versions 0 -> 1 -> 2 -> 3 -> 4 (current) all persisted the same
        // {user, isAuthenticated} shape (only the set of `user` fields
        // narrowed over time) — one validated read covers every branch.
        // Version 0->1: initial version with proper typing.
        // Version 1->2: removed tokens from localStorage (security fix).
        // Version 2->3: final cleanup (ensure no token fields exist).
        // Version 3->4 / current: optimized user serialization (essential fields only).
        if (version <= 4) {
          const oldState = parsePersistedAuthState(persistedState);
          return {
            user: toMigratedUser(oldState.user),
            isAuthenticated: oldState.isAuthenticated ?? false,
            isLoading: false,
            error: null,
          };
        }

        return {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        };
      },
    },
  ),
);
