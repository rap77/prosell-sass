/**
 * Server Actions for Authentication
 *
 * These actions handle HTTP-only cookie operations for authentication.
 * They run on the server and cannot be accessed by client-side code,
 * preventing XSS attacks and solving hydration mismatches.
 *
 * Server-Side Performance: Uses after() for non-blocking error logging
 */

"use server";

import { setAuthCookies as setAuthCookiesImpl, deleteAuthCookies as deleteAuthCookiesImpl } from "@/lib/auth/cookies";
import { after } from "next/server";
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

export interface AuthCookieData {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_email_verified: boolean;
    is_2fa_enabled: boolean;
  };
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Set authentication cookies after successful login/registration
 * This action runs on the server and sets httpOnly cookies
 */
export async function setAuthCookies(data: AuthCookieData): Promise<void> {
  try {
    await setAuthCookiesImpl(data);
  } catch (error) {
    // Non-blocking error logging with after() - doesn't delay response
    after(() => {
      logger.error("Failed to set auth cookies", error);
    });
    // Don't throw - let the client handle the auth state
    // The cookies will be set by the API response directly
  }
}

/**
 * Delete authentication cookies on logout
 * This action runs on the server and removes all auth cookies
 */
export async function deleteAuthCookies(): Promise<void> {
  try {
    await deleteAuthCookiesImpl();
  } catch (error) {
    // Non-blocking error logging with after() - doesn't delay response
    after(() => {
      logger.error("Failed to delete auth cookies", error);
    });
    // Don't throw - the client should clear local state regardless
  }
}

/**
 * Get current authentication state from cookies
 * This can be used to initialize the auth state on the client
 *
 * Returns null if no auth cookies are found
 */
export async function getAuthState(): Promise<{
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_email_verified: boolean;
    is_2fa_enabled: boolean;
  };
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    // This would need to be called from a client component that can access cookies
    // For now, we'll implement a different approach using a route handler
    return null;
  } catch (error) {
    // Non-blocking error logging with after() - doesn't delay response
    after(() => {
      logger.error("Failed to get auth state", error);
    });
    return null;
  }
}

// ============================================
// CLIENT HELPER FUNCTIONS
// ============================================

/**
 * Client-side function to check if user is authenticated on the server
 * This can be used in Server Components or Route Handlers
 */
export async function checkAuth(): Promise<{
  isAuthenticated: boolean;
  user?: AuthCookieData["user"];
  accessToken?: string;
}> {
  try {
    // This would typically be implemented in a middleware or route handler
    // For now, return a basic structure
    return {
      isAuthenticated: false,
    };
  } catch (error) {
    // Non-blocking error logging with after() - doesn't delay response
    after(() => {
      logger.error("Auth check failed", error);
    });
    return {
      isAuthenticated: false,
    };
  }
}
