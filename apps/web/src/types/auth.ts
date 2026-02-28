/**
 * Auth Types - Re-exports from domain layer
 *
 * DEPRECATED: Import from @/domain/auth/types instead
 * This file exists for backward compatibility during migration
 *
 * @deprecated Use domain types directly
 */

// Import types first for use in interfaces
import type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  AuthError,
  TwoFactorSetup,
  PasswordResetRequest,
  PasswordReset,
  EmailVerification,
  TwoFactorVerification,
} from "@/domain/auth/types";

// Re-export for convenience
export type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  AuthError,
  TwoFactorSetup,
  PasswordResetRequest,
  PasswordReset,
  EmailVerification,
  TwoFactorVerification,
};

// Legacy types - maintained for backward compatibility
// NOTE: These are deprecated. Migrate consumers to use domain types directly.
// See docs/technical-debt/auth-types-migration.md for migration guide

/**
 * Authentication state interface
 *
 * @deprecated This will be replaced by store-specific state interface
 */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshTokenValue: string | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  is2faEnabled: boolean;
  isLoading: boolean;
  error: string | { message: string } | null;
}
