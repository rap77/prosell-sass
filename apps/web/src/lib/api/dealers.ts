/**
 * Dealer API hooks and types
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";

// Types
export interface Dealer {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  logo_url?: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface DealerListResponse {
  items: Dealer[];
  total: number;
  limit: number;
  offset: number;
}

export interface DealerStats {
  total_vehicles: number;
  published_vehicles: number;
  draft_vehicles: number;
  last_activity: string | null;
}

// API client
const DEALERS_BASE_URL = "/api/v1/dealers";

async function fetchDealers(): Promise<DealerListResponse> {
  const response = await fetch(DEALERS_BASE_URL);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to fetch dealers" }));
    throw new Error(error.message || "Failed to fetch dealers");
  }

  return response.json();
}

async function fetchDealerStats(dealerId: string): Promise<DealerStats> {
  const response = await fetch(`${DEALERS_BASE_URL}/${dealerId}/stats`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to fetch dealer stats" }));
    throw new Error(error.message || "Failed to fetch dealer stats");
  }

  return response.json();
}

async function assignVehicleToDealer(vehicleId: string, dealerId: string): Promise<void> {
  const response = await fetch(`/api/v1/vehicles/${vehicleId}/dealer`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dealer_id: dealerId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to assign vehicle to dealer" }));
    throw new Error(error.message || "Failed to assign vehicle to dealer");
  }
}

async function bulkAssignVehiclesToDealer(vehicleIds: string[], dealerId: string): Promise<void> {
  const response = await fetch(`/api/v1/vehicles/bulk-assign-dealer`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ vehicle_ids: vehicleIds, dealer_id: dealerId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to bulk assign vehicles" }));
    throw new Error(error.message || "Failed to bulk assign vehicles");
  }
}

// Hooks
export function useDealers(): UseQueryResult<DealerListResponse, Error> {
  return useQuery({
    queryKey: ["dealers"],
    queryFn: fetchDealers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDealerStats(dealerId: string): UseQueryResult<DealerStats, Error> {
  return useQuery({
    queryKey: ["dealer-stats", dealerId],
    queryFn: () => fetchDealerStats(dealerId),
    enabled: !!dealerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAssignVehicleToDealer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vehicleId, dealerId }: { vehicleId: string; dealerId: string }) =>
      assignVehicleToDealer(vehicleId, dealerId),
    onSuccess: (_, variables) => {
      // Invalidate vehicles query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle", variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["dealer-stats", variables.dealerId] });

      toast.success("Vehicle assigned to dealer", {
        description: "The vehicle has been successfully assigned.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to assign vehicle", {
        description: error.message,
      });
    },
  });
}

export function useBulkAssignVehiclesToDealer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vehicleIds, dealerId }: { vehicleIds: string[]; dealerId: string }) =>
      bulkAssignVehiclesToDealer(vehicleIds, dealerId),
    onSuccess: (_, variables) => {
      // Invalidate vehicles query
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-stats", variables.dealerId] });

      toast.success(`${variables.vehicleIds.length} vehicles assigned`, {
        description: "All selected vehicles have been assigned to the dealer.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to assign vehicles", {
        description: error.message,
      });
    },
  });
}
