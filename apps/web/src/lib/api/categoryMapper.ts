/**
 * Mapper from the backend's loose Category response shape to the strict
 * frontend `Category` contract (Subsystem A, post-T1).
 *
 * Why this exists
 * ---------------
 * The backend's `CategoryResponse` Pydantic DTO
 * (apps/api/src/prosell/application/dto/category/response.py) has two
 * contract gaps vs. the frontend's `Category` type
 * (apps/web/src/types/category.ts):
 *
 *   1. `attribute_schema` is a free-form `dict[str, Any]` on the backend
 *      (validation-oriented: `{type, required, filterable, filter_type,
 *      options}`). The frontend uses a strict
 *      `Record<string, AttributeSchemaEntry>` (display-oriented:
 *      `{type, filter_type, unit?, label?, options?}`).
 *
 *   2. `presentation` lives on the backend entity + ORM model but is NOT
 *      serialized by the response DTO. The frontend expects
 *      `CategoryPresentation | null`.
 *
 * This mapper is the single point of truth for that translation.
 * `attribute_schema` is validated at the boundary via a Zod schema that
 * narrows the free-form JSONB to the frontend `AttributeSchemaEntry` shape.
 * Extra backend-only fields (`required`, `filterable`) are stripped by the
 * parser; missing optional fields default to `undefined`.
 *
 * Note: `presentation` lives on the backend entity but is NOT serialized by
 * the list DTO. It defaults to `null` here; a separate task will add it to
 * `CategoryResponse` when needed.
 */

import { z } from "zod";
import { AttributeGroupSchema } from "@/lib/api/schemas/categorySchema";
import type {
  AttributeSchemaEntry,
  Category,
  CategoryPresentation,
} from "@/types/category";

const _attributeSchemaEntrySchema = z.object({
  type: z
    .enum(["number", "string", "boolean", "select"])
    .catch("string" as "string" | "number" | "boolean" | "select"),
  filter_type: z
    .enum(["range", "select", "text", "boolean", "exact"])
    .default("text"),
  unit: z.string().optional(),
  label: z.string().optional(),
  options: z.array(z.string()).optional(),
  group: z.string().optional(),
});
const _attributeSchemaMapSchema = z.record(
  z.string(),
  _attributeSchemaEntrySchema,
);

/**
 * Raw shape of a category as returned by the backend's
 * `GET /api/v1/categories` endpoint.
 */
export interface BackendCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  level?: number;
  sort_order?: number;
  icon?: string | null;
  description?: string | null;
  image_url?: string | null;
  /**
   * Backend uses a validation-oriented shape. The frontend contract is
   * stricter (see file header DEBT note). Cast at the mapper boundary.
   */
  attribute_schema?: Record<string, unknown>;
  attribute_groups?: Record<string, unknown>[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /**
   * Optional + nullable so the mapper tolerates both the current
   * backend (omits the field) and the post-fix backend (sends it).
   */
  presentation?: CategoryPresentation | null;
}

/**
 * Map a raw backend category to the strict frontend `Category` contract.
 *
 * - `attribute_schema` is cast through `unknown` (see DEBT note above).
 * - `presentation` defaults to `null` when the backend omits or nulls it.
 * - All other fields are passed through verbatim.
 */
export function mapBackendCategoryToDomain(raw: BackendCategory): Category {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    parent_id: raw.parent_id ?? null,
    level: raw.level ?? 0,
    sort_order: raw.sort_order ?? 0,
    icon: raw.icon ?? null,
    description: raw.description ?? null,
    image_url: raw.image_url ?? null,
    attribute_schema: _attributeSchemaMapSchema
      .catch({})
      .parse(raw.attribute_schema ?? {}),
    attribute_groups: z
      .array(AttributeGroupSchema)
      .catch([])
      .parse(raw.attribute_groups ?? []),
    presentation: raw.presentation ?? null,
    is_active: raw.is_active,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}
