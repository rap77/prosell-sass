"use client";

/**
 * teamApi Client - HTTP client for team endpoints
 *
 * Features:
 * - Direct calls to FastAPI backend (localhost:8000)
 * - httpOnly cookie authentication
 * - TypeScript types matching backend Pydantic DTOs
 * - Error handling with ApiError
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
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
  // NEVER accept tenant_id from the client — the backend always derives it
  // from the authenticated user and ignores any client-supplied value.
  org_id: string;
}

export interface UpdateTeamRequest {
  name?: string;
}

export interface AddTeamMemberRequest {
  team_id: string;
  user_id: string;
  // NEVER accept tenant_id from the client — the backend always derives it
  // from the authenticated user and ignores any client-supplied value.
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
   *
   * Tenant scoping is server-side only — the backend derives tenant_id from
   * the authenticated user and does not accept it as a query param.
   */
  async listByOrg(
    orgId: string,
    params?: {
      skip?: number;
      limit?: number;
    },
  ): Promise<TeamListResponse> {
    const searchParams = new URLSearchParams();
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
   *
   * Tenant scoping is server-side only — the backend derives tenant_id from
   * the authenticated user and does not accept it as a query param.
   */
  async getById(teamId: string): Promise<Team> {
    const response = await fetch(`${API_BASE_URL}/api/v1/teams/${teamId}`, {
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

// ============================================
// REACT QUERY HOOKS
// ============================================

/**
 * Accept a team invitation by token.
 * No onError/onSuccess here — callers need the raw thrown ApiError to reach
 * their own onError so status-based branching (expired/already-member/401)
 * keeps working exactly as before.
 */
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (data: AcceptTeamInvitationRequest) =>
      teamApi.acceptInvitation(data),
  });
}

export const TEAMS_BY_ORG_QUERY_KEY = (orgId: string) =>
  ["teams", "org", orgId] as const;

/**
 * List teams for an organization.
 * Replaces the mount-fetch useEffect in TeamSwitcher — same single-request
 * semantics, no query-param tenant_id (the backend derives it server-side).
 */
export function useTeamsByOrg(orgId: string) {
  return useQuery({
    queryKey: TEAMS_BY_ORG_QUERY_KEY(orgId),
    queryFn: () => teamApi.listByOrg(orgId),
    enabled: Boolean(orgId),
  });
}
