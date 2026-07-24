/**
 * teamApi Client - HTTP client for team endpoints
 *
 * Features:
 * - Direct calls to FastAPI backend (localhost:8000)
 * - httpOnly cookie authentication
 * - TypeScript types matching backend Pydantic DTOs
 * - Error handling with ApiError
 */

import type { z } from "zod";
import {
  TeamSchema,
  TeamMemberSchema,
  TeamListResponseSchema,
  type Team,
  type TeamMember,
  type TeamMemberRole,
  type TeamListResponse,
} from "./schemas/teamApi";

export type {
  TeamMemberRole,
  TeamMember,
  Team,
  TeamListResponse,
} from "./schemas/teamApi";

// ============================================
// TYPES (matching backend Pydantic DTOs)
// ============================================

export interface CreateTeamRequest {
  name: string;
  tenant_id: string;
  organization_id: string;
}

export interface UpdateTeamRequest {
  name?: string;
}

export interface AddTeamMemberRequest {
  team_id: string;
  user_id: string;
  tenant_id?: string; // Optional - backend derives from current_user
  role?: TeamMemberRole;
  commission_rate?: number | null;
}

export interface AcceptTeamInvitationRequest {
  token: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: string;
  expires_at: string;
  status: string;
  created_at: string;
  days_until_expiration: number;
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

async function handleResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Error desconocido" }));
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
// TEAM API CLIENT
// ============================================

export const teamApi = {
  /**
   * Create a new team
   * POST /api/v1/teams
   */
  async create(data: CreateTeamRequest): Promise<Team> {
    const response = await fetch(`${API_BASE_URL}/api/v1/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse(response, TeamSchema);
  },

  /**
   * List teams for an organization
   * GET /api/v1/teams/org/{org_id}
   */
  async listByOrg(
    orgId: string,
    tenantId: string,
    params?: {
      skip?: number;
      limit?: number;
    },
  ): Promise<TeamListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("tenant_id", tenantId);
    if (params?.skip !== undefined)
      searchParams.set("skip", params.skip.toString());
    if (params?.limit !== undefined)
      searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/v1/teams/org/${orgId}${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    return handleResponse(response, TeamListResponseSchema);
  },

  /**
   * Get team by ID
   * GET /api/v1/teams/{team_id}
   */
  async getById(teamId: string, tenantId: string): Promise<Team> {
    const searchParams = new URLSearchParams();
    searchParams.set("tenant_id", tenantId);

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/v1/teams/${teamId}${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    return handleResponse(response, TeamSchema);
  },

  /**
   * Update team
   * PATCH /api/v1/teams/{team_id}
   */
  async update(teamId: string, data: UpdateTeamRequest): Promise<Team> {
    const response = await fetch(`${API_BASE_URL}/api/v1/teams/${teamId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse(response, TeamSchema);
  },

  /**
   * Add member to team
   * POST /api/v1/teams/{team_id}/members
   */
  async addMember(
    teamId: string,
    data: Omit<AddTeamMemberRequest, "team_id">,
  ): Promise<TeamMember> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/teams/${teamId}/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          team_id: teamId,
        }),
        credentials: "include",
      },
    );

    return handleResponse(response, TeamMemberSchema);
  },

  /**
   * Accept team invitation
   * POST /api/v1/teams/accept-invitation
   */
  async acceptInvitation(
    data: AcceptTeamInvitationRequest,
  ): Promise<TeamMember> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/teams/accept-invitation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      },
    );

    return handleResponse(response, TeamMemberSchema);
  },
};
