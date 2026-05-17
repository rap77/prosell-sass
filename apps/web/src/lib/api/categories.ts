import { useQuery, useQueryClient, useMutation, type UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import type { Category, CategoryOption, CategoryListResponse } from "@/types/category";

interface BackendCategoryResponse {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    attribute_schema: Record<string, boolean>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
  total: number;
  page: number;
  page_size: number;
}

/**
 * Fetch all categories with 5-minute cache
 *
 * Categories change rarely (admin-only operation), so we cache aggressively
 * to reduce API calls and improve UI responsiveness.
 *
 * In test mode (detected by hostname or environment), caching is disabled
 * to ensure tests see newly created categories immediately.
 */
export function useCategories(): UseQueryResult<Category[], Error> {
  // Detect test mode: localhost in development or explicit NODE_ENV=test
  const isTestMode =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
     process.env.NODE_ENV === "test");

  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/v1/categories", {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch categories" }));
        throw new Error(error.message || "Failed to fetch categories");
      }

      const data = (await res.json()) as BackendCategoryResponse;
      return data.categories;
    },
    // Disable cache in test mode, use 5-minute cache in production
    staleTime: isTestMode ? 0 : 5 * 60 * 1000,
    // CRITICAL: Always refetch on mount in test mode to catch newly created categories
    // In production, respect the cache to reduce API calls
    refetchOnMount: isTestMode ? "always" : undefined,
    // CRITICAL: Refetch on window focus in test mode to ensure fresh data
    refetchOnWindowFocus: isTestMode ? "always" : undefined,
  });
}

/**
 * Transform categories for Select component dropdowns
 *
 * Returns memoized array of { value, label } options for use with
 * Radix UI Select, React Select, or similar dropdown components.
 *
 * Example:
 * ```tsx
 * const { data: options, isLoading } = useCategoryOptions();
 * <Select>
 *   {options?.map(opt => (
 *     <SelectItem key={opt.value} value={opt.value}>
 *       {opt.label}
 *     </SelectItem>
 *   ))}
 * </Select>
 * ```
 */
export function useCategoryOptions() {
  const categoriesQuery = useCategories();

  const data = useMemo(
    () =>
      categoriesQuery.data?.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categoriesQuery.data],
  );

  return { ...categoriesQuery, data };
}

/**
 * Create a new category
 */
export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
}): Promise<Category> {
  const res = await fetch("/api/v1/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to create category" }));
    throw new Error(error.message || "Failed to create category");
  }

  return res.json();
}

/**
 * Mutation hook for creating categories
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create category");
    },
  });
}
