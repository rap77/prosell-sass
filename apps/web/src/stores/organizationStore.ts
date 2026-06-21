/**
 * organizationStore - Zustand store for organization state
 *
 * Manages organization CRUD operations using orgApi for API calls.
 * Uses localStorage for client-side persistence with versioning support.
 *
 * Features:
 * - Organization list with pagination
 * - Current organization tracking
 * - Create, update, verify, reject, suspend operations
 * - Real-time loading and error states
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  orgApi,
  ApiError,
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from "@/lib/api/orgApi";
import { logger } from "@/lib/logger";
import { useAuthStore } from "@/stores/authStore";
import { Permission, userHasPermission } from "@/lib/auth/permissions";

// ============================================
// TYPES
// ============================================

export interface OrganizationListParams {
  page?: number;
  page_size?: number;
  tenant_id?: string;
}

export interface OrganizationError {
  message: string;
  code?: string;
}

// ============================================
// STORE INTERFACE
// ============================================

export interface OrganizationState {
  // State
  organizations: Organization[];
  currentOrg: Organization | null;
  isLoading: boolean;
  error: OrganizationError | null;
  pagination: {
    total: number;
    page: number;
    page_size: number;
  } | null;
  // The dealer an admin is currently "viewing as" (Subsystem D DealerPicker).
  // null means "viewing my own organization" — the default for everyone.
  viewingOrgId: string | null;

  // Actions
  fetchOrganizations: (params?: OrganizationListParams) => Promise<void>;
  fetchMyOrganization: (tenantId: string) => Promise<void>;
  fetchOrganizationById: (id: string, tenantId: string) => Promise<void>;
  createOrganization: (
    data: CreateOrganizationRequest,
  ) => Promise<Organization>;
  updateOrganization: (
    id: string,
    data: UpdateOrganizationRequest,
  ) => Promise<void>;
  verifyOrganization: (id: string, verifierId: string) => Promise<void>;
  rejectOrganization: (
    id: string,
    verifierId: string,
    reason?: string,
  ) => Promise<void>;
  suspendOrganization: (id: string) => Promise<void>;
  setCurrentOrg: (org: Organization | null) => void;
  // Guarded setter: no-op when the current user lacks
  // Permission.DEALER_ADMIN_VIEW_ALL (checked against the live authStore
  // user, not a prop — callers can't bypass the guard by omitting a check).
  setViewingOrgId: (orgId: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================
// STORE
// ============================================

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      // Initial state
      organizations: [],
      currentOrg: null,
      isLoading: false,
      error: null,
      pagination: null,
      viewingOrgId: null,

      // Fetch organizations list
      fetchOrganizations: async (params) => {
        set({ isLoading: true, error: null });

        try {
          const response = await orgApi.list(params);

          set({
            organizations: response.organizations,
            pagination: {
              total: response.total,
              page: response.page,
              page_size: response.page_size,
            },
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to fetch organizations";

          logger.error("Failed to fetch organizations", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Fetch current user's organization
      fetchMyOrganization: async (tenantId) => {
        set({ isLoading: true, error: null });

        try {
          const org = await orgApi.getMyOrganization();

          set({
            currentOrg: org,
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to fetch organization";

          logger.error("Failed to fetch my organization", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Fetch organization by ID
      fetchOrganizationById: async (id, tenantId) => {
        set({ isLoading: true, error: null });

        try {
          const org = await orgApi.getById(id, tenantId);

          // Update in list if exists
          const { organizations } = get();
          const index = organizations.findIndex((o) => o.id === id);

          if (index !== -1) {
            const updated = [...organizations];
            updated[index] = org;
            set({ organizations: updated, currentOrg: org, isLoading: false });
          } else {
            set({ currentOrg: org, isLoading: false });
          }
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to fetch organization";

          logger.error("Failed to fetch organization by ID", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Create new organization
      createOrganization: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const org = await orgApi.create(data);

          // Add to list
          set((state) => ({
            organizations: [...state.organizations, org],
            currentOrg: org,
            isLoading: false,
          }));

          return org;
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to create organization";

          logger.error("Failed to create organization", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
          throw unknownError;
        }
      },

      // Update organization
      updateOrganization: async (id, data) => {
        set({ isLoading: true, error: null });

        try {
          const updated = await orgApi.update(id, data);

          // Update in list
          const { organizations, currentOrg } = get();

          set({
            organizations: organizations.map((o) =>
              o.id === id ? updated : o,
            ),
            currentOrg: currentOrg?.id === id ? updated : currentOrg,
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to update organization";

          logger.error("Failed to update organization", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Verify organization
      verifyOrganization: async (id, verifierId) => {
        set({ isLoading: true, error: null });

        try {
          const verified = await orgApi.verify(id, verifierId);

          // Update in list
          const { organizations, currentOrg } = get();

          set({
            organizations: organizations.map((o) =>
              o.id === id ? verified : o,
            ),
            currentOrg: currentOrg?.id === id ? verified : currentOrg,
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to verify organization";

          logger.error("Failed to verify organization", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Reject organization
      rejectOrganization: async (id, verifierId, reason) => {
        set({ isLoading: true, error: null });

        try {
          const rejected = await orgApi.reject(id, verifierId, reason);

          // Update in list
          const { organizations, currentOrg } = get();

          set({
            organizations: organizations.map((o) =>
              o.id === id ? rejected : o,
            ),
            currentOrg: currentOrg?.id === id ? rejected : currentOrg,
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to reject organization";

          logger.error("Failed to reject organization", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Suspend organization
      suspendOrganization: async (id) => {
        set({ isLoading: true, error: null });

        try {
          const suspended = await orgApi.suspend(id);

          // Update in list
          const { organizations, currentOrg } = get();

          set({
            organizations: organizations.map((o) =>
              o.id === id ? suspended : o,
            ),
            currentOrg: currentOrg?.id === id ? suspended : currentOrg,
            isLoading: false,
          });
        } catch (unknownError) {
          const message =
            unknownError instanceof ApiError
              ? unknownError.message
              : unknownError instanceof Error
                ? unknownError.message
                : "Failed to suspend organization";

          logger.error("Failed to suspend organization", unknownError);
          set({
            error: { message },
            isLoading: false,
          });
        }
      },

      // Set current organization manually
      setCurrentOrg: (org) => {
        set({ currentOrg: org });
      },

      // Set the dealer being "viewed as" — no-op without DEALER_ADMIN_VIEW_ALL
      setViewingOrgId: (orgId) => {
        const role = useAuthStore.getState().user?.role ?? null;
        if (!userHasPermission(role, Permission.DEALER_ADMIN_VIEW_ALL)) {
          return;
        }
        set({ viewingOrgId: orgId });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Reset store
      reset: () => {
        set({
          organizations: [],
          currentOrg: null,
          isLoading: false,
          error: null,
          pagination: null,
          viewingOrgId: null,
        });
      },
    }),
    {
      name: "organization-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data
      partialize: (state) => ({
        currentOrg: state.currentOrg,
        // Don't persist organizations list (fetch fresh on mount)
        // Don't persist error or loading states
      }),
      version: 1,
    },
  ),
);
