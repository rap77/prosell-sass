import { useQuery, type UseQueryResult } from "@tanstack/react-query";
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
 */
export function useCategories(): UseQueryResult<Category[], Error> {
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
    staleTime: 5 * 60 * 1000, // 5 minutes - categories rarely change
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
export function useCategoryOptions(): UseQueryResult<CategoryOption[], Error> {
  const categoriesQuery = useCategories();

  const transformedData = useMemo(() => {
    if (!categoriesQuery.data) return undefined;

    return categoriesQuery.data.map((category) => ({
      value: category.id,
      label: category.name,
    }));
  }, [categoriesQuery.data]);

  return {
    ...categoriesQuery,
    data: transformedData,
  } as UseQueryResult<CategoryOption[], Error>;
}
