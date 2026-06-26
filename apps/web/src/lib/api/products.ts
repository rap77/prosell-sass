import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import type {
  CreateProductRequest,
  Product,
  ProductListResponse,
} from "@/types/product";
import { getAttributeMap } from "@/types/product";
import {
  isVehicleAttributes,
  isRealEstateAttributes,
  isGenericAttributes,
  type ProductAttributes,
} from "@/types/vehicle";
import { extractErrorMessage } from "./extractErrorMessage";
import { getCoverImageKey } from "./productImages";
import { mapProductStatusToVehicleStatus } from "@/lib/utils/mapProductStatusToVehicleStatus";
import { BulkUploadUploadResultSchema } from "@/lib/api/schemas/bulkUpload";
import type { BulkUploadUploadResult } from "@/lib/api/schemas/bulkUpload";

function isProductAttributes(value: unknown): value is ProductAttributes {
  return (
    isVehicleAttributes(value) ||
    isRealEstateAttributes(value) ||
    isGenericAttributes(value)
  );
}

/**
 * Mirrors the full `Product` shape so `parse()`'s inferred type is
 * structurally assignable to `Product` — no `as` needed, the function's
 * `: Product` return annotation makes TypeScript check assignability.
 * `attributes` reuses the discriminated-union guards from `types/vehicle`
 * rather than duplicating their shape here.
 */
const productSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  organization_id: z.string(),
  category_id: z.string(),
  title: z.string(),
  slug: z.string().optional(),
  description: z.string().optional(),
  price_cents: z.number(),
  currency: z.string(),
  condition: z.enum(["new", "used", "refurbished"]),
  status: z.enum([
    "draft",
    "pending",
    "published",
    "paused",
    "reserved",
    "sold",
    "rejected",
    "archived",
  ]),
  attributes: z.custom<ProductAttributes>(isProductAttributes),
  image_urls: z.array(z.string()).optional(),
  cover_image_key: z.string().nullable().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip: z.string().optional(),
  is_featured: z.boolean(),
  published_to_marketplace: z.boolean().optional(),
  view_count: z.number(),
  favorite_count: z.number(),
  submitted_for_approval_at: z.string().optional(),
  submitted_by: z.string().optional(),
  approved_at: z.string().optional(),
  approved_by: z.string().optional(),
  rejection_reason: z.string().optional(),
  published_at: z.string().optional(),
  sold_at: z.string().optional(),
  archived_at: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

function parseProductResponse(raw: unknown): Product {
  return productSchema.parse(raw);
}

const productListResponseSchema = z.object({
  products: z.array(productSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

function parseProductListResponse(raw: unknown): ProductListResponse {
  return productListResponseSchema.parse(raw);
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
  data: CreateProductRequest,
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
    const body = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, "Failed to create product"));
  }

  return parseProductResponse(await res.json());
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
        const body = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(body, "Failed to fetch products"));
      }

      const data = parseProductListResponse(await res.json());
      return data.products;
    },
  });
}

/**
 * Update a product
 */
export async function updateProduct(
  productId: string,
  data: Partial<CreateProductRequest>,
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
    const body = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, "Failed to update product"));
  }

  return parseProductResponse(await res.json());
}

/**
 * Update product status (for approval workflow)
 */
export async function updateProductStatus(
  productId: string,
  status: Product["status"],
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
    const body = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, "Failed to update product"));
  }

  return parseProductResponse(await res.json());
}

/**
 * Mutation hook for updating product status
 */
export function useUpdateProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      status,
    }: {
      productId: string;
      status: Product["status"];
    }) => updateProductStatus(productId, status),
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
  options: { internal?: boolean } = {},
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
        const body = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(body, "Failed to fetch product"));
      }

      return parseProductResponse(await res.json());
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
      queryClient.invalidateQueries({
        queryKey: ["products", updatedProduct.id],
      });

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
        const body = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(body, "Failed to delete product"));
      }

      return id;
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });

      const previousProducts = queryClient.getQueryData<Product[]>([
        "products",
      ]);

      queryClient.setQueryData<Product[]>(["products"], (old) =>
        old?.filter((p) => p.id !== id),
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

// ─── Signed image URLs ─────────────────────────────────────────────────────────

export interface ProductImageUrl {
  key: string;
  url: string;
  expires_in: number;
}

export interface ProductImageUrlsResponse {
  product_id: string;
  images: ProductImageUrl[];
}

const productImageUrlsResponseSchema = z.object({
  product_id: z.string(),
  images: z.array(
    z.object({
      key: z.string(),
      url: z.string(),
      expires_in: z.number(),
    }),
  ),
});

/**
 * Fetch signed URLs for product images.
 *
 * DO Spaces is private (403 on direct URLs), so this hook fetches
 * time-limited signed download URLs generated by the backend.
 *
 * Cache is set to 5 minutes — the backend signed URLs expire after 1 hour.
 */
export function useProductImageUrls(productId: string | undefined) {
  return useQuery({
    queryKey: ["products", productId, "image-urls"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/products/${productId}/image-urls`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch image URLs");
      return productImageUrlsResponseSchema.parse(await res.json());
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    // The signed URL endpoint will 404 for products the user can't see
    // (different tenant) and the card already falls back to the placeholder
    // in that case. We only retry once to absorb transient network blips.
    retry: 1,
  });
}

// ─── Set the product cover ─────────────────────────────────────────────────────

/**
 * PATCH the product to set (or clear) its cover image. Pure
 * fetcher — the `useSetProductCover` hook below wraps it in a
 * TanStack Query mutation with invalidation and toast.
 *
 * Contract:
 *   - `key === null`  → clear the cover (body is `{ cover_image_key: null }`).
 *   - `key === "..."` → set the cover to that storage key. The
 *                       backend validator rejects keys that are not
 *                       in the product's current `image_urls` list.
 *
 * The `key` MUST be the storage key (e.g. `orgs/<uuid>/vehicles/<file>.jpg`),
 * NOT a signed URL — the backend stores the raw key, and the cover
 * lookup uses the same key as the gallery.
 */
export async function setProductCover(
  productId: string,
  key: string | null,
): Promise<Product> {
  const res = await fetch(`/api/v1/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ cover_image_key: key }),
  });

  if (!res.ok) {
    // Surface the backend's message verbatim — the validator
    // returns a 422 with a descriptive `detail` ("cover_image_key
    // 'X' is not in the product's current image list") that the UI
    // shows to the user. Falling back to a generic message would
    // hide a useful diagnostic.
    const body = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(body, "Failed to set cover"));
  }

  return parseProductResponse(await res.json());
}

/**
 * Mutation hook: set (or clear) the product's cover image.
 *
 * On success, invalidates the product's query so the catalog grid,
 * detail view, and any other consumer re-fetch and pick up the new
 * cover. On error, shows a toast with the backend's message.
 */
export function useSetProductCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      key,
    }: {
      productId: string;
      key: string | null;
    }) => setProductCover(productId, key),

    onSuccess: (_data, { productId }) => {
      // Invalidate every product-related query so the catalog grid,
      // detail view, CommandPalette thumbnail, etc. all see the
      // new cover on next render.
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
      toast.success("Cover updated");
    },

    onError: (err) => {
      toast.error(err.message || "Failed to update cover");
    },
  });
}

// ─── Vehicle-specific helpers (catalog page) ─────────────────────────────────

/**
 * Transform Product to vehicle-like object for catalog display.
 * Extracts vehicle data from product.attributes.
 */
export function transformProductToVehicle(product: Product): {
  id: string;
  title: string;
  price: number;
  status:
    | "published"
    | "pending"
    | "failed"
    | "draft"
    | "expired"
    | "online"
    | "sold";
  photo_url?: string;
  year?: number;
  make?: string;
  model?: string;
  created_at: string;
  updated_at: string;
} {
  const attrMap = getAttributeMap(product.attributes);
  const year = typeof attrMap.year === "number" ? attrMap.year : undefined;
  const make = typeof attrMap.make === "string" ? attrMap.make : undefined;
  const model = typeof attrMap.model === "string" ? attrMap.model : undefined;
  // Use the shared image-key resolver. It handles both post-migration
  // (`product.image_urls`) and legacy (`attrs.image_urls`) sources —
  // the naive `Array.isArray(product.image_urls) ? … : …` short-circuit
  // missed the case where the backend returns `[]` for the top-level
  // field and the actual keys live in `attrs.image_urls` (the create
  // form persists there). See `productImages.ts` for the regression
  // context.
  // The cover is now an explicit field on the product — see
  // `getCoverImageKey` for the priority rules. Falls back to the
  // first image when no cover is set (legacy / pre-migration data).
  const coverKey = getCoverImageKey(product);
  return {
    id: product.id,
    title: product.title,
    price: product.price_cents / 100,
    // Map product status to vehicle status (product.status is more granular)
    status: mapProductStatusToVehicleStatus(product.status),
    photo_url: coverKey,
    year,
    make,
    model,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

export interface ProductFilters {
  status?:
    | "published"
    | "pending"
    | "failed"
    | "draft"
    | "expired"
    | "online"
    | "sold";
  search?: string;
  /** Scopes the list to one category; required for `attributes` to apply. */
  category_id?: string;
  /** Category-driven attribute filters, mapped to `attr.<key>` (Task 12). */
  attributes?: Record<string, string>;
}

/**
 * Infinite scroll for products.
 * Note: Does NOT filter by isVehicleProduct — caller should filter if needed.
 *       Currently catalog page needs all products returned and filters via isVehicleProduct.
 */
export function useInfiniteProducts(
  filters?: ProductFilters,
  limit: number = 50,
) {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append("status", filters.status);
  if (filters?.search) queryParams.append("search", filters.search);
  if (filters?.category_id)
    queryParams.append("category_id", filters.category_id);
  for (const [key, value] of Object.entries(filters?.attributes ?? {})) {
    if (value) queryParams.append(`attr.${key}`, value);
  }
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
        const body = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(body, "Failed to fetch products"));
      }

      const data = parseProductListResponse(await res.json());

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

/**
 * Bulk upload products via CSV file (schema-aware, backend PR1).
 *
 * Sends the file as `multipart/form-data` to
 * `POST /api/v1/products/bulk-upload`. The backend parses the CSV against
 * each row's category `attribute_schema` and returns a
 * `BulkUploadUploadResult` describing per-row outcomes. Clients handle
 * partial failures via the `BulkUploadErrorModal`.
 */
export function useBulkUploadProducts() {
  const queryClient = useQueryClient();

  return useMutation<BulkUploadUploadResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("csv_file", file);

      const res = await fetch("/api/v1/products/bulk-upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ detail: "Upload failed" }));
        throw new Error(
          typeof error.detail === "string"
            ? error.detail
            : "Failed to upload products",
        );
      }

      return BulkUploadUploadResultSchema.parse(await res.json());
    },

    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });

      if (result.failed_count === 0) {
        toast.success(`Successfully uploaded ${result.created_count} products`);
      } else {
        toast.warning(
          `Uploaded ${result.created_count} products — ${result.failed_count} rows failed`,
        );
      }
    },

    onError: (err) => {
      toast.error(err.message || "Failed to upload products");
    },
  });
}
