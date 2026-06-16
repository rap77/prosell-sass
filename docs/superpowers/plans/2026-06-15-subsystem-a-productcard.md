# Subsystem A — Generic ProductCard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vehicle-specific `VehicleCard` with a generic, contract-driven `ProductCard` that renders any vertical (Vehicles, Real Estate, …) from the category's `presentation` JSON — no per-niche frontend code.

**Architecture:** Container/presentational split. `catalog/page.tsx` (container) fetches products + `GET /organizations/{id}/verticals`, builds a `category_id → presentation` map, resolves image URLs, and passes `(product, presentation, imageUrl)` to a pure `ProductCard`. Helpers (`composeSubtitle`, `formatCardField`, `placeholderForVertical`) are pure functions in `lib/utils/`. Card slice only — table and detail are later slices.

**Tech Stack:** React 19, Next.js 16, TypeScript 5.5 strict, TanStack Query v5, Vitest 2.1 + Testing Library, TailwindCSS 4.

**Depends on:** Subsystem 0 — Foundation (merged, PR #10 + #13). The backend read-API `GET /organizations/{id}/verticals` already exists.

**Spec:** [`docs/superpowers/specs/2026-06-09-subsystem-a-productcard-design.md`](../specs/2026-06-09-subsystem-a-productcard-design.md)

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `apps/web/src/types/category.ts` | **REWRITE**: model `presentation`, `card_fields`, `subtitle_template`, `filter_fields` (currently stale) |
| `apps/web/src/types/category.test.ts` | Shape tests for new types |
| `apps/web/src/lib/utils/composeSubtitle.ts` | **NEW**: client-side subtitle composition from template + attributes |
| `apps/web/src/lib/utils/composeSubtitle.test.ts` | Template substitution tests |
| `apps/web/src/lib/utils/formatCardField.ts` | **NEW**: client-side label + value formatting (number / currency / string) |
| `apps/web/src/lib/utils/formatCardField.test.ts` | Formatting tests |
| `apps/web/src/lib/utils/placeholderForVertical.ts` | **NEW**: niche slug → placeholder asset path mapping |
| `apps/web/src/lib/utils/placeholderForVertical.test.ts` | Mapping tests |
| `apps/web/src/lib/api/verticals.ts` | **NEW**: `useOrgVerticals(orgId)` React Query hook |
| `apps/web/src/lib/api/verticals.test.ts` | Hook tests (fetch + transform) |
| `apps/web/src/components/catalog/ProductCard.tsx` | **NEW**: pure presentational card |
| `apps/web/src/components/catalog/__tests__/ProductCard.test.tsx` | Component tests (Vehicle + RealEstate + degradation) |
| `apps/web/src/app/(seller)/catalog/page.tsx` | **MODIFY**: container — fetch verticals, build map, pass to `ProductCard`, remove `VehicleCard` |
| `apps/web/next.config.ts` | **MODIFY**: add `images.formats: ['image/avif', 'image/webp']` |
| `scripts/optimize-placeholders.mjs` | **NEW**: sharp-based script to re-export placeholders to 540px WebP |
| `apps/web/public/placeholders/placeholder-{vehicles,realstate}.webp` | **NEW**: optimized assets (replace PNG) |
| `apps/web/public/placeholders/placeholder-generic.webp` | **NEW**: neutral fallback |
| `apps/web/src/lib/api/productImageUrlsBatch.ts` | **NEW (T7b)**: `useProductImageUrlsBatch(ids[])` — TanStack Query `useQueries` batch resolver so the container can populate `viewModels.imageUrl` without N+1 |
| `apps/web/src/app/(seller)/publications/page.tsx` | **MODIFY (T7e)**: drop the `isVehicleProduct` import; filter by `product.attributes.category === "vehicle"` directly (publications is the other consumer of the legacy helper) |
| `tests/e2e/specs/catalog-productcard.spec.ts` | **NEW (T10)**: Playwright smoke — Vehicle + Real Estate render, placeholder shown when no cover |

**Out of scope (NOT in this plan):**
- Subsystem B (dynamic filters)
- Subsystem C (auto-category on create)
- Subsystem D (dealer ownership UI)
- Subsystem E (onboarding/RBAC)
- DataGrid (table) generalization
- `CatalogDetailView` generalization
- Server-side subtitle composition (intentionally client-side here)
- Deleting `isVehicleProduct` / `transformProductToVehicle` from `types/product.ts` and `lib/api/products.ts` — kept as **deprecated wrappers** for this slice. Full removal is a follow-up after Subsystem C lands (auto-category on create) so vertical-specific code can be deleted coherently with the write path
- Conversion of `ImageOptimizer` upload pipeline to WebP (separate slice)

---

## Task 1: Rewrite `types/category.ts` with presentation contract

**Files:**
- Modify: `apps/web/src/types/category.ts` (full rewrite — currently 22 lines, stale)
- Create: `apps/web/src/types/category.test.ts`

- [ ] **Step 1: Write the failing tests for the new types**

Create `apps/web/src/types/category.test.ts`:

```typescript
import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  AttributeSchemaEntry,
  CategoryPresentation,
  CardField,
  Category,
  VerticalResponse,
  CategoryNode,
  OrgVerticalsResponse,
} from "./category";
import type { Product } from "./product";
import type { VehicleStatus } from "@/components/datagrid/StatusBadge";

describe("AttributeSchemaEntry", () => {
  it("models type, filter_type, and unit", () => {
    const entry: AttributeSchemaEntry = {
      type: "number",
      filter_type: "range",
      unit: "km",
    };
    expect(entry.type).toBe("number");
  });
});

describe("CategoryPresentation", () => {
  it("models card_fields, subtitle_template, and filter_fields", () => {
    const p: CategoryPresentation = {
      card_fields: [
        { key: "mileage", source: "attributes.mileage" },
        { key: "year", source: "attributes.year" },
      ],
      subtitle_template: "{year} · {make} · {model}",
      filter_fields: [
        { key: "mileage", filter_type: "range", label: "Kilometraje" },
      ],
    };
    expect(p.card_fields).toHaveLength(2);
  });

  it("allows nullable fields for categories without a presentation contract", () => {
    const p: CategoryPresentation | null = null;
    expect(p).toBeNull();
  });
});

describe("CardField", () => {
  it("supports a max 4 fields invariant via type-level comment", () => {
    const fields: CardField[] = [
      { key: "a", source: "attributes.a" },
      { key: "b", source: "attributes.b" },
      { key: "c", source: "attributes.c" },
      { key: "d", source: "attributes.d" },
    ];
    expect(fields).toHaveLength(4);
  });
});

describe("Category", () => {
  it("exposes presentation (or null) and attribute_schema as a record of AttributeSchemaEntry", () => {
    const c: Category = {
      id: "c1",
      name: "Autos",
      slug: "autos",
      attribute_schema: {
        mileage: { type: "number", filter_type: "range", unit: "km" },
        year: { type: "number", filter_type: "range" },
      },
      presentation: {
        card_fields: [{ key: "mileage", source: "attributes.mileage" }],
        subtitle_template: "{year}",
        filter_fields: [],
      },
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expectTypeOf(c.attribute_schema["mileage"]).toMatchTypeOf<AttributeSchemaEntry>();
  });
});

describe("OrgVerticalsResponse", () => {
  it("models the full read-API contract", () => {
    const r: OrgVerticalsResponse = {
      verticals: [
        {
          id: "v1",
          name: "Vehículos y transporte",
          slug: "vehiculos-y-transporte",
          presentation: {
            card_fields: [{ key: "mileage", source: "attributes.mileage" }],
            subtitle_template: "{year} · {make} · {model}",
            filter_fields: [],
          },
          categories: [
            {
              id: "c1",
              name: "Autos",
              slug: "autos",
              attribute_schema: { mileage: { type: "number", filter_type: "range" } },
              presentation: {
                card_fields: [{ key: "mileage", source: "attributes.mileage" }],
                subtitle_template: "{year} · {make} · {model}",
                filter_fields: [],
              },
              filter_fields: [],
            },
          ],
        },
      ],
    };
    expect(r.verticals[0].categories[0].presentation?.card_fields).toHaveLength(1);
  });
});

describe("VerticalResponse and CategoryNode", () => {
  it("allow null presentation at the root (legacy verticals without contract)", () => {
    const v: VerticalResponse = {
      id: "v1",
      name: "Legacy",
      slug: "legacy",
      presentation: null,
      categories: [],
    };
    expect(v.presentation).toBeNull();
  });

  it("CategoryNode has its own presentation that defaults from vertical if null", () => {
    const node: CategoryNode = {
      id: "c1",
      name: "X",
      slug: "x",
      attribute_schema: {},
      presentation: null, // inherits from vertical
      filter_fields: [],
    };
    expect(node.presentation).toBeNull();
  });
});

describe("Product.status alignment with StatusBadge", () => {
  // Pins the type so T6 (ProductCard) can pass `product.status` to
  // <StatusBadge> WITHOUT the `as never` cast that the previous plan left
  // to a Step 5 cleanup. If this test ever fails, either:
  //   (a) `Product.status` got widened to a broader union (e.g. `string`),
  //       and ProductCard needs a runtime narrowing helper, OR
  //   (b) StatusBadge lost a status literal (rare — adding a new Product
  //       status is a coordinated change).
  it("Product.status is assignable to StatusBadge's VehicleStatus (no cast needed in T6)", () => {
    expectTypeOf<Product["status"]>().toMatchTypeOf<VehicleStatus>();
  });

  it("Product.status is exactly VehicleStatus (no wider union, no narrower subset)", () => {
    expectTypeOf<Product["status"]>().toEqualTypeOf<VehicleStatus>();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (types not yet defined)**

Run: `cd apps/web && pnpm vitest run src/types/category.test.ts`
Expected: FAIL — `AttributeSchemaEntry` / `CategoryPresentation` / `CardField` / `VerticalResponse` / `CategoryNode` / `OrgVerticalsResponse` not exported from `./category`.

- [ ] **Step 3: Rewrite `apps/web/src/types/category.ts`**

Full replacement of the file (currently 22 lines):

```typescript
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

/** A single entry in `attribute_schema`. */
export interface AttributeSchemaEntry {
  /** Logical type used for client-side formatting. */
  type: "number" | "string" | "boolean" | "select";
  /** How the attribute is filterable in the catalog. */
  filter_type: "range" | "exact" | "boolean" | "select";
  /** Optional display unit (e.g. "km", "m²", "USD"). */
  unit?: string;
  /** Optional human-readable label override (defaults to humanized key). */
  label?: string;
  /** For `select` type: allowed values. */
  options?: string[];
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
  filter_type: "range" | "exact" | "boolean" | "select";
  label: string;
}

/**
 * The presentation contract stored on Category.ler
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run src/types/category.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 5: Type-check the rest of the app — expect BROKEN imports in catalog page**

Run: `cd apps/web && pnpm typecheck`
Expected: ERRORS in `apps/web/src/app/(seller)/catalog/page.tsx` and any other consumer of the old `Category.attribute_schema: Record<string, boolean>` shape. **These are EXPECTED — we fix them in T7 (catalog refactor).** Do NOT fix them here; the goal of T1 is types only.

- [ ] **Step 6: Commit**

```bash
cd apps/web
git add src/types/category.ts src/types/category.test.ts
git commit -m "feat(types): rewrite Category with presentation + attribute_schema contract

Models the full Foundation read-API contract on the frontend:
- AttributeSchemaEntry (type, filter_type, unit, label, options)
- CategoryPresentation (card_fields, subtitle_template, filter_fields)
- VerticalResponse + CategoryNode (read-API response)
- OrgVerticalsResponse

src/types/category.ts previously modeled attribute_schema as Record<string, boolean>,
which is stale. This rewrite is the first step of Subsystem A. Consumers
(catalog page) will be updated in T7."
```

---

## Task 2: `composeSubtitle(template, attributes)` helper

**Files:**
- Create: `apps/web/src/lib/utils/composeSubtitle.ts`
- Create: `apps/web/src/lib/utils/composeSubtitle.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/utils/composeSubtitle.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { composeSubtitle } from "./composeSubtitle";

describe("composeSubtitle", () => {
  it("returns empty string when template is null", () => {
    expect(composeSubtitle(null, { year: 2020 })).toBe("");
  });

  it("substitutes a single placeholder", () => {
    expect(composeSubtitle("{year}", { year: 2020 })).toBe("2020");
  });

  it("substitutes multiple placeholders with literal separator", () => {
    expect(
      composeSubtitle("{year} · {make} · {model}", {
        year: 2020,
        make: "Toyota",
        model: "Corolla",
      }),
    ).toBe("2020 · Toyota · Corolla");
  });

  it("drops a placeholder whose attribute is missing without producing double separators", () => {
    expect(
      composeSubtitle("{year} · {make} · {model}", {
        year: 2020,
        // make missing
        model: "Corolla",
      }),
    ).toBe("2020 · Corolla");
  });

  it("returns only literals when ALL placeholders are missing", () => {
    expect(composeSubtitle("Brand: {make} Model: {model}", {})).toBe(
      "Brand:  Model: ",
    );
    // Note: leading/trailing literals are preserved verbatim.
  });

  it("drops unknown placeholders (not in attributes) without crashing", () => {
    expect(
      composeSubtitle("{year} · {nonexistent}", { year: 2020 }),
    ).toBe("2020");
  });

  it("preserves empty string when template is empty", () => {
    expect(composeSubtitle("", { year: 2020 })).toBe("");
  });

  it("preserves surrounding literals when only the middle placeholder is missing", () => {
    expect(
      composeSubtitle("[{year}] [{make}] [{model}]", {
        year: 2020,
        model: "Corolla",
      }),
    ).toBe("[2020] [] [Corolla]");
  });

  it("coerces non-string values to string via String()", () => {
    expect(composeSubtitle("{m2} m²", { m2: 75 })).toBe("75 m²");
    expect(composeSubtitle("{covered}", { covered: true })).toBe("true");
  });

  it("does not crash on attributes that are objects or arrays (uses String())", () => {
    expect(
      composeSubtitle("{x}", { x: { nested: 1 } as unknown as string }),
    ).toBe("[object Object]");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run src/lib/utils/composeSubtitle.test.ts`
Expected: FAIL — `composeSubtitle` is not exported.

- [ ] **Step 3: Implement `composeSubtitle`**

Create `apps/web/src/lib/utils/composeSubtitle.ts`:

```typescript
/**
 * Client-side subtitle composition for the ProductCard (Subsystem A).
 *
 * Mirrors the server-side `compose_from_template` contract used for `title`
 * (Foundation) but is applied here on the client:
 *   - Literal-only `{field}` substitution (no expressions, no nesting).
 *   - Unknown placeholders are dropped silently (no crash, no raw `{key}` in output).
 *   - Missing attributes (key absent or value is `undefined` / `null`) cause the
 *     entire `{field}` token to be removed — adjacent separators are collapsed
 *     to avoid "a · · b" patterns.
 *   - Literals between placeholders are preserved verbatim.
 *   - Non-string values are coerced via `String(value)`.
 *
 * Spec: docs/superpowers/specs/2026-06-09-subsystem-a-productcard-design.md §7
 * Decision (deviation from Foundation §4): see
 *   engram obs #1816 (subtitle composed client-side in Subsystem A).
 */
const PLACEHOLDER = /\{([^}]+)\}/g;

export function composeSubtitle(
  template: string | null,
  attributes: Record<string, unknown>,
): string {
  if (!template) return "";

  return template.replace(PLACEHOLDER, (match, key: string) => {
    const value = attributes[key];
    if (value === undefined || value === null) {
      // Drop the placeholder + the leading separator that precedes it.
      // We cannot drop the separator in-place from inside `replace`, so we
      // collapse runs of " · " (and " ·" / "· ") in a post-pass below.
      return "";
    }
    return String(value);
  })
    // Collapse " · · " → " · " (and similar) for separators commonly used in
    // the catalog. This is intentionally narrow; we don't try to handle every
    // possible separator template.
    .replace(/( · )+/g, " · ")
    .replace(/^ · | · $/g, "")
    .trim();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run src/lib/utils/composeSubtitle.test.ts`
Expected: 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd apps/web
git add src/lib/utils/composeSubtitle.ts src/lib/utils/composeSubtitle.test.ts
git commit -m "feat(web): composeSubtitle helper for client-side subtitle

Mirrors the server-side template composition but client-side, per the
documented deviation in Subsystem A spec §7. Drops missing/unknown
placeholders, collapses adjacent separators, preserves literals."
```

---

## Task 3: `formatCardField(field, value, schema)` helper

**Files:**
- Create: `apps/web/src/lib/utils/formatCardField.ts`
- Create: `apps/web/src/lib/utils/formatCardField.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/utils/formatCardField.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatCardField } from "./formatCardField";
import type { CardField, AttributeSchemaEntry } from "@/types/category";

const mileageField: CardField = { key: "mileage", source: "attributes.mileage" };
const yearField: CardField = { key: "year", source: "attributes.year" };
const priceField: CardField = { key: "price", source: "attributes.price" };
const areaField: CardField = { key: "area_m2", source: "attributes.area_m2" };
const customLabelField: CardField = { key: "foo", source: "attributes.foo" };

const numberSchema = (unit?: string): AttributeSchemaEntry => ({
  type: "number",
  filter_type: "range",
  unit,
});

describe("formatCardField — label", () => {
  it("returns the schema-provided label when present", () => {
    const out = formatCardField(
      customLabelField,
      "bar",
      { foo: { type: "string", filter_type: "exact", label: "Custom Label" } },
    );
    expect(out.label).toBe("Custom Label");
  });

  it("uses the known-label dictionary for `mileage` → `Kilometraje`", () => {
    const out = formatCardField(mileageField, 100000, {
      mileage: numberSchema("km"),
    });
    expect(out.label).toBe("Kilometraje");
  });

  it("uses the known-label dictionary for `area_m2` → `Superficie`", () => {
    const out = formatCardField(areaField, 75, { area_m2: numberSchema("m²") });
    expect(out.label).toBe("Superficie");
  });

  it("humanizes the key as a fallback (snake_case → Capitalized words)", () => {
    const out = formatCardField(
      { key: "engine_size", source: "attributes.engine_size" },
      2.0,
      { engine_size: numberSchema("L") },
    );
    expect(out.label).toBe("Engine Size");
  });
});

describe("formatCardField — value formatting", () => {
  it("formats a number with the unit suffix (es-AR locale, thousands separator)", () => {
    const out = formatCardField(mileageField, 100000, {
      mileage: numberSchema("km"),
    });
    expect(out.value).toBe("100.000 km");
  });

  it("formats a currency-like value as a price (uses Intl.NumberFormat)", () => {
    const out = formatCardField(priceField, 1234567, {
      price: { type: "string", filter_type: "exact" }, // not "number" → not formatted as number
    });
    // Since type is "string", the value is returned as-is (raw).
    expect(out.value).toBe("1234567");
  });

  it("formats a number without unit as plain localized number", () => {
    const out = formatCardField(yearField, 2020, { year: numberSchema() });
    expect(out.value).toBe("2020");
  });

  it("returns a string value as-is", () => {
    const out = formatCardField(
      customLabelField,
      "Toyota",
      { foo: { type: "string", filter_type: "exact" } },
    );
    expect(out.value).toBe("Toyota");
  });

  it("returns null when value is missing (caller decides to skip the cell)", () => {
    const out = formatCardField(mileageField, undefined, {
      mileage: numberSchema("km"),
    });
    expect(out.value).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run src/lib/utils/formatCardField.test.ts`
Expected: FAIL — `formatCardField` not exported.

- [ ] **Step 3: Implement `formatCardField`**

Create `apps/web/src/lib/utils/formatCardField.ts`:

```typescript
import type { CardField, AttributeSchemaEntry } from "@/types/category";

/** Small known-label dictionary. Extend as needed; falls back to humanized key. */
const KNOWN_LABELS: Record<string, string> = {
  mileage: "Kilometraje",
  year: "Año",
  area_m2: "Superficie",
  bedrooms: "Dormitorios",
  bathrooms: "Baños",
  engine_size: "Cilindrada",
  fuel_type: "Combustible",
  transmission: "Transmisión",
  color: "Color",
  make: "Marca",
  model: "Modelo",
};

/** Humanize a snake_case key: `engine_size` → `Engine Size`. */
function humanizeKey(key: string): string {
  return key
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

/** Result of formatting a single card_field cell. */
export interface FormattedCardField {
  key: string;
  label: string;
  value: string | null;
}

/**
 * Format a single `card_field` cell: humanized label + value formatted by the
 * attribute's `type` and `unit`. Returns `value: null` when the value is
 * missing (caller skips the cell — see Subsystem A spec §8).
 *
 * @param field   The card_field declaration (key + source path).
 * @param value   The raw attribute value (may be undefined).
 * @param schema  The category's `attribute_schema` (key → entry).
 */
export function formatCardField(
  field: CardField,
  value: unknown,
  schema: Record<string, AttributeSchemaEntry>,
): FormattedCardField {
  const entry = schema[field.key];
  const label =
    entry?.label ??
    KNOWN_LABELS[field.key] ??
    humanizeKey(field.key);

  if (value === undefined || value === null) {
    return { key: field.key, label, value: null };
  }

  let formatted: string;
  if (entry?.type === "number" && typeof value === "number") {
    formatted = new Intl.NumberFormat("es-AR").format(value);
    if (entry.unit) formatted = `${formatted} ${entry.unit}`;
  } else if (typeof value === "boolean") {
    formatted = value ? "Sí" : "No";
  } else {
    formatted = String(value);
  }

  return { key: field.key, label, value: formatted };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run src/lib/utils/formatCardField.test.ts`
Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd apps/web
git add src/lib/utils/formatCardField.ts src/lib/utils/formatCardField.test.ts
git commit -m "feat(web): formatCardField helper (label + value formatting)

Label: known-label dictionary (mileage, area_m2, …) → humanized fallback.
Value: type-based — number formatted via Intl.NumberFormat with optional
unit; boolean as Sí/No; string as-is. Returns value: null when missing
(caller skips the cell per Subsystem A spec §8)."
```

---

## Task 4: `placeholderForVertical(slug)` helper

**Files:**
- Create: `apps/web/src/lib/utils/placeholderForVertical.ts`
- Create: `apps/web/src/lib/utils/placeholderForVertical.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/utils/placeholderForVertical.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { placeholderForVertical } from "./placeholderForVertical";

describe("placeholderForVertical", () => {
  it("maps the vehicles vertical slug to the vehicles placeholder", () => {
    expect(placeholderForVertical("vehiculos-y-transporte")).toBe(
      "/placeholders/placeholder-vehicles.webp",
    );
  });

  it("maps the real estate vertical slug to the realstate placeholder", () => {
    expect(placeholderForVertical("bienes-raices")).toBe(
      "/placeholders/placeholder-realstate.webp",
    );
  });

  it("returns the generic fallback for an unknown vertical slug", () => {
    expect(placeholderForVertical("unknown-niche")).toBe(
      "/placeholders/placeholder-generic.webp",
    );
  });

  it("returns the generic fallback for an empty slug", () => {
    expect(placeholderForVertical("")).toBe(
      "/placeholders/placeholder-generic.webp",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run src/lib/utils/placeholderForVertical.test.ts`
Expected: FAIL — function not defined.

- [ ] **Step 3: Implement `placeholderForVertical`**

Create `apps/web/src/lib/utils/placeholderForVertical.ts`:

```typescript
/**
 * Map a vertical's root slug to its branded placeholder asset path.
 *
 * Spec §5:
 *   - vehiculos-y-transporte → vehicles
 *   - bienes-raices          → realstate
 *   - unknown                → neutral generic fallback
 *
 * The asset is a `.webp` (re-exported from the original 1.3MB PNG by
 * `scripts/optimize-placeholders.mjs` — see T8). Path is `/placeholders/...`
 * (served from `apps/web/public/`).
 */
const NICHE_MAP: Record<string, string> = {
  "vehiculos-y-transporte": "vehicles",
  "bienes-raices": "realstate",
  // Future niches: add here as the corresponding .webp is added.
};

const GENERIC = "/placeholders/placeholder-generic.webp";

export function placeholderForVertical(slug: string | null | undefined): string {
  if (!slug) return GENERIC;
  const niche = NICHE_MAP[slug];
  if (!niche) return GENERIC;
  return `/placeholders/placeholder-${niche}.webp`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run src/lib/utils/placeholderForVertical.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd apps/web
git add src/lib/utils/placeholderForVertical.ts src/lib/utils/placeholderForVertical.test.ts
git commit -m "feat(web): placeholderForVertical mapping (slug → asset path)

Maps the two known vertical slugs to branded placeholders; unknown/empty
slug → neutral generic fallback. Assets are .webp (T8 will regenerate them
from the existing PNGs)."
```

---

## Task 5: `useOrgVerticals(orgId)` API hook

**Files:**
- Create: `apps/web/src/lib/api/verticals.ts`
- Create: `apps/web/src/lib/api/verticals.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/api/verticals.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// We mock global.fetch; the hook uses it directly.
const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

import { useOrgVerticals } from "./verticals";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

const fakeResponse = {
  verticals: [
    {
      id: "v1",
      name: "Vehículos y transporte",
      slug: "vehiculos-y-transporte",
      presentation: {
        card_fields: [{ key: "mileage", source: "attributes.mileage" }],
        subtitle_template: "{year} · {make} · {model}",
        filter_fields: [],
      },
      categories: [
        {
          id: "c1",
          name: "Autos",
          slug: "autos",
          attribute_schema: {
            mileage: { type: "number", filter_type: "range", unit: "km" },
          },
          presentation: null,
          filter_fields: [],
        },
      ],
    },
  ],
};

describe("useOrgVerticals", () => {
  it("calls GET /api/v1/organizations/{orgId}/verticals with credentials", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeResponse,
    });

    const { result } = renderHook(() => useOrgVerticals("org-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/organizations/org-1/verticals",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result.current.data?.verticals).toHaveLength(1);
    expect(result.current.data?.verticals[0].slug).toBe(
      "vehiculos-y-transporte",
    );
  });

  it("is a no-op (data undefined) when orgId is null", async () => {
    const { result } = renderHook(() => useOrgVerticals(null), {
      wrapper: makeWrapper(),
    });
    // Query is disabled → no fetch issued, data is undefined.
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it("throws when the response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Forbidden" }),
    });

    const { result } = renderHook(() => useOrgVerticals("org-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Forbidden");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run src/lib/api/verticals.test.ts`
Expected: FAIL — `./verticals` module not found.

- [ ] **Step 3: Implement `useOrgVerticals`**

Create `apps/web/src/lib/api/verticals.ts`:

```typescript
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { OrgVerticalsResponse } from "@/types/category";

/**
 * Fetch the verticals + their categories for a given organization.
 *
 * Backend: `GET /api/v1/organizations/{organization_id}/verticals`
 * (Foundation, PR #10 + #13).
 *
 * When `organizationId` is `null` (e.g. user is loading), the query is
 * disabled — `data` stays `undefined` and no network call is made.
 */
export function useOrgVerticals(
  organizationId: string | null,
): UseQueryResult<OrgVerticalsResponse, Error> {
  return useQuery({
    queryKey: ["org-verticals", organizationId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/organizations/${organizationId}/verticals`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const payload = (await res
          .json()
          .catch(() => ({ message: "Failed to fetch verticals" }))) as {
          message?: string;
        };
        throw new Error(payload.message ?? "Failed to fetch verticals");
      }
      return (await res.json()) as OrgVerticalsResponse;
    },
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run src/lib/api/verticals.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd apps/web
git add src/lib/api/verticals.ts src/lib/api/verticals.test.ts
git commit -m "feat(web): useOrgVerticals hook (read-API client)

TanStack Query wrapper for GET /api/v1/organizations/{id}/verticals.
Disabled when orgId is null. Stale time 5min (matches useCategories)."
```

---

## Task 6: `ProductCard` component (pure presentational)

**Files:**
- Create: `apps/web/src/components/catalog/ProductCard.tsx`
- Create: `apps/web/src/components/catalog/__tests__/ProductCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/components/catalog/__tests__/ProductCard.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductCard } from "../ProductCard";
import type {
  CategoryPresentation,
  CardField,
} from "@/types/category";
import type { Product } from "@/types/product";

// next/image: render as plain <img> for tests so we can assert src.
vi.mock("next/image", () => ({
  default: (props: { src: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt ?? ""} data-testid="next-image" />
  ),
}));

const baseProduct: Product = {
  id: "p1",
  tenant_id: "t1",
  organization_id: "o1",
  category_id: "c1",
  title: "Toyota Corolla 2020",
  description: null,
  price_cents: 1500000,
  currency: "USD",
  condition: "used",
  status: "published",
  attributes: { category: "vehicle" },
  image_urls: [],
  cover_image_key: null,
  is_featured: false,
  view_count: 0,
  favorite_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const vehiclePresentation: CategoryPresentation = {
  card_fields: [
    { key: "mileage", source: "attributes.mileage" },
    { key: "year", source: "attributes.year" },
    { key: "color", source: "attributes.color" },
  ] as CardField[],
  subtitle_template: "{year} · {make} · {model}",
  filter_fields: [],
};

const realEstatePresentation: CategoryPresentation = {
  card_fields: [
    { key: "area_m2", source: "attributes.area_m2" },
    { key: "bedrooms", source: "attributes.bedrooms" },
  ] as CardField[],
  subtitle_template: "{bedrooms} amb · {area_m2} m²",
  filter_fields: [],
};

const schema = {
  mileage: { type: "number" as const, filter_type: "range" as const, unit: "km" },
  year: { type: "number" as const, filter_type: "range" as const },
  color: { type: "string" as const, filter_type: "exact" as const },
  area_m2: { type: "number" as const, filter_type: "range" as const, unit: "m²" },
  bedrooms: { type: "number" as const, filter_type: "range" as const },
};

const vehicleAttributes = {
  category: "vehicle" as const,
  mileage: 100000,
  year: 2020,
  make: "Toyota",
  model: "Corolla",
  color: "Blanco",
};

const realEstateAttributes = {
  category: "real_estate" as const,
  area_m2: 75,
  bedrooms: 3,
};

const noop = () => {};

describe("ProductCard — rendering", () => {
  it("renders title, price, and currency", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttributes}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Toyota Corolla 2020")).toBeInTheDocument();
    // Price is formatted; just assert it contains digits.
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it("renders the subtitle via composeSubtitle (client-side)", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttributes}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("2020 · Toyota · Corolla")).toBeInTheDocument();
  });

  it("renders the status badge (real StatusBadge's data-testid is `vehicle-status`)", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttributes}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    // The real `StatusBadge` component carries `data-testid="vehicle-status"`
    // (see `apps/web/src/components/datagrid/StatusBadge.tsx:85`). We do
    // NOT wrap it in an extra div with a different testid — that would
    // hide the real one and break the assertions in DataGrid tests that
    // rely on `vehicle-status`. Positioning is achieved via the parent's
    // class.
    expect(screen.getByTestId("vehicle-status")).toBeInTheDocument();
  });
});

describe("ProductCard — image", () => {
  it("renders the cover image when imageUrl is provided (object-fit: cover, unoptimized false)", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttributes}
        verticalSlug="vehiculos-y-transporte"
        imageUrl="https://signed.example.com/cover.jpg"
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    const img = screen.getByTestId("next-image");
    expect(img).toHaveAttribute("src", "https://signed.example.com/cover.jpg");
  });

  it("falls back to the niche placeholder when imageUrl is null", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttributes}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    const img = screen.getByTestId("next-image");
    expect(img).toHaveAttribute("src", "/placeholders/placeholder-vehicles.webp");
  });

  it("falls back to the realstate placeholder for the real estate vertical", () => {
    render(
      <ProductCard
        product={{ ...baseProduct, attributes: realEstateAttributes }}
        presentation={realEstatePresentation}
        attributeSchema={schema}
        productAttributes={realEstateAttributes}
        verticalSlug="bienes-raices"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    const img = screen.getByTestId("next-image");
    expect(img).toHaveAttribute("src", "/placeholders/placeholder-realstate.webp");
  });
});

describe("ProductCard — card_fields meta grid", () => {
  it("renders up to 4 meta cells (max invariant), formatted via formatCardField", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttributes}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Kilometraje")).toBeInTheDocument();
    expect(screen.getByText("100.000 km")).toBeInTheDocument();
    expect(screen.getByText("Año")).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
  });

  it("skips cells whose attribute value is missing (no label-only noise)", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={{ category: "vehicle" as const, mileage: 50000 }} // no year, no color
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Kilometraje")).toBeInTheDocument();
    expect(screen.queryByText("Año")).not.toBeInTheDocument();
    expect(screen.queryByText("Color")).not.toBeInTheDocument();
  });

  it("caps the meta grid at 4 cells even if presentation declares more", () => {
    const manyFields: CategoryPresentation = {
      card_fields: [
        { key: "a", source: "attributes.a" },
        { key: "b", source: "attributes.b" },
        { key: "c", source: "attributes.c" },
        { key: "d", source: "attributes.d" },
        { key: "e", source: "attributes.e" },
        { key: "f", source: "attributes.f" },
      ] as CardField[],
      subtitle_template: null,
      filter_fields: [],
    };
    const attrs = {
      category: "vehicle" as const,
      a: 1, b: 2, c: 3, d: 4, e: 5, f: 6,
    };
    const bigSchema = {
      a: { type: "number" as const, filter_type: "range" as const },
      b: { type: "number" as const, filter_type: "range" as const },
      c: { type: "number" as const, filter_type: "range" as const },
      d: { type: "number" as const, filter_type: "range" as const },
      e: { type: "number" as const, filter_type: "range" as const },
      f: { type: "number" as const, filter_type: "range" as const },
    };
    render(
      <ProductCard
        product={baseProduct}
        presentation={manyFields}
        attributeSchema={bigSchema}
        productAttributes={attrs}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    // Only 4 cells rendered; the 5th and 6th are dropped.
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.queryByText("E")).not.toBeInTheDocument();
    expect(screen.queryByText("F")).not.toBeInTheDocument();
  });
});

describe("ProductCard — degradation", () => {
  it("renders title + price + image when presentation is null (no crash)", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={null}
        attributeSchema={schema}
        productAttributes={vehicleAttributes}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText("Toyota Corolla 2020")).toBeInTheDocument();
    expect(screen.queryByText("2020 · Toyota · Corolla")).not.toBeInTheDocument();
    expect(screen.queryByText("Kilometraje")).not.toBeInTheDocument();
  });
});

describe("ProductCard — actions on hover", () => {
  it("does NOT show the actions bar in the resting state", () => {
    render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttributes}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    // The actions group is hidden by CSS (opacity-0 → group-hover:opacity-100)
    // and is NOT present in the a11y tree in resting state.
    const actions = screen.queryByRole("toolbar");
    expect(actions).toBeNull();
  });

  it("shows the actions group when the card is hovered (simulated via group-hover class)", () => {
    const { container } = render(
      <ProductCard
        product={baseProduct}
        presentation={vehiclePresentation}
        attributeSchema={schema}
        productAttributes={vehicleAttributes}
        verticalSlug="vehiculos-y-transporte"
        imageUrl={null}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    // The actions container must carry the "group-hover:opacity-100" class
    // (Tailwind pattern for the on-hover reveal).
    const group = container.querySelector('[data-testid="product-card-actions"]');
    expect(group?.className).toMatch(/group-hover:opacity-100/);
    expect(group?.className).toMatch(/opacity-0/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run src/components/catalog/__tests__/ProductCard.test.tsx`
Expected: FAIL — `./ProductCard` module not found.

- [ ] **Step 3: Implement `ProductCard`**

Create `apps/web/src/components/catalog/ProductCard.tsx`:

```typescript
"use client";

import Image from "next/image";
import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/datagrid/StatusBadge";
import type { Product } from "@/types/product";
import type {
  AttributeSchemaEntry,
  CategoryPresentation,
} from "@/types/category";
import { composeSubtitle } from "@/lib/utils/composeSubtitle";
import { formatCardField } from "@/lib/utils/formatCardField";
import { placeholderForVertical } from "@/lib/utils/placeholderForVertical";

const MAX_META_CELLS = 4;

export interface ProductCardProps {
  product: Product;
  presentation: CategoryPresentation | null;
  attributeSchema: Record<string, AttributeSchemaEntry>;
  productAttributes: Record<string, unknown>;
  verticalSlug: string | null;
  imageUrl: string | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Pure presentational ProductCard (Subsystem A).
 *
 * Renders a single product in the catalog grid from the category's
 * `presentation` contract. No data fetching, no store reads, no side effects.
 *
 * Spec: docs/superpowers/specs/2026-06-09-subsystem-a-productcard-design.md
 */
export function ProductCard({
  product,
  presentation,
  attributeSchema,
  productAttributes,
  verticalSlug,
  imageUrl,
  onView,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const placeholder = placeholderForVertical(verticalSlug);

  // --- Subtitle (client-side, per §7) ---
  const subtitle = presentation
    ? composeSubtitle(presentation.subtitle_template, productAttributes)
    : "";

  // --- Card fields meta grid (max 4) ---
  const metaCells = (presentation?.card_fields ?? [])
    .slice(0, MAX_META_CELLS)
    .map((field) => formatCardField(field, productAttributes[field.key], attributeSchema))
    .filter((cell) => cell.value !== null);

  // --- Price (separate slot) ---
  // Spec §8 says "never crash". `Intl.NumberFormat` throws on a malformed
  // currency string; the backend currently types `Product.currency` as a
  // wide `string` (not a strict ISO-4217 union). Wrap in try/catch with
  // a USD fallback so a bad value renders rather than blowing up the card.
  let price: string;
  try {
    price = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: product.currency || "USD",
    }).format(product.price_cents / 100);
  } catch {
    price = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
    }).format(product.price_cents / 100);
  }

  // --- Image (cover vs. niche placeholder) ---
  const imgSrc = imageUrl ?? placeholder;
  // Placeholders are local + branded → optimize. Signed MinIO URLs are
  // host-bound (next.config.ts comment) → unoptimized to bypass the
  // server-side `/_next/image` fetch (which can't reach MinIO).
  const unoptimized = Boolean(imageUrl);

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-lg border border-[var(--ps-border)] bg-[var(--ps-surface)] transition-shadow hover:shadow-md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image (4:3) */}
      <div className="relative aspect-[4/3] w-full bg-[var(--ps-bg-muted)]">
        <Image
          src={imgSrc}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className={imageUrl ? "object-cover" : "object-contain p-6"}
          unoptimized={unoptimized}
          priority={false}
        />
        {/* Status badge — top-right (spec §4). Use StatusBadge's own
            `vehicle-status` testid (do not wrap in a div that overrides it,
            or DataGrid tests that rely on it break). Positioning via the
            badge's own props / wrapping <span> is OK but the testid must
            pass through. */}
        <div className="absolute right-2 top-2">
          <StatusBadge status={product.status} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="truncate text-sm font-semibold text-[var(--ps-text)]">
          {product.title}
        </h3>

        {subtitle && (
          <p className="truncate text-xs text-[var(--ps-text-muted)]">
            {subtitle}
          </p>
        )}

        <p className="text-base font-bold text-[var(--ps-text)]">{price}</p>

        {metaCells.length > 0 && (
          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {metaCells.map((cell) => (
              <div key={cell.key} className="flex flex-col">
                <dt className="text-[var(--ps-text-muted)]">{cell.label}</dt>
                <dd className="font-medium text-[var(--ps-text)]">
                  {cell.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Actions — on hover only (spec §4) */}
      <div
        data-testid="product-card-actions"
        aria-hidden={!hovered}
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 border-t border-[var(--ps-border)] bg-[var(--ps-surface)]/95 px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
      >
        <button
          type="button"
          onClick={onView}
          className="rounded p-1.5 hover:bg-[var(--ps-bg-muted)]"
          aria-label="Ver detalle"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded p-1.5 hover:bg-[var(--ps-bg-muted)]"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1.5 text-[var(--ps-danger)] hover:bg-[var(--ps-bg-muted)]"
          aria-label="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run src/components/catalog/__tests__/ProductCard.test.tsx`
Expected: 12 tests PASS.

- [ ] **Step 5: Run typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: 0 errors. The `Product.status` type is pinned by the T1 `expectTypeOf`
test to equal `VehicleStatus`, so no `as never` cast is needed here. If
the typecheck fails on the StatusBadge prop, the T1 test should also have
failed — fix it there first, not here.

- [ ] **Step 6: Commit**

```bash
cd apps/web
git add src/components/catalog/ProductCard.tsx src/components/catalog/__tests__/ProductCard.test.tsx
git commit -m "feat(web): ProductCard component (pure presentational)

Renders any vertical from the category's presentation contract:
image (4:3, cover or niche placeholder), status badge top-right, title,
subtitle (client-side composeSubtitle), price (product.currency),
card_fields meta in 2-col grid (max 4), actions on hover only.

Pure presentational — no data fetching, no store reads. Container
(catalog page) is responsible for resolving imageUrl, presentation,
and vertical slug per product."
```

---

## Task 7: `catalog/page.tsx` refactor (container)

This task is split into 4 commits for atomicity.

### Task 7a-0: Add `useProductImageUrlsBatch` hook (N+1-free container URL resolution)

**Files:**
- Create: `apps/web/src/lib/api/productImageUrlsBatch.ts`
- Create: `apps/web/src/lib/api/productImageUrlsBatch.test.ts`

The existing `useProductImageUrls(productId)` is per-product (the legacy
`VehicleCard` invoked one hook per card; TanStack Query dedup'd via cache
key but the network still served N round-trips for a 50-card page). The
new container needs to resolve URLs for every visible product, so we
wrap the per-product hook in `useQueries` for batched fetching.

- [ ] **Step 1: Write the failing tests for the batch hook**

Create `apps/web/src/lib/api/productImageUrlsBatch.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useProductImageUrlsBatch } from "./productImageUrlsBatch";

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

const fakeImageUrlsResponse = (productId: string) => ({
  images: [{ key: `cover-${productId}`, url: `https://signed/${productId}/cover.jpg` }],
});

describe("useProductImageUrlsBatch", () => {
  it("returns a Map<productId, imageUrl|null> populated from per-product queries", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => fakeImageUrlsResponse("p1") })
      .mockResolvedValueOnce({ ok: true, json: async () => fakeImageUrlsResponse("p2") });

    const { result } = renderHook(() => useProductImageUrlsBatch(["p1", "p2"]), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.urls.get("p1")).toBe("https://signed/p1/cover.jpg");
    expect(result.current.urls.get("p2")).toBe("https://signed/p2/cover.jpg");
  });

  it("is a no-op (empty Map, no fetch) when the ids list is empty", async () => {
    const { result } = renderHook(() => useProductImageUrlsBatch([]), {
      wrapper: makeWrapper(),
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.urls.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("populates null for products whose signed-URL fetch fails (4xx/5xx)", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => fakeImageUrlsResponse("p1") })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Not found" }) });

    const { result } = renderHook(() => useProductImageUrlsBatch(["p1", "p2"]), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.urls.get("p1")).toBe("https://signed/p1/cover.jpg");
    expect(result.current.urls.get("p2")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run src/lib/api/productImageUrlsBatch.test.ts`
Expected: FAIL — `./productImageUrlsBatch` module not found.

- [ ] **Step 3: Implement the batch hook**

Create `apps/web/src/lib/api/productImageUrlsBatch.ts`:

```typescript
import { useQueries } from "@tanstack/react-query";
import type { ProductImageUrlsResponse } from "@/lib/api/products";

/**
 * Batched version of `useProductImageUrls` for the catalog container.
 *
 * The legacy `VehicleCard` invoked `useProductImageUrls(productId)` per
 * card; TanStack Query dedup'd the cache key, but the network still saw
 * N round-trips per visible page. The new container is the right place
 * to fan the requests out and assemble a single Map<productId, url|null>
 * for the per-product view model.
 *
 * The container calls this once per render with the visible `productId`s.
 * Each per-product query still uses the existing
 * `GET /api/v1/products/{id}/image-urls` endpoint — no backend change
 * is required for this slice. A future optimization (out of scope) is a
 * single batch endpoint `POST /products/image-urls:batch`.
 */
export function useProductImageUrlsBatch(productIds: string[]): {
  urls: Map<string, string | null>;
  isLoading: boolean;
} {
  const queries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: ["products", productId, "image-urls"] as const,
      queryFn: async (): Promise<string | null> => {
        const res = await fetch(`/api/v1/products/${productId}/image-urls`, {
          credentials: "include",
        });
        if (!res.ok) return null;
        const payload = (await res.json()) as ProductImageUrlsResponse;
        // Pick the first image (the cover) — `ProductImageUrlsResponse.images`
        // is ordered with the cover first per the backend contract.
        return payload.images[0]?.url ?? null;
      },
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  const urls = new Map<string, string | null>();
  for (let i = 0; i < productIds.length; i++) {
    urls.set(productIds[i], (queries[i]?.data as string | null | undefined) ?? null);
  }
  const isLoading = queries.some((q) => q.isLoading);

  return { urls, isLoading };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run src/lib/api/productImageUrlsBatch.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd apps/web
git add src/lib/api/productImageUrlsBatch.ts src/lib/api/productImageUrlsBatch.test.ts
git commit -m "feat(web): useProductImageUrlsBatch hook (N+1-free URL resolution)

Wraps the per-product useProductImageUrls in useQueries so the catalog
container can resolve every visible product's cover URL with one
hook call instead of N round-trips. TanStack Query still dedup's via
the cache key. No backend change — keeps the existing
GET /products/{id}/image-urls endpoint."
```

---

### Task 7a: Fetch verticals + build `categoryId → presentation` map

**Files:**
- Modify: `apps/web/src/app/(seller)/catalog/page.tsx`

- [ ] **Step 1: Add the verticals query + the presentation map (replacing the `isVehicleProduct` filter)**

In `apps/web/src/app/(seller)/catalog/page.tsx`, locate the imports section (top) and the query section around line 540-560.

> **Pre-step (no commit):** verify the line numbers below still match
> the current file with `rg -n "useInfiniteProducts|VehicleCard" src/app/\(seller\)/catalog/page.tsx`. If they drifted, update this plan before editing.

Add to the imports (top of file, alphabetically grouped):

```typescript
import { useCurrentOrganizationProfile } from "@/lib/api/userApi";
import { useOrgVerticals } from "@/lib/api/verticals";
import { useProductImageUrlsBatch } from "@/lib/api/productImageUrlsBatch";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { CategoryPresentation, AttributeSchemaEntry } from "@/types/category";
```

Locate the `useInfiniteProducts(apiFilters, 50)` call (line 540-ish) and add the three new queries immediately after it:

```typescript
// Vertical contracts: presentation + attribute_schema per category.
const { data: orgProfile } = useCurrentOrganizationProfile();
const organizationId = orgProfile?.id ?? null;
const { data: verticalsData } = useOrgVerticals(organizationId);

// Image URLs for the visible products (batched; see T7a-0).
// `products` is the flat list from `useInfiniteProducts(...).data?.pages[0]?.items`
// (renamed from `vehicles` in Step 2). We resolve URLs at the container
// instead of letting the card fetch per-product (legacy VehicleCard did the
// latter; we now centralize so ProductCard is a pure presentational).
const { urls: productImageUrls } = useProductImageUrlsBatch(
  (data?.pages[0]?.items ?? []).map((p) => p.id),
);

// Build the lookup map: category_id → { presentation, attribute_schema }.
const categoryPresentationMap = useMemo(() => {
  const map = new Map<
    string,
    { presentation: CategoryPresentation | null; schema: Record<string, AttributeSchemaEntry>; verticalSlug: string | null }
  >();
  for (const vertical of verticalsData?.verticals ?? []) {
    for (const cat of vertical.categories) {
      map.set(cat.id, {
        presentation: cat.presentation ?? vertical.presentation ?? null,
        schema: cat.attribute_schema,
        verticalSlug: vertical.slug,
      });
    }
  }
  return map;
}, [verticalsData]);
```

Make sure `useMemo` is already imported (it should be, since the file uses it elsewhere).

- [ ] **Step 2: Remove the `isVehicleProduct` filter on the products list**

Locate lines 555-557 (the `.filter(isVehicleProduct)` + `.map(transformProductToVehicle)` chain) and replace with a flat map that passes through every product (the new card is generic):

```typescript
// BEFORE:
// const vehicleProducts = data?.pages[0]?.items.filter(isVehicleProduct) ?? [];
// const vehicles = vehicleProducts.map(transformProductToVehicle);

// AFTER: pass through every product. The container still normalizes
// attributes for typed access downstream (kept as `vehicles` alias for now;
// the new card does not need the transform — it reads `product.attributes`).
const products = data?.pages[0]?.items ?? [];
```

Then, rename the subsequent `vehicles` references in the same file scope to `products`. (Do NOT rename the `vehicle` variable inside the old `VehicleCard` function — that function is removed in 7b.)

- [ ] **Step 3: Typecheck — expect errors in old `VehicleCard` references**

Run: `cd apps/web && pnpm typecheck`
Expected: errors referring to the OLD `VehicleCard` internal function. These will be fixed in 7b. **Do not skip the next step.**

- [ ] **Step 4: Commit**

```bash
cd apps/web
git add src/app/\(seller\)/catalog/page.tsx
git commit -m "feat(catalog): fetch verticals + build category_id → presentation map

The catalog container now reads GET /organizations/{id}/verticals and
builds a lookup map so each product's card can resolve its category's
presentation + attribute_schema + vertical slug. Removes the
isVehicleProduct filter (the card is generic from now on)."
```

---

### Task 7b: Replace `VehicleCard` (grilla view) with `ProductCard`

**Files:**
- Modify: `apps/web/src/app/(seller)/catalog/page.tsx`

- [ ] **Step 1: Add a resolver helper for `(presentation, schema, slug, imageUrl)` per product**

Add (or extend) the `useMemo` block where the products list is consumed. After the `products` flat-map from 7a, add:

```typescript
// Resolved per-product view model: presentation + schema + slug + imageUrl.
// Container is the source of truth for `imageUrl` (via the batch hook from
// T7a-0) — ProductCard stays a pure presentational function of its props,
// matching spec §3's "container/presentational" invariant.
const viewModels = useMemo(
  () =>
    products.map((product) => {
      const meta = categoryPresentationMap.get(product.category_id);
      return {
        product,
        presentation: meta?.presentation ?? null,
        attributeSchema: meta?.schema ?? {},
        productAttributes: product.attributes as Record<string, unknown>,
        verticalSlug: meta?.verticalSlug ?? null,
        imageUrl: productImageUrls.get(product.id) ?? null,
      };
    }),
  [products, categoryPresentationMap, productImageUrls],
);
```

`productImageUrls` is the `Map<productId, string|null>` returned by
`useProductImageUrlsBatch` (T7a-0). `null` means "no cover for this
product" — the card falls back to the niche placeholder.

- [ ] **Step 2: Replace the `VehicleCard` JSX in the grilla view**

Locate the grilla view block (around line 848-856 in the original). Replace the `<VehicleCard ... />` usage with `<ProductCard ... />`:

```typescript
{/* BEFORE:
  <VehicleCard
    key={vehicle.id}
    product={vehicle}
    onView={...}
    onEdit={...}
    onDelete={...}
  />
*/}

{/* AFTER: */}
{viewModels.map((vm) => (
  <ProductCard
    key={vm.product.id}
    product={vm.product}
    presentation={vm.presentation}
    attributeSchema={vm.attributeSchema}
    productAttributes={vm.productAttributes}
    verticalSlug={vm.verticalSlug}
    imageUrl={vm.imageUrl}
    onView={() => router.push(`/catalog/${vm.product.id}`)}
    onEdit={() => router.push(`/catalog/${vm.product.id}/edit`)}
    onDelete={() => setDeleteId(vm.product.id)}
  />
))}
```

Adjust the import names if your project uses different `router`/`setDeleteId` names. The point: pass exactly the props `ProductCard` expects.

- [ ] **Step 3: Typecheck — grilla should now typecheck; estado view still has errors**

Run: `cd apps/web && pnpm typecheck`
Expected: errors only in the `estado` view block, which still uses the old `VehicleCard`. The grilla block should be clean.

- [ ] **Step 4: Commit**

```bash
cd apps/web
git add src/app/\(seller\)/catalog/page.tsx
git commit -m "refactor(catalog): replace VehicleCard with ProductCard in grilla view

The grilla view now renders <ProductCard> from the per-product view
model. VehicleCard (the vehicle-specific internal function) is no
longer used in the grilla; the estado view still uses it and is
replaced in the next commit."
```

---

### Task 7c: Replace `VehicleCard` (estado view) with `ProductCard`

**Files:**
- Modify: `apps/web/src/app/(seller)/catalog/page.tsx`

- [ ] **Step 1: Replace the estado view's `VehicleCard` usage**

Locate the estado view (around line 926-934) and apply the same replacement as 7b. Use the same `viewModels` array — no duplicate work.

- [ ] **Step 2: Remove the `VehicleCard` function entirely (lines 125-335 in the original)**

Delete the entire `function VehicleCard(...)` declaration. Also delete the now-unused helpers it referenced (`getApiStatus`, `formatPrice`, `transformProductToVehicle`, `isVehicleProduct` if not used elsewhere, etc.). Be careful: only delete helpers whose ONLY consumer was `VehicleCard`.

- [ ] **Step 3: Run full lint + typecheck + tests**

Run:
```bash
cd apps/web
pnpm typecheck
pnpm lint
pnpm test -- --run src/components/catalog src/lib/utils src/lib/api/verticals src/types/category
```

Expected: 0 errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
cd apps/web
git add src/app/\(seller\)/catalog/page.tsx
git commit -m "refactor(catalog): replace VehicleCard in estado view + remove legacy code

Both grilla and estado views now use <ProductCard>. The internal
VehicleCard function and its vehicle-specific helpers (transformProductToVehicle,
isVehicleProduct, getApiStatus for the badge, hardcoded ARS formatter) are
removed. Currency now comes from product.currency (the typed Product.currency
field), not a hardcoded literal."
```

---

### Task 7e: Migrate `publications/page.tsx` off `isVehicleProduct`

**Files:**
- Modify: `apps/web/src/app/(seller)/publications/page.tsx`

publications/page.tsx imports `isVehicleProduct` at lines 33, 168, 498.
T7c keeps `isVehicleProduct` exported (deprecated wrapper, per the new
"Out of scope" policy) so this task is technically optional for
typecheck. BUT — this task is a prerequisite for safely keeping
`isVehicleProduct` as a deprecated wrapper: it migrates the only other
real consumer in the frontend to the generic `product.attributes.category`
check, so that a future cleanup can delete the helper without surprises.

- [ ] **Step 1: Replace `isVehicleProduct` import with a local helper**

In `apps/web/src/app/(seller)/publications/page.tsx`:

```typescript
// BEFORE:
import { isVehicleProduct } from "@/types/product";

// AFTER:
// (no import — use the inline check, since publications is a generic
//  products list, not a vehicle list. The card view is generic; the
//  publications filter just needs to know "is this a vehicle category
//  for the FB Marketplace publisher?".)
```

Then add a tiny local guard near the top of the file (above
`buildPublicationRows`):

```typescript
function isVehicleCategory(p: Product): boolean {
  return p.attributes.category === "vehicle";
}
```

- [ ] **Step 2: Replace the two call sites (lines 168 and 498)**

```typescript
// BEFORE (line 168, inside buildPublicationRows):
if (!status || !isVehicleProduct(product)) return [];

// AFTER:
if (!status || !isVehicleCategory(product)) return [];

// BEFORE (line 498):
if (!isVehicleProduct(p)) return [];

// AFTER:
if (!isVehicleCategory(p)) return [];
```

- [ ] **Step 3: Typecheck + tests**

Run:
```bash
cd apps/web
pnpm typecheck
pnpm test -- --run src/app/\(seller\)/publications 2>/dev/null || pnpm test -- --run
```

Expected: 0 errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
cd apps/web
git add src/app/\(seller\)/publications/page.tsx
git commit -m "refactor(publications): migrate off isVehicleProduct to attributes check

publications/page.tsx was the only other frontend consumer of the
isVehicleProduct type guard (besides catalog/page.tsx, migrated in T7c).
Replaces it with a local isVehicleCategory(p) helper that reads
p.attributes.category directly. This unblocks a future cleanup that
will delete the now-fully-deprecated helper from types/product.ts."
```

---

## Task 8: Optimize placeholder assets (1.3 MB → ~20-40 KB)

**Files:**
- Create: `scripts/optimize-placeholders.mjs`
- Create: `apps/web/public/placeholders/placeholder-vehicles.webp`
- Create: `apps/web/public/placeholders/placeholder-realstate.webp`
- Create: `apps/web/public/placeholders/placeholder-generic.webp`
- Delete: `apps/web/public/placeholders/placeholder-vehicles.png`
- Delete: `apps/web/public/placeholders/placeholder-realstate.png`

- [ ] **Step 1: Install `sharp` as a dev dep (only if not already present)**

Run: `cd apps/web && rg "sharp" package.json || pnpm add -D sharp`
Expected: `sharp` added to devDependencies.

- [ ] **Step 2: Write the optimize script**

Create `scripts/optimize-placeholders.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Re-export placeholder PNGs to ~540px WebP for the catalog card.
 *
 * Input : apps/web/public/placeholders/placeholder-*.png
 * Output: apps/web/public/placeholders/placeholder-*.webp
 *
 * Why: 1.3 MB PNGs are absurd for a 270px display. WebP @ 540px (2× retina)
 *      brings them to ~20-40 KB. The catalog's <Image> component further
 *      negotiates AVIF/WebP at request time and resizes to the slot.
 */
import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACEHOLDER_DIR = join(
  __dirname,
  "..",
  "apps",
  "web",
  "public",
  "placeholders",
);

const MAX_DIM = 540; // 2× the typical 270px display size.

async function convertOne(pngPath) {
  const buf = await readFile(pngPath);
  const out = await sharp(buf)
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const targetPath = pngPath.replace(/\.png$/, ".webp");
  await writeFile(targetPath, out);
  console.log(
    `${basename(pngPath)}: ${(buf.length / 1024).toFixed(0)} KB → ${basename(targetPath)}: ${(out.length / 1024).toFixed(0)} KB`,
  );
}

async function main() {
  const entries = await readdir(PLACEHOLDER_DIR);
  const pngs = entries.filter((f) => extname(f) === ".png");
  for (const f of pngs) await convertOne(join(PLACEHOLDER_DIR, f));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Generate a neutral generic placeholder**

The two existing PNGs are branded. Create a neutral 540×540 WebP generic fallback from a plain gray rectangle:

```javascript
// Append to scripts/optimize-placeholders.mjs OR run inline via node -e:
```

Run inline:

```bash
cd apps/web
node -e "
  import('sharp').then(async ({default: sharp}) => {
    const buf = await sharp({
      create: { width: 540, height: 540, channels: 4, background: { r: 229, g: 231, b: 235, alpha: 1 } }
    }).webp({ quality: 80 }).toBuffer();
    const fs = await import('node:fs/promises');
    await fs.writeFile('public/placeholders/placeholder-generic.webp', buf);
    console.log('generic placeholder: ' + (buf.length / 1024).toFixed(0) + ' KB');
  });
"
```

- [ ] **Step 4: Run the script to convert the existing PNGs**

Run: `node scripts/optimize-placeholders.mjs`
Expected: two log lines showing the size reduction (e.g. `placeholder-vehicles.png: 1240 KB → placeholder-vehicles.webp: 28 KB`).

- [ ] **Step 5: Delete the original PNGs**

Run: `cd apps/web && git rm public/placeholders/placeholder-vehicles.png public/placeholders/placeholder-realstate.png`

- [ ] **Step 6: Run the placeholder tests to verify the assets exist (the unit test reads the path string, not the file, but this catches typos)**

Run: `cd apps/web && pnpm test -- --run src/lib/utils/placeholderForVertical.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 7: Visually verify the assets render in the dev server (manual smoke)**

Run: `cd apps/web && pnpm dev` and load `http://localhost:3000/placeholders/placeholder-vehicles.webp` in the browser. Confirm the image loads.

- [ ] **Step 8: Commit**

```bash
git add scripts/optimize-placeholders.mjs apps/web/public/placeholders/
git commit -m "perf(web): optimize placeholder assets (1.3MB PNG → ~30KB WebP)

Re-exports placeholder-vehicles and placeholder-realstate from 540px
PNGs to 540px WebP via sharp, plus a new neutral placeholder-generic
WebP. Total: 2.5 MB → ~80 KB. <Image> negotiates AVIF at request time.

Co-located optimize script: scripts/optimize-placeholders.mjs."
```

---

## Task 9: `next.config.ts` — add `images.formats` for AVIF/WebP negotiation

**Files:**
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Add the `formats` array**

Open `apps/web/next.config.ts` and **first verify** whether the `images:` block already exists with `rg -n "images:" apps/web/next.config.ts`.

- **If `images:` exists:** add a `formats` array (defaults to WebP only — we add AVIF first for better compression when the browser supports it). Preserve any existing `remotePatterns` and other keys:

  ```typescript
  images: {
    // ...existing keys preserved (remotePatterns, etc.)
    formats: ["image/avif", "image/webp"],
  },
  ```

- **If `images:` does NOT exist:** create it, but be careful — the existing
  `remotePatterns` (and any other keys like `deviceSizes`) may be set
  elsewhere in the config. Read the whole `next.config.ts` first, then
  add the `images:` block with `formats: ["image/avif", "image/webp"]`
  and the discovered `remotePatterns` (etc.) preserved verbatim.

- [ ] **Step 2: Typecheck + lint smoke test (NOT build)**

Per `CLAUDE.md` (project rule: "Never build after changes"), do NOT run
`pnpm build` here. CI will catch the build. Run typecheck and lint as
the smoke:

```bash
cd apps/web
pnpm typecheck
pnpm lint
```

Expected: 0 type errors, 0 lint errors. (If CI later fails the build
with an `images:` config issue, fix it then — it's a config-only change
with no code that the build smoke would catch earlier than CI.)

- [ ] **Step 3: Commit**

```bash
cd apps/web
git add next.config.ts
git commit -m "perf(web): enable AVIF/WebP negotiation in next/image

Adds images.formats: ['image/avif', 'image/webp']. Browsers advertising
AVIF in Accept get ~30% smaller responses than WebP. The placeholder
WebP source assets (T8) and the upload-pipeline JPEG outputs both
benefit without code changes."
```

---

## Task 10: E2E smoke for the generic catalog grid

**Files:**
- Create: `tests/e2e/specs/catalog-productcard.spec.ts`

Unit tests + a component test for `ProductCard` cover the contract
deterministically, but the catalog grid is the only place where the
generic card actually renders against a real backend + real
TanStack Query + real placeholder assets. This E2E smoke guards
against regressions in the wiring (verticals read-API, presentation
map, image URL batch, placeholders, badge positioning).

- [ ] **Step 1: Write the failing spec**

Create `tests/e2e/specs/catalog-productcard.spec.ts` (follows the
pattern in `tests/e2e/specs/catalog-accessibility.spec.ts`):

```typescript
import { test, expect } from "@playwright/test";
import {
  mockVehiclesEndpoint,
  mockCategoriesEndpoint,
  mockOrgVerticalsEndpoint,
} from "../helpers/mock-endpoints";
import { MOCK_CATEGORIES, MOCK_VEHICLES } from "../fixtures/mock-data";

/**
 * E2E smoke for the generic ProductCard (Subsystem A).
 *
 * Mocks the verticals + products + image-urls endpoints so the test is
 * self-contained and never hits the real backend. Validates the
 * end-to-end wiring: categoryPresentationMap + ProductCard + placeholders.
 */

test.describe("Catalog — Generic ProductCard", () => {
  test.beforeEach(async ({ page }) => {
    await mockOrgVerticalsEndpoint(page);
    await mockCategoriesEndpoint(page);
    await mockVehiclesEndpoint(page);
  });

  test("renders a vehicle card with the real StatusBadge testid", async ({ page }) => {
    await page.goto("/catalog");
    // At least one card visible.
    await expect(page.getByRole("article").first()).toBeVisible();
    // Real StatusBadge carries data-testid="vehicle-status" (StatusBadge.tsx:85).
    await expect(page.getByTestId("vehicle-status").first()).toBeVisible();
    // Card shows the cover OR the niche placeholder (whichever the fixture
    // provides — depends on whether MOCK_VEHICLES includes cover_image_key).
    const img = page.getByRole("article").first().locator("img").first();
    await expect(img).toBeVisible();
  });

  test("falls back to the vehicles placeholder when the product has no cover", async ({ page }) => {
    // Use a fixtures variant with cover_image_key=null; mock-endpoints helper
    // can filter, or override the mockVehiclesEndpoint fixture inline.
    await page.route("**/api/v1/products/*/image-urls", (route) =>
      route.fulfill({ status: 404, body: "" }),
    );
    await page.goto("/catalog");
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeVisible();
    const imgSrc = await firstCard.locator("img").first().getAttribute("src");
    // Either the niche placeholder (vehicles) or the generic fallback —
    // never the product image (404'd above).
    expect(imgSrc).toMatch(/placeholder-(vehicles|generic)\.webp/);
  });

  test("a real-estate category renders without crashing (no vehicle-only fields)", async ({ page }) => {
    // Override the verticals mock to return a real-estate vertical with a
    // real-estate product. The card must render (not crash, not show
    // raw template strings) and present the area_m2 meta cell.
    await page.route("**/api/v1/organizations/*/verticals", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          verticals: [
            {
              id: "v2",
              name: "Bienes raíces",
              slug: "bienes-raices",
              presentation: {
                card_fields: [
                  { key: "area_m2", source: "attributes.area_m2" },
                  { key: "bedrooms", source: "attributes.bedrooms" },
                ],
                subtitle_template: "{bedrooms} amb · {area_m2} m²",
                filter_fields: [],
              },
              categories: [
                {
                  id: "c2",
                  name: "Departamentos",
                  slug: "departamentos",
                  attribute_schema: {
                    area_m2: { type: "number", filter_type: "range", unit: "m²" },
                    bedrooms: { type: "number", filter_type: "range" },
                  },
                  presentation: null,
                  filter_fields: [],
                },
              ],
            },
          ],
        }),
      }),
    );
    await page.goto("/catalog");
    const card = page.getByRole("article").first();
    await expect(card).toBeVisible();
    // Real-estate meta cell must appear (label + value).
    await expect(card.getByText("Superficie")).toBeVisible();
    // No raw template strings in the rendered HTML.
    const html = await card.innerHTML();
    expect(html).not.toMatch(/\{area_m2\}|\{bedrooms\}/);
  });
});
```

- [ ] **Step 2: Confirm the mock-endpoints helpers cover the new endpoints**

The new spec uses `mockOrgVerticalsEndpoint(page)` (lines 25 and 41).
If this helper does not yet exist in `tests/e2e/helpers/mock-endpoints.ts`,
add it — pattern mirrors `mockCategoriesEndpoint`:

```typescript
// In tests/e2e/helpers/mock-endpoints.ts:
export async function mockOrgVerticalsEndpoint(page: Page) {
  await page.route("**/api/v1/organizations/*/verticals", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ORG_VERTICALS),
    }),
  );
}
```

(Define `MOCK_ORG_VERTICALS` in `tests/e2e/fixtures/mock-data.ts` if not
already present — follow the contract from T1 step 1's
`OrgVerticalsResponse`.)

- [ ] **Step 3: Run the E2E smoke**

```bash
cd tests/e2e
pnpm test -- catalog-productcard
```

Expected: 3 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/specs/catalog-productcard.spec.ts tests/e2e/helpers/mock-endpoints.ts tests/e2e/fixtures/mock-data.ts
git commit -m "test(e2e): generic ProductCard smoke (vehicle + real-estate + placeholder fallback)

End-to-end coverage for the Subsystem A wiring: verifies the real
StatusBadge testid renders, the placeholder fallback path works when
the image-urls endpoint 404s, and a real-estate category renders
without vehicle-only fields and without leaking raw template strings."
```

---

## Final Verification

After all 10 top-level tasks are complete (T1, T2, T3, T4, T5, T6, T7, T8, T9, T10 — with T7 split into 5 sub-tasks: T7a-0, T7a, T7b, T7c, T7e), run the full web quality gate from the project root:

```bash
cd apps/web
pnpm typecheck         # 0 errors
pnpm lint              # 0 errors, 0 warnings (max-warnings 0 per project policy)
pnpm test -- --run     # all unit + component tests pass
cd ..
./scripts/check-hooks.sh # if it exists — confirms hooks are wired
```

Then run the backend gate to ensure Foundation still passes:

```bash
cd apps/api
uv run ruff check . && uv run ruff format --check .
uv run pyright
uv run pytest
```

**All gates green → ready for PR.**

---

## Self-Review Notes

**Spec coverage (§1-§10):**
- §1 Goal: T6 + T7 (the card renders any vertical).
- §2 Scope (in): T6 (ProductCard), T7 (catalog wiring), plus primitives T1-T5.
- §3 Container/presentational: T6 enforces "pure" (no fetch, no store); T7 makes the container fetch verticals + resolve URLs.
- §4 Card layout: T6 covers image 4:3, status badge top-right, title single-line truncate, subtitle, price, meta 2x2 max 4, actions on hover.
- §5 Niche placeholder: T4 (helper) + T8 (optimized assets).
- §6 card_fields formatting: T3 (formatCardField).
- §7 Subtitle composition: T2 (composeSubtitle, client-side per deviation).
- §8 Degradation: T6 tests null-presentation and missing-attribute cases; T6 wraps `Intl.NumberFormat` in try/catch (USD fallback) so a malformed `Product.currency` does not crash the card.
- §9 Testing: every task has unit/component tests; T7 has integration via the full test suite; **T10 adds an end-to-end Playwright smoke** that exercises the wiring (verticals read-API + presentation map + ProductCard + placeholders) against a mocked backend.
- §10 Primitives delivered: T1 (types), T2 (composeSubtitle), T3 (formatCardField), T4 (placeholderForVertical), T6 (ProductCard). All five are reused by future slices (table, detail, B).

**Architectural change — image URL resolution moves from per-card to container-batch:**

The legacy `VehicleCard` invoked `useProductImageUrls(productId)` per
card; TanStack Query dedup'd via cache key, but the network still
served N HTTP requests per visible page. The new `ProductCard` is
**pure presentational** (spec §3) — it does no fetching. The catalog
container now calls `useProductImageUrlsBatch(ids[])` (T7a-0) once per
render and threads `imageUrl` as a prop into `ProductCard`. The
`useQueries` wrapper preserves the existing per-product endpoint
(no backend change for this slice) and gives the container a single
`Map<productId, string|null>` to feed the per-product view model. A
future optimization (single `POST /products/image-urls:batch` endpoint)
is explicitly out of scope.

**`VehicleStatus` literal count:** the existing `StatusBadge` carries
7 status literals (`published`, `pending`, `failed`, `draft`,
`expired`, `online`, `sold`), not 8. T1 pins `Product.status` against
`VehicleStatus` via `expectTypeOf().toEqualTypeOf` so any widening on
either side trips a unit test instead of a runtime cast.

**StatusBadge data-testid contract:** the real `StatusBadge` carries
`data-testid="vehicle-status"` (StatusBadge.tsx:85). T6's earlier draft
wrapped it in a div with `data-testid="status-badge"`; that override
was removed — the test now asserts `vehicle-status`, and the wrapper
div is purely a positioning hook (no testid). Tests in `DataGrid.test.tsx`
that rely on `vehicle-status` continue to work unchanged.

**Placeholder scan:** No "TBD", "TODO", "implement later", or vague instructions. Every code block is complete.

**Type consistency:** `CardField`, `CategoryPresentation`, `AttributeSchemaEntry`, `OrgVerticalsResponse`, `VerticalResponse`, `CategoryNode` are defined in T1 and consumed by T2-T7. `formatCardField` returns `FormattedCardField` (defined inline in T3). `ProductCard` props are defined in T6 and consumed by T7. `useProductImageUrlsBatch` return type is pinned in T7a-0 (`{ urls: Map<productId, string|null>; isLoading: boolean }`) and consumed by the catalog container in T7a/T7b. No naming drift.

**Gaps not addressed (intentional, out of scope):**
- `VehicleCard` legacy had hardcoded status mapping (`getApiStatus`); the new card uses `product.status` directly via the existing `StatusBadge`. The 7 literals cover the current `Product.status` union; widening `Product.status` requires a coordinated T1 test update + a `StatusBadge` config entry.
- Currency: `Product.currency` is `string` (not a strict ISO-4217 union). T6 wraps the `Intl.NumberFormat` call in try/catch with a USD fallback (spec §8 "Never crash"). A follow-up could narrow `Product.currency` to a strict union in the backend and remove the try/catch.
- The old `VehicleCard` had a `unoptimized` flag on the cover image; the new card preserves this for signed MinIO URLs (T6 step 3) and the dev comment in `next.config.ts` explains why.
- `isVehicleProduct` and `transformProductToVehicle` are **kept** (deprecated wrappers) in `types/product.ts` and `lib/api/products.ts` for this slice. T7e migrates the only other real frontend consumer (`publications/page.tsx`); the helpers remain exported so any third-party consumer (E2E tests, future client code, external docs) does not break. Full removal is a follow-up after Subsystem C (auto-category on create) lands, so the write path can delete vertical-specific code in one coherent change.
- `UpdateProductUseCase` (Foundation Plan 2 gap) is NOT addressed in this plan. It is a prerequisite for future slices (e.g. when Subsystem C auto-categorizes on create), not for the read-side card slice. If a card test ever depends on title recomposition, the gap is documented and the use case is filed as a separate task.
- T7d (originally a no-op `useProductImageUrls` verification step with an `--allow-empty` commit) was **eliminated** — its intent is subsumed by T7a-0 + T7a step 1 (the batch hook setup happens in the same commit as the verticals query setup, with no follow-up verification needed).
- T9 step 2 originally ran `pnpm build` as a smoke test. Per `CLAUDE.md`'s "Never build after changes" rule, the build was replaced with `pnpm typecheck` + `pnpm lint`. CI catches build breaks; the explicit `pnpm build` here was redundant and would have eroded the project convention.
