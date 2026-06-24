/**
 * Leads API client
 * Handles lead management for vendedores and managers
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import {
  LeadStatus,
  BackendLeadResponseSchema,
  BackendLeadListResponseSchema,
  BackendLeadDetailResponseSchema,
  TeamMetricsResponseSchema,
  LeadDuplicatesResponseSchema,
  type BackendLeadResponse,
  type BackendLeadDetailResponse,
  type TeamMetricsResponse,
  type VendedorMetricsBreakdown,
  type LeadDuplicateMatch,
  type LeadDuplicatesResponse,
} from "@/lib/api/schemas/leads";

export { LeadStatus };

/**
 * Audit log entry for a lead status change.
 * Mirrors LeadAuditLogResponse from the backend.
 */
export interface LeadAuditLogEntry {
  id: string;
  lead_id: string;
  old_status: LeadStatus;
  new_status: LeadStatus;
  changed_by_user_id: string | null;
  reason: string | null;
  created_at: string;
}

/**
 * Product attributes for a vehicle product
 */
export interface ProductAttributes {
  category?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  body_type?: string;
  body_style?: string;
  drivetrain?: string;
  transmission?: string;
  engine?: string;
  fuel_type?: string;
  mileage?: number;
  mileage_unit?: string;
  exterior_color?: string;
  interior_color?: string;
  has_sunroof?: boolean;
  has_navigation?: boolean;
  has_leather?: boolean;
  has_backup_camera?: boolean;
  has_bluetooth?: boolean;
  has_remote_start?: boolean;
  seat_material?: string;
  vin_verified?: boolean;
  stock_number?: string;
  [key: string]: unknown;
}

/**
 * Product summary embedded in lead responses
 */
export interface LeadProduct {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  status: string;
  attributes: ProductAttributes;
  created_at: string;
  updated_at: string;
}

export type { LeadDuplicateMatch, LeadDuplicatesResponse };

/**
 * Lead entity
 */
export interface Lead {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  product_id: string | null;
  vendedor_id?: string | null;
  product: LeadProduct | null;
  message: string | null;
  status: LeadStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lead list filters
 */
export interface LeadFilters {
  status?: LeadStatus;
  search?: string;
  vendedor_id?: string;
}

/**
 * Request payload for creating a new lead
 */
export interface CreateLeadRequest {
  buyer_name: string;
  buyer_email?: string | null;
  buyer_phone?: string | null;
  product_id?: string | null;
  message?: string | null;
}

/**
 * Request payload for updating lead status
 */
export interface UpdateLeadStatusRequest {
  new_status: LeadStatus;
  reason?: string | null;
}

/**
 * Request payload for reassigning lead to vendedor
 */
export interface ReassignLeadRequest {
  vendedor_id: string | null;
}

export type { TeamMetricsResponse, VendedorMetricsBreakdown };

// ─── Transform ────────────────────────────────────────────────────────────────

function transformLead(backendLead: BackendLeadResponse): Lead {
  return {
    id: backendLead.id,
    buyer_name: backendLead.buyer_name,
    buyer_email: backendLead.buyer_email,
    buyer_phone: backendLead.buyer_phone,
    product_id: backendLead.product_id,
    product: backendLead.product
      ? {
          id: backendLead.product.id,
          title: backendLead.product.title,
          price_cents: backendLead.product.price_cents,
          currency: backendLead.product.currency,
          status: backendLead.product.status,
          attributes: backendLead.product.attributes,
          created_at: backendLead.product.created_at,
          updated_at: backendLead.product.updated_at,
        }
      : null,
    vendedor_id: backendLead.vendedor_id,
    message: backendLead.message,
    status: backendLead.status,
    source: backendLead.source,
    created_at: backendLead.created_at,
    updated_at: backendLead.updated_at,
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLeads(
  filters?: LeadFilters,
  limit: number = 50,
  offset: number = 0,
): UseQueryResult<Lead[], Error> {
  return useQuery({
    queryKey: ["leads", filters, limit, offset],
    queryFn: async () => {
      // Build params inside queryFn to avoid stale closure on background refetches
      const queryParams = new URLSearchParams();
      queryParams.append("limit", limit.toString());
      queryParams.append("offset", offset.toString());
      if (filters?.status) queryParams.append("status", filters.status);
      if (filters?.search) queryParams.append("search", filters.search);
      if (filters?.vendedor_id)
        queryParams.append("vendedor_id", filters.vendedor_id);

      const res = await fetchWithAuth(
        `/api/v1/leads?${queryParams.toString()}`,
      );

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Failed to fetch leads" }));
        throw new Error(error.message || "Failed to fetch leads");
      }

      const data = BackendLeadListResponseSchema.parse(await res.json());
      return data.items.map(transformLead);
    },
    staleTime: 35_000, // slightly above refetchInterval to avoid redundant refetches
    refetchInterval: 30_000,
    refetchIntervalInBackground: false, // pause polling when tab is not visible
  });
}

/**
 * getLeadAuditTrail — fetches lead details (which includes audit_logs) for a given lead ID.
 *
 * The backend GET /api/v1/leads/{id} returns LeadDetailResponse:
 *   { lead: LeadResponse, audit_logs: LeadAuditLogResponse[] }
 *
 * Audit logs are returned newest-first by the backend.
 */
export async function getLeadAuditTrail(
  leadId: string,
): Promise<LeadAuditLogEntry[]> {
  const res = await fetchWithAuth(`/api/v1/leads/${leadId}`);

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: "Failed to fetch lead audit trail" }));
    throw new Error(error.message || "Failed to fetch lead audit trail");
  }

  const data = BackendLeadDetailResponseSchema.parse(await res.json());
  return data.audit_logs;
}

async function fetchLeadDetail(
  leadId: string,
): Promise<BackendLeadDetailResponse> {
  const res = await fetchWithAuth(`/api/v1/leads/${leadId}`);
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: "Failed to fetch lead" }));
    throw new Error(error.message || "Failed to fetch lead");
  }
  return BackendLeadDetailResponseSchema.parse(await res.json());
}

/**
 * useLead and useLeadAuditTrail share the same query key ["lead-detail", leadId].
 * TanStack Query deduplicates the HTTP call — one request per lead, two consumers.
 */
export function useLead(
  leadId: string | undefined,
): UseQueryResult<Lead | null, Error> {
  return useQuery({
    queryKey: ["lead-detail", leadId],
    queryFn: () => (leadId ? fetchLeadDetail(leadId) : null),
    select: (data) => (data ? transformLead(data.lead) : null),
    enabled: !!leadId,
    staleTime: 60 * 1000,
  });
}

/**
 * useLeadAuditTrail — derives audit logs from the shared lead-detail query.
 * No extra HTTP request — TanStack Query reuses the cache entry from useLead.
 * Audit logs are returned newest-first (backend ordering).
 */
export function useLeadAuditTrail(
  leadId: string | undefined,
): UseQueryResult<LeadAuditLogEntry[], Error> {
  return useQuery({
    queryKey: ["lead-detail", leadId],
    queryFn: () => (leadId ? fetchLeadDetail(leadId) : null),
    select: (data) => data?.audit_logs ?? [],
    enabled: !!leadId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateLeadStatus(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateLeadStatusRequest) => {
      const res = await fetchWithAuth(`/api/v1/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Failed to update lead status" }));
        throw new Error(error.message || "Failed to update lead status");
      }

      const data = BackendLeadResponseSchema.parse(await res.json());
      return transformLead(data);
    },
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      toast.success("Lead status updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update lead status");
    },
  });
}

export function useReassignLead(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ReassignLeadRequest) => {
      const res = await fetchWithAuth(`/api/v1/leads/${leadId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Failed to reassign lead" }));
        throw new Error(error.message || "Failed to reassign lead");
      }

      const data = BackendLeadResponseSchema.parse(await res.json());
      return transformLead(data);
    },
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      toast.success("Lead reassigned successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reassign lead");
    },
  });
}

export function useTeamMetrics(): UseQueryResult<TeamMetricsResponse, Error> {
  return useQuery({
    queryKey: ["team-metrics"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/v1/leads/metrics");

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Failed to fetch team metrics" }));
        throw new Error(error.message || "Failed to fetch team metrics");
      }

      return TeamMetricsResponseSchema.parse(await res.json());
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * useLeadDuplicates — fetches potential duplicate leads for a given lead ID.
 *
 * Calls GET /api/v1/leads/{leadId}/duplicates and returns the list of
 * DuplicateMatch objects so the lead detail page can display a warning.
 *
 * Data is cached for 2 minutes. The query is disabled when leadId is absent.
 */
export function useLeadDuplicates(
  leadId: string | undefined,
): UseQueryResult<LeadDuplicatesResponse, Error> {
  return useQuery({
    queryKey: ["lead-duplicates", leadId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/v1/leads/${leadId}/duplicates`);

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Failed to fetch duplicates" }));
        throw new Error(error.message || "Failed to fetch duplicates");
      }

      return LeadDuplicatesResponseSchema.parse(await res.json());
    },
    enabled: !!leadId,
    staleTime: 2 * 60 * 1000,
  });
}
