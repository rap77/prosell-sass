/**
 * Leads API client
 * Handles lead management for vendedores and managers
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Lead status enum - 5-state lifecycle
 */
export enum LeadStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  APPOINTMENT_SET = "appointment_set",
  LOST = "lost",
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

/**
 * Duplicate lead match returned by /leads/{id}/duplicates
 */
export interface LeadDuplicateMatch {
  lead_id: string;
  match_type: "email" | "phone" | "both";
  confidence: "high" | "medium" | "low";
}

/**
 * Response from GET /leads/{id}/duplicates
 */
export interface LeadDuplicatesResponse {
  lead_id: string;
  duplicates: LeadDuplicateMatch[];
  count: number;
}

/**
 * Lead entity
 */
export interface Lead {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  product_id: string | null;
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
  status: LeadStatus;
  reason?: string | null;
}

/**
 * Request payload for reassigning lead to vendedor
 */
export interface ReassignLeadRequest {
  vendedor_id: string | null;
}

// ─── Backend shape ────────────────────────────────────────────────────────────

interface BackendProductForLead {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  status: string;
  attributes: ProductAttributes;
  created_at: string;
  updated_at: string;
}

interface BackendLeadResponse {
  id: string;
  tenant_id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  product_id: string | null;
  vendedor_id: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
  product: BackendProductForLead | null;
}

interface BackendLeadListResponse {
  items: BackendLeadResponse[];
  total: number;
  limit: number;
  offset: number;
}

interface VendedorMetricsBreakdown {
  vendedor_id: string;
  vendedor_name: string;
  total_leads: number;
  new_leads: number;
  conversion_rate: number;
}

interface TeamMetricsResponse {
  total_leads: number;
  new_leads_last_24h: number;
  conversion_rate: number;
  vendedor_breakdown: VendedorMetricsBreakdown[];
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
    message: backendLead.message,
    status: backendLead.status,
    source: backendLead.source,
    created_at: backendLead.created_at,
    updated_at: backendLead.updated_at,
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLeads(filters?: LeadFilters, limit: number = 50, offset: number = 0): UseQueryResult<Lead[], Error> {
  const queryParams = new URLSearchParams();
  queryParams.append("limit", limit.toString());
  queryParams.append("offset", offset.toString());

  if (filters?.status) queryParams.append("status", filters.status);
  if (filters?.search) queryParams.append("search", filters.search);
  if (filters?.vendedor_id) queryParams.append("vendedor_id", filters.vendedor_id);

  return useQuery({
    queryKey: ["leads", filters, limit, offset],
    queryFn: async () => {
      const res = await fetch(`/api/v1/leads?${queryParams.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch leads" }));
        throw new Error(error.message || "Failed to fetch leads");
      }

      const data = (await res.json()) as BackendLeadListResponse;
      return data.items.map(transformLead);
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useLead(leadId: string | undefined): UseQueryResult<Lead | null, Error> {
  return useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const res = await fetch(`/api/v1/leads/${leadId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch lead" }));
        throw new Error(error.message || "Failed to fetch lead");
      }

      const data = (await res.json()) as BackendLeadResponse;
      return transformLead(data);
    },
    enabled: !!leadId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateLeadStatus(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateLeadStatusRequest) => {
      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to update lead status" }));
        throw new Error(error.message || "Failed to update lead status");
      }

      const data = (await res.json()) as BackendLeadResponse;
      return transformLead(data);
    },
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.setQueryData(["lead", leadId], updatedLead);
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
      const res = await fetch(`/api/v1/leads/${leadId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to reassign lead" }));
        throw new Error(error.message || "Failed to reassign lead");
      }

      const data = (await res.json()) as BackendLeadResponse;
      return transformLead(data);
    },
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.setQueryData(["lead", leadId], updatedLead);
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
      const res = await fetch("/api/v1/leads/metrics", {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch team metrics" }));
        throw new Error(error.message || "Failed to fetch team metrics");
      }

      return (await res.json()) as TeamMetricsResponse;
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
      const res = await fetch(`/api/v1/leads/${leadId}/duplicates`, {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch duplicates" }));
        throw new Error(error.message || "Failed to fetch duplicates");
      }

      return (await res.json()) as LeadDuplicatesResponse;
    },
    enabled: !!leadId,
    staleTime: 2 * 60 * 1000,
  });
}
