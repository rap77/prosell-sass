# Bulk Upload Category Generalization — Design

**Date**: 2026-06-25
**Author**: Claude (brainstorming session)
**Status:** APPROVED — awaiting PR1 backend + PR2 frontend implementation (per Implementation Plan preview in this doc)
**Scope**: Roadmap F-1 + F-2 of the [[product-platform-generalization-roadmap]] follow-up

## Context

The `POST /api/v1/products/bulk-upload` endpoint and its frontend counterpart `useBulkUploadProducts` are coupled to vehicle-only semantics: the `CSVProductParser` hardcodes `required_columns = {"vin", "title", "price", "category_id"}`, every bulk-uploaded row is required to have a `vin`, and the frontend hardcodes `category: "vehicle"` and the wrong dead route `/api/v1/products/bulk`.

This made sense when the platform was vehicle-only. After [[product-platform-generalization-roadmap]] (Subsystems A-E) generalized categories with per-category `attribute_schema`, the bulk upload became broken:

1. **Functional break**: The frontend posts JSON to `/api/v1/products/bulk` which doesn't exist (404). The real route is `POST /api/v1/products/bulk-upload` and expects multipart `csv_file`. The frontend's client-side CSV parser never gets past the 404.
2. **Architectural break**: Even if the route worked, the backend parser rejects every non-vehicle row because it requires `vin` regardless of category. The only test (`tests/unit/components/upload/BulkUpload.test.tsx`) is a stub of `expect(true).toBe(true)` placeholders — zero real coverage, which is why this went undetected for years.

This design generalizes the bulk upload pipeline so it works with any product category defined by `attribute_schema`, fixes the dead-route bug, and provides an admin UI for prosell superadmins to maintain category schemas dynamically.

## Goals

1. **Bulk upload works for any category** — Vehicles, Real Estate, or any future niche. Required fields are derived from the category's `attribute_schema`, not hardcoded.
2. **Per-row validation with actionable errors** — Errors point at the exact cell (`row_number`, `column`, `message`) so users can fix CSVs in spreadsheets.
3. **Schema is maintainable from the frontend** — Prosell superadmins can add columns, remove columns, toggle required, change types, and clone schemas between categories without writing code or running migrations.
4. **Backward compat for existing vehicle CSVs** — Files with `vin, title, price, category_id` columns continue to work without changes.
5. **All changes go through PR review + CI** — TDD: failing tests written first for each new behavior.

## Non-Goals (deferred to follow-up roadmap)

These were explicitly discussed in brainstorming and deferred to a separate roadmap (see "Roadmap split" section below):

- **Tenant admin schema-change request workflow** — Tenants can't directly edit schemas; they submit a request that prosell superadmin approves. The request/approve/reject/apply entity, endpoints, and UI are deferred.
- **Bulk upload streaming for >5000 rows** — Multipart upload, progress UI, resumable upload. The current `max_rows` is raised from 1000 to 5000 (constant change) as a stop-gap; full streaming is its own roadmap.
- **Bulk upload with images (ZIP)** — The legacy `POST /api/v1/products/bulk-upload/with-images` endpoint is left untouched (vehicle-specific import from external client).
- **UI for create/delete entire categories** — That capability exists in `/admin/categories` (separate page) and is not part of this scope. The schema editor only manages the `attribute_schema` of an existing category.

## Decisions (locked in brainstorming)

| Decision                   | Choice                                                               | Rationale                                                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope                      | **Roadmap split: F-1+F-2 now, requests workflow next roadmap**       | Bug fix unblocks prod; requests workflow is cross-cutting enough to deserve its own spec                                                                         |
| Categories per upload      | **Single per upload, detected post-load**                            | CSV's `category_id` column already exists; reject multi-category uploads with clear error ("split into N CSVs")                                                  |
| Required fields definition | **Extend `attribute_schema` with `required: bool`**                  | Schema is already the source of truth for category attributes; adding `required` is a backward-compatible extension; avoids drift between schema and config file |
| Error UX                   | **Inline modal with table + "Download CSV errors" button**           | User sees error context in UI; can also export for spreadsheet fix                                                                                               |
| Schema admin UI scope      | **Full CRUD + type change + drag-and-drop reorder + schema cloning** | User confirmed all four operations are wanted                                                                                                                    |
| Auth model                 | **Prosell superadmin only writes schema; tenant admins read-only**   | Per user decision; request workflow comes in next roadmap                                                                                                        |
| `max_rows`                 | **Raise from 1000 to 5000**                                          | Stop-gap until streaming roadmap                                                                                                                                 |
| Test approach              | **TDD per phase, failing test first**                                | Project standard ([[NEVER_DO]], [[apply-known-fixes-immediately]])                                                                                               |

## Architecture Overview

### Backend (one PR)

1. **`Category.attribute_schema` extended**: each entry accepts `required: bool` (default `false`), plus existing `type`, `label`, `filter_type`, `options`. Pydantic validation enforces schema shape.

2. **`CSVProductParser` rewritten as schema-aware**:
   - Universal columns (`title`, `price`, `category_id`) always required.
   - Per-row: extract `category_id`, look up `attribute_schema` once per unique `category_id` in the CSV (no N+1), validate `attributes` dict against schema (required presence + type match), accumulate per-row errors.
   - Top-level fail: mix of categories, unknown `category_id`, empty schema, or `>max_rows` → raise before parsing rows.

3. **`POST /api/v1/products/bulk-upload`** (multipart) returns 201 with `{total_rows, created_count, failed_count, errors[]}` even on partial success. 422 only for top-level fails.

4. **`GET /api/v1/products/bulk-upload/errors.csv?upload_id={uuid}`** downloads CSV of failed rows with original headers + `error_message` + `error_column` columns.

5. **New table `bulk_upload_errors`** (id, tenant_id, category_id, created_at, expires_at, payload jsonb) for `upload_id` lookup. Cleanup on download + 24h TTL via query.

6. **`GET /api/v1/categories/{id}/schema`** returns schema with metadata (version counter for optimistic locking, updated_at).

7. **`PATCH /api/v1/categories/{id}/schema`** updates schema. Validates key format (snake_case), types (string/number/boolean/array/object), no duplicates. Executes migration strategy on type changes (auto for compatible, requires `?force=true` for incompatible).

8. **Migration strategy** (type changes with existing data):
   - `string → number` (parseable): auto, cast to float
   - `number → string`: auto, `str()`
   - `boolean → string`: auto, "true"/"false"
   - `string → boolean`: requires `?force=true` (heuristic fragile)
   - `*` with non-parseable values: requires `?force=true` with product count warning
   - `required: false → true` with existing products missing that field: requires `?force=true` with product count warning

9. **`GET /api/v1/categories/{id}/schema/template.csv`** generates downloadable CSV with the schema's headers (no sample data — empty rows).

10. **`POST /api/v1/categories/{id}/schema/clone-from/{source_category_id}`** copies another category's schema into this one (full overwrite). Requires `?force=true` if existing schema has data.

11. **`GET /api/v1/categories/{id}/schema/history`** returns append-only audit log (who changed what when). Backed by new `category_schema_changes` table.

12. **Prosell superadmin only write**: `PATCH /schema`, `POST /schema/clone-from`, `DELETE` operations require `RoleType.PLATFORM_ADMIN` (new role, no `tenant_id`, global). For this roadmap, **a stub permission check is sufficient** (e.g., hardcoded check that the calling user has the platform-admin email `admin@prosell.saas` OR a new `RoleType.PLATFORM_ADMIN` is added). The full `RoleType.PLATFORM_ADMIN` migration is the **next roadmap**.

### Frontend (one PR)

1. **`useBulkUploadProducts` rewrite** (move from `apps/web/src/lib/api/vehicles.ts` to `apps/web/src/lib/api/products.ts`):
   - Stop parsing CSV client-side (no more `csv-parse/sync` in browser).
   - Upload as `FormData` with `csv_file` field.
   - On 201 with `failed_count > 0` → open `BulkUploadErrorModal`.
   - On 201 with `failed_count === 0` → toast success.
   - On 422 → toast top-level error with `errors[]` if present.

2. **`BulkUploadErrorModal`** component (`apps/web/src/components/admin/bulk-upload-error-modal.tsx`):
   - Accessible `<table>` with `row_number`, `title`, `column`, `message` columns.
   - Header summary: "X creadas, Y fallaron de Z totales".
   - Footer: "Descargar CSV de errores" (fetches `/errors.csv?upload_id=X`, downloads via Blob) + "Cerrar".
   - Focus trap, `role="dialog"`, `aria-modal="true"`, escape closes.

3. **Page `/admin/categories/[id]/schema`** (server component + client island):
   - Drag-and-drop reorder via `@dnd-kit/core`.
   - Inline edit: click cell → input/select.
   - Toggle required: checkbox/switch.
   - Add row: button at bottom, focus auto on `key` input.
   - Delete row: button → confirm modal ("Existing products with this attribute are NOT deleted from DB; data becomes orphan in `attributes` JSONB").
   - Type change: highlights row yellow, save triggers migration warning modal with product counts.
   - "Clone from..." dropdown → POST `/schema/clone-from/{source_id}`.
   - "Download template" button → fetch `/schema/template.csv`.
   - "History" expandable section → fetch `/schema/history`, render list with `changed_by`, `changed_at`, `summary`.

4. **Platform role check on frontend**: hide `/admin/categories/[id]/schema` edit controls for non-prosell-superadmin users. Read-only view + "Request change" placeholder button (full workflow comes in next roadmap).

## Data Flow

### Bulk upload happy path

```
User selects CSV file
    ↓
BulkUploadCSV.tsx → useBulkUploadProducts(file)
    ↓
FormData { csv_file: <File> }
    ↓ POST multipart
FastAPI: bulk_upload_products()
    ↓
CSVProductParser.parse_csv(content, tenant_id, organization_id)
    ↓
  1. Validate universal columns (title, price, category_id)
  2. Group rows by category_id
  3. If >1 unique category_id → raise CSVParseError("multi-category detected")
  4. For each unique category_id:
       - Load Category.attribute_schema (1 query per unique id)
       - If category not found → raise CSVParseError("unknown category_id: X")
  5. For each row:
       - Validate attributes against schema (required + type)
       - Append per-row errors
    ↓
BulkUploadProductsUseCase.execute(parsed_products, ...)
    ↓
  - For each ParsedProductRow, call CreateProductUseCase
  - Collect created/failed counts
    ↓
Response 201 { total_rows, created_count, failed_count, errors: [...] }
    ↓
Frontend:
  - failed_count > 0 → open BulkUploadErrorModal with errors[]
  - else → toast.success
```

### Bulk upload errors download

```
User clicks "Descargar CSV de errores" in modal
    ↓
GET /api/v1/products/bulk-upload/errors.csv?upload_id={id}
    ↓
Backend: SELECT FROM bulk_upload_errors WHERE id=? AND tenant_id=?
    ↓
Build CSV with original headers + error_message + error_column
    ↓
Return text/csv with Content-Disposition: attachment
    ↓
Frontend: Blob → URL.createObjectURL → trigger download
```

### Schema edit + migration warning

```
User changes "mileage" type from "number" to "string" in admin UI
    ↓
Frontend: highlight row yellow, on save → POST PATCH /api/v1/categories/{id}/schema
    ↓
Backend:
  - Compare old vs new schema
  - "mileage" type changed: number → string (auto-migratable)
  - Count products with mileage in attributes: e.g. 142
  - Response: { attributes: [...], migration_warnings: ["mileage type changed (142 products)"], version: N }
    ↓
Frontend: render migration modal with warning list
    ↓
User clicks "Aplicar de todas formas"
    ↓
PATCH with ?force=true
    ↓
Backend: apply schema + write to category_schema_changes audit table
    ↓
Response 200
```

## Component Specs

### Backend

#### `Category.attribute_schema` Pydantic validation

```python
class AttributeSchemaEntry(BaseModel):
    type: Literal["string", "number", "boolean", "array", "object"]
    required: bool = False
    label: str | None = None
    filter_type: Literal["select", "range"] | None = None
    options: list[str] | None = None

class AttributeSchema(BaseModel):
    # dict[str, AttributeSchemaEntry] validated as a whole
    ...
```

#### `BulkUploadError` response shape

```python
class BulkUploadErrorResponse(BaseModel):
    row_number: int           # 2-indexed (1 = header)
    column: str | None        # e.g. "attributes.vin" or "price" or None if row-level
    message: str              # user-facing message
    raw_row: dict[str, str]   # the original row, unprocessed
```

#### `bulk_upload_errors` table schema

```python
class BulkUploadErrorRecord(BaseModel):
    id: UUID                  # the upload_id
    tenant_id: UUID
    category_id: UUID
    created_at: datetime
    expires_at: datetime      # created_at + 24h
    payload: dict             # original errors[] from the response
```

#### `category_schema_changes` table schema (audit log)

```python
class CategorySchemaChange(BaseModel):
    id: UUID
    category_id: UUID
    changed_by_user_id: UUID
    changed_at: datetime
    previous_attributes: dict | None  # None for first version
    new_attributes: dict
    migration_applied: bool
    migration_warnings: list[str]
    change_summary: str  # human-readable diff summary
```

### Frontend

#### `BulkUploadErrorModal` props

```ts
interface BulkUploadErrorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadId: string;
  totalRows: number;
  createdCount: number;
  failedCount: number;
  errors: BulkUploadError[];
}
```

#### `/admin/categories/[id]/schema` page structure

Server component loads category name + initial schema via `GET /schema`. Client island handles all editing.

State management: `useReducer` for the schema list (add, remove, update, reorder). On save: optimistic update + PATCH + rollback on error.

Drag-and-drop: `@dnd-kit/core` (already a project dep or add). Each row has `useSortable` hook. Reorder dispatches `MOVE` action.

## Testing Strategy

TDD per phase, failing test written before implementation:

### Backend tests (PR 1)

| Test                    | Path                                                     | What it covers                                                                                                                                                                                                     |
| ----------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Parser schema-aware     | `tests/unit/domain/services/test_csv_product_parser.py`  | universal column missing → error; category not found → top-level fail; `required` field missing → per-row error with column; type mismatch → per-row error with expected/received; mix categories → top-level fail |
| Bulk upload endpoint    | `tests/integration/api/test_bulk_upload_endpoint.py`     | 201 happy path; 201 partial errors; 422 top-level; max_rows enforcement                                                                                                                                            |
| Errors CSV download     | `tests/integration/api/test_bulk_upload_errors_csv.py`   | valid upload_id → CSV with header + error columns; expired/missing upload_id → 404; wrong tenant → 403                                                                                                             |
| Category schema GET     | `tests/integration/api/test_category_schema_endpoint.py` | returns schema + version; wrong tenant → 404                                                                                                                                                                       |
| Category schema PATCH   | `tests/integration/api/test_category_schema_endpoint.py` | additive change → 200; type change compatible → 200; type change incompatible → 422 warning; force=true → 200; `required: false → true` with missing data → 422 warning                                            |
| Schema cloning          | `tests/integration/api/test_category_schema_clone.py`    | clone from valid source → 200, target schema = source; clone with data conflicts → requires force                                                                                                                  |
| Audit history           | `tests/integration/api/test_category_schema_history.py`  | each PATCH appends to history; GET /history returns ordered list                                                                                                                                                   |
| Prosell superadmin only | `tests/integration/api/test_category_schema_auth.py`     | tenant admin PATCH → 403; prosell superadmin PATCH → 200                                                                                                                                                           |

### Frontend tests (PR 2)

| Test                  | Path                                                          | What it covers                                                                                                                                   |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hook rewrite          | `tests/unit/lib/api/useBulkUploadProducts.test.ts`            | FormData with `csv_file`, no `csv-parse/sync` import; Zod parse response; 422 throws typed error                                                 |
| Error modal           | `tests/components/admin/bulk-upload-error-modal.test.tsx`     | renders error table; download button calls endpoint; close button; accessibility (role=dialog, focus trap, escape)                               |
| Schema editor         | `tests/components/admin/category-schema-editor.test.tsx`      | renders initial schema; add row; delete with confirm; toggle required; type change triggers migration modal; drag-and-drop reorder; clone button |
| Bulk upload real test | `tests/components/upload/BulkUpload.test.tsx` (REPLACES stub) | file upload → FormData; mock 201 no errors → toast; mock 201 with errors → modal; mock 422 → toast                                               |
| Template download     | `tests/unit/lib/api/useCategorySchemaTemplate.test.ts`        | hook fetches + returns Blob                                                                                                                      |

## Acceptance Criteria

### Backend

- ✅ `POST /bulk-upload` accepts CSVs with any single `category_id`, validates per-row against that category's `attribute_schema`, returns detailed errors.
- ✅ CSVs legacy (vehicle-only `vin, title, price, category_id`) work IF `attribute_schema` for vehicles marks `vin` as the only `required: true` field.
- ✅ Unknown fields in `attributes` → log warning, accept.
- ✅ Mix of categories in one CSV → 422 with clear message.
- ✅ `GET /errors.csv?upload_id=X` returns CSV with original headers + error columns.
- ✅ `PATCH /schema` applies changes with migration strategy, returns warnings before applying force.
- ✅ `POST /schema/clone-from/{source}` copies schema between categories.
- ✅ `GET /schema/template.csv` returns downloadable empty CSV with schema headers.
- ✅ `GET /schema/history` returns append-only audit log.
- ✅ Tenant admin attempts to PATCH schema → 403.
- ✅ Integration tests cover all the above. Unit tests cover parser logic.

### Frontend

- ✅ `useBulkUploadProducts` uploads FormData, no client-side CSV parse.
- ✅ Bulk upload with partial errors → modal with accessible table + CSV download button.
- ✅ Bulk upload all-success → toast, no modal.
- ✅ Bulk upload top-level 422 → toast error.
- ✅ `/admin/categories/[id]/schema` allows full CRUD + drag-and-drop reorder + clone + template download + history view.
- ✅ Prosell superadmin sees edit controls; tenant admin sees read-only + placeholder "Request change" button (workflow comes next roadmap).
- ✅ `BulkUpload.test.tsx` stub replaced with real coverage.
- ✅ All pre-commit hooks (GGA, ruff, pyright, eslint, prettier) green.
- ✅ Conventional commits, no Co-Authored-By.

### Operational

- ✅ CI 5 jobs all green.
- ✅ No new `as X` casts.
- ✅ Backend test coverage maintains parity on `attribute_schema` paths.

## Roadmap Split

This spec covers **Roadmap G-1** (F-1 + F-2 minus requests workflow):

- **PR 1 (Backend)**: Schema extension, parser, bulk-upload endpoint rewrite, errors CSV, schema CRUD endpoints, migration strategy, schema cloning, template CSV, audit log, basic platform-role stub.
- **PR 2 (Frontend)**: Hook rewrite, error modal, schema admin page with full CRUD + drag-and-drop + clone + template download + history, platform-role gating.

**Roadmap G-2 (separate spec, future)**:

When this roadmap ships, the deferred items below become a full brainstorming + spec cycle (likely a sibling spec file like `2026-MM-DD-schema-change-request-workflow-design.md`). Outlined here at high level so the deferred work is captured, not lost.

**Trigger conditions to resume G-2** (any one of these should prompt opening a session for it):

1. **Operational signal**: A tenant admin explicitly asks "how do I change my category schema?" or files a support request. The placeholder "Request change" button in the read-only UI will be the surface that surfaces this.
2. **Operational scale**: Bulk upload starts hitting the 5000-row cap with any real-world tenant. That's the signal streaming is needed.
3. **Security review**: A code review flags the platform-role stub as insufficient for production (e.g., the hardcoded email check isn't auditable, doesn't scale beyond one operator). PLATFORM_ADMIN migration becomes urgent.
4. **Strategic decision**: The team decides to let tenants self-serve more aggressively, or conversely to lock down schema changes entirely (move the workflow earlier in the roadmap).

**G-2 scope outline** (to be detailed in its own brainstorm):

- **Backend entities**:
  - `SchemaChangeRequest` (id, tenant_id, requested_by_user_id, category_id, current_attributes snapshot, proposed_attributes, justification text, status enum: pending/approved/rejected/applied, reviewed_by_user_id, reviewed_at, review_notes, applied_at).
  - `RoleType.PLATFORM_ADMIN` added to enum; `RoleModel.is_platform_role: bool` flag; seed script for prosell internal operators; permission helper functions in domain layer.
- **Backend endpoints**:
  - `POST /api/v1/categories/{id}/schema/requests` (tenant admin creates request).
  - `GET /api/v1/categories/{id}/schema/requests` (list requests for that category, visible to anyone with category access).
  - `GET /api/v1/schema-requests?status=pending` (prosell superadmin cross-tenant inbox).
  - `POST /api/v1/schema-requests/{id}/approve` (prosell superadmin only — marks approved + applies the proposed schema via the existing PATCH endpoint, writes to audit log).
  - `POST /api/v1/schema-requests/{id}/reject` (prosell superadmin only — marks rejected with review_notes).
- **Backend streaming** (>5000 rows): `POST /api/v1/products/bulk-upload/init` returns upload_id, client streams chunks to `PUT /api/v1/products/bulk-upload/{upload_id}/chunk`, final `POST /api/v1/products/bulk-upload/{upload_id}/finalize` triggers the same parser. Progress endpoint optional.
- **Frontend UIs**:
  - `/admin/categories/[id]/schema` for tenant admin → in addition to read-only, the placeholder "Request change" becomes a real form (proposed_attributes editor + justification textarea).
  - `/admin/schema-requests` (prosell superadmin) → inbox of pending requests with side-by-side diff preview, approve/reject buttons, review_notes textarea.
  - Notifications (email/in-app) for request lifecycle — could be email-only for MVP via the existing Resend integration.
- **Testing**: Cross-tenant isolation tests (tenant A can't see tenant B's requests); permission tests (prosell superadmin only); streaming integration tests (if implemented).

**G-2 non-goals** (explicit, to avoid bloat when that roadmap comes):

- Schema marketplace (cloning across tenants, sharing between organizations).
- Versioned schemas with rollback.
- Granular per-attribute permissions.

## Risks

1. **Migration strategy heuristics for `string → boolean`**: `true/false/1/0/yes/no` mapping is fragile. Documented in spec; non-obvious cases require `?force=true` with product count warning.
2. **`bulk_upload_errors` table cleanup**: We cleanup on download, but stale entries could accumulate. 24h TTL via query. Run a daily cron to hard-delete expired entries (deferred to ops; for now just relying on the TTL query filter).
3. **`raw_row` in response exposes uploaded data**: Acceptable because the user uploading already has the data. Documented in spec.
4. **Backward compat with existing vehicle CSVs**: If `attribute_schema` for vehicles is updated to require more than `vin` (e.g., `make`, `model`), existing vehicle CSVs will start failing. Mitigation: in the schema update, mark ONLY `vin` as required initially; `make`/`model`/`year` as optional. Product individual form still requires them via separate form-level validation.
5. **Platform-role stub is not real RBAC**: The stub (hardcoded admin@prosell.saas OR a placeholder check) is sufficient for THIS roadmap. Full `RoleType.PLATFORM_ADMIN` migration is the next roadmap. Documented in spec.
6. **Drag-and-drop accessibility**: `dnd-kit` supports keyboard navigation (arrow keys), so this is accessible. Verified in the framework's docs.

## Open Questions

None at this point — all decisions are locked in brainstorming.

## Implementation Plan (preview)

This is the high-level sequence for implementation. The detailed task breakdown is generated by `writing-plans` skill after spec approval.

### PR 1 (Backend) — order

1. Pydantic models for new AttributeSchemaEntry with `required: bool`.
2. Migration to add `required` to existing vehicle schemas (only `vin: required: true`).
3. `bulk_upload_errors` table + model.
4. `category_schema_changes` audit table + model.
5. Rewrite `CSVProductParser` (with failing tests first).
6. New endpoints: `/bulk-upload/errors.csv`, `/categories/{id}/schema` GET/PATCH, `/categories/{id}/schema/template.csv`, `/categories/{id}/schema/clone-from/{source}`, `/categories/{id}/schema/history`.
7. Platform-role stub auth check on schema write endpoints.
8. Raise `max_rows` from 1000 to 5000.
9. Integration tests + unit tests for all the above.

### PR 2 (Frontend) — order

1. Move `useBulkUploadProducts` to `lib/api/products.ts`, rewrite as FormData upload.
2. `BulkUploadErrorModal` component + tests.
3. Update `BulkUpload.test.tsx` stub → real coverage.
4. `useCategorySchema` hook (GET + PATCH + clone + template + history).
5. `/admin/categories/[id]/schema` page (server component skeleton + client island).
6. Drag-and-drop reorder with `@dnd-kit/core`.
7. Add/remove rows with inline edit + confirm modals.
8. Type-change migration warning modal flow.
9. Clone-from dropdown + template download + history expandable.
10. Platform-role gating (show edit controls only for prosell superadmin; read-only + "Request change" placeholder for tenant admin).
