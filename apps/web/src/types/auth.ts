/**
 * Authentication types
 * Defines all types related to authentication state and operations
 */

/**
 * User interface representing authenticated user
 */
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_email_verified: boolean;
  is_2fa_enabled: boolean;
}

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshTokenValue: string | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  is2faEnabled: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

/**
 * Authentication error type
 */
export type AuthError = string | { message: string };


/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data interface
 */
export interface RegisterData {
  email: string;
  password: string;
  fullName?: string;
  first_name?: string;
  last_name?: string;
  confirmPassword?: string;
  acceptedTerms?: boolean;
}

/**
 * Authentication tokens interface
 */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}
