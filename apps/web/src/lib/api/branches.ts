/**
 * Branch API hooks and types
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { extractErrorMessage } from "./extractErrorMessage";

// Types
export interface Branch {
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

export interface BranchListResponse {
  items: Branch[];
  total: number;
  limit: number;
  offset: number;
}

export interface BranchStats {
  total_vehicles: number;
  published_vehicles: number;
  draft_vehicles: number;
  last_activity: string | null;
}

// API client
const BRANCHES_BASE_URL = "/api/v1/branches";

async function fetchBranches(): Promise<BranchListResponse> {
  const response = await fetch(BRANCHES_BASE_URL);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, "Failed to fetch branches"));
  }

  return response.json();
}

async function fetchBranchStats(branchId: string): Promise<BranchStats> {
  const response = await fetch(`${BRANCHES_BASE_URL}/${branchId}/stats`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, "Failed to fetch branch stats"));
  }

  return response.json();
}

async function assignProductToBranch(
  productId: string,
  branchId: string,
): Promise<void> {
  const response = await fetch(`/api/v1/products/${productId}/branch`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ branch_id: branchId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      extractErrorMessage(body, "Failed to assign product to branch"),
    );
  }
}

async function bulkAssignProductsToBranch(
  productIds: string[],
  branchId: string,
): Promise<void> {
  const response = await fetch(`/api/v1/products/bulk-assign-branch`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ product_ids: productIds, branch_id: branchId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      extractErrorMessage(body, "Failed to bulk assign products"),
    );
  }
}

// Hooks
export function useBranches(): UseQueryResult<BranchListResponse, Error> {
  return useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBranchStats(
  branchId: string,
): UseQueryResult<BranchStats, Error> {
  return useQuery({
    queryKey: ["branch-stats", branchId],
    queryFn: () => fetchBranchStats(branchId),
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAssignProductToBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      branchId,
    }: {
      productId: string;
      branchId: string;
    }) => assignProductToBranch(productId, branchId),
    onSuccess: (_, variables) => {
      // Invalidate vehicles query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({
        queryKey: ["product", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["branch-stats", variables.branchId],
      });

      toast.success("Vehicle assigned to branch", {
        description: "The vehicle has been successfully assigned.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to assign product", {
        description: error.message,
      });
    },
  });
}

export function useBulkAssignProductsToBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productIds,
      branchId,
    }: {
      productIds: string[];
      branchId: string;
    }) => bulkAssignProductsToBranch(productIds, branchId),
    onSuccess: (_, variables) => {
      // Invalidate vehicles query
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({
        queryKey: ["branch-stats", variables.branchId],
      });

      toast.success(`${variables.productIds.length} products assigned`, {
        description: "All selected vehicles have been assigned to the branch.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to assign products", {
        description: error.message,
      });
    },
  });
}
