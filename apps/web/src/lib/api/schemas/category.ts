/**
 * Zod schemas for the categories API.
 *
 * These schemas validate the wire shape of category responses at the
 * HTTP boundary. After parsing, the data flows into `mapBackendCategoryToDomain`
 * (in `./categoryMapper`) which projects it to the strict frontend
 * `Category` contract.
 *
 * The schemas are intentionally permissive: `BackendCategorySchema` is
 * `.passthrough()` so the backend may add fields (e.g. `parent_id`,
 * `level`, `icon`, `image_url`, `sort_order`, `field_config`,
 * `tenant_id`) without breaking the frontend. The mapper projects to
 * the subset the frontend actually uses.
 */

import { z } from "zod";

/**
 * `CategoryPresentation` shape (frontend contract, post-Subsystem A T1).
 * Validates the `presentation` field of a category response at the wire
 * boundary. The backend's `CategoryResponse` DTO does not currently
 * serialize `presentation`; this schema exists for the post-fix backend
 * and to keep the wire validator honest about the contract.
 */
const CardFieldSchema = z.object({
  key: z.string(),
  source: z.string(),
});

const FilterFieldSchema = z.object({
  key: z.string(),
  filter_type: z.enum(["range", "exact", "boolean", "select"]),
  label: z.string(),
});

const CategoryPresentationSchema = z.object({
  card_fields: z.array(CardFieldSchema),
  subtitle_template: z.string().nullable(),
  filter_fields: z.array(FilterFieldSchema),
});

/**
 * Wire shape of a single category from `GET /api/v1/categories`.
 *
 * Mirrors the backend's `CategoryResponse` Pydantic DTO. The cast
 * inside `mapBackendCategoryToDomain` operates on the parsed result of
 * this schema, so `attribute_schema` is `Record<string, unknown>` here
 * (the wire shape) and becomes `Record<string, AttributeSchemaEntry>`
 * after the mapper.
 */
export const BackendCategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    attribute_schema: z.record(z.string(), z.unknown()).optional(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    /**
     * The backend's `CategoryResponse` DTO does not currently serialize
     * `presentation`. Tolerate both states (omitted, null, or present)
     * so the mapper works against the current and post-fix backends.
     */
    presentation: CategoryPresentationSchema.nullable().optional(),
  })
  .passthrough();

export type BackendCategoryParsed = z.infer<typeof BackendCategorySchema>;

/**
 * Wire shape of the paginated list response from `GET /api/v1/categories`.
 */
export const BackendListResponseSchema = z.object({
  categories: z.array(BackendCategorySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type BackendListResponseParsed = z.infer<typeof BackendListResponseSchema>;
