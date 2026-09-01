"use client";

/**
 * orgApi Client - HTTP client for organization endpoints
 *
 * Features:
 * - Direct calls to FastAPI backend (localhost:8000)
 * - httpOnly cookie authentication
 * - TypeScript types matching backend Pydantic DTOs
 * - Error handling with ApiError
 */

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  OrganizationSchema,
  OrganizationListResponseSchema,
  type Organization,
  type OrganizationListResponse,
} from "./schemas/orgApi";

export type {
  OrganizationStatus,
  Organization,
  OrganizationListResponse,
} from "./schemas/orgApi";

// ============================================
// TYPES (matching backend Pydantic DTOs)
// ============================================

export interface CreateOrganizationRequest {
  name: string;
  code?: string;
  color?: string;
  description?: string;
  website?: string;
  phone?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  code?: string;
  color?: string;
  description?: string;
  website?: string;
  phone?: string;
  logo_url?: string;
  banner_url?: string;
}

// ============================================
// API CLIENT CONFIGURATION
// ============================================

// Relative URL — Next.js rewrites proxy /api/:path* to the backend container.
// See apps/web/next.config.ts and PR #3 for context.
const API_BASE_URL = "";

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

const errorBodySchema = z.object({
  detail: z
    .union([z.string(), z.array(z.object({ msg: z.string() }))])
    .optional(),
  message: z.string().optional(),
});

async function handleResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!response.ok) {
    const rawError: unknown = await response
      .json()
      .catch(() => ({ detail: "Error desconocido" }));
    const errorData = errorBodySchema.safeParse(rawError).data;
    let message: string;
    if (Array.isArray(errorData?.detail)) {
      message = errorData.detail.map((e) => e.msg).join(", ");
    } else if (typeof errorData?.detail === "string") {
      message = errorData.detail;
    } else {
      message = errorData?.message || "Error en la petición";
    }

    throw new ApiError(message, response.status);
  }

  return schema.parse(await response.json());
}

// ============================================
// ORGANIZATION API CLIENT
// ============================================

export const orgApi = {
  /**
   * Create a new organization
   * POST /api/v1/org
   */
  async create(data: CreateOrganizationRequest): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse(response, OrganizationSchema);
  },

  /**
   * List all organizations (paginated)
   * GET /api/v1/org
   */
  async list(params?: {
    skip?: number;
    limit?: number;
  }): Promise<OrganizationListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined)
      searchParams.set("skip", params.skip.toString());
    if (params?.limit !== undefined)
      searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/v1/org${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    return handleResponse(response, OrganizationListResponseSchema);
  },

  /**
   * Get current user's organization
   * GET /api/v1/org/me
   */
  async getMyOrganization(): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org/me`, {
      method: "GET",
      credentials: "include",
    });

    return handleResponse(response, OrganizationSchema);
  },

  /**
   * Get organization by ID
   * GET /api/v1/org/{id}
   */
  async getById(id: string): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org/${id}`, {
      method: "GET",
      credentials: "include",
    });

    return handleResponse(response, OrganizationSchema);
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

    return handleResponse(response, OrganizationSchema);
  },

  /**
   * Verify organization (SUPER_ADMIN only)
   * POST /api/v1/org/{id}/verify
   */
  async verify(id: string): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org/${id}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    return handleResponse(response, OrganizationSchema);
  },

  /**
   * Reject organization (SUPER_ADMIN only)
   * POST /api/v1/org/{id}/reject
   */
  async reject(id: string, reason?: string): Promise<Organization> {
    const response = await fetch(`${API_BASE_URL}/api/v1/org/${id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
      credentials: "include",
    });

    return handleResponse(response, OrganizationSchema);
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
    return handleResponse(response, OrganizationSchema);
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

    return handleResponse(response, OrganizationSchema);
  },
};

// ============================================
// REACT QUERY HOOKS
// ============================================

export const ORG_ME_QUERY_KEY = ["org", "me"] as const;

/**
 * Fetch the current user's organization.
 * `retry: false` mirrors the previous useEffect's single-attempt behavior —
 * a new user with no organization yet should see the wizard immediately,
 * not after several retry delays.
 */
export function useMyOrganization() {
  return useQuery({
    queryKey: ORG_ME_QUERY_KEY,
    queryFn: () => orgApi.getMyOrganization(),
    retry: false,
  });
}
