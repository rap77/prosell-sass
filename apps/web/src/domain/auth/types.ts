/**
 * Domain Types for Authentication
 *
 * These are the business entity types for authentication.
 * They are NOT coupled to any external API or store implementation.
 *
 * Single source of truth for auth types across the application.
 *
 * @see https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
 */

/**
 * User entity representing an authenticated user
 *
 * Domain entity that represents a user in the system.
 * Readonly properties prevent accidental mutations.
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly role: string;
  readonly is_email_verified: boolean;
  readonly is_2fa_enabled: boolean;
  readonly organization_id?: string | null;
}

/**
 * Authentication tokens (NOT stored in localStorage)
 *
 * These tokens are managed by the backend via httpOnly cookies.
 * The frontend only receives them temporarily during login/register.
 */
export interface AuthTokens {
  readonly access_token: string;
  readonly refresh_token: string;
}

/**
 * Login credentials
 *
 * Input data for login operation.
 */
export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Registration data
 *
 * Input data for user registration.
 */
export interface RegisterData {
  readonly email: string;
  readonly password: string;
  readonly first_name: string;
  readonly last_name: string;
}

/**
 * Auth error response
 */
export interface AuthError {
  readonly message: string;
  readonly code?: string;
  readonly field?: string;
}

/**
 * 2FA setup data
 */
export interface TwoFactorSetup {
  readonly secret: string;
  readonly qr_code: string;
  readonly backup_codes: readonly string[];
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  readonly email: string;
}

/**
 * Password reset with token
 */
export interface PasswordReset {
  readonly token: string;
  readonly newPassword: string;
}

/**
 * Email verification
 */
export interface EmailVerification {
  readonly token: string;
}

/**
 * 2FA verification
 */
export interface TwoFactorVerification {
  readonly code: string;
  readonly accessToken: string;
}
