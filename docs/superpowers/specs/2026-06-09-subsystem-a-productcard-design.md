# Subsystem A — Generic ProductCard (Presentation) — Design

> Part of the product-platform generalization roadmap
> (`docs/superpowers/specs/2026-06-06-product-platform-roadmap.md`).
> Depends on: **Subsystem 0 — Foundation** (merged, PR #10 + #13).
> Slice: **card only** (catalog grid). Table and detail are later slices.

## 1. Goal

Replace the vehicle-specific catalog card with a **generic, contract-driven
`ProductCard`** that renders any vertical (Vehicles, Real Estate, Artículos)
from the category's presentation contract — without re-coding the frontend per
niche. The same component renders a car and an apartment; only the data
differs.

Success criterion: a Real Estate product renders correctly in the catalog grid
**with no changes to card code** — only its category's `presentation` +
`attribute_schema` drive what is shown.

## 2. Scope

**In scope (this slice):**

- A pure `ProductCard` component for the catalog **grid (grilla) mode**.
- The shared **primitives** that later slices (table, detail) reuse:
  - Frontend types for the presentation contract.
  - `composeSubtitle(template, attributes)` — client-side subtitle composition.
  - `formatCardField(field, value, schema)` — label + value formatting.
  - `placeholderForVertical(slug)` — niche → placeholder asset mapping.
- Wiring in the catalog page (container) to feed the card.

**Out of scope (future slices):**

- DataGrid (table) column generalization → pairs with Subsystem B (filters).
- `CatalogDetailView` generalization → later slice.
- Dynamic filters (Subsystem B), auto-category (C), onboarding/RBAC (D/E).
- Server-side subtitle composition (see §7 — intentionally client-side here).

## 3. Architecture — container / presentational

```
┌─ catalog/page.tsx (CONTAINER) ─────────────────────────────┐
│  • useQuery products                                       │
│  • useQuery GET /organizations/{id}/verticals  (contract)  │
│  • build map: category_id → presentation (+ attribute_schema)
│  • for each product → <ProductCard product presentation /> │
└───────────────────────────┬────────────────────────────────┘
                            │ props: { product, presentation }
┌───────────────────────────▼────────────────────────────────┐
│  ProductCard (PURE PRESENTATIONAL)                          │
│  • no data fetching, no store reads                         │
│  • renders: image|placeholder + badge, title, subtitle,    │
│    price, card_fields meta, hover actions                  │
│  • pure helpers: composeSubtitle, formatCardField,         │
│    placeholderForVertical                                  │
└─────────────────────────────────────────────────────────────┘
```

The card is a **pure function of `(product, presentation)`** — fully
testable in isolation, no backend change required (the verticals read-API from
Foundation already exposes the contract).

## 4. The card — layout and zones

Layout **A** (vertical). Top to bottom:

| Zone                            | Source                                                                | Rules                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Image** (4:3)                 | `product` cover key → signed URL; else niche placeholder              | `object-fit: cover` for real photos, `contain` for placeholders                                                                                                                  |
| **Status badge**                | `product.status`                                                      | Overlay top-right of the image. A product _state_ — never mixed into the data meta.                                                                                              |
| **Title**                       | `product.title` (stored, composed at save time)                       | Single line, truncate with ellipsis.                                                                                                                                             |
| **Subtitle**                    | `composeSubtitle(presentation.subtitle_template, product.attributes)` | Muted; hidden if empty/no template.                                                                                                                                              |
| **Price**                       | `product.price_cents` + `currency`                                    | Fixed slot, currency format (`Intl.NumberFormat`).                                                                                                                               |
| **Meta**                        | `presentation.card_fields`                                            | **2-column grid**, each cell = humanized label + formatted value. **Max 4** fields (2×2); extras dropped (shown in detail later). `price` is skipped here (it has its own slot). |
| **Actions** (Editar / Publicar) | —                                                                     | Appear on **hover** over the card; do not occupy layout in the resting state.                                                                                                    |

Defaults locked: **image 4:3 · max 4 card_fields · actions on hover**.

## 5. Niche placeholder (no image)

When a product has no cover image, the image slot shows a **per-niche branded
placeholder**, not a generic gray box.

- Asset path: `/placeholders/placeholder-{niche}.png`.
- Mapping: vertical root slug → niche key.
  `vehiculos-y-transporte → vehicles`, `bienes-raices → realstate`.
  (Today only `vehicles` and `realstate` assets exist; each new niche needs its
  PNG. Unknown niche → a neutral generic placeholder fallback.)
- `placeholderForVertical(slug)` returns the asset path; the card chooses
  cover-vs-placeholder.
- `object-fit: contain` for placeholders (they are branded logos — `cover`
  would crop the "ProSell / PREMIUM ..." text).

**⚠️ Performance task (must be in the plan):** the current placeholder PNGs are
**~1.3 MB each** — absurd for an image shown at ~270 px. Two-lever fix, in order
of impact:

1. **Render via `next/image` `<Image>` (not raw `<img>`).** Next optimizes at
   runtime: resizes to the slot and negotiates format (serves WebP/AVIF per the
   browser's `Accept`), cached. This alone makes the browser receive ~15–30 KB
   instead of 1.3 MB. The card image (cover AND placeholder) MUST use `<Image>`.
2. **Re-export the source assets** to ~540 px (2× retina) as **WebP** → 1.3 MB
   → ~20–40 KB. De-bloats the repo and speeds Next's first optimization pass.

Format guidance: **WebP for the source asset** (branded flat-color logo → WebP
compresses it well, universal support). For serving, set
`images.formats: ['image/avif','image/webp']` in `next.config` and let `<Image>`
negotiate — do NOT hardcode a format in markup.

Tooling note: no `convert`/PIL/`cwebp`/`sharp` is available in the current shell;
the conversion is an implementation step (use `sharp` — Next's own lib — via a
small script, or convert locally with `cwebp`/Squoosh).

**Scope boundary — product images are NOT this slice's problem.** Uploaded
product photos are ALREADY optimized by the backend `ImageOptimizer`
(`apps/api/src/prosell/infrastructure/images/image_optimizer.py`): resize to
≤1920×1080, JPEG quality 85, strip EXIF, run in the image upload flow
(`image_router.py`). The 1.3 MB problem is specific to the **static placeholder
assets**, which bypass that pipeline (they are committed PNGs). Only the
placeholder optimization belongs to Subsystem A. Broader image-pipeline
modernization — converting the optimizer's output to WebP, serving MinIO signed
URLs through `next/image` (complicated by the remote-host allowlist), tuning the
1920×1080/q85 caps — is a **separate optimization slice**, explicitly out of
scope here.

## 6. card_fields formatting (client-side, type-based)

`attribute_schema` today has `type` + `filter_type` but **no display label or
unit**. The card formats client-side, no backend change:

- **Label:** humanize the field name. Small known-label dictionary first
  (`mileage → Kilometraje`, `area_m2 → Superficie`, …), capitalize fallback.
- **Value:** format by `type` — `number` → localized number; a `price`-like
  field → currency; string → as-is.
- Units (km, m²) are approximate at first and refined later (e.g. by extending
  the contract with `unit`/`label` — explicitly deferred, not in this slice).

## 7. Subtitle composition — client-side (documented deviation)

Foundation spec §4 says subtitle is composed server-side and returned in the
read model. **Decision (see engram `foundation/subtitle-composition`):**
subtitle is composed **client-side in Subsystem A** instead. Rationale: subtitle
is purely presentational/ephemeral (title is the stored/searchable one); the raw
`subtitle_template` is already exposed in the contract.

`composeSubtitle(template, attributes)` mirrors the server `compose_from_template`
contract: literal-only `{field}` substitution, drop unknown placeholders, no
double separators when a field is missing, literals preserved.

## 8. Degradation / error handling

- `presentation == null` (category without a contract): render title + price +
  image/placeholder only; no subtitle, no meta. Never crash, never show raw
  template strings.
- Missing attribute referenced by a card_field: that cell is omitted (no empty
  "label: —" noise).
- Unknown niche slug: neutral generic placeholder.
- Image signed-URL miss: fall back to the niche placeholder (same as no cover).

## 9. Testing

- **Unit (pure helpers):** `composeSubtitle` (full template, missing field, no
  double separators, unknown placeholder dropped, literals); `formatCardField`
  (number, currency, string, known vs humanized label); `placeholderForVertical`
  (known slugs, unknown → fallback).
- **Component (`ProductCard`):** renders a Vehicle and a Real Estate fixture
  from contract; status badge present; ≤4 meta cells; placeholder shown when no
  cover; null-presentation degrades to title+price+image; actions appear on
  hover.
- **Validation data:** the dev DB has ~2 vehicles + real estate products — use
  them to eyeball the real card + placeholders in the running app.

## 10. Primitives delivered (reused by later slices)

1. Frontend contract types (`presentation`, `card_fields`, `subtitle_template`,
   `filter_fields`) — note `src/types/category.ts` is currently stale (no
   presentation); this slice models the real contract.
2. `composeSubtitle(template, attributes)`
3. `formatCardField(field, value, schema)` (label + value)
4. `placeholderForVertical(slug)` + the optimized placeholder assets
5. The pure `ProductCard` component

Table (Subsystem B-adjacent) and detail slices consume 1–4 directly.
