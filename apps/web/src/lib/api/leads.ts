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
 * Vehicle information associated with a lead
 */
export interface LeadVehicle {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
}

/**
 * Lead entity
 */
export interface Lead {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  vehicle: LeadVehicle | null;
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
  vehicle_id?: string | null;
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
 * Backend lead response
 */
interface BackendLeadResponse {
  id: string;
  tenant_id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  vehicle_id: string | null;
  vendedor_id: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Backend lead list response
 */
interface BackendLeadListResponse {
  items: BackendLeadResponse[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Transform backend lead response to frontend lead
 */
function transformLead(backendLead: BackendLeadResponse): Lead {
  return {
    id: backendLead.id,
    buyer_name: backendLead.buyer_name,
    buyer_email: backendLead.buyer_email,
    buyer_phone: backendLead.buyer_phone,
    vehicle: backendLead.vehicle_id
      ? {
          id: backendLead.vehicle_id,
          title: "", // TODO: Fetch from vehicle endpoint if needed
          make: "",
          model: "",
          year: 0,
        }
      : null,
    message: backendLead.message,
    status: backendLead.status,
    source: backendLead.source,
    created_at: backendLead.created_at,
    updated_at: backendLead.updated_at,
  };
}

/**
 * Fetch leads with optional filters
 * @param filters - Optional filters for status, search, vendedor_id
 * @returns Query result with leads array
 */
export function useLeads(filters?: LeadFilters, limit: number = 50, offset: number = 0): UseQueryResult<Lead[], Error> {
  const queryParams = new URLSearchParams();
  queryParams.append("limit", limit.toString());
  queryParams.append("offset", offset.toString());

  if (filters?.status) queryParams.append("status", filters.status);
  if (filters?.search) queryParams.append("search", filters.search);

  // Role-based filtering: vendedor_id filter only applies if explicitly provided
  // Otherwise backend handles role-based filtering via auth token
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
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch a single lead by ID
 * @param leadId - The lead ID to fetch
 * @returns Query result with lead details or null if not found
 */
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
    enabled: !!leadId, // Only run query if leadId is provided
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Update lead status mutation
 * @param leadId - The lead ID to update
 * @returns Mutation object with updateStatus function
 */
export function useUpdateLeadStatus(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateLeadStatusRequest) => {
      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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
      // Invalidate and refetch leads list
      queryClient.invalidateQueries({ queryKey: ["leads"] });

      // Update specific lead cache if it exists
      queryClient.setQueryData(["lead", leadId], updatedLead);

      // Show success toast
      toast.success("Lead status updated successfully");
    },
    onError: (error) => {
      // Show error toast
      toast.error(error.message || "Failed to update lead status");
    },
  });
}

