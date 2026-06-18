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

const attributeSchemaEntrySchema = z.object({
  type: attributeTypeSchema,
  filter_type: filterTypeSchema,
  unit: z.string().optional(),
  label: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const cardFieldSchema = z.object({
  key: z.string(),
  source: z.string(),
});

const filterFieldSchema = z.object({
  key: z.string(),
  filter_type: filterTypeSchema,
  label: z.string().optional(),
});

const categoryPresentationSchema = z.object({
  card_fields: z.array(cardFieldSchema),
  subtitle_template: z.string().nullable(),
  filter_fields: z.array(filterFieldSchema),
});

const categoryNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  attribute_schema: z.record(attributeSchemaEntrySchema),
  presentation: categoryPresentationSchema.nullable(),
  filter_fields: z.array(filterFieldSchema),
});

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

/** Error body schema for non-OK responses. FastAPI default errors are
 *  `{ detail: ... }`, so we only narrow the optional `message` field. */
const errorBodySchema = z
  .object({ message: z.string().optional() })
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
          parsed.success && parsed.data.message
            ? parsed.data.message
            : "Failed to fetch verticals";
        throw new Error(message);
      }
      const raw: unknown = await res.json();
      const parsed = orgVerticalsResponseSchema.parse(raw);
      return parsed satisfies OrgVerticalsResponse;
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
    values: z.record(z.array(z.string())),
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
  const res = await fetch(
    `/api/v1/categories/${categoryId}/filter-values`,
    { credentials: "include" },
  );
  if (!res.ok) return {};
  const parsed = filterValuesSchema.safeParse(await res.json());
  return parsed.success ? parsed.data.values : {};
}
