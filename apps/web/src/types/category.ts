/**
 * Category domain types.
 *
 * `presentation` is the contract that drives how a category's products render
 * in the catalog grid (Subsystem A — Generic ProductCard). It is JSON-serializable
 * and persisted on the backend Category model.
 *
 * `attribute_schema` describes the *shape* of `Product.attributes` for a category.
 * Each entry maps an attribute key to its `type`, `filter_type`, and optional
 * `unit`. It is consumed by both the catalog filters (Subsystem B) and the
 * generic card's `card_fields` rendering.
 *
 * Foundation spec:
 *   docs/superpowers/specs/2026-06-06-category-presentation-foundation-design.md
 * Subsystem A spec:
 *   docs/superpowers/specs/2026-06-09-subsystem-a-productcard-design.md
 */

/* ---------- attribute_schema entries ---------- */

/**
 * Canonical set of `filter_type` values that the catalog understands.
 *
 * The 5 values match the backend resolver (post-Subsystem B G2) and
 * the backend seed schema. `text` was added for free-form attributes
 * (e.g. model name, color); `exact` and `boolean` remain for
 * historical compatibility.
 */
export type FilterType = "range" | "select" | "text" | "boolean" | "exact";

/**
 * Per-attribute constraints. Currently used by `range` filters to give
 * the Slider sensible bounds (e.g. `year` 1980-2026, `price` 0-1M USD).
 * Future: regex for `text`, allowed enums for tighter validation, etc.
 */
export interface ValidationRules {
  min?: number;
  max?: number;
}

/** A single entry in `attribute_schema`. */
export interface AttributeSchemaEntry {
  /** Logical type used for client-side formatting. */
  type: "number" | "string" | "boolean" | "select";
  /** How the attribute is filterable in the catalog. */
  filter_type: FilterType;
  /** Optional display unit (e.g. "km", "m²", "USD"). */
  unit?: string;
  /** Optional human-readable label override (defaults to humanized key). */
  label?: string;
  /** For `select` type: allowed values. */
  options?: string[];
  /** Optional per-attribute constraints (e.g. Slider bounds for `range`). */
  validation_rules?: ValidationRules;
}

/* ---------- presentation contract ---------- */

/**
 * One `card_field` shown in the ProductCard's meta grid (2-col, max 4).
 * `source` uses dot notation: `attributes.<key>` for now; reserved for future
 * nested sources (e.g. `organization.name`).
 */
export interface CardField {
  key: string;
  source: string;
}

/**
 * `filter_fields` describes how a category's attributes map to catalog filters.
 * Deferred to Subsystem B, but typed here so the contract is complete.
 */
export interface FilterField {
  key: string;
  filter_type: FilterType;
  label?: string;
}

/**
 * The presentation contract stored on Category.
 *   - `card_fields`: which attributes to show in the ProductCard meta grid.
 *   - `subtitle_template`: client-side subtitle composition template (Subsystem A).
 *   - `filter_fields`: which attributes to expose as catalog filters (Subsystem B).
 *
 * A category MAY have `null` presentation (legacy categories, or a category whose
 * vertical supplies the inherited contract — the resolver handles fallback).
 */
export interface CategoryPresentation {
  card_fields: CardField[];
  subtitle_template: string | null;
  filter_fields: FilterField[];
}

/* ---------- category ---------- */

export interface Category {
  id: string;
  name: string;
  slug: string;
  attribute_schema: Record<string, AttributeSchemaEntry>;
  presentation: CategoryPresentation | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* ---------- dropdown option helper (existing) ---------- */

export interface CategoryOption {
  value: string;
  label: string;
}

export interface CategoryListResponse {
  categories: Category[];
  total: number;
  page: number;
  page_size: number;
}

/* ---------- verticals read-API ---------- */

/**
 * A category as it appears nested under a vertical.
 * `presentation` is resolved (own-or-inherited-from-vertical) by the backend.
 */
export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  attribute_schema: Record<string, AttributeSchemaEntry>;
  /** Own-or-inherited presentation; `null` if neither defines one. */
  presentation: CategoryPresentation | null;
  filter_fields: FilterField[];
}

/** A vertical (root Category) with its child categories. */
export interface VerticalResponse {
  id: string;
  name: string;
  slug: string;
  /** Root-level presentation; children may inherit if their own is `null`. */
  presentation: CategoryPresentation | null;
  categories: CategoryNode[];
}

/** Response of `GET /api/v1/organizations/{organization_id}/verticals`. */
export interface OrgVerticalsResponse {
  verticals: VerticalResponse[];
}
