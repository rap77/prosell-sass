import { useMutation, useQuery, useQueryClient, useInfiniteQuery, type UseMutationResult, type UseQueryResult, type UseInfiniteQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateProductRequest, Product, ProductListResponse, ProductAttributes } from "@/types/product";
import type { VehicleAttributes } from "@/types/vehicle";
import { isVehicleProduct } from "@/types/product";

interface BackendProductResponse {
  id: string;
  title: string;
  price_cents: number;
  category_id: string;
  attributes: ProductAttributes;
  status: "draft" | "active" | "sold";
  created_at: string;
  updated_at: string;
}

/**
 * Create a product with optional vehicle auto-creation
 *
 * When `attributes.vin` is present, the backend automatically creates
 * a vehicle record linked to this product. This is the single-call
 * pattern for vehicle creation in Phase 13.
 *
 * @param data - Product data with optional VIN in attributes
 * @returns Created product with server-assigned ID
 *
 * Example:
 * ```tsx
 * const createProduct = useCreateProduct();
 *
 * await createProduct.mutateAsync({
 *   title: "2017 Toyota Camry SE",
 *   price_cents: 18500_00,
 *   category_id: "cat-123",
 *   attributes: {
 *     category: 'vehicle',
 *     vin: "2GNALCEK1H1615946", // triggers auto-vehicle creation
 *     year: 2017,
 *     make: "Chevrolet",
 *     model: "Equinox",
 *   }
 * });
 * ```
 */
export async function createProductWithVehicle(
  data: CreateProductRequest
): Promise<Product> {
  const res = await fetch("/api/v1/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to create product" }));
    throw new Error(error.message || "Failed to create product");
  }

  const product = (await res.json()) as BackendProductResponse;
  return product as Product;
}

/**
 * Mutation hook for creating products with vehicle auto-creation
 *
 * Automatically invalidates `['vehicles']` and `['products']` queries
 * on success to keep the catalog in sync.
 *
 * Features:
 * - Optimistic updates (optional)
 * - Toast notifications for success/error
 * - Automatic query invalidation
 *
 * Example:
 * ```tsx
 * function ProductForm() {
 *   const createProduct = useCreateProduct();
 *
 *   const handleSubmit = async (data) => {
 *     try {
 *       await createProduct.mutateAsync(data);
 *       // success toast shown automatically
 *     } catch (error) {
 *       // error toast shown automatically
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <button disabled={createProduct.isPending}>
 *         {createProduct.isPending ? "Creating..." : "Create Product"}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreateProduct(): UseMutationResult<
  Product,
  Error,
  CreateProductRequest,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductWithVehicle,

    onSuccess: (newProduct) => {
      // Invalidate vehicles query (may have auto-created vehicle)
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });

      toast.success("Product created successfully");
    },

    onError: (err) => {
      toast.error(err.message || "Failed to create product");
    },
  });
}

/**
 * Fetch products list
 */
export function useProducts(): UseQueryResult<Product[], Error> {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/v1/products", {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch products" }));
        throw new Error(error.message || "Failed to fetch products");
      }

      const data = (await res.json()) as ProductListResponse;
      return data.products;
    },
  });
}

/**
 * Update a product
 */
export async function updateProduct(
  productId: string,
  data: Partial<CreateProductRequest>
): Promise<Product> {
  const res = await fetch(`/api/v1/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to update product" }));
    throw new Error(error.message || "Failed to update product");
  }

  const product = (await res.json()) as BackendProductResponse;
  return product as Product;
}

/**
 * Update product status (for approval workflow)
 */
export async function updateProductStatus(
  productId: string,
  status: Product["status"]
): Promise<Product> {
  const res = await fetch(`/api/v1/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to update product" }));
    throw new Error(error.message || "Failed to update product");
  }

  return res.json();
}

/**
 * Mutation hook for updating product status
 */
export function useUpdateProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, status }: { productId: string; status: Product["status"] }) =>
      updateProductStatus(productId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product status updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update product status");
    },
  });
}

/**
 * Fetch a single product by ID.
 *
 * @param productId - Product UUID
 * @param options.internal - When true, passes `?internal=true` to the backend
 *   so that view_count is NOT incremented. Use this for seller-side reads
 *   (edit forms, admin panels) to avoid polluting analytics with internal traffic.
 */
export function useProduct(
  productId: string | undefined,
  options: { internal?: boolean } = {}
): UseQueryResult<Product, Error> {
  const { internal = false } = options;

  return useQuery({
    queryKey: ["products", productId, { internal }],
    queryFn: async () => {
      if (!productId) {
        throw new Error("Product ID is required");
      }

      const url = internal
        ? `/api/v1/products/${productId}?internal=true`
        : `/api/v1/products/${productId}`;

      const res = await fetch(url, {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch product" }));
        throw new Error(error.message || "Failed to fetch product");
      }

      const product = (await res.json()) as BackendProductResponse;
      return product as Product;
    },
    enabled: !!productId,
  });
}

/**
 * Mutation hook for updating products
 */
export function useUpdateProduct(): UseMutationResult<
  Product,
  Error,
  { productId: string; data: Partial<CreateProductRequest> },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }) => updateProduct(productId, data),

    onSuccess: (updatedProduct) => {
      // Invalidate products queries
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", updatedProduct.id] });

      toast.success("Product updated successfully");
    },

    onError: (err) => {
      toast.error(err.message || "Failed to update product");
    },
  });
}

/**
 * Delete product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to delete product" }));
        throw new Error(error.message || "Failed to delete product");
      }

      return id;
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });

      const previousProducts = queryClient.getQueryData<Product[]>(["products"]);

      queryClient.setQueryData<Product[]>(["products"], (old) =>
        old?.filter((p) => p.id !== id)
      );

      return { previousProducts };
    },

    onError: (err, _id, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(["products"], context.previousProducts);
      }

      toast.error(err.message || "Failed to delete product");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ─── Vehicle-specific helpers (catalog page) ─────────────────────────────────

/**
 * Transform Product to vehicle-like object for catalog display.
 * Extracts vehicle data from product.attributes.
 */
export function transformProductToVehicle(product: Product): {
  id: string
  title: string
  price: number
  status: "published" | "pending" | "failed" | "draft" | "expired" | "online" | "sold"
  photo_url?: string
  year?: number
  make?: string
  model?: string
  created_at: string
  updated_at: string
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attrs = product.attributes as any;
  // Try product-level image_urls first, fall back to attrs.image_urls for backward compat
  const imageUrls = Array.isArray(product.image_urls)
    ? product.image_urls
    : (Array.isArray(attrs?.image_urls) ? attrs.image_urls : []);
  return {
    id: product.id,
    title: product.title,
    price: product.price_cents / 100,
    // Map product status to vehicle status (product.status is more granular)
    status: mapProductStatusToVehicleStatus(product.status),
    photo_url: imageUrls[0] ?? undefined,
    year: attrs.year,
    make: attrs.make,
    model: attrs.model,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

/**
 * Map product status to vehicle status enum.
 * Product uses: draft | pending | published | paused | reserved | sold | rejected | archived
 * Vehicle uses: published | pending | failed | draft | expired | online | sold
 */
function mapProductStatusToVehicleStatus(
  status: Product["status"]
): "published" | "pending" | "failed" | "draft" | "expired" | "online" | "sold" {
  switch (status) {
    case "published": return "published";
    case "pending": return "pending";
    case "rejected": return "failed";
    case "draft": return "draft";
    case "archived": return "expired";
    case "sold": return "sold";
    case "paused": return "online";
    case "reserved": return "online";
    default: return "draft";
  }
}

export interface VehicleFilters {
  status?: "published" | "pending" | "failed" | "draft" | "expired" | "online" | "sold"
  search?: string
  make?: string
  model?: string
  year_min?: number
  year_max?: number
}

/**
 * Infinite scroll for vehicle products (products with category: 'vehicle')
 * Note: Does NOT filter by isVehicleProduct — caller should filter if needed.
 *       Currently catalog page needs all products returned and filters via isVehicleProduct.
 */
export function useInfiniteProducts(filters?: VehicleFilters, limit: number = 50) {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append("status", filters.status);
  if (filters?.search) queryParams.append("search", filters.search);
  if (filters?.make) queryParams.append("make", filters.make);
  if (filters?.model) queryParams.append("model", filters.model);
  if (filters?.year_min) queryParams.append("year_min", filters.year_min.toString());
  if (filters?.year_max) queryParams.append("year_max", filters.year_max.toString());
  queryParams.append("limit", limit.toString());

  return useInfiniteQuery({
    queryKey: ["products", "infinite", filters, limit],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const params = new URLSearchParams(queryParams);
      if (pageParam) {
        params.append("cursor", pageParam);
      }

      const res = await fetch(`/api/v1/products?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch products" }));
        throw new Error(error.message || "Failed to fetch products");
      }

      const data = await res.json() as ProductListResponse;

      return {
        items: data.products,
        next_cursor: null, // TODO: Add cursor pagination support
        has_more: data.products.length === limit,
      } as const;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 60 * 1000, // 1 minute
  });
}
