# Foundation: Category-Driven Presentation Model

**Date:** 2026-06-06
**Status:** IMPLEMENTED (PR #10 + #13, merged 2026-06-10)
**Scope:** Backend / domain foundation. This is subsystem **0** — the base that subsystems A–E depend on.

---

## 1. Problem

The catalog is generic in the domain (`Product` has `category_id` + a free `attributes` dict, `image_urls`, `cover_image_key`) but **vehicle-specific in the frontend and in some backend leaks**:

- The catalog filters are hardcoded to `make / model / year` (`useVehicleFilters`).
- The product title is composed vehicle-specifically (`{year} {make} {model}`).
- The card (`VehicleCard`) renders vehicle fields directly.
- Even the RBAC permission model leaks vehicle naming (`Permission.VEHICLE_CREATE`, …).

We want a **niche/vertical-driven** product platform where each vertical (Vehicles, Real Estate, Retail…) declares its own fields, title, subtitle, and filters — without re-coding the frontend per niche. The platform already has most of the building blocks (a `Category` tree with `field_config` + `attribute_schema`, multi-tenancy, RBAC, organizations, teams, invitations). This spec finishes the data model so the rest can hang off it.

## 2. Locked decisions

These were decided during brainstorming and are NOT open for re-litigation in the plan:

1. **Vertical = root `Category` (`level 0`).** No new "Vertical" entity. "Vehicles", "Real Estate" are level-0 categories; sub-categories hang off them via `parent_id`. Reuses the existing tree.
2. **Categories are GLOBAL platform templates** (system-owned), not per-tenant trees. ProSell defines each vertical's tree + schema once.
3. **An organization operates in N verticals** via a many-to-many link (`organization_vertical`). One account, multiple niches — no account-per-niche.
4. **Presentation contract lives on category metadata** and inherits down the tree.
5. **Title/subtitle use a template string** with `{field_name}` placeholders (safe, literal-only substitution — supports literals like "en Palermo"). NOT a flat field list.
6. **Title is stored** on `Product.title` (recomposed on every save), so it stays searchable/sortable in the DB.

## 3. Data model changes

### 3.1 `Category` becomes a global template

- Root categories (`level 0`) are the **verticals**.
- Categories are **system-owned**: `tenant_id` becomes **nullable**, and global templates store `tenant_id = NULL` (decision: NULL is simpler than a magic "system tenant" row and reads as "belongs to no dealer"). Any future per-dealer override category would carry a real `tenant_id`.
- Existing fields stay: `parent_id`, `level`, `field_config` (UI renderer), `attribute_schema` (validation).

### 3.2 New: presentation contract on `Category`

Add a `presentation` JSONB column on `Category` (inherited down the tree — a child without its own `presentation` falls back to the nearest ancestor that has one):

```jsonc
{
  "title_template": "{year} {make} {model}",
  "subtitle_template": "{trim} · {mileage} km",
  "card_fields": ["price", "status"], // extra fields the card surfaces
}
```

### 3.3 Per-field filter declaration

Extend each entry of `attribute_schema` with optional filter metadata:

```jsonc
{
  "make": {
    "type": "string",
    "required": true,
    "filterable": true,
    "filter_type": "select",
  },
  "year": {
    "type": "number",
    "required": true,
    "filterable": true,
    "filter_type": "range",
  },
  "mileage": { "type": "number", "required": false, "filterable": false },
}
```

`filter_type ∈ {select, range, text, boolean}`. Subsystem B (filters UI) reads this.

### 3.4 New table: `organization_vertical`

Many-to-many between organization and the verticals (root categories) it operates in:

| column             | type      | notes                           |
| ------------------ | --------- | ------------------------------- |
| `organization_id`  | UUID FK   | the dealer                      |
| `root_category_id` | UUID FK   | a `level 0` category (vertical) |
| `enabled_at`       | timestamp |                                 |

Composite PK `(organization_id, root_category_id)`.

### 3.5 `Product`

No structural change. `category_id` still points at a (now global) leaf category. `organization_id` already records the owning dealer.

## 4. Title / subtitle composition

A domain service `compose_product_title(category, attributes)`:

- Resolves the category's effective `presentation` (own, or inherited from the nearest ancestor).
- Substitutes each `{field_name}` with `str(attributes[field_name])`.
- **Missing/empty field** → the placeholder AND any immediately-adjacent separator collapse, so `"{year} {make} {model}"` with no `trim` never yields double spaces or dangling separators. (Concrete rule: split the template into tokens, drop tokens whose value is empty, then join survivors and normalize whitespace.)
- **Safety**: only `{field_name}` placeholders are substituted; values are inserted as plain text (no nested templates, no logic, no HTML). Unknown placeholders are dropped.
- Called on product **create and update**, writing the result to `Product.title`. Subtitle is composed the same way and returned in the read model (not stored — it's purely presentational; only `title` needs DB persistence for search/sort).

## 5. Read API

`GET /api/v1/organizations/{id}/verticals` → the org's enabled verticals with their category subtrees and presentation contracts:

```jsonc
{
  "verticals": [
    {
      "id": "...", "name": "Vehículos", "slug": "vehicles",
      "presentation": { "title_template": "...", "subtitle_template": "...", "card_fields": [...] },
      "categories": [
        { "id": "...", "name": "Autos", "attribute_schema": { ... }, "presentation": { ...inherited or own... } }
      ]
    }
  ]
}
```

This single contract feeds: A (rendering), B (filters), C (auto-category: 1 vertical+1 category → auto; N → picker).

## 6. Migration (project is NOT fully in production)

1. Seed the global vertical/category templates (start with the existing Vehicles tree + its schema, now system-owned).
2. Backfill `organization_vertical`: every org that currently has vehicle products gets the Vehicles vertical enabled.
3. Remap existing `Product.category_id` to the corresponding global category id.
4. Recompose existing product titles via the new service (idempotent backfill).
5. Drop/deprecate per-tenant category rows once products are remapped.

Because the app is not fully in production, a clean reset of category seed data is acceptable if it is simpler than an in-place remap — to be decided in the plan.

## 7. Out of scope (YAGNI / deferred to later specs)

- **Per-dealer schema overrides** (a dealer adding a custom field) — future override layer.
- **Template versioning**.
- **Conditional/logic-bearing templates** — substitution only.
- **Frontend** rendering, filters UI, create-flow UX — subsystems A/B/C.
- **Onboarding & dealer self-service RBAC** — subsystem E (note: rename `Permission.VEHICLE_*` → `LISTING_*`/`PRODUCT_*` belongs there or in a dedicated cleanup).
- **Ownership UI** (admin differentiating dealers) — subsystem D.

## 8. Risks

- **Category global-ization migration** touches a table with existing seeded data and FK from products. Must be sequenced carefully (templates → remap products → backfill M2M → drop tenant rows).
- **`tenant_id` nullability** on `Category` affects any query that assumes tenant scoping on categories. Audit category reads for tenant filters that would now drop global rows.
- **Title recomposition on update** must not clobber a manually-edited title if we ever allow manual override (we don't today — title is always derived; flag if that assumption changes).

## 9. Testing strategy

- **Domain unit**: `compose_product_title` — full template, missing fields (no double separators), empty attributes, unknown placeholder dropped, literals preserved (`"{tipo} en {barrio}"`).
- **Repository integration** (real test DB): `organization_vertical` create/read; product create/update persists the recomposed title; category presentation inheritance from ancestor.
- **API integration**: `GET /organizations/{id}/verticals` returns enabled verticals + subtrees + presentation; an org with 0 / 1 / N verticals.
- **Regression guard**: a vehicle product created through the new path yields the same title shape (`{year} {make} {model}`) as today.

## 10. Implementation status

Plan: `docs/superpowers/plans/2026-06-06-foundation-title-composition.md` (Plan 1 of 2).
Branch: `feat/category-presentation-foundation`.

**Done (Plan 1):**

- §3.2 `presentation` column on `Category` (entity + model + migration `a4d7a394211c`).
- §4 title composition service (`template_composer.compose_from_template` + `resolve_title`) wired into **product create** (server composes the title from the category's `title_template`; falls back to the request title when the category has none).
- Bug fixed en route: `CategoryModel.updated_at` `onupdate` was the literal string `"now()"`, which made **every category UPDATE** fail with an asyncpg `DataError`. Fixed to `func.now()`. (Worth knowing for Plan 2, which updates categories to set presentation.)

**Deferred:**

- §4 title recomposition on **UPDATE** → Plan 2 (needs the category loaded; clean via a dedicated `UpdateProductUseCase`). Edit still composes title client-side meanwhile — backward-compatible.
- `title` optional in the create DTO → subsystem A (only needed once the frontend stops sending a client-composed title).
- §3.1/§3.4 global-ization + filterable, §3.4 `organization_vertical` M2M, §5 read-API, subtitle → Plan 2.

**Resolved on `fix/catalog-image-perf` (reaches this branch when that PR merges):** `CreateProductUseCase` now forwards `cover_image_key` to `Product.create` (commit `37bcfe0`) — the cover was being dropped on create even after the repo persistence fix (`3fc7da8`).
