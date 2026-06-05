/**
 * teamApi Client - HTTP client for team endpoints
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

export type TeamMemberRole = "manager" | "vendor";

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  tenant_id: string;
  role: TeamMemberRole;
  commission_rate: number | null;
  joined_at: string;
}

export interface Team {
  id: string;
  name: string;
  tenant_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
  member_count?: number;
}

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
  tenant_id: string;
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

export interface TeamListResponse {
  teams: Team[];
  total: number;
  skip: number;
  limit: number;
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
// TEAM API CLIENT
// ============================================

export const teamApi = {
  /**
   * Create a new team
   * POST /api/v1/teams
   */
  async create(
    data: CreateTeamRequest,
  ): Promise<Team> {
    const response = await fetch(`${API_BASE_URL}/api/v1/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse<Team>(response);
  },

  /**
   * List teams for an organization
   * GET /api/v1/teams/org/{org_id}
   */
  async listByOrg(orgId: string, tenantId: string, params?: {
    skip?: number;
    limit?: number;
  }): Promise<TeamListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("tenant_id", tenantId);
    if (params?.skip !== undefined) searchParams.set("skip", params.skip.toString());
    if (params?.limit !== undefined) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/v1/teams/org/${orgId}${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    return handleResponse<TeamListResponse>(response);
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

    return handleResponse<Team>(response);
  },

  /**
   * Update team
   * PATCH /api/v1/teams/{team_id}
   */
  async update(
    teamId: string,
    data: UpdateTeamRequest,
  ): Promise<Team> {
    const response = await fetch(`${API_BASE_URL}/api/v1/teams/${teamId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse<Team>(response);
  },

  /**
   * Add member to team
   * POST /api/v1/teams/{team_id}/members
   */
  async addMember(
    teamId: string,
    data: Omit<AddTeamMemberRequest, "team_id">,
  ): Promise<TeamMember> {
    const response = await fetch(`${API_BASE_URL}/api/v1/teams/${teamId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        team_id: teamId,
      }),
      credentials: "include",
    });

    return handleResponse<TeamMember>(response);
  },

  /**
   * Accept team invitation
   * POST /api/v1/teams/accept-invitation
   */
  async acceptInvitation(
    data: AcceptTeamInvitationRequest,
  ): Promise<TeamMember> {
    const response = await fetch(`${API_BASE_URL}/api/v1/teams/accept-invitation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    return handleResponse<TeamMember>(response);
  },
};
