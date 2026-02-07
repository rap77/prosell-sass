/**
 * authApi Client - HTTP client for authentication endpoints
 * GREEN PHASE - Implementación para hacer pasar los tests
 */

interface LoginResponse {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_email_verified: boolean;
    is_2fa_enabled?: boolean;
    organization_id?: string | null;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
  };
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_email_verified: boolean;
  is_2fa_enabled?: boolean;
  organization_id?: string | null;
}

interface MessageResponse {
  message: string;
}

interface Enable2FAResponse {
  qr_code: string;
  backup_codes: string[];
}

// ============================================
// API CLIENT CONFIGURATION
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================
// ERROR HANDLING
// ============================================

class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }));
    throw new ApiError(errorData.detail || "Error en la petición", response.status);
  }

  return response.json() as Promise<T>;
}

// ============================================
// AUTH API CLIENT
// ============================================

export const authApi = {
  /**
   * Login with email and password
   * POST /api/auth/login
   */
  async login(
    email: string,
    password: string
  ): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    return handleResponse<LoginResponse>(response);
  },

  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(
    email: string,
    password: string,
    first_name: string,
    last_name: string
  ): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        first_name,
        last_name,
      }),
    });

    return handleResponse<LoginResponse>(response);
  },

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    return handleResponse<RefreshTokenResponse>(response);
  },

  /**
   * Logout current user
   * POST /api/auth/logout
   */
  async logout(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      await handleResponse<void>(response);
    } catch {
      // Logout should not throw even if API fails
      // The client should clear local state regardless
    }
  },

  /**
   * Get current authenticated user
   * GET /api/auth/me
   */
  async getCurrentUser(accessToken: string): Promise<UserResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return handleResponse<UserResponse>(response);
  },

  /**
   * Verify email with token
   * POST /api/auth/verify-email
   */
  async verifyEmail(token: string): Promise<MessageResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    return handleResponse<MessageResponse>(response);
  },

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  async forgotPassword(email: string): Promise<MessageResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    return handleResponse<MessageResponse>(response);
  },

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<MessageResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        new_password: newPassword,
      }),
    });

    return handleResponse<MessageResponse>(response);
  },

  /**
   * Enable 2FA for current user
   * POST /api/auth/2fa/enable
   */
  async enable2FA(accessToken: string): Promise<Enable2FAResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/2fa/enable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return handleResponse<Enable2FAResponse>(response);
  },

  /**
   * Verify 2FA code
   * POST /api/auth/2fa/verify
   */
  async verify2FA(
    code: string,
    accessToken: string
  ): Promise<MessageResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/2fa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ code }),
    });

    return handleResponse<MessageResponse>(response);
  },

  /**
   * Disable 2FA for current user
   * POST /api/auth/2fa/disable
   */
  async disable2FA(accessToken: string): Promise<MessageResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/2fa/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return handleResponse<MessageResponse>(response);
  },
};
