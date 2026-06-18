# Subsystem B — Dynamic Filters (Design Spec)

**Date:** 2026-06-17
**Status:** Design approved (brainstorming) → ready for implementation plan
**Roadmap:** `docs/superpowers/specs/2026-06-06-product-platform-roadmap.md` (Subsystem B)
**Depends on:** Foundation (Subsystem 0, MERGED — PRs #10/#13) + Subsystem A (MERGED — PR #34/#36)

## Goal

Replace the hardcoded vehicle-specific catalog filters (`useVehicleFilters`,
`FilterSidebar` with `BRANDS`/`STATUSES` constants) with filters **driven by each
category's `filter_fields`**, and make those filters actually filter — by adding
generic `Product.attributes` (JSONB) filtering on the backend. After this change a
catalog operating in any vertical (Vehicles, Real Estate, Articles…) renders the
right filters from its category schema, with zero per-niche frontend code.

## Locked decisions (from brainstorming, 2026-06-17)

1. **Scope = full-stack.** Backend gains generic attribute filtering. Frontend-only
   was rejected: with `useInfiniteProducts` (50/page) client-side filtering only
   filters the loaded page — incorrect for real catalogs.
2. **Filter source = selected category.** The catalog gets a category selector; the
   dynamic filters derive from that category's `filter_fields`. If the org has a
   single active category, it auto-selects (no extra step). Multi-category *union*
   was rejected (mixes unrelated filters); "single vertical only" was rejected
   (breaks as soon as an org enables a 2nd vertical — the M2M already supports it).
3. **Backend filtering = `AttributeFilter` value object + repository translation.**
   Domain defines the contract; infrastructure translates to JSONB SQL. Specification
   pattern was rejected (over-engineering for ~5 filter types); Python post-query
   filtering was rejected (breaks pagination).
4. **Select-without-options = dynamic faceting (bounded).** `make`/`color` are
   `filter_type: "select"` with no `options` in the schema. A dedicated endpoint
   returns the DISTINCT values present in `attributes[key]` for that category — **no
   counts**. Static seed lists and "degrade to text input" were rejected.

## Gaps closed by this spec (found during design verification)

- **G1 — `filter_type` universe was misaligned in 3 places.** Seed uses
  `select | range | text`; frontend type declared `range | exact | boolean | select`
  (missing `text`); resolver defaulted to `"text"`. **Canonical set:**
  `range | select | text | boolean | exact`. Reconcile the frontend `FilterField` /
  `AttributeSchemaEntry` unions, the resolver, and the backend VO to this set.
- **G2 — Shape mismatch.** `presentation_resolver.filter_fields()` emits
  `{"field": name, "filter_type": ...}`; frontend `FilterField` expects
  `{key, filter_type, label}`. Backend will emit `key` (rename `field`→`key`) and the
  frontend will derive `label` by humanizing `key` (the `label?` override stays
  optional). The resolver must **not** silently default `filter_type` to `"text"`:
  a `filterable` field without a `filter_type` is a seed bug — log/skip, don't guess.
- **G3 — `select` without `options`** → dynamic faceting endpoint (decision 4).
- **G4 — `text` filter type** was absent from the backend design → `ILIKE %value%`.
- **G5 — a11y:** `FilterSidebar` has `aria-label="Vehicle filters"` hardcoded →
  generic label. Project enforces zero a11y warnings (PR #24).

## Architecture

```
Category schema (filterable + filter_type)        Product.attributes (JSONB + GIN)
        │                                                     ▲
        ▼                                                     │
 presentation_resolver.filter_fields()              product_repository_impl
   → [{key, filter_type}]  (G2: key, not field)       .get_all(attribute_filters)
        │                                                     ▲
        ▼                                                     │
 GET /organizations/{id}/verticals  ──► frontend ──► AttributeFilter VO (domain)
 GET /categories/{id}/filter-values (G3, new)               ▲
        │                                                     │
        ▼                                                     │
 useCatalogFilters (URL state) ──► apiFilters ──► useInfiniteProducts ──► API router
```

### Backend

**Domain — new Value Object** (`domain/value_objects/attribute_filter.py`):

```python
class AttributeFilter(ValueObject):
    key: str                       # attribute key, e.g. "year", "make"
    filter_type: Literal["range", "select", "text", "boolean", "exact"]
    # exactly one populated per filter_type:
    value: str | bool | None       # exact / boolean / text
    values: list[str] | None       # select (multi)
    min: Decimal | None            # range
    max: Decimal | None            # range
```

Validators: `range` requires at least one of `min`/`max`; `select` requires non-empty
`values`; `text`/`exact` require `value`; `boolean` requires bool `value`.

**Repository interface** — `AbstractProductRepository.get_all(...)` gains
`attribute_filters: list[AttributeFilter] = []`.

**Infrastructure** (`product_repository_impl.get_all`) translates each filter to
a WHERE clause over `ProductModel.attributes`. Combination semantics: **AND across
filters; OR within a `select`'s `values`.** A product missing the attribute is excluded
from `range`/`exact`/`select`/`boolean` (no match), included only when no filter
references that key.

| filter_type | SQL (SQLAlchemy 2.0)                                                              | GIN `jsonb_path_ops` |
| ----------- | --------------------------------------------------------------------------------- | -------------------- |
| `exact`     | `ProductModel.attributes.contains({key: value})` (`@>`)                           | ✅ used               |
| `select`    | `attributes[key].astext.in_(values)` (OR)                                         | partial              |
| `text`      | `attributes[key].astext.ilike(f"%{value}%")`                                      | ❌ not used           |
| `range`     | `cast(attributes[key].astext, Numeric)` between `min`/`max` (each bound optional) | ❌ not used           |
| `boolean`   | `cast(attributes[key].astext, Boolean) == value`                                  | ❌ not used           |

**Performance note (not blocking at current volume):** the GIN `jsonb_path_ops` index
accelerates only containment (`exact`). `range`/`text`/`boolean` use the text-cast of a
JSONB member and will seq-scan. If catalogs grow large, add expression indexes per hot
range key (e.g. `((attributes->>'year')::numeric)`) — out of scope here, documented.

**Router validation (SECURITY — not optional):** the products list endpoint parses
incoming attribute filters and **validates each key against the category's
`attribute_schema`**: only keys with `filterable: true` are accepted, and the
`filter_type` must match the schema. Unknown/non-filterable keys are rejected (422),
never passed through to the JSONB query. Without this, a client could inject arbitrary
keys/operators into the attributes query.

**New endpoint (G3)** — `GET /api/v1/categories/{category_id}/filter-values`:
returns, for each `select` field of that category **that has no static `options`**, the
DISTINCT non-null values present in `attributes[key]` among that tenant's products in
the category. No counts. Tenant-scoped. Shape:
`{ "values": { "make": ["Toyota", "Honda", ...], "color": [...] } }`.

### Frontend

- **`useCatalogFilters`** (`lib/hooks/`, replaces `useVehicleFilters`): given the
  selected category's `filter_fields`, reads/writes generic URL state. URL keys = the
  attribute keys (e.g. `?year_min=2015&year_max=2020&make=Toyota,Honda`). Keeps the
  existing searchParams pattern. Core filters (`search`, `status`, price) remain as
  today — they are top-level columns, not attributes; B layers dynamic filters on top.
- **`FilterSidebar`** (generic): renders each `filter_field` by `filter_type`:
  - `range` → `Slider` (bounds from `validation_rules` min/max when present, else data
    range fallback)
  - `select` → `Checkbox` list, options from schema `options` OR the filter-values
    endpoint (G3)
  - `text` → text input (debounced)
  - `boolean` → toggle
  - `exact` → single-select / input
  Generic `aria-label` (G5). `BRANDS`/`STATUSES` constants deleted.
- **`FilterPills`** (generic): active-filter pills derived from active URL keys; label
  via humanized key (or `FilterField.label`).
- **Category selector**: lists the org's categories (from
  `GET /organizations/{id}/verticals`); auto-selects when exactly one active category.
- **`catalog/page.tsx`**: maps the generic filter state → API query params; drops the
  vehicle-baked `make`/`year_min`/`year_max` wiring (which was a backend no-op anyway).
- **API client / Zod** (`lib/api/`): a schema for the filter-values response and for the
  attribute-filter query params (no `as` assertions — project zero-tolerance).

## Testing (TDD strict — failing test first)

**Backend (pytest):**
- `AttributeFilter` VO validation per type (valid + invalid payloads).
- `get_all` per `filter_type` over JSONB: `range` (min-only, max-only, both),
  `select` (OR within values), `text` (ILIKE), `boolean`, `exact`.
- AND-across-filters + missing-attribute exclusion semantics.
- Pagination correctness with attribute filters applied.
- Router: rejects non-`filterable` keys and `filter_type` mismatch (422) — security.
- filter-values endpoint: DISTINCT values, tenant-scoped, excludes nulls, only
  select-without-options fields.
- `presentation_resolver.filter_fields`: emits `key` (G2), no silent `text` default.

**Frontend (Vitest + Testing Library):**
- `useCatalogFilters`: URL read/write round-trip per filter_type; clear-all.
- `FilterSidebar`: renders correct control per `filter_type`; select sourced from
  options vs facet endpoint; generic aria-label (G5).
- `FilterPills`: pills reflect active keys; remove-pill clears the key.
- Category auto-select when single category; selector switches filter set.

## Out of scope (YAGNI — explicit)

- Facet **counts** (only DISTINCT values for select-without-options).
- Multi-category simultaneous filtering (union).
- Saved / persisted filter presets.
- `search` over attributes (stays on title/description).
- Range expression indexes (documented as future perf work).
- Backend `Permission.VEHICLE_*` rename (Subsystem E).

## Definition of Done

- Catalog renders filters from the selected category's `filter_fields`; no
  vehicle-specific filter code remains in the frontend.
- `make`/`color` (select-without-options) populate from the filter-values endpoint.
- Backend filters products by `attributes` JSONB for all canonical filter types.
- Non-filterable / mismatched keys are rejected (422).
- Vehicle catalog keeps functional parity (year range, make, mileage… now actually
  filter server-side — a fix vs the current no-op).
- All new code TDD'd; web typecheck 0 / lint 0; backend ruff/format/pyright 0; full
  suites green; GGA clean.
```
