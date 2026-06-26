# F01 — Client CSV Bulk Import with Image Association

**Date**: 2026-06-26
**Author**: Claude (brainstorming session, surfaced from canonical doc)
**Status:** DRAFT — awaiting approval
**Scope**: Migration path for a specific client coming from a legacy CSV-based workflow. Complements (does not replace) the generic schema-aware bulk upload shipped in `2026-06-25-bulk-upload-category-generalization-design.md`.

## Context

The client currently maintains their vehicle inventory in a legacy system that exports a **semicolon-separated CSV with 23 columns** (see [F01-bulk-upload-csv-import.md](../../canonical/F01-bulk-upload-csv-import.md) — the canonical reference for the source CSV format and the original product request).

The generic bulk upload shipped in PR #60/#61 uses a **comma-separated CSV driven by per-category `attribute_schema`**, optimized for any category. It does not handle:

1. The client's semicolon-separated format with their specific column names (`cod_dealer`, `clean_title`, `groups`, `label`, `publicado`, `path`, etc.)
2. The **dry-run preview** the client wants before committing
3. The **ZIP + path matching** image association workflow
4. **Upsert by VIN** for idempotent re-imports

This design captures the **client-specific import flow** — both the backend (already shipped, 73 tests passing) and the frontend (still pending).

## Goals

1. **Preview before commit**: user uploads CSV → sees a per-row table showing which fields mapped cleanly, which need attention, which images would be associated → user confirms → import runs.
2. **Image association**: client bundles images in a ZIP preserving folder structure; backend matches ZIP folders to CSV rows via the `path` column; matched images upload to DO Spaces and link to the imported products.
3. **Idempotency**: re-importing the same CSV updates existing products (by VIN) instead of creating duplicates.
4. **Tenant isolation**: `tenant_id` comes from JWT context, never from the CSV. `organization_id` must belong to the user's tenant (IDOR check).
5. **Format coexistence**: the F01 flow does not break or replace the generic bulk upload at `/api/v1/products/bulk-upload` (PR #60/#61). Both endpoints coexist; clients pick the one matching their CSV format.

## Non-Goals (explicitly out of scope)

- Replacing the generic bulk upload endpoint
- Reformatting legacy data on disk or migrating live systems
- Server-side thumbnail generation or image processing beyond what already exists
- Editing imported products in the F01 flow (the regular product edit UI covers this)
- Scraper or automatic Facebook import

## Architecture

### Backend (already shipped — `main` as of 2026-06-26)

**Domain services** (`apps/api/src/prosell/domain/services/`):
- `csv_product_parser.py` — generic schema-aware parser (PR #60). **Not used by F01.**
- `csv_field_mapper.py` — maps the 23 client columns to ProSell fields, with format conversions (location, clean_title, groups, mileage, year, publicado).
- `csv_image_mapper.py` — matches ZIP entries to CSV rows by `path` prefix, produces DO Spaces keys. Includes path-traversal protection (`..` rejected) and decompression-bomb guards (100 MB/file, 500 MB total).

**Use cases** (`apps/api/src/prosell/application/use_cases/product/`):
- `bulk_upload_preview.py` — runs field mapper against CSV, returns per-row analysis. No DB writes.
- `bulk_upload_vehicles.py` — runs field mapper + image mapper, upserts products by VIN, uploads images to DO Spaces, records associations in `product_images` table.

**Endpoints** (`apps/api/src/prosell/infrastructure/api/routers/product_router.py`):

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/products/bulk-upload/preview` | Dry-run analysis. CSV-only, no DB writes. |
| `POST` | `/api/v1/products/bulk-upload/with-images` | Real import. CSV + optional ZIP. Idempotent upsert by VIN. |

**DTOs** (`apps/api/src/prosell/application/dto/product/bulk_upload.py`):
- `BulkUploadPreviewResponse` — `{total_rows, rows: [PreviewRowResponse], summary: PreviewSummaryResponse}`
- `BulkUploadVehiclesResponse` — `{total_rows, imported_count, updated_count, failed_count, results: [VehicleImportRowResponse]}`

**Storage**: `apps/api/src/prosell/infrastructure/services/do_spaces_service.py` — abstraction over DO Spaces (staging uses MinIO-compatible local stack via the same interface).

### Frontend (this spec — to be built)

**Route group**: `(admin)/admin/import-client-csv/page.tsx` — super_admin-only (matches the migration use case; not a regular catalog operation).

**Components** (`apps/web/src/components/admin/`):
- `BulkImportClientCSV.tsx` — wizard with 3 steps:
  1. **Upload**: dropzone for CSV (required) + dropzone for ZIP (optional). Shows selected filenames.
  2. **Preview**: calls `usePreviewBulkUpload` → renders `PreviewTable` with per-row mapped_fields, missing_fields, unmapped_csv_columns, images_found, errors. Summary header shows importable_count / error_count / images_count.
  3. **Confirm**: user picks `organization_id` + `category_id` from selects, clicks "Importar". Calls `useBulkUploadVehicles`. Shows progress + final report.
- `PreviewTable.tsx` — table view of preview rows with status badges (✓ importable, ⚠ warnings, ✗ errors).

**Hooks** (`apps/web/src/lib/api/`):
- `usePreviewBulkUpload()` — `useMutation`, takes `File` (CSV), returns `BulkUploadPreviewResponse`.
- `useBulkUploadVehicles()` — `useMutation`, takes `{csv, zip?, organizationId, categoryId}`, returns `BulkUploadVehiclesResponse`.

**Zod schemas** (`apps/web/src/lib/api/schemas/bulkImportClient.ts`):
- Mirror of the backend DTOs: `PreviewRowSchema`, `PreviewSummarySchema`, `BulkUploadPreviewSchema`, `VehicleImportRowSchema`, `BulkUploadVehiclesSchema`.
- Used by `parseX()` helpers in the hooks to validate the response before returning.

**Page** (`apps/web/src/app/(admin)/admin/import-client-csv/page.tsx`):
- Server component fetches the user's organizations (tenant-scoped via existing `useOrganizations()`) and vehicle categories.
- Client island renders the wizard.
- Gated to super_admin via `useCurrentUser().roles`.

## Data flow

### Preview flow (dry-run)

```
Browser                                API                                   DO Spaces
   │                                   │                                       │
   ├─── POST /preview (csv) ──────────►│                                       │
   │                                   ├─── csv_field_mapper.map(csv)          │
   │                                   │     (in-memory, no DB)                │
   │                                   ├─── csv_image_mapper.map(zip?)         │
   │                                   │     (if zip provided)                │
   │                                   │                                       │
   │◄── {total_rows, rows, summary} ───┤                                       │
   │                                   │                                       │
   ▼ (render PreviewTable)             │                                       │
```

### Import flow

```
Browser                              API                                     DB              DO Spaces
   │                                  │                                       │                   │
   ├── POST /with-images ────────────►│                                       │                   │
   │   csv + zip + orgId + catId      ├── validate org belongs to tenant      │                   │
   │                                  ├── csv_field_mapper.map(csv)            │                   │
   │                                  ├── csv_image_mapper.map(zip)            │                   │
   │                                  ├── for each row:                       │                   │
   │                                  │   - upsert product by VIN             │                   │
   │                                  │     (UPDATE if exists, INSERT else)   │                   │
   │                                  │   - for each matched image:           │                   │
   │                                  │     upload bytes to do_spaces ────────┼──────────────────►│
   │                                  │     insert product_images row          │                   │
   │                                  │                                       │                   │
   │◄── {total_rows, imported_count,  ┤                                       │                   │
   │     updated_count, failed_count, │                                       │                   │
   │     results} ────────────────────┤                                       │                   │
   ▼ (render ImportReport)            │                                       │                   │
```

## Acceptance criteria

### Backend (already met)

- [x] `POST /api/v1/products/bulk-upload/preview` returns per-row analysis with mapped fields, missing fields, unmapped columns, images found, and errors.
- [x] `POST /api/v1/products/bulk-upload/with-images` accepts CSV + optional ZIP + organization_id + category_id, upserts products by VIN, uploads images to DO Spaces, records associations.
- [x] Tenant isolation enforced (org must belong to user's tenant).
- [x] Path traversal protection on `path` field.
- [x] ZIP decompression bomb guards (100 MB/file, 500 MB total).
- [x] 73 backend unit + integration tests passing.

### Frontend (this PR)

- [ ] `apps/web/src/lib/api/schemas/bulkImportClient.ts` exists with Zod mirrors of all backend DTOs.
- [ ] `apps/web/src/lib/api/bulkImportClient.ts` exports `usePreviewBulkUpload` and `useBulkUploadVehicles` hooks with `safeParse` on responses.
- [ ] `apps/web/src/components/admin/BulkImportClientCSV.tsx` renders a 3-step wizard (upload → preview → confirm).
- [ ] `apps/web/src/app/(admin)/admin/import-client-csv/page.tsx` exists, gated to super_admin.
- [ ] Sidebar nav shows the new admin link (only when role is super_admin).
- [ ] Unit tests for the hooks (response parsing, error handling).
- [ ] Component tests for the wizard (step transitions, validation messages).
- [ ] All 912+ existing frontend tests still pass.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` clean.
- [ ] Staging verification: upload sample CSV from `docs/data39.csv`, confirm preview shows expected mapped fields, confirm import creates product with images.

## Validation commands

```bash
# Backend (already passing)
cd apps/api && uv run pytest tests/unit/services/test_csv_field_mapper.py \
  tests/unit/services/test_csv_image_mapper.py \
  tests/unit/domain/services/test_csv_image_mapper.py \
  tests/unit/application/use_cases/product/test_bulk_upload_vehicles.py \
  tests/unit/application/use_cases/product/test_bulk_upload_persists_image_urls.py \
  -v

# Frontend (after implementation)
cd apps/web && pnpm lint && pnpm typecheck && pnpm test run
```

## Planned tasks (frontend only — backend already done)

1. Add Zod mirror schemas in `apps/web/src/lib/api/schemas/bulkImportClient.ts`.
2. Add TanStack Query hooks `usePreviewBulkUpload` + `useBulkUploadVehicles` in `apps/web/src/lib/api/bulkImportClient.ts` with `safeParse`.
3. Add unit tests for the hooks.
4. Add `BulkImportClientCSV` wizard component in `apps/web/src/components/admin/`.
5. Add component tests for the wizard.
6. Add `(admin)/admin/import-client-csv/page.tsx` server + client island.
7. Wire the page into the admin sidebar nav (super_admin only).
8. Update this spec's Status to `IMPLEMENTED (PR #<this>, merged <date>)` after merge.

## References

- Canonical product request: `docs/canonical/F01-bulk-upload-csv-import.md`
- Sample CSV: `docs/data39.csv` (178 KB, 45+ rows)
- Generic bulk upload spec (sister, not replacement): `docs/superpowers/specs/2026-06-25-bulk-upload-category-generalization-design.md`
- Backend services: `apps/api/src/prosell/domain/services/csv_field_mapper.py`, `csv_image_mapper.py`
- Backend use cases: `apps/api/src/prosell/application/use_cases/product/bulk_upload_*.py`
- Backend router: `apps/api/src/prosell/infrastructure/api/routers/product_router.py:1001` (preview), `:1051` (with-images)
