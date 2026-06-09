/**
 * teamStore - Zustand store for team state
 *
 * Manages team CRUD operations using teamApi for API calls.
 * Uses localStorage for client-side persistence with versioning support.
 *
 * Features:
 * - Team list by organization
 * - Current team tracking
 * - Create, update, add member operations
 * - Real-time loading and error states
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  teamApi,
  ApiError,
  Team,
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamMember,
  AddTeamMemberRequest,
} from "@/lib/api/teamApi";
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

export interface TeamListParams {
  org_id: string;
  tenant_id: string;
  skip?: number;
  limit?: number;
}

export interface TeamError {
  message: string;
  code?: string;
}

// ============================================
// STORE INTERFACE
// ============================================

export interface TeamState {
  // State
  teams: Team[];
  currentTeam: Team | null;
  members: TeamMember[];
  isLoading: boolean;
  error: TeamError | null;
  pagination: {
    total: number;
    skip: number;
    limit: number;
  } | null;

  // Actions
  fetchTeamsByOrg: (params: TeamListParams) => Promise<void>;
  fetchTeamById: (teamId: string, tenantId: string) => Promise<void>;
  createTeam: (data: CreateTeamRequest) => Promise<Team>;
  updateTeam: (teamId: string, data: UpdateTeamRequest) => Promise<void>;
  addMember: (
    teamId: string,
    data: Omit<AddTeamMemberRequest, "team_id">,
  ) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================
// STORE
// ============================================

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      // Initial state
      teams: [],
      currentTeam: null,
      members: [],
      isLoading: false,
      error: null,
      pagination: null,

      // Fetch teams by organization
      fetchTeamsByOrg: async (params) => {
        set({ isLoading: true, error: null });

        try {
          const response = await teamApi.listByOrg(
            params.org_id,
            params.tenant_id,
            { skip: params.skip, limit: params.limit },
          );

          set({
            teams: response.teams,
            pagination: {
              total: response.total,
              skip: response.skip,
              limit: response.limit,
            },
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to fetch teams";

          logger.error("Failed to fetch teams", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Fetch team by ID
      fetchTeamById: async (teamId, tenantId) => {
        set({ isLoading: true, error: null });

        try {
          const team = await teamApi.getById(teamId, tenantId);

          // Update in list if exists
          const { teams } = get();
          const index = teams.findIndex((t) => t.id === teamId);

          if (index !== -1) {
            const updated = [...teams];
            updated[index] = team;
            set({ teams: updated, currentTeam: team, isLoading: false });
          } else {
            set({ currentTeam: team, isLoading: false });
          }
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to fetch team";

          logger.error("Failed to fetch team by ID", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Create new team
      createTeam: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const team = await teamApi.create(data);

          // Add to list
          set((state) => ({
            teams: [...state.teams, team],
            currentTeam: team,
            isLoading: false,
          }));

          return team;
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to create team";

          logger.error("Failed to create team", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
          throw unknownError;
        }
      },

      // Update team
      updateTeam: async (teamId, data) => {
        set({ isLoading: true, error: null });

        try {
          const updated = await teamApi.update(teamId, data);

          // Update in list
          const { teams, currentTeam } = get();

          set({
            teams: teams.map((t) => (t.id === teamId ? updated : t)),
            currentTeam: currentTeam?.id === teamId ? updated : currentTeam,
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to update team";

          logger.error("Failed to update team", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Add member to team
      addMember: async (teamId, data) => {
        set({ isLoading: true, error: null });

        try {
          const member = await teamApi.addMember(teamId, data);

          // Add to members list
          set((state) => ({
            members: [...state.members, member],
            isLoading: false,
          }));
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to add member";

          logger.error("Failed to add team member", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
          throw unknownError;
        }
      },

      // Set current team manually
      setCurrentTeam: (team) => {
        set({ currentTeam: team });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Reset store
      reset: () => {
        set({
          teams: [],
          currentTeam: null,
          members: [],
          isLoading: false,
          error: null,
          pagination: null,
        });
      },
    }),
    {
      name: "team-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data
      partialize: (state) => ({
        currentTeam: state.currentTeam,
        // Don't persist teams list (fetch fresh on mount)
        // Don't persist error or loading states
      }),
      version: 1,
    },
  ),
);
