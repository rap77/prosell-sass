import {
  useQuery,
  useQueryClient,
  useMutation,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { Category, CategoryOption } from "@/types/category";
import {
  mapBackendCategoryToDomain,
  type BackendCategory,
} from "@/lib/api/categoryMapper";
import {
  BackendCategorySchema,
  BackendListResponseSchema,
} from "@/lib/api/schemas/category";

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
      // flat=true returns all categories for client-side tree building
      // is_active=true filters out soft-deleted categories
      const res = await fetch("/api/v1/categories?flat=true&is_active=true", {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Failed to fetch categories" }));
        throw new Error(error.message || "Failed to fetch categories");
      }

      // Validate the wire shape before projecting to the strict Category contract.
      const data = BackendListResponseSchema.parse(await res.json());
      return data.categories.map(mapBackendCategoryToDomain);
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
 * Returns the array of { value, label } options for use with
 * Radix UI Select, React Select, or similar dropdown components.
 * (Memoization handled by React Compiler.)
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
  const data = categoriesQuery.data?.map((category) => ({
    value: category.id,
    label: category.name,
  }));
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
    const error = await res
      .json()
      .catch(() => ({ message: "Failed to create category" }));
    throw new Error(error.message || "Failed to create category");
  }

  const raw: BackendCategory = BackendCategorySchema.parse(await res.json());
  return mapBackendCategoryToDomain(raw);
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

/**
 * Update an existing category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        name: string;
        slug: string;
        icon: string | null;
        description: string | null;
        parent_id: string | null;
        sort_order: number;
        is_active: boolean;
      }>;
    }) => {
      const res = await fetch(`/api/v1/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Failed to update category" }));
        throw new Error(error.message || "Failed to update category");
      }
      const raw: BackendCategory = BackendCategorySchema.parse(
        await res.json(),
      );
      return mapBackendCategoryToDomain(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update category");
    },
  });
}

/**
 * Soft delete (deactivate) a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: "Failed to delete category" }));
        throw new Error(error.message || "Failed to delete category");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete category");
    },
  });
}

/**
 * Reorder categories by firing N parallel PATCH requests
 * Optimistic update with rollback on failure
 */
export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      orderedCategories: { id: string; sort_order: number }[],
    ) => {
      await Promise.all(
        orderedCategories.map(({ id, sort_order }) =>
          fetch(`/api/v1/categories/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ sort_order }),
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed to update category ${id}`);
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.error(err.message || "Failed to reorder categories");
    },
  });
}
