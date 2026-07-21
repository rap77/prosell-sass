/**
 * authApi Client - HTTP client for authentication endpoints
 *
 * Features:
 * - LRU cache for API responses
 * - React.cache for deduplication
 * - SWR integration for data fetching
 * - Pre-compiled regular expressions
 * - Module-level function caching
 * - O(1) lookups with Map/Set
 * - Early exit patterns
 */

import {
  LoginResponseSchema,
  RegisterResponseSchema,
  UserResponseSchema,
  MessageResponseSchema,
  Enable2FAResponseSchema,
  type LoginResponse,
  type RegisterResponse,
  type UserResponse,
  type MessageResponse,
  type Enable2FAResponse,
} from "./schemas/authApi";

export type {
  LoginResponse,
  RegisterResponse,
  UserResponse,
  MessageResponse,
  Enable2FAResponse,
} from "./schemas/authApi";

// RefreshTokenResponse removed - tokens handled by httpOnly cookies
// Refresh logic is handled server-side, not client-side

// ============================================
// API CLIENT CONFIGURATION
// ============================================

// Use relative URLs so Next.js rewrites (configured in next.config.ts) proxy
// /api/:path* to the backend container. Absolute URLs (e.g. localhost:8000)
// break in deployed environments where the browser cannot reach the host's
// localhost. See PR #3 (initializeAuth) and PR #4 (rest of lib/api/*) for context.
export const API_BASE_URL = "";

// ============================================
// IMPORTS & SETUP
// ============================================

import { z } from "zod";
import { apiCache, generateCacheKey } from "../cache/lru-cache";
import { createAuthCacheKey } from "../cache/cache-utils";
import { hoistRegExp } from "@/lib/utils";

// Pre-compiled regular expressions for better performance
const EMAIL_REGEX = hoistRegExp("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
const PASSWORD_REGEX = hoistRegExp(
  "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
);

// Type union for all possible API responses
type ApiResponse =
  LoginResponse | UserResponse | MessageResponse | Enable2FAResponse;

// Module-level cache for frequent operations
const requestCache = new Map<string, ApiResponse>();
const responseCache = new Map<string, ApiResponse>();

// ============================================
// DEDUPLICATION UTILITIES
// ============================================

// React.cache for deduplication
const deduplicateRequest = (() => {
  const pendingRequests = new Map<string, Promise<ApiResponse>>();

  return (key: string, requestFn: () => Promise<ApiResponse>) => {
    // Early exit if request is already pending
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key)!;
    }

    const promise = requestFn();
    pendingRequests.set(key, promise);

    promise.finally(() => {
      pendingRequests.delete(key);
    });

    return promise;
  };
})();

// Cache for frequently accessed users
const userLookupCache = (() => {
  const cache = new Map<string, UserResponse>();

  return {
    get: (userId: string) => cache.get(userId),
    set: (userId: string, user: UserResponse) => cache.set(userId, user),
    clear: () => cache.clear(),
  };
})();

// ============================================
// ERROR HANDLING
// ============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Error desconocido" }));

    // FastAPI validation errors: detail is an array of {msg, loc, type}
    // Other errors: detail is a string, or message is a string
    let message: string;
    if (Array.isArray(errorData.detail)) {
      message = errorData.detail.map((e: { msg: string }) => e.msg).join(", ");
    } else if (typeof errorData.detail === "string") {
      message = errorData.detail;
    } else {
      message = errorData.message || "Error en la petición";
    }

    throw new ApiError(message, response.status);
  }

  return schema.parse(await response.json());
}

// ============================================
// AUTH API CLIENT
// ============================================

export const authApi = {
  /**
   * Login with email and password
   * POST /api/v1/auth/login
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Validate email format only - let server handle password validation
    if (!EMAIL_REGEX.test(email)) {
      throw new ApiError("Invalid email format", 400);
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include", // Important for cookies to be sent and received
    });

    const result = await handleResponse(response, LoginResponseSchema);

    // Mutations should NOT be cached - each call hits the API
    return result;
  },

  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  async register(
    email: string,
    password: string,
    first_name: string,
    last_name: string,
  ): Promise<RegisterResponse> {
    // Validate inputs with pre-compiled regex
    if (!EMAIL_REGEX.test(email) || !PASSWORD_REGEX.test(password)) {
      throw new ApiError("Invalid email or password format", 400);
    }

    // Trim and validate first_name and last_name (early exit if invalid)
    const trimmedFirstName = first_name.trim();
    const trimmedLastName = last_name.trim();

    if (trimmedFirstName.length < 2 || trimmedLastName.length < 2) {
      throw new ApiError(
        "First and last name must be at least 2 characters",
        400,
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        full_name: `${trimmedFirstName} ${trimmedLastName}`.trim(),
      }),
      credentials: "include",
    });

    // Mutations should NOT be cached - each call hits the API
    return handleResponse(response, RegisterResponseSchema);
  },

  /**
   * Refresh token removed - tokens handled by httpOnly cookies server-side
   * Client-side refresh is no longer needed (automatic via cookies)
   */

  /**
   * Logout current user
   * POST /api/v1/auth/logout
   */
  async logout(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for cookies to be sent and received
      });

      await handleResponse(response, z.unknown());

      // Clear cache on successful logout
      requestCache.clear();
      userLookupCache.clear();
    } catch {
      // Logout should not throw even if API fails
      // Clear cache anyway
      requestCache.clear();
      userLookupCache.clear();
      // Return undefined - logout is always successful from client perspective
    }
  },

  /**
   * Get current authenticated user
   * GET /api/v1/auth/me
   *
   * Uses httpOnly cookies for authentication (no accessToken parameter needed)
   * Cached with React.cache for deduplication
   */
  getCurrentUser: (() => {
    const cacheKeyPrefix = "user:current";

    return async (): Promise<UserResponse> => {
      const cacheKey = generateCacheKey(
        "GET",
        `${API_BASE_URL}/api/v1/auth/me`,
        {},
      );

      // Try to get from cache first
      const cached = apiCache.get(cacheKey);
      if (cached !== null) {
        return UserResponseSchema.parse(cached);
      }

      // Use deduplication for concurrent requests
      const result = await deduplicateRequest(cacheKey, async () => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          method: "GET",
          credentials: "include", // CRITICAL: Sends httpOnly cookies automatically
        });

        const result = await handleResponse(response, UserResponseSchema);

        // Cache the result
        apiCache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes
        userLookupCache.set(result.id, result);

        return result;
      });

      return UserResponseSchema.parse(result);
    };
  })(),

  /**
   * Verify email with token
   * POST /api/v1/auth/verify-email
   */
  async verifyEmail(token: string): Promise<MessageResponse> {
    // Early exit if invalid token
    if (!token || token.trim() === "") {
      throw new ApiError("Token is required", 400);
    }

    // Mutations must NOT be cached — token is consumed server-side on first use
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    return handleResponse(response, MessageResponseSchema);
  },

  /**
   * Request password reset
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(email: string): Promise<MessageResponse> {
    // Early exit if invalid email
    if (!EMAIL_REGEX.test(email)) {
      throw new ApiError("Invalid email format", 400);
    }

    // Mutations must NOT be cached — triggers email send on every call
    const response = await fetch(
      `${API_BASE_URL}/api/v1/auth/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      },
    );

    return handleResponse(response, MessageResponseSchema);
  },

  /**
   * Reset password with token
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<MessageResponse> {
    // Early exit if invalid inputs
    if (!token || token.trim() === "") {
      throw new ApiError("Token is required", 400);
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      throw new ApiError("Password does not meet requirements", 400);
    }

    // Mutations must NOT be cached — token is consumed server-side on first use
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        new_password: newPassword,
      }),
    });

    return handleResponse(response, MessageResponseSchema);
  },

  /**
   * Enable 2FA for current user
   * POST /api/v1/auth/2fa/enable
   *
   * Uses httpOnly cookies for authentication (no accessToken parameter needed)
   */
  async enable2FA(): Promise<Enable2FAResponse> {
    // Mutations must NOT be cached — generates a new QR code / TOTP secret each call
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/2fa/enable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // CRITICAL: Sends httpOnly cookies automatically
    });

    return handleResponse(response, Enable2FAResponseSchema);
  },

  /**
   * Verify 2FA code
   * POST /api/v1/auth/2fa/verify
   *
   * Uses httpOnly cookies for authentication (no accessToken parameter needed)
   */
  async verify2FA(code: string): Promise<MessageResponse> {
    // Early exit if invalid inputs
    if (!code || code.trim() === "" || code.length !== 6) {
      throw new ApiError("2FA code must be 6 digits", 400);
    }

    const cacheKey = createAuthCacheKey("2fa/verify", { code });
    const cached = requestCache.get(cacheKey);

    if (cached) {
      return MessageResponseSchema.parse(cached);
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/2fa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // CRITICAL: Sends httpOnly cookies automatically
      body: JSON.stringify({ code }),
    });

    const result = await handleResponse(response, MessageResponseSchema);

    // Clear 2FA cache after successful verification
    requestCache.delete(cacheKey);

    return result;
  },

  /**
   * Disable 2FA for current user
   * POST /api/v1/auth/2fa/disable
   *
   * Uses httpOnly cookies for authentication (no accessToken parameter needed)
   */
  async disable2FA(): Promise<MessageResponse> {
    // Mutations must NOT be cached — revokes TOTP secret server-side
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/2fa/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // CRITICAL: Sends httpOnly cookies automatically
    });

    return handleResponse(response, MessageResponseSchema);
  },

  /**
   * Batch clear cache by patterns
   */
  clearCache(patterns: string[] = []): void {
    patterns.forEach((pattern) => {
      requestCache.delete(pattern);
      apiCache.delete(pattern);
    });

    // Clear user cache on auth operations
    if (patterns.some((p) => p.includes("auth"))) {
      userLookupCache.clear();
    }
  },

  /**
   * Clear all caches
   */
  clearAllCache(): void {
    requestCache.clear();
    responseCache.clear();
    userLookupCache.clear();
  },
};
