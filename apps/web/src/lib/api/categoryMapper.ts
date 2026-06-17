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
 * This mapper is the single point of truth for that translation. The
 * `attribute_schema` field is cast with `as Record<string,
 * AttributeSchemaEntry>` — see DEBT note below.
 *
 * DEBT (runtime, documented)
 * --------------------------
 * The cast is a deliberate type lie: the backend's `dict[str, Any]`
 * cannot be strictly validated at the boundary without an explicit
 * Pydantic schema for `AttributeSchemaEntry`. The three overlapping
 * fields (`type`, `filter_type`, `options`) are compatible at runtime;
 * the rest is silently dropped on the frontend.
 *
 * The proper end-to-end schema alignment (Pydantic schema for
 * `AttributeSchemaEntry`, `presentation` in `CategoryResponse`,
 * migration of legacy `attribute_schema` rows) is a separate task and
 * is the right place to retire this cast.
 */

import type {
  AttributeSchemaEntry,
  Category,
  CategoryPresentation,
} from "@/types/category";

/**
 * Raw shape of a category as returned by the backend's
 * `GET /api/v1/categories` endpoint.
 */
export interface BackendCategory {
  id: string;
  name: string;
  slug: string;
  /**
   * Backend uses a validation-oriented shape. The frontend contract is
   * stricter (see file header DEBT note). Cast at the mapper boundary.
   */
  attribute_schema?: Record<string, unknown>;
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
    attribute_schema: (raw.attribute_schema ?? {}) as Record<
      string,
      AttributeSchemaEntry
    >,
    presentation: raw.presentation ?? null,
    is_active: raw.is_active,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}
