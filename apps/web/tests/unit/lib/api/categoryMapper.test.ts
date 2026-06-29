/**
 * Unit tests for the backend → domain Category mapper.
 *
 * Covers the contract gap between the backend's CategoryResponse DTO
 * (loose `dict[str, Any]`, no `presentation`) and the frontend's strict
 * `Category` contract (`Record<string, AttributeSchemaEntry>` + nullable
 * `presentation`). The mapper is the single point of truth for that
 * translation; all consumers of `useCategories` rely on it returning a
 * strict `Category[]`.
 */

import { describe, it, expect } from "vitest";
import {
  mapBackendCategoryToDomain,
  type BackendCategory,
} from "@/lib/api/categoryMapper";

/** Baseline raw backend payload for tests below. */
const baseRaw: BackendCategory = {
  id: "cat-1",
  name: "Sedans",
  slug: "sedans",
  attribute_schema: {
    year: { type: "number", filter_type: "range" },
    make: { type: "string", filter_type: "select" },
    model: { type: "string", filter_type: "exact" },
  },
  is_active: true,
  created_at: "2026-04-26T00:00:00Z",
  updated_at: "2026-04-26T00:00:00Z",
};

describe("mapBackendCategoryToDomain", () => {
  it("maps a populated backend category to a strict Category with presentation: null", () => {
    const result = mapBackendCategoryToDomain(baseRaw);

    expect(result).toEqual({
      id: "cat-1",
      name: "Sedans",
      slug: "sedans",
      attribute_schema: {
        year: { type: "number", filter_type: "range" },
        make: { type: "string", filter_type: "select" },
        model: { type: "string", filter_type: "exact" },
      },
      attribute_groups: [],
      presentation: null,
      is_active: true,
      created_at: "2026-04-26T00:00:00Z",
      updated_at: "2026-04-26T00:00:00Z",
    });
  });

  it("defaults presentation to null when backend omits the field", () => {
    const raw: BackendCategory = { ...baseRaw, presentation: undefined };
    const result = mapBackendCategoryToDomain(raw);
    expect(result.presentation).toBeNull();
  });

  it("defaults presentation to null when backend returns null", () => {
    const raw: BackendCategory = { ...baseRaw, presentation: null };
    const result = mapBackendCategoryToDomain(raw);
    expect(result.presentation).toBeNull();
  });

  it("defaults attribute_schema to {} when backend returns undefined", () => {
    const raw: BackendCategory = { ...baseRaw, attribute_schema: undefined };
    const result = mapBackendCategoryToDomain(raw);
    expect(result.attribute_schema).toEqual({});
  });

  it("preserves presentation when backend supplies it (post-fix backend contract)", () => {
    const raw: BackendCategory = {
      ...baseRaw,
      presentation: {
        card_fields: [{ key: "price", source: "attributes.price" }],
        subtitle_template: "{make} {model}",
        filter_fields: [],
      },
    };
    const result = mapBackendCategoryToDomain(raw);
    expect(result.presentation).toEqual({
      card_fields: [{ key: "price", source: "attributes.price" }],
      subtitle_template: "{make} {model}",
      filter_fields: [],
    });
  });
});
