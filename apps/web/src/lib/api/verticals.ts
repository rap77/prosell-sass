import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import type { OrgVerticalsResponse } from "@/types/category";

/**
 * Schemas for `GET /api/v1/organizations/{organization_id}/verticals`
 * (Foundation, PR #10 + #13). The full per-vertical shape is
 * intentionally validated to keep the response contract enforceable
 * end-to-end; per-category shapes (categories[].attribute_schema,
 * categories[].presentation, etc.) live in `@/types/category` and are
 * trusted at the call site after Zod validation.
 */
const filterTypeSchema = z.enum([
  "range",
  "select",
  "text",
  "boolean",
  "exact",
]);
const attributeTypeSchema = z.enum(["number", "string", "boolean", "select"]);

// ponytail: passthrough — API adds required/filterable/etc, frontend only validates what it uses
const attributeSchemaEntrySchema = z
  .object({
    type: attributeTypeSchema,
    filter_type: filterTypeSchema,
    unit: z.string().optional(),
    label: z.string().optional(),
    // ponytail: options can be strings or numbers (cylinders: [3,4,5,6,8], doors: [2,3,4,5])
    options: z.array(z.union([z.string(), z.number()])).optional(),
    validation_rules: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .optional(),
    group: z.string().optional(),
  })
  .passthrough();

// ponytail: passthrough — API may add fields, order is optional
const attributeGroupSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    order: z.number().optional(),
    fields: z.array(z.string()).optional(),
  })
  .passthrough();

// ponytail: card_fields can be strings or objects — API is inconsistent
const cardFieldSchema = z.union([
  z.string(),
  z.object({ key: z.string(), source: z.string() }),
]);

const filterFieldSchema = z.object({
  key: z.string(),
  filter_type: filterTypeSchema,
  label: z.string().optional(),
});

// ponytail: passthrough — API has title_template, etc
const categoryPresentationSchema = z
  .object({
    card_fields: z.array(cardFieldSchema).optional(),
    subtitle_template: z.string().nullable().optional(),
    filter_fields: z.array(filterFieldSchema).optional(),
  })
  .passthrough();

interface CategoryNodeShape {
  id: string;
  name: string;
  slug: string;
  attribute_schema: Record<string, z.infer<typeof attributeSchemaEntrySchema>>;
  attribute_groups: z.infer<typeof attributeGroupSchema>[];
  presentation: z.infer<typeof categoryPresentationSchema> | null;
  filter_fields: z.infer<typeof filterFieldSchema>[];
  children?: CategoryNodeShape[];
}

// ponytail: ZodType<Shape> — constrains output only; needed for z.lazy + .default()
const categoryNodeSchema: z.ZodType<CategoryNodeShape> =
  z.lazy(() =>
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      attribute_schema: z.record(z.string(), attributeSchemaEntrySchema),
      attribute_groups: z.array(attributeGroupSchema).default([]),
      presentation: categoryPresentationSchema.nullable(),
      filter_fields: z.array(filterFieldSchema),
      children: z.array(categoryNodeSchema).default([]),
    }),
  );

const verticalResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  presentation: categoryPresentationSchema.nullable(),
  categories: z.array(categoryNodeSchema),
});

const orgVerticalsResponseSchema = z.object({
  verticals: z.array(verticalResponseSchema),
});

const errorBodySchema = z
  .object({ detail: z.string().optional() })
  .passthrough();

/**
 * Fetch the verticals + their categories for a given organization.
 *
 * When `organizationId` is `null` (e.g. user is loading), the query is
 * disabled — `data` stays `undefined` and no network call is made.
 */
export function useOrgVerticals(
  organizationId: string | null,
): UseQueryResult<OrgVerticalsResponse, Error> {
  return useQuery({
    queryKey: ["org-verticals", organizationId],
    queryFn: async (): Promise<OrgVerticalsResponse> => {
      const res = await fetch(
        `/api/v1/organizations/${organizationId}/verticals`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const parsed = errorBodySchema.safeParse(
          await res.json().catch(() => ({})),
        );
        const message =
          parsed.success && parsed.data.detail
            ? parsed.data.detail
            : "Failed to fetch verticals";
        throw new Error(message);
      }
      const raw: unknown = await res.json();
      const parsed = orgVerticalsResponseSchema.parse(raw);
      // ponytail: Zod validates, types drift — cast is safe; fix types when it hurts
      return parsed as unknown as OrgVerticalsResponse;
    },
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Filter-values response schema.
 *
 * Endpoint: `GET /api/v1/categories/{category_id}/filter-values`
 * (Subsystem B, Task 5 + secfix F2).
 *
 * Shape: `{ values: Record<string, string[]> }` plus an optional
 * `truncated: string[]` flag (added by the secfix to surface which
 * attribute keys were capped at the cardinality limit). We accept the
 * wider shape with `.extend` so both pre- and post-secfix payloads
 * parse without breaking callers.
 */
const filterValuesSchema = z
  .object({
    values: z.record(z.string(), z.array(z.string())),
  })
  .extend({
    truncated: z.array(z.string()).optional(),
  });

/**
 * Fetch distinct values for dynamic filter fields in a category.
 *
 * Used by `FilterSidebar` for `select` fields without static `options`
 * (Subsystem B, Task 9). Returns `{}` on non-OK responses or when the
 * body fails schema validation, so callers can render an empty state
 * without special-casing. Network rejections propagate to the caller.
 */
export async function fetchFilterValues(
  categoryId: string,
): Promise<Record<string, string[]>> {
  const res = await fetch(`/api/v1/categories/${categoryId}/filter-values`, {
    credentials: "include",
  });
  if (!res.ok) return {};
  const parsed = filterValuesSchema.safeParse(await res.json());
  return parsed.success ? parsed.data.values : {};
}

/**
 * `fetchFilterValues` as a TanStack Query hook, disabled until a category
 * is selected (Subsystem B, Task 12).
 */
export function useFilterValues(
  categoryId: string | null,
): UseQueryResult<Record<string, string[]>, Error> {
  return useQuery({
    queryKey: ["filter-values", categoryId],
    queryFn: () => {
      if (!categoryId) throw new Error("categoryId is required");
      return fetchFilterValues(categoryId);
    },
    enabled: Boolean(categoryId),
    staleTime: 5 * 60 * 1000,
  });
}
