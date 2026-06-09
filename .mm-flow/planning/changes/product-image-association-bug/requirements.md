# Requirements — Product Image Association Bug

**Objective slug:** `product-image-association-bug`
**Status:** active
**Priority:** critical (P0 — production incident on prosellweb.com)
**Created:** 2026-06-03

## Problem statement

Products created via drag-and-drop in `/catalog/create` upload their images successfully to the DO Spaces bucket (`prosell-assets` in `atl1`), but the catalog grid renders a placeholder image instead of the actual uploaded photos.

## Root cause (verified 2026-06-03)

There are **three inconsistent storage locations** for product image associations. None of them align with each other:

| Location                                            | Type        | Written by                    | Read by                                |
| --------------------------------------------------- | ----------- | ----------------------------- | -------------------------------------- |
| `products.image_urls` (top-level JSONB column)      | canonical   | **NOBODY**                    | `GET /api/v1/products/{id}/image-urls` |
| `products.attributes->>'image_urls'` (nested JSONB) | orphan data | frontend `create/page.tsx:59` | NOBODY                                 |
| `product_images` (legacy table, 0 rows)             | dead schema | NOBODY (bulk upload has TODO) | NOBODY                                 |

The frontend sends images to `attributes.image_urls` (line 59 of `create/page.tsx`); no backend use case copies them to the top-level column. The signed-URL endpoint reads the always-empty top-level column → returns `images: []` → frontend shows placeholder.

The 8+ previous commits were symptom-fixes (placeholder fallback, retry logic, signed URL endpoint) that didn't ask **"where is the image↔product association actually persisted?"** — it never was, in the canonical location.

## What must be TRUE (acceptance criteria)

### Functional

1. **AC-1**: A product created via drag-and-drop in `/catalog/create` shows its images in the catalog grid (no placeholder).
2. **AC-2**: A product updated via PATCH `/api/v1/products/{id}` with new `image_urls` shows the new images after the next refetch.
3. **AC-3**: A product created/updated via bulk CSV upload (with associated images in the ZIP) shows its images in the catalog grid.
4. **AC-4**: Existing products in production (those that have URLs in `attributes->>'image_urls'`) show their images after the data migration runs.
5. **AC-5**: The `product_images` legacy table is dropped (zero references, no regressions).

### Non-functional

6. **AC-6**: All existing tests pass (`pnpm test` + `pytest`).
7. **AC-7**: 3 new failing-then-passing tests cover the bug (RED → GREEN cycle documented in commit history).
8. **AC-8**: The fix is deployed to staging, manually verified via drag-and-drop, BEFORE prod window.
9. **AC-9**: Production deploy happens inside a maintenance window with `alembic upgrade head` (backfill + drop) + API restart.

## Out of scope

- Public marketplace SEO rendering
- Image optimization pipeline changes (already in place)
- Image CDN migration
- Migration to a different storage provider

## Constraints

- No new dependencies (the bug is data-flow, not infra)
- No `--no-verify` commits
- Conventional commits, no AI attribution
- Stack hard-lock (Next 16, React 19, TS strict, Tailwind 4, Zustand 5, pnpm, uv, Python 3.14)
- Single source of truth: `products.image_urls` (top-level column) is canonical
