/**
 * useAuth - Authentication hook for managing user authentication state
 *
 * Provides a convenient interface to the authStore, wrapping authentication
 * operations and providing derived user information.
 *
 * @example
 * ```tsx
 * const { user, login, logout, isAuthenticated } = useAuth();
 *
 * if (!isAuthenticated) {
 *   return <LoginForm onLogin={login} />;
 * }
 * return <Welcome user={user} />;
 * ```
 *
 * @returns {UseAuthReturn} Authentication state and actions
 */
import { useAuthStore } from "@/stores/authStore";
import type { User, AuthError } from "@/stores/authStore";

/**
 * Return type for the useAuth hook
 *
 * Contains authentication state, actions for authentication operations,
 * and convenience getters for commonly used user properties.
 */
export interface UseAuthReturn {
  /** Current authenticated user, or null if not logged in */
  user: User | null;

  /** JWT access token for API requests */
  accessToken: string | null;

  /** Refresh token for obtaining new access tokens */
  refreshTokenValue: string | null;

  /** Whether a user is currently authenticated */
  isAuthenticated: boolean;

  /** Whether an authentication operation is in progress */
  isLoading: boolean;

  /** Current authentication error, if any */
  error: AuthError | null;

  /** Login with email and password */
  login: (email: string, password: string) => Promise<void>;

  /** Register a new user account */
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;

  /** Logout the current user */
  logout: () => Promise<void>;

  /** Refresh the access token using the refresh token */
  refreshToken: () => Promise<void>;

  /** Update user information in state */
  updateUser: (updates: Partial<User>) => void;

  /** Clear the current authentication error */
  clearError: () => void;

  /** Convenience: Current user ID */
  userId: string | null;

  /** Convenience: Current user email */
  userEmail: string | null;

  /** Convenience: Current user's full name */
  userFullName: string | null;

  /** Convenience: Current user's role */
  userRole: string | null;

  /** Convenience: Whether the user's email is verified */
  isEmailVerified: boolean;

  /** Convenience: Whether 2FA is enabled for this user */
  is2FAEnabled: boolean;
}

/**
 * useAuth hook implementation
 *
 * Wraps the authStore with a more convenient API and adds
 * computed properties for commonly used user information.
 */
export function useAuth(): UseAuthReturn {
  const {
    user,
    accessToken,
    refreshTokenValue,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    refreshToken: storeRefreshToken,
    updateUser: storeUpdateUser,
    clearError: storeClearError,
  } = useAuthStore();

  // Wrap login to accept separate parameters
  const login = async (email: string, password: string) => {
    await storeLogin({ email, password });
  };

  // Wrap register to accept separate parameters
  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    await storeRegister({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    });
  };

  // Convenience getters
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const userFullName = user ? `${user.first_name} ${user.last_name}`.trim() : null;
  const userRole = user?.role ?? null;
  const isEmailVerified = user?.is_email_verified ?? false;
  const is2FAEnabled = user?.is_2fa_enabled ?? false;

  return {
    // State
    user,
    accessToken,
    refreshTokenValue,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    register,
    logout: storeLogout,
    refreshToken: storeRefreshToken,
    updateUser: storeUpdateUser,
    clearError: storeClearError,

    // Convenience getters
    userId,
    userEmail,
    userFullName,
    userRole,
    isEmailVerified,
    is2FAEnabled,
  };
}
