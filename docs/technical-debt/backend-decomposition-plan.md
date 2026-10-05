# Backend Decomposition — Staged Mitigation Plan

> **Companion to** [`component-decomposition-plan.md`](./component-decomposition-plan.md) (frontend). Same
> methodology, same non-regression discipline, applied to `apps/api` (Python/FastAPI, Clean Architecture:
> domain → application → infrastructure). Produced the same way: a full objective scan (`uvx radon cc`, the
> backend's direct equivalent of `react-doctor`) filtered to real decomposition candidates, each one investigated
> for real responsibilities, SOLID/DRY violations, existing test coverage, and a concrete extraction plan — not
> guessed from the complexity number alone.

**Scan**: `uvx radon cc src/prosell --exclude "*/tests/*"` (run from `apps/api/`), 55 flagged
functions/methods/classes across 31 files. Radon grades: A (best) → F (worst); C=11-20, D=21-30, E=31-40, F=41+.

---

## How to use this plan

1. Work through stages **in order**. Stage 3's cross-cutting extractions are referenced by name from Stage 1/2
   items that would otherwise duplicate them — read Stage 3 before starting Stage 1 even though you _implement_
   Stage 1 first, so you recognize when an "independent" fix is actually one of the shared extractions.
2. **Non-regression protocol, per item** (same spirit as the frontend plan's 7 steps, adapted for this stack):
   1. Confirm the full `pytest` suite is green on `main` before touching anything (this project is currently at
      2300+ passing backend tests — know your baseline).
   2. If the item has **zero existing test coverage** (several do — flagged explicitly below), write
      characterization tests FIRST, against the current behavior, before extracting anything. Do not refactor
      untested business logic blind.
   3. Extract **one** method/class/table at a time. Do not bundle multiple unrelated extractions in one commit.
   4. Re-run `ruff check . && ruff format --check .` and `pyright` — must stay clean.
   5. Re-run the specific test file(s) for that area.
   6. Re-run the **full** `pytest` suite — a file-scoped green run is not sufficient (this project has already
      been burned by assuming a failure was "pre-existing" without re-verifying against the real baseline).
   7. Re-run `uvx radon cc <file> -s` before/after (via `git stash`/`git diff` against `main`, same technique used
      for the frontend's `react-doctor --scope changed`) to confirm the score actually dropped and you didn't just
      move complexity sideways.
   8. Never remove functionality, only relocate it. If an extraction surfaces a real behavioral discrepancy
      between two places that were assumed to agree (this happened during investigation — see Stage 3.3), **stop
      and surface it as a question**, don't silently pick one behavior.
   9. Commit per-extraction. Conventional commits, no AI attribution — same rules as the rest of this repo.
3. **Route handlers are a special case**: several items below are FastAPI endpoint functions. Decomposing them
   (Extract Method into private helpers, delegating to a use case) does **not** change their request/response
   shape — it's internally contract-preserving by construction. If any extraction _would_ require changing a
   response DTO, stop and check the "Cross-Stack Coordination" section below for the exact frontend file that
   consumes it, and coordinate before merging.
4. Every stage is independently shippable. Nothing here blocks a feature.

---

## Cross-Stack Coordination

SOLID/DRY decomposition that preserves public interfaces (the normal case here) needs **no** frontend
coordination — it's invisible from `apps/web`. This section exists for the narrow set of backend files this plan
touches that a frontend file **directly** depends on, so that IF a future pass decides to change a contract
(not what this plan proposes), the blast radius is known up front.

| Backend file (handler/endpoint)                                                      | Frontend consumer                                                                                     | Notes                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `product_router.py` → `GET /products` (`list_products`)                              | `apps/web/src/lib/api/products.ts` (`useInfiniteProducts`)                                            | Catalog grid's main data source. Hot path.                                                                                                                                                                                                                                                                                            |
| `product_router.py` → `POST /products/image-urls:batch` (`batch_product_cover_urls`) | `apps/web/src/lib/api/products.ts` → catalog grid thumbnails                                          | Hot path, partial-success contract (silently drops failed items) — preserve this exact contract.                                                                                                                                                                                                                                      |
| `product_router.py` → `GET /products/{id}/image-urls` (`get_product_image_urls`)     | Product detail/edit views                                                                             | Shares cover-resolution logic with the item above (Stage 3.4).                                                                                                                                                                                                                                                                        |
| `product_router.py` → `GET /products/price-range` (added today)                      | `apps/web/src/lib/api/products.ts` (`usePriceRange`) → `CatalogFilterPanel.tsx`                       | New endpoint from today's session; reuses `_apply_product_filters` (Stage 4.1).                                                                                                                                                                                                                                                       |
| `product_router.py` → `PATCH /products/{id}` (`update_product`)                      | `apps/web/src/components/forms/UnifiedProductForm.tsx`                                                | Core edit flow.                                                                                                                                                                                                                                                                                                                       |
| `product_router.py` → `GET /products/export-client-format.zip`                       | Export button on catalog admin UI                                                                     | Response is a ZIP, not JSON — any change here must re-verify the Next.js BFF proxy's blob-vs-JSON branching (already a once-real bug, see project memory).                                                                                                                                                                            |
| `product_router.py` → `GET /categories/{id}/filter-values`                           | Catalog filter dropdowns (status/org selects)                                                         | Probable test-coverage gap (Stage 2.5) — confirm before touching.                                                                                                                                                                                                                                                                     |
| `vehicle_router.py` (VIN decode, calls `nhtsa_normalizer.py`)                        | `apps/web/src/components/forms/VinDecodeField.tsx` + `apps/web/src/lib/i18n/facebook-values/index.ts` | **Read the corrected finding in Stage 2.3 before touching this** — the dual-catalog premise this plan started with is outdated; the real issue is backend-internal (Stage 2.3), not a frontend/backend mismatch. The frontend's own Spanish catalog file is a separate, already-reconciled concern (intent `260915-vehicle-catalog`). |
| `admin_organizations_router.py`                                                      | `apps/web/src/lib/api/organizations.ts`, `OrganizationPicker.tsx`, admin org pages                    | 15-field PATCH — if `Organization.apply_patch()` (Stage 3.6) changes which fields are patchable, the admin org edit form must be checked field-by-field.                                                                                                                                                                              |
| `category_router.py` → `PatchCategorySchemaUseCase`                                  | `category-schema-editor.tsx`                                                                          | **Zero backend test coverage** on a schema-migration path (Stage 2.1) — do not extend `category-schema-editor.tsx` further until this has characterization tests, since there's currently no backend safety net for a frontend-triggered migration bug.                                                                               |
| `fb_sync_router.py`, `fb_credential_migration_router.py`                             | Admin FB account management pages (bot-facing, lower frontend surface)                                | Security-sensitive (credential handling) — see Stage 1.4/1.5. Lower frontend coupling than the product/category rows above.                                                                                                                                                                                                           |

**Recommendation on how to run the two plans together** (per your question): keep this document and the frontend
one as **two separate, independently-staged tracks** — don't interleave them into one combined sequential list.
Reasons:

- Nearly everything in both plans is internal reorganization that preserves its public contract by construction
  (a private-method extraction, a new domain service, a Strategy dict-dispatch) — this kind of change doesn't
  need the other stack to be "ready" first, the same way `_apply_product_filters`'s refactor today didn't block
  anything in `CatalogFilterPanel.tsx`.
- The ONLY real dependency between the stacks is the table above — a handful of named files. Check that table
  before starting any item; if your item isn't in it, there's nothing to coordinate.
- Running them as one merged list would force an artificial ordering (e.g. "do all backend Stage 1 before any
  frontend Stage 1") that doesn't reflect reality — some frontend Stage 1 items (e.g. `UnifiedProductForm`) and
  backend Stage 1 items (e.g. `update_product.py`) touch the SAME feature, but neither blocks the other's
  internal cleanup, since both already work today and the extraction doesn't change their contract.
- Pick work from whichever track has the highest-value item available; use the cross-stack table only as a
  pre-merge checklist, not a scheduling dependency.

---

## Stage 1 — Critical, tested, core write-paths (do these first)

High complexity on code that runs on every product create/edit/lead-create, with existing test coverage making
extraction safe to attempt now.

### 1.1 `update_product.py` — `UpdateProductUseCase.execute` (E=37, the highest score outside this stage's outliers)

- **Why Stage 1**: single highest complexity in the application layer (excluding the two F-grade outliers staged
  separately below), core write-path (every product edit), and it owns a genuine **security-relevant
  authorization gate** (tenant-cascade restricted to `is_org_admin`) buried mid-method — exactly the kind of place
  a careless future edit could lose that check.
- **Decomposition**: Extract Method for `_sanitize_image_fields`, `_apply_simple_field_patches` (declarative loop
  over patchable fields instead of ~10 if-branches), `_apply_tenant_cascade`, `_validate_cover_image_key`. Share
  the `internal_code` collision-check logic with `create_product.py` via the new `InternalCodeResolver` domain
  service (Stage 3.1) instead of each use case re-deriving it.
- **Tests**: `tests/integration/use_cases/test_update_product_use_case.py` +
  `test_update_product_internal_code.py`, `_persists_cover_image_key.py`, `_persists_image_urls.py`, plus router
  tests `test_update_product_cover_legacy_data.py`, `test_update_product_thumbnail_cdn_purge.py`. Well covered.

### 1.2 `create_product.py` — `CreateProductUseCase.execute` (D=22)

- **Why Stage 1**: core write-path, and it directly interacts with the `internal_code` allocator whose
  collision/race-condition correctness is data-integrity-critical.
- **Decomposition**: Extract Method for `_auto_generate_stock_number`, `_sanitize_image_fields` (shareable with
  1.1's version — see Stage 3.2), `_resolve_tenant_and_organization`. Extract Class for `internal_code` resolution
  into the shared `InternalCodeResolver` (Stage 3.1) — do this one FIRST since both 1.1 and 1.2 depend on it.
- **Tests**: `test_create_product_use_case.py`, `test_create_product_cover.py`,
  `test_create_product_persists_image_urls.py`.

### 1.3 `bulk_upload_vehicles.py` — `_upsert_vehicle` (C=20), `_build_attributes` (C=17), `execute` (C=16)

- **Why Stage 1**: a dealer's entire inventory + images goes through this one use case on every CSV import.
  `_build_attributes` is the single highest-value, lowest-risk item in this whole plan — a pure mechanical
  if-chain → declarative-table conversion with zero behavior change.
- **Decomposition**: Extract `_build_title`, `_upload_vehicle_images`, `_check_missing_images`,
  `_create_vehicle_product`/`_update_vehicle_product` out of `_upsert_vehicle`. Convert `_build_attributes`'s
  ~16-branch if-chain into the shared declarative field table (Stage 3.3) — **do this jointly with 1.7's
  `_analyze_row`**, since both currently hand-duplicate the same vehicle-field list.
- **Tests**: `test_bulk_upload_vehicles.py`, `test_bulk_upload_persists_image_urls.py`,
  `test_bulk_upload_endpoint.py`, `test_bulk_upload_with_images.py`. Well covered.

### 1.4 `publish_product_task.py` — `publish_product_task` (C=12) + `update_listing_task.py` — `update_listing_task` (C=11)

- **Why Stage 1, security-bumped past its raw score**: both tasks decrypt a Facebook page access token into a
  local variable, then stringify the FULL exception (`str(exc)`) from the publisher adapter call to classify
  retry-vs-block. If the Playwright adapter ever raises an exception whose message embeds a session cookie or
  token (a realistic risk for an HTTP/Playwright timeout error), that string flows into
  `publication.mark_failed(..., str(exc))` and gets **persisted** into the `publications` table's error column.
  **Zero test coverage on either file** confirms nothing currently verifies this doesn't happen.
- **Second, independent finding**: the two tasks hand-construct `PublisherStrategySelector` separately and have
  **silently diverged** — `publish_product_task.py` wires `NullGraphAPIPublisherService()`, `update_listing_task.py`
  wires the real `GraphAPIPublisherService(encryption)`. Harmless today (a flag forces Playwright-only), but the
  day that flag flips, one of the two tasks is wired wrong with no test to catch it.
- **Decomposition**: Extract a shared `build_publisher_selector(encryption)` factory (Stage 3.7) used by both.
  Extract a shared `classify_publisher_error(exc) -> PublicationErrorCategory` function replacing the
  character-for-character duplicated keyword-sniffing (`"captcha"`/`"checkpoint"`/`"ban"` in `str(exc).lower()`)
  — and while extracting it, decide explicitly whether the full exception string should ever reach persisted
  storage, or whether it needs scrubbing first. **Write characterization tests before any extraction** — there
  are none today.
- **Tests**: none found for either file. Write first.

### 1.5 `fb_sync_router.py` (D=21/C=19/C=14) + `fb_credential_migration_router.py` (D=23)

- **Why Stage 1, security-bumped**: `get_pending_products`/`get_account_config` decrypt and transmit Facebook bot
  credentials to the polling bot; `import_credentials` encrypts and bulk-persists bot account passwords with an
  idempotency-replay branch glued to a fresh-import branch by a mid-function early return — exactly the kind of
  structure where a future edit could cross-contaminate the two paths and accidentally skip the
  batch-fingerprint re-check on replay (an authorization-bypass-shaped risk, not just a readability one). Neither
  file currently logs credentials (confirmed by reading both) — the goal here is to make that invariant
  structurally obvious instead of merely true-by-luck in a long function.
- **Decomposition**: `fb_sync_router.py` — extract `GetPendingProductsUseCase` (or at minimum a DTO-mapping
  function) for the per-row Facebook-vocabulary translation currently embedded in the router; extract
  `RecordFBPublicationResultUseCase` for `sync_callback`'s 3-table write; extract `SyncFBGroupsUseCase` for
  `sync_groups`'s diff/UPSERT. Also collapse the duplicated authorized-org-fallback subquery (copy-pasted across
  `get_pending_products`/`get_verticals`) into one `_build_pending_products_query` helper.
  `fb_credential_migration_router.py` — extract `ImportFBCredentialsUseCase.execute` with three named private
  steps: `_validate_migration_token`, `_replay_idempotent_import`, `_import_new_accounts` — making the
  replay-vs-fresh split an explicit, separately-testable branch instead of an inline early return.
- **Tests**: `fb_sync_router.py` has `tests/integration/api/routers/test_fb_sync_router.py` (good integration
  coverage, no unit-level isolation of the translation logic — exactly what this extraction unlocks).
  `fb_credential_migration_router.py` has `test_fb_credential_migration_authorization.py` +
  `test_fb_credential_migration_router.py` (good coverage).

### 1.6 `create_lead.py` — `execute` (C=18), `_auto_assign_lead` (C=17)

- **Why Stage 1**: core sales-funnel write-path; the duplicate-reconciliation branch inside `execute` (the part
  most likely to carry a real bug) has the thinnest test coverage of anything in this file.
- **Decomposition**: Extract `_raise_if_hard_duplicate(request, duplicates)` for the reconciliation block — note
  it currently **re-derives** its own stricter duplicate rule instead of using the `match_type`/`confidence`
  the detector already returns; worth asking during extraction whether that's intentional or drift. Extract
  `_gather_assignment_candidates(tenant_id)` out of `_auto_assign_lead` — check whether `get_team_metrics.py`
  (Stage 2) does the same team→member→workload fan-out; if so, promote to a shared
  `TeamWorkloadAggregator` domain/application service instead of two private methods.
- **Tests**: `test_create_lead_auto_assignment.py` exists but only 2 test functions, and **none** found for the
  duplicate-reconciliation branch specifically. Write characterization tests for that branch before extracting it.

---

## Stage 2 — Critical, untested (write characterization tests FIRST)

Same tier as Stage 1 by risk, but these have **zero** existing test coverage — do not refactor any of these
until a characterization test pins current behavior, per this project's own test-after posture.

### 2.1 `patch_category_schema.py` — `PatchCategorySchemaUseCase` (whole class — only `_build_summary`, C=12, was

flagged by the scanner, but the real finding is broader)

- **Finding**: the entire use case — including the `_AUTO_MIGRATE_PAIRS`/`_FORCE_REQUIRED_PAIRS` migration
  business rules, the force-gate (`SchemaMigrationRequiresForceError`), and the audit-log write — has **zero**
  test coverage anywhere in the repo. This performs live schema migrations across every product in a category.
- **Action**: write characterization tests covering the force-required path, the auto-migrate path, and the
  audit-log write, BEFORE touching `_build_summary` or anything else in this file. This is the backend's direct
  equivalent of the frontend plan's Stage 2 (`PublishForm` — critical, untested, tests-first).

### 2.2 `get_team_metrics.py` — `execute` (C=15, but zero tests is the real issue)

- **Finding**: zero test coverage on a function computing manager-facing numbers (team conversion rate, per-vendor
  breakdown) that a human may act on. Also a real DRY/performance smell: the "count leads matching X in a time
  window" computation is written twice (tenant-wide, then re-derived per vendedor via an O(leads×vendedores)
  rescan) — but don't fix the performance angle unless/until it's a proven bottleneck; scope this pass to the
  DRY extraction only.
- **Action**: characterization tests first. Then extract `_compute_lead_counts(leads, cutoff_time)` called once
  per scope (tenant-wide, then per vendedor) to collapse six near-identical list comprehensions into one reused
  helper.

### 2.3 `nhtsa_normalizer.py` — `normalize_nhtsa_value` (F=63, worst function in the entire backend, zero tests)

- **IMPORTANT — corrected finding, supersedes the original premise**: this plan started from the assumption that
  this file still held the old English/lowercase-vs-Spanish-frontend dual-catalog mismatch (project history,
  hallazgo #87). **That specific mismatch is already fixed.** Every value in `NHTSA_TO_FACEBOOK` and every
  fallback branch now returns Spanish canonical labels (`"Chevrolet"`, `"SUV"`, `"Sedán"`, `"FWD"`, etc.),
  confirmed by reading all 129 dict entries and all 10 fallback branches.
- **The real remaining issue**: this file's docstring claims these values are meant to track
  `FACEBOOK_VEHICLE_VALUE_CATALOG` in `src/prosell/domain/services/facebook_vehicle_value_catalog.py` (confirmed
  to exist), but **the code never imports or references it** — every Spanish string here is a second,
  independently hand-typed copy. If the canonical catalog's wording ever changes, this file silently drifts out
  of sync with no compiler or test error — same structural risk class as the original bug, now a
  duplicated-Spanish-literal problem instead of a language mismatch.
- **Decomposition**: (a) Strategy dict-dispatch — 8 of the 10 field-type branches share an identical
  keyword-substring-match shape; collapse them into one `_match_by_keywords(cleaned_lower, rules, default)`
  helper fed by 8 small data tables (`make` and `boolean` stay as their own branches, they don't fit the shape).
  (b) Have those data tables' values **resolve through** `FACEBOOK_VEHICLE_VALUE_CATALOG`'s `canonical_value`
  instead of hardcoding their own copy — this is the real DRY fix, and it's entirely backend-only (both files
  live in `apps/api`), it does **not** require touching the frontend's Spanish catalog file at all.
- **Action**: characterization tests first (covering all 10 field types' happy-path + fallback-default
  behavior), then (a), then (b). Both changes are backend-only and safe to do in the same pass.

### 2.4 `category_field.py` — `CategoryField.validate_validation_rules` (C=13, zero tests)

- **Finding**: a Pydantic validator enforcing per-`field_type` allowed `validation_rules` keys, with 4
  near-identical "for key in rules: if key not in ALLOWED: raise" loops — and genuinely zero test coverage
  confirmed by direct search.
- **Decomposition**: a lookup table `_ALLOWED_RULE_KEYS: dict[FieldType, tuple[str, ...]]` plus one shared loop —
  collapses 4 duplicated loops into 1, drops the score to roughly B.
- **Action**: one characterization test per `FieldType` branch (both the allowed-keys-pass case and the
  rejected-key-raises case) before extracting.

### 2.5 `product_router.py` — `get_category_filter_values` (C=11, probable coverage gap)

- **Finding**: no router-level test was found by direct name search for this specific endpoint (it's lower
  traffic than the catalog-grid hot path, but still user-facing — populates filter dropdowns).
- **Action**: confirm the gap with a direct search before extracting; if confirmed, add a characterization test,
  then extract the per-key truncation loop into a pure `_cap_filter_values(raw_values, max_per_key)` helper.

---

## Stage 3 — High, cross-cutting DRY (shared extractions — do these before their consumers if not already done)

These are the backend's equivalent of the frontend plan's Stage 3 (`formatProductPrice`, `ModalShell`,
`useOrganizationFormState`): one extraction that several Stage 1/2 items above independently need. Doing the
shared piece first means each consumer's own extraction is smaller and can't silently re-diverge.

### 3.1 `InternalCodeResolver` (new domain service)

- **Consumers**: `create_product.py` (Stage 1.2) and `update_product.py` (Stage 1.1) each independently
  implement the same rule — "an explicit `internal_code` from the caller must be unique, exclude-self on
  update" — via their own copy of a `_to_int_or_none` + collision-check pattern.
- **Extraction**: one domain service (zero external deps, following the existing `internal_code_allocator.py`
  convention) with a create-path method and an update-path method (`resolve_update(pre_value, new_value,
exists_check)`), used by both use cases. Do this before 1.1/1.2's own extractions.

### 3.2 Shared image-field sanitizer

- **Consumers**: `create_product.py` and `update_product.py` both re-sanitize `image_urls`/`cover_image_key`/
  `thumbnail_image_key` via the same defense-in-depth logic, written independently in each.
- **Extraction**: a small domain-service function `sanitize_product_image_fields(image_urls, cover, thumbnail)`
  used by both instead of inlined per use case.

### 3.3 Shared vehicle-attribute field table

- **Consumers**: `bulk_upload_vehicles.py._build_attributes` (Stage 1.3) and
  `bulk_upload_preview.py._analyze_row` (originally a standalone candidate, folded in here) iterate **the same
  ~16-18 vehicle fields** off the same `MappedCSVRow` — one builds the persisted `attributes` dict, the other
  builds the preview's `mapped_fields` dict — with zero shared code.
- **Why this matters more than its complexity score suggests**: this is a live, latent correctness risk, not
  just duplication — a future field added to one and not the other produces silent preview/import divergence.
  Same risk shape as the already-documented NHTSA/Facebook catalog mismatch (hallazgo #87).
- **Extraction**: a single declarative field table (e.g. in `csv_field_mapper.py` or a new
  `vehicle_attribute_fields.py`) of `(MappedCSVRow attr name, output key, is_present predicate)` tuples, iterated
  by both call sites — one to build persisted values, one to build preview DTO entries. Do this **before**
  finishing Stage 1.3, since `_build_attributes`'s own extraction is this same table by another name.
- **Non-regression note**: while extracting, verify both consumers agree field-for-field on what counts as
  "present" — if they don't (a discrepancy would only surface now, via this extraction), surface it as a
  question rather than silently picking one behavior, per the protocol above.

### 3.4 Shared "normalize key → check tenant allowlist → CDN-sign" helper

- **Consumers**: `product_router.py`'s `get_product_image_urls` and `batch_product_cover_urls` both inline the
  identical sequence (same `_key_tenant_allowed` + `spaces.generate_cdn_download_url` pairing, same comments
  about legacy prefixes), independently, twice.
- **Extraction**: one private helper (e.g. `_sign_if_allowed(key, tenant_prefixes, is_org_admin, org_repo,
spaces)`) used by both handlers in `product_router.py`.

### 3.5 Shared CSV content-type + decode validation

- **Consumers**: `product_router.py`'s `bulk_upload_products` and `bulk_upload_with_images` both duplicate the
  identical `.endswith(".csv")` + `decode("utf-8-sig")` try/except block.
- **Extraction**: one helper `_read_and_decode_csv(upload_file) -> str` (raising `HTTPException` on failure) used
  by both handlers.

### 3.6 `Organization.apply_patch()` entity method + shared org-lookup dependency

- **Consumers**: `admin_organizations_router.py`'s `update_organization` currently patches 15 fields directly on
  the entity from the router (bypassing most of the entity's own validation, despite a comment claiming "entity
  handles validation"), and the permission-check-then-lookup-then-404 pattern is repeated verbatim across 9+
  handlers in the same file.
- **Extraction**: (a) a FastAPI dependency `get_organization_or_404(organization_id, current_user, org_repo)`
  collapsing the 9+ duplicate call sites into one `Depends(...)`. (b) move the 15-field patch into
  `Organization.apply_patch(patch)` on the entity itself, so the router becomes a one-line call and the entity's
  own validation actually runs for all 15 fields, not just the ones currently special-cased (`code`, `contacts`).
  This also absorbs `organization.py`'s separately-flagged `update_basic_info` (Stage 4.4) into the same place —
  check for overlap before writing two similar entity methods.

### 3.7 Shared publisher-selector factory + error classifier

- **Consumers**: `publish_product_task.py` and `update_listing_task.py` (Stage 1.4) — covered there; listed here
  because it's the same "extract once, use twice" pattern as the rest of this stage. Do this extraction as part
  of 1.4, not separately.

---

## Stage 4 — Medium (real debt, contained risk, well tested)

### 4.1 `product_repository_impl.py` — `_apply_product_filters` (D=24)

- Well-tested (`test_product_repository_attribute_filters.py`, `test_product_repository_organization_ids_filter.py`,
  plus 5 more), correctly placed in the infrastructure layer, and the file's own docstring says the
  centralization is deliberate ("kept as one place so get_all/count can never drift") — the complexity is an
  accepted tradeoff, not an oversight. Today's `get_price_range()` addition reused this method as-is without
  adding branches to it.
- **Decomposition**: Strategy dict-dispatch for the 5-way `attribute_filters` if/elif chain
  (`exact`/`select`/`text`/`boolean`/`range`) — the single highest-leverage fix here. Pair with 4.2 below since
  both share the exact same `filter_type` vocabulary; do them in the same PR.
- **Re-run before merging**: `test_product_repository_attribute_filters.py` + the new
  `test_product_price_range_api.py` from today's session.

### 4.2 `build_attribute_filters.py` — `build_attribute_filters` (C=17)

- Pure function, well-tested (`test_build_attribute_filters.py`), no I/O. Textbook Strategy-dispatch candidate —
  same `filter_type` vocabulary as 4.1. Do together.

### 4.3 `admin_organizations_router.py` — `update_organization` (D=22), `update_organization_verticals` (C=12)

- Covered mostly by Stage 3.6's extraction. `update_organization_verticals`'s removal-blocking check
  (`_validate_vertical_removal`) is a separate, smaller Extract Method on top.

### 4.4 `organization.py` — `Organization.update_basic_info` (C=17)

- 14 of 16 branches are trivial identical "if not None, assign" patches; only `code`/`color` have real logic
  (truncation/uppercasing). Well-tested. Low real risk despite the score — check for overlap with Stage 3.6's
  `apply_patch` before writing a second near-duplicate entity method; they may end up being the same thing.

### 4.5 `rate_limit_middleware.py` — `smart_rate_limit` (C=12), `is_rate_limit_exempt` (C=11)

- **Real correctness bug found, not just a style issue**: the IP-range exemption check implements CIDR-like
  matching via string-replace-into-regex (`ip_range.replace(".", "\\.").replace("*", "\\d+")`) instead of
  Python's stdlib `ipaddress` module — this can't express real CIDR notation (`/24`), only glob-style `*`
  wildcards, so an operator configuring `"192.168.1.0/24"` likely gets silently wrong behavior.
- **Decomposition**: dict-dispatch tables for `smart_rate_limit`'s environment×endpoint-type lookup. For
  `is_rate_limit_exempt`, migrate to `ipaddress.ip_network`/`ip_address` — flag this as a **correctness fix**,
  not just a cleanup, given broad blast radius (every rate-limited endpoint depends on this).
- **Tests**: `test_oauth_rate_limit.py`, `test_rate_limiting_config.py` — confirm whether either exercises a real
  `/24`-style range before assuming current behavior is even tested.

### 4.6 `csv_image_mapper.py` — `map_images` (C=14)

- Already a well-organized domain service (correct zero-deps placement, same tier as `category_translation.py`).
  Extract `_resolve_csv_path` and `_match_zip_keys` out of `map_images` — clean Extract Method, no Extract Class
  needed. Well-tested.

### 4.7 `lead_duplicate_detector.py` — `find_duplicates` (D=23)

- Three near-identical matching strategies (email/phone/combined) repeating the same loop-skip-append-track
  shape. Strong test coverage (14 tests). Extract one `_collect_matches(...)` helper called 3x — mechanical,
  low-risk, should drop the score from D to roughly C or low-D.

### 4.8 `facebook_webhook_use_case.py` — `execute` (C=11)

- Already correctly layered (a real use case, not router-embedded logic); just long. Extract
  `_extract_payload_fields`, `_resolve_publication_and_page`, `_fetch_buyer_profile_safe`. Well-tested
  (integration + e2e). No security issue found — the decrypted token never reaches a logged string in this file.

### 4.9 `csv_product_parser.py` — `_parse_row` (E=34), `parse_csv` (C=18)

- **Before decomposing**: confirm via `rg` whether this generic, schema-driven parser (distinct from the
  vehicle-specific pipeline in Stage 1.3/3.3) is still wired to an active endpoint, or is legacy/parallel
  functionality — same "don't decompose possibly-dead code" caution the frontend plan applied to `ProductsPage`.
  If confirmed live: split `_parse_row` into `_validate_universal_fields`, `_coerce_attributes`,
  `_check_required_schema_fields` — three phases currently glued into one method with three separate
  error-accumulation loops. Well-tested either way (`test_csv_product_parser_conversion.py`,
  `test_csv_product_parser.py`).

---

## Stage 5 — Low (polish, do last or skip)

- **`do_spaces_service.py.__init__`** (C=16) — **leave alone unless a 4th endpoint-client variant is added.** The
  three-tier conditional client construction is the actual fix for two real, already-burned production incidents
  (2026-09-25, CDN signing). Well-tested. The risk of touching hard-won, comment-documented logic outweighs the
  complexity-score benefit here, in contrast to every other item in this plan.
- **`category.py.validate_attributes`** (C=11) — borderline score (lowest C-rank in the whole inventory), already
  exemplary Clean Architecture (explicit "pure domain, no I/O" docstring), well-tested. Trivial Extract Method
  only if touched for other reasons.
- **`attribute_filter.py`** (C=11) — a Pydantic validator with 4 mutually-exclusive branches inherent to its
  `Literal` type; the complexity is the shape of the problem, not accidental. Well-tested. Recommend leaving as-is.
- **`csv_field_mapper.py.map_row`** (C=11) — mild, mostly an artifact of a long constructor call. Extract
  `_resolve_vin` (the one real 3-tier fallback chain) if touched; otherwise skip.
- **`public_product_router.py.get_public_product_image_urls`** (C=12) — no auth, no credentials, no cross-tenant
  risk, well-tested. Pure readability debt on an otherwise clean endpoint.
- **`seed_categories.py._seed_node`** (C=13) — one-time/dev-time infra regardless of its score; "deep but linear"
  recursive tree-walker, not tangled branching. Well-tested (5 tests). Skip unless touched for other reasons.
- **`patch_category_schema.py._build_summary`** (C=12) — the complexity itself (3 parallel list comprehensions)
  is low-value to decompose further; the real finding for this file is the zero-test-coverage issue on the
  surrounding class, already captured as Stage 2.1. Don't confuse the two.

---

## Summary table

| #   | Item                                                            | Score | Stage                | Tested?              |
| --- | --------------------------------------------------------------- | ----- | -------------------- | -------------------- |
| —   | `InternalCodeResolver` (shared extraction)                      | —     | 3.1                  | —                    |
| —   | Shared image-field sanitizer                                    | —     | 3.2                  | —                    |
| —   | Shared vehicle-attribute field table                            | —     | 3.3                  | —                    |
| 1   | `update_product.py` `execute`                                   | E=37  | 1.1                  | Yes                  |
| 2   | `export_catalog_client_format.py` `execute`                     | F=42  | — (see note)         | Integration only     |
| 3   | `nhtsa_normalizer.py` `normalize_nhtsa_value`                   | F=63  | 2.3                  | **No**               |
| 4   | `csv_product_parser.py` `_parse_row`                            | E=34  | 4.9                  | Yes                  |
| 5   | `bulk_upload_preview.py` `_analyze_row`                         | E=31  | 3.3/1.3              | Yes                  |
| 6   | `create_lead.py` `execute`                                      | C=18  | 1.6                  | Partial              |
| 7   | `create_lead.py` `_auto_assign_lead`                            | C=17  | 1.6                  | Partial              |
| 8   | `bulk_upload_preview.py` `execute`                              | D=21  | 3.3/1.3              | Yes                  |
| 9   | `lead_duplicate_detector.py` `find_duplicates`                  | D=23  | 4.7                  | Yes                  |
| 10  | `product_repository_impl.py` `_apply_product_filters`           | D=24  | 4.1                  | Yes                  |
| 11  | `fb_credential_migration_router.py` `import_credentials`        | D=23  | 1.5                  | Yes                  |
| 12  | `admin_organizations_router.py` `update_organization`           | D=22  | 4.3/3.6              | Partial              |
| 13  | `create_product.py` `execute`                                   | D=22  | 1.2                  | Yes                  |
| 14  | `fb_sync_router.py` `sync_callback`                             | D=21  | 1.5                  | Yes                  |
| 15  | `bulk_upload_vehicles.py` `_upsert_vehicle`                     | C=20  | 1.3                  | Yes                  |
| 16  | `fb_sync_router.py` `get_pending_products`                      | C=19  | 1.5                  | Yes                  |
| 17  | `product_router.py` `list_products`                             | C=18  | Stage 3.4/hot-path   | Yes                  |
| 18  | `csv_product_parser.py` `parse_csv`                             | C=18  | 4.9                  | Yes                  |
| 19  | `build_attribute_filters.py`                                    | C=17  | 4.2                  | Yes                  |
| 20  | `organization.py` `update_basic_info`                           | C=17  | 4.4                  | Yes                  |
| 21  | `bulk_upload_vehicles.py` `_build_attributes`                   | C=17  | 1.3/3.3              | Yes                  |
| 22  | `do_spaces_service.py` `__init__`                               | C=16  | 5 (skip)             | Yes                  |
| 23  | `bulk_upload_vehicles.py` `execute`                             | C=16  | 1.3                  | Yes                  |
| 24  | `get_team_metrics.py` `execute`                                 | C=15  | 2.2                  | **No**               |
| 25  | `bulk_upload_preview.py` class                                  | C=15  | 3.3/1.3              | Yes                  |
| 26  | `product_router.py` `update_product`                            | C=15  | Stage 1.1-adjacent   | Yes                  |
| 27  | `product_router.py` `export_catalog_client_format`              | C=15  | 3.4-adjacent         | Yes                  |
| 28  | `csv_product_parser.py` class                                   | C=13  | 4.9                  | Yes                  |
| 29  | `category_field.py` `validate_validation_rules`                 | C=13  | 2.4                  | **No**               |
| 30  | `seed_categories.py` `_seed_node`                               | C=13  | 5 (skip)             | Yes                  |
| 31  | `create_lead.py` class                                          | C=13  | 1.6                  | Partial              |
| 32  | `create_product.py` class                                       | C=13  | 1.2                  | Yes                  |
| 33  | `product_router.py` `batch_product_cover_urls`                  | C=14  | 3.4/hot-path         | Yes                  |
| 34  | `csv_image_mapper.py` `map_images`                              | C=14  | 4.6                  | Yes                  |
| 35  | `fb_sync_router.py` `sync_groups`                               | C=14  | 1.5                  | Yes                  |
| 36  | `product_router.py` `bulk_upload_with_images`                   | C=13  | 3.5                  | Yes                  |
| 37  | `product_router.py` `get_product_image_urls`                    | C=13  | 3.4                  | Yes                  |
| 38  | `product_router.py` `bulk_upload_products`                      | C=13  | 3.5                  | Yes                  |
| 39  | `lead_duplicate_detector.py` (standalone)                       | —     | 4.7                  | Yes                  |
| 40  | `export_catalog_client_format.py` class                         | C=12  | see Stage note below | Integration only     |
| 41  | `admin_organizations_router.py` `update_organization_verticals` | C=12  | 4.3                  | Partial              |
| 42  | `publish_product_task.py`                                       | C=12  | 1.4                  | **No**               |
| 43  | `patch_category_schema.py` `_build_summary`                     | C=12  | 5 (skip, see 2.1)    | **No** (class-level) |
| 44  | `rate_limit_middleware.py` `smart_rate_limit`                   | C=12  | 4.5                  | Yes                  |
| 45  | `public_product_router.py` `get_public_product_image_urls`      | C=12  | 5                    | Yes                  |
| 46  | `product_router.py` `get_category_filter_values`                | C=11  | 2.5                  | Gap, confirm         |
| 47  | `product_router.py` `_check_org_scope_permission`               | C=11  | leave as-is          | Transitive           |
| 48  | `rate_limit_middleware.py` `is_rate_limit_exempt`               | C=11  | 4.5                  | Yes                  |
| 49  | `csv_field_mapper.py` `map_row`                                 | C=11  | 5                    | Yes                  |
| 50  | `category.py` `validate_attributes`                             | C=11  | 5                    | Yes                  |
| 51  | `attribute_filter.py`                                           | C=11  | 5 (leave as-is)      | Yes                  |
| 52  | `update_listing_task.py`                                        | C=11  | 1.4                  | **No**               |
| 53  | `facebook_webhook_use_case.py` `execute`                        | C=11  | 4.8                  | Yes                  |
| 54  | `update_product.py` class                                       | C=20  | 1.1                  | Yes                  |
| 55  | `bulk_upload_vehicles.py` class                                 | C=11  | 1.3                  | Yes                  |

> Note on #2/#40 (`export_catalog_client_format.py`, the F=42 use case): treated as its own Stage-1-tier item in
> practice — worst single use case in the repo, user-facing export path, good integration coverage but no
> dedicated unit test on the per-row exclusion branches. Decomposition: extract
> `_extract_valid_internal_code`, `_resolve_category_translation`, `_resolve_location` as private methods (Extract
> Method on the same class — this logic isn't reused elsewhere, unlike `nhtsa_normalizer.py`'s case), and feed it
> an already-resolved `ExportScope` value object (Stage 3's spirit, shared with `product_router.py`'s own
> duplicate scope-precedence computation) instead of three raw booleans/lists.

---

## Checklist

> **Progress note (2026-10-04)**: items below marked `[x]` landed across 3 commits
> (`7a1e4b80`, `38213f59`, `dc77412d`) in a session that prioritized the 3 items an
> explicit code-quality ask called out as "weaknesses" — a real security finding, a
> DRY/correctness gap, and the 4 zero-coverage files — not a top-to-bottom pass through
> every stage. Full pytest suite stayed green throughout (2534 passed, 0 regressions).

- [ ] Stage 3.1 `InternalCodeResolver` extracted, used by both `create_product.py` and `update_product.py`
- [ ] Stage 3.2 shared image-field sanitizer extracted
- [x] Stage 3.3 shared vehicle-attribute field table extracted (behavioral discrepancy between the two consumers
      checked and resolved, not papered over — `publicado` divergence fixed, team decision recorded)
- [ ] Stage 1.1 `update_product.py` decomposed
- [ ] Stage 1.2 `create_product.py` decomposed
- [~] Stage 1.3 `bulk_upload_vehicles.py` decomposed — **partial**: `_build_attributes`'s field
  table landed (via 3.3, plus a DRY/correctness fix for row-numbering and parse-failure
  handling found by GGA), but `_upsert_vehicle` itself (`_build_title`, `_upload_vehicle_images`,
  `_check_missing_images`, `_create_vehicle_product`/`_update_vehicle_product`) is still
  undecomposed
- [x] Stage 1.4 `publish_product_task.py`/`update_listing_task.py` — characterization tests written, selector
      divergence fixed, error-classification deduplicated, secret-scrubbing fix applied to all 3 FB tasks
      (including `delete_listing_task.py`, found during investigation, not originally listed here)
- [ ] Stage 1.5 `fb_sync_router.py`/`fb_credential_migration_router.py` decomposed
- [ ] Stage 1.6 `create_lead.py` decomposed (duplicate-reconciliation branch tested first)
- [x] Stage 2.1 `PatchCategorySchemaUseCase` — characterization tests written (15 tests; no decomposition
      needed per this plan's own Stage 5 note on `_build_summary`)
- [x] Stage 2.2 `get_team_metrics.py` — characterization tests written, DRY extraction done
      (`execute()`: C=15 → A=5)
- [~] Stage 2.3 `nhtsa_normalizer.py` — **partial**: characterization tests written (92 tests, every
  field_type's dict-hit + fallback branches); the Strategy-dispatch collapse and canonical-catalog
  reference ((a)/(b) below) are NOT done — deliberately out of scope for this pass
- [x] Stage 2.4 `category_field.py` — characterization tests written, lookup table extracted
- [ ] Stage 2.5 `get_category_filter_values` coverage gap confirmed/closed
- [~] Stage 3.4-3.7 remaining shared extractions — 3.7 (`build_publisher_selector` factory) done as part
  of 1.4; 3.4/3.5/3.6 not done
- [ ] Stage 4 items addressed (contained risk, can be done opportunistically)
- [ ] Stage 5 items left alone unless touched for unrelated reasons
