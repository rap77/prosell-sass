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
import {
  CategorySchemaResponseSchema,
  MigrationWarningResponseSchema,
  SchemaHistorySchema,
} from "@/lib/api/schemas/categorySchema";
import type {
  AttributeField,
  AttributeGroup,
  CategorySchemaResponse,
  SchemaChangeEntry,
} from "@/lib/api/schemas/categorySchema";

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
  // ponytail: org info derived from products.organization_id JOIN organizations.
  // Single source of truth for who owns the product (tenant cascade).
  org_code: z.string().nullish(),
  org_color: z.string().nullish(),
  category_id: z.string(),
  title: z.string(),
  slug: z.string().nullish(),
  description: z.string().nullish(),
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
  cover_image_key: z.string().nullish(),
  location_city: z.string().nullish(),
  location_state: z.string().nullish(),
  location_zip: z.string().nullish(),
  is_featured: z.boolean(),
  published_to_marketplace: z.boolean().optional(),
  view_count: z.number(),
  favorite_count: z.number(),
  submitted_for_approval_at: z.string().nullish(),
  submitted_by: z.string().nullish(),
  approved_at: z.string().nullish(),
  approved_by: z.string().nullish(),
  rejection_reason: z.string().nullish(),
  published_at: z.string().nullish(),
  sold_at: z.string().nullish(),
  archived_at: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string(),
});

function parseProductResponse(raw: unknown): Product {
  return productSchema.parse(raw);
}

const productListResponseSchema = z.object({
  products: z.array(productSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
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

    onSuccess: () => {
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
 *
 * Payload accepts the fields of UpdateProductRequest, including
 * `organization_id` (tenant cascade — ProSell can transfer a product to
 * another organization; the backend clears broker shares on change).
 */
export async function updateProduct(
  productId: string,
  data: Partial<CreateProductRequest> & { organization_id?: string | null },
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
 * Mutation hook for updating products.
 *
 * `data.organization_id` (tenant cascade) is allowed only for callers
 * with ORG_ADMIN_VIEW_ALL; the backend returns 403 otherwise.
 */
export function useUpdateProduct(): UseMutationResult<
  Product,
  Error,
  {
    productId: string;
    data: Partial<CreateProductRequest> & {
      organization_id?: string | null;
    };
  },
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

  return useMutation<string, Error, string, { previousProducts?: Product[] }>({
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
  cover_image_key?: string | null;
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
  cover_image_key: z.string().nullable().optional(),
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
    photo_url: coverKey ?? undefined,
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
  const initialPageParam: string | null = null;

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
    initialPageParam,
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
        const error: unknown = await res.json().catch(() => ({}));
        throw new Error(
          extractErrorMessage(error, "Failed to upload products"),
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

/**
 * Category schema hooks (PR2 — bulk upload category generalization).
 *
 * `useCategorySchema` reads the current attribute_schema for a category.
 * `usePatchCategorySchema` replaces it; when type/required changes affect
 * existing products, backend returns 422 + migration_warnings — caller must
 * re-send with `force: true`. `useCloneCategorySchema` copies attributes
 * from a source category. `useCategorySchemaHistory` returns the audit log.
 * `downloadSchemaTemplate` fetches a CSV template with the category's
 * universal + per-attribute headers.
 */

type PatchSchemaVars = {
  categoryId: string;
  schema: Record<string, AttributeField>;
  groups?: AttributeGroup[];
  force?: boolean;
};

type CloneSchemaVars = {
  targetId: string;
  sourceId: string;
  force?: boolean;
};

export function useCategorySchema(categoryId: string) {
  return useQuery<CategorySchemaResponse, Error>({
    queryKey: ["category-schema", categoryId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/categories/${categoryId}/schema`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load schema");
      return CategorySchemaResponseSchema.parse(await res.json());
    },
    enabled: Boolean(categoryId),
  });
}

export function usePatchCategorySchema() {
  const queryClient = useQueryClient();

  return useMutation<CategorySchemaResponse, Error, PatchSchemaVars>({
    mutationFn: async ({ categoryId, schema, groups, force }) => {
      const url = `/api/v1/categories/${categoryId}/schema${force ? "?force=true" : ""}`;
      const res = await fetch(url, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attribute_schema: schema,
          attribute_groups: groups ?? [],
        }),
      });
      if (!res.ok) {
        const err: unknown = await res.json().catch(() => ({}));
        const migration = z
          .object({ detail: MigrationWarningResponseSchema })
          .safeParse(err);
        throw new Error(
          migration.success
            ? JSON.stringify(migration.data.detail)
            : extractErrorMessage(err, "Failed to update schema"),
        );
      }
      return CategorySchemaResponseSchema.parse(await res.json());
    },

    onSuccess: (_, { categoryId }) => {
      queryClient.invalidateQueries({
        queryKey: ["category-schema", categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["category-schema-history", categoryId],
      });
      toast.success("Schema updated");
    },

    onError: () => {
      // Don't toast here — caller inspects the error for migration_warnings
      // and decides whether to prompt the user to confirm force=true.
    },
  });
}

export function useCloneCategorySchema() {
  const queryClient = useQueryClient();

  return useMutation<CategorySchemaResponse, Error, CloneSchemaVars>({
    mutationFn: async ({ targetId, sourceId, force }) => {
      const url = `/api/v1/categories/${targetId}/schema/clone-from/${sourceId}${force ? "?force=true" : ""}`;
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to clone schema");
      return CategorySchemaResponseSchema.parse(await res.json());
    },

    onSuccess: (_, { targetId }) => {
      queryClient.invalidateQueries({
        queryKey: ["category-schema", targetId],
      });
      toast.success("Schema cloned");
    },
  });
}

export function useCategorySchemaHistory(categoryId: string) {
  return useQuery<SchemaChangeEntry[], Error>({
    queryKey: ["category-schema-history", categoryId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/categories/${categoryId}/schema/history`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to load history");
      return SchemaHistorySchema.parse(await res.json());
    },
    enabled: Boolean(categoryId),
  });
}

/**
 * Download a CSV template pre-populated with this category's universal
 * columns + per-attribute headers. Plain async function (no hook) because
 * it has no cache/mutation semantics — caller invokes on button click.
 */
export async function downloadSchemaTemplate(
  categoryId: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/categories/${categoryId}/schema/template.csv`,
    {
      credentials: "include",
    },
  );
  if (!res.ok) return;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `schema-template-${categoryId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Product Ownership ─────────────────────────────────────────────────────────

export interface OwnerShare {
  owner_id: string;
  owner_type: "organization" | "user";
  percentage: string;
  created_at?: string;
}

export interface ProductOwnership {
  product_id: string;
  owners: OwnerShare[];
}

const ownerShareSchema = z.object({
  owner_id: z.string(),
  owner_type: z.enum(["organization", "user"]).default("organization"),
  percentage: z.string(),
  created_at: z.string().optional(),
});

const productOwnershipSchema = z.object({
  product_id: z.string(),
  owners: z.array(ownerShareSchema),
});

/**
 * Fetch ownership for a product.
 */
export function useProductOwnership(
  productId: string | undefined,
): UseQueryResult<ProductOwnership, Error> {
  return useQuery({
    queryKey: ["products", productId, "ownership"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/products/${productId}/ownership`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(body, "Failed to fetch ownership"));
      }
      return productOwnershipSchema.parse(await res.json());
    },
    enabled: !!productId,
  });
}

/**
 * Set broker shares for a product (replaces existing broker rows).
 *
 * Product-level ownership (the tenant) is changed via PATCH /products/{id}
 * with the `organization_id` field; this hook is for broker (user) shares
 * only — owner_type is forced to "user" because the /brokers endpoint
 * rejects organization shares (use organization_id for that).
 */
export function useSetProductBrokers() {
  const queryClient = useQueryClient();

  return useMutation<
    ProductOwnership,
    Error,
    {
      productId: string;
      owners: Array<{ owner_id: string; percentage: string }>;
    }
  >({
    mutationFn: async ({ productId, owners }) => {
      const res = await fetch(`/api/v1/products/${productId}/brokers`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owners }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(body, "Failed to set brokers"));
      }
      return productOwnershipSchema.parse(await res.json());
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Brokers updated");
    },

    onError: (err) => {
      toast.error(err.message || "Failed to update brokers");
    },
  });
}
