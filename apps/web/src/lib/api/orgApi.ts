/**
 * orgApi Client - HTTP client for organization endpoints
 *
 * Features:
 * - Direct calls to FastAPI backend (localhost:8000)
 * - httpOnly cookie authentication
 * - TypeScript types matching backend Pydantic DTOs
 * - Error handling with ApiError
 */

// ============================================
// TYPES (matching backend Pydantic DTOs)
// ============================================

export type OrganizationStatus =
  | "pending_verification"
  | "active"
  | "suspended"
  | "rejected";

export interface Organization {
  id: string;
  name: string;
  tenant_id: string;
  status: OrganizationStatus;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  wallet_id: string | null;
  setup_complete: boolean;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  verified_by: string | null;
}

export interface CreateOrganizationRequest {
  name: string;
  tenant_id: string;
  description?: string;
  website?: string;
  phone?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  website?: string;
  phone?: string;
  logo_url?: string;
  banner_url?: string;
}

export interface OrganizationListResponse {
  organizations: Organization[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================
// API CLIENT CONFIGURATION
// ============================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "" : "http://localhost:3000");

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Error desconocido" }));
    throw new ApiError(
      errorData.detail || errorData.message || "Error en la petición",
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

// ============================================
// ORGANIZATION API CLIENT
// ============================================

export const orgApi = {
  /**
   * Create a new organization
   * POST /api/v1/org
   */
  async create(
    data: CreateOrganizationRequest,
  ): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse<Organization>(response);
  },

  /**
   * List all organizations (paginated)
   * GET /api/v1/org
   */
  async list(params?: {
    page?: number;
    page_size?: number;
    tenant_id?: string;
  }): Promise<OrganizationListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());
    if (params?.tenant_id) searchParams.set("tenant_id", params.tenant_id);

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/v1/org${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    return handleResponse<OrganizationListResponse>(response);
  },

  /**
   * Get current user's organization
   * GET /api/v1/org/me
   */
  async getMyOrganization(tenant_id: string): Promise<Organization> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/org/me?tenant_id=${tenant_id}`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    return handleResponse<Organization>(response);
  },

  /**
   * Get organization by ID
   * GET /api/v1/org/{id}
   */
  async getById(id: string, tenant_id: string): Promise<Organization> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/org/${id}?tenant_id=${tenant_id}`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    return handleResponse<Organization>(response);
  },

  /**
   * Update organization
   * PATCH /api/v1/org/{id}
   */
  async update(
    id: string,
    data: UpdateOrganizationRequest,
  ): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse<Organization>(response);
  },

  /**
   * Verify organization (SUPER_ADMIN only)
   * POST /api/v1/org/{id}/verify
   */
  async verify(id: string, verifier_id: string): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org/${id}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ verifier_id }),
      credentials: "include",
    });

    return handleResponse<Organization>(response);
  },

  /**
   * Reject organization (SUPER_ADMIN only)
   * POST /api/v1/org/{id}/reject
   */
  async reject(id: string, verifier_id: string, reason?: string): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org/${id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ verifier_id, reason }),
      credentials: "include",
    });

    return handleResponse<Organization>(response);
  },

  /**
   * Mark current organization onboarding as complete (or skip)
   * PATCH /api/v1/org/me/setup
   */
  async completeSetup(): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org/me/setup`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ setup_complete: true }),
    });
    return handleResponse<Organization>(response);
  },

  /**
   * Suspend organization (SUPER_ADMIN only)
   * POST /api/v1/org/{id}/suspend
   */
  async suspend(id: string): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org/${id}/suspend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    return handleResponse<Organization>(response);
  },
};
