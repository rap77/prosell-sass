# Component Decomposition — Staged Mitigation Plan

> **Priority**: Mixed (staged Critical→Low below) | **Estimate**: ~6-8 weeks of incremental work, not a sprint
> **Created**: 2026-10-03 | **Status**: ⏳ Pending | **Blocking**: No — every stage is independently shippable
> **Source**: `npx react-doctor@latest --verbose` (full scope, apps/web) — score 55/100, 252 findings — filtered to the 3
> rules that are actually about structural decomposition (`no-high-complexity-react-function`, `no-giant-component`,
> `only-export-components`) → 34 components, manually investigated for real responsibilities, SOLID/DRY violations, and
> existing test coverage.
> **Human-readable companion** (same data, browsable UI, not meant for an agent to parse): https://claude.ai/artifact/26uyc1hoJqkxtxjZ1MQAuT

---

## How to use this document

This file is the **authoritative, agent-readable version** of the decomposition inventory — any Claude Code session
(or other coding agent) working in this repo can `Read` it directly instead of needing a browser. It is ordered by
**criticality** (business impact × blast radius if something breaks), not by ease of implementation — a cross-cutting
fix that touches 3 files comes before an isolated one-file fix of similar complexity when the cross-cutting one has
higher leverage or active correctness risk (e.g. §3.1 jumps the queue because 3 price formatters have **already
drifted**, not hypothetically).

**Read the whole stage before starting any item in it.** Several items within a stage share a dependency —
extracting a shared hook/util is listed FIRST within its stage specifically so the components that consume it are
built on top of the extraction, not in parallel with it.

### Non-regression protocol — apply to every single item, no exceptions

This is the exact sequence used successfully 4 times today (`useCatalogFilterPanelState`, `useImagesDirtyState`,
`CatalogFilterPanel`, the `QuickFilters.tsx` → `catalogFilterLogic.ts` split) — it already caught 2 real bugs
(an effect-ordering bug that silently wiped seeded images, and a lint violation from reading a ref during render).
Do not skip steps to save time; every skipped step in that list is a step that caught something today.

1. **Before touching anything**: run `pnpm exec tsc --noEmit -p tsconfig.json`, `pnpm exec eslint <scope> --max-warnings=0`,
   and the relevant test file(s) — confirm they're green on the UNMODIFIED file. This is your rollback baseline.
2. **If the item has NO existing test file** (flagged "⚠ NO TESTS" below): write characterization tests for its
   current observable behavior BEFORE extracting anything. Don't extract blind — a test written after the fact only
   proves the refactor matches the refactor, not the original.
3. **Extract incrementally, one responsibility at a time.** Don't rewrite the whole component in one pass — pull out
   ONE hook/component, verify, commit, then pull out the next. Matches this project's trunk-based/small-PR convention.
4. **After each extraction**: re-run typecheck, lint, the component's own test file, AND
   `npx react-doctor@latest --verbose --scope changed` to confirm the complexity number actually dropped (not just
   "felt cleaner").
5. **Before closing out the item**: run the FULL test suite (`pnpm exec vitest run` on web, `uv run pytest -q` on
   api if backend is touched) — not just the files you changed. A passing scoped test and a passing full suite are
   different claims.
6. **Never remove functionality, only move it.** If a step surfaces a REAL behavior bug (like the 3 drifted price
   formatters in §3.1), stop, document the discrepancy explicitly, and get it confirmed before silently picking one
   behavior as "correct" — same rule this project already has for any defect found while touching a file.
7. **Commit per extraction, not per stage.** Small, revertible, reviewable units — never a single giant "refactor
   CatalogPage" commit.

---

## Stage 1 — Critical, tested, start immediately

Core revenue-path components (every category edit, every product create/edit, the main catalog screen) with the
highest complexity scores AND existing test coverage. No blocking prerequisite — start here.

### 1.1 — `category-schema-editor.tsx` (2 components, same file, do together)

- **`SortableRow`** (`components/admin/category-schema-editor.tsx:206`) — cyclomatic **41/39**, the single highest
  complexity score in the entire codebase. 372 lines for one table row's renderer: drag handle + canonical-field
  option fetching + 5-7 editable cells + an entire secondary expanded-details panel + two near-duplicate
  "load options from catalog" buttons.
- **`CategorySchemaEditor`** (same file, line 717) — size-only, 571 lines. Field CRUD + group CRUD (with a
  confirm-before-delete flow) + a `handleDragEnd` that branches between field-reorder and group-reorder + search/filter
  - a save flow that parses a thrown `Error.message` as JSON to detect a 422 migration-conflict.
- **Decomposition**: Split `SortableRow` into `<SortableRowCollapsed>` + `<FieldDetailsPanel>` (Compound Component).
  Collapse the two near-duplicate "load options" buttons via a `useOptionsLoader(row)` hook (Strategy pattern — one
  strategy for the vehicle catalog, one for the Facebook catalog, same interface). For `CategorySchemaEditor`: four
  Custom Hooks — `useFieldRows`, `useGroupRows`, `useSchemaDragAndDrop`, `useSaveSchemaWithMigrationGuard` (the
  highest-value one — the JSON-parse-on-error is the most fragile piece in the file, and the easiest to unit-test
  once isolated from rendering).
- **Tests**: ✓ `category-schema-editor.test.tsx` (248 lines) covers both components — do them in the same pass.

### 1.2 — `UnifiedProductForm` (`components/forms/UnifiedProductForm.tsx:194`)

- Cyclomatic **66/55** (down from 69/57 after today's `useImagesDirtyState` extraction — continue from here, don't
  restart the analysis). 1323 lines: RHF form state, org/broker tenant-cascade transfer with a confirm dialog, FB
  account multi-select override, wizard vs. non-wizard dual rendering, mobile-vs-desktop group expansion.
- **Decomposition** (next 3 extractions, in order):
  1. `useOrganizationTransfer` — `selectedOrgId`/`pendingBrokers`/`orgDirty`/`brokersDirty`/`applyOrganizationChange`/
     `confirmTransfer`/`cancelTransfer`/`persistBrokers`. Fully self-contained state machine, same shape as the
     already-extracted `useImagesDirtyState`.
  2. `useFbAccountOverride` — `fbAccountsOverride`/`selectedFbAccounts`/`fbAccountsDirty`.
  3. `useProductSubmit` — Facade wrapping `buildProductPayload`/`handleCreateProduct`/`handleUpdateProduct`.
- **⚠ Do not confuse with §3.9's `useOrganizationFormState`** — that one edits an _organization's own identity
  fields_ (name/code/address/etc.); this one assigns _which organization owns this product_ (tenant cascade). Same
  word, different domain, do not merge them into one hook.
- **Tests**: ✓ `UnifiedProductForm.test.tsx` (12 tests).

### 1.3 — `CatalogPage` (`app/(seller)/catalog/page.tsx:407`)

- Cyclomatic **59/49** (down from 81/70 after today's `useCatalogFilterPanelState` extraction — continue from here).
  1261 lines: view-mode switching, category selector, the export flow (CSV + client-format ZIP with a 3-popup
  sequence), the cross-org export summary banner, bulk branch assign, delete confirmation, infinite scroll, command
  palette.
- **Decomposition** (next 2 extractions):
  1. `useClientFormatExport` — the export flow (`resolveExportOrganization`/`exportOrgBadgeContent`/
     `exportSummaryMessage`/`emptyCatalogExportMessage` + the 3-popup sequence + the mutation). Keep
     `ExportSummaryBanner` presentational (it already mostly is).
  2. Split the 3 view-mode renderers (grilla/tabla/estado) into `<CatalogGridView>`/`<CatalogTableView>`/
     `<CatalogStatusView>`, selected via a Strategy map keyed on `viewMode` — Container/Presentational.
- **Tests**: ✓ `CatalogPage.test.tsx` (34 tests).

---

## Stage 2 — Critical, untested → write tests before touching

Same severity as Stage 1 (core revenue path), but zero existing test coverage. Do NOT start the extraction until
step 2 of the protocol above is done for each.

### 2.1 — `PublishForm` (`components/publisher/PublishForm.tsx:208`)

- Cyclomatic **34/33**, 596 lines. The ONLY Facebook Marketplace publish write-path in the app. Owns a 23-field Zod
  schema (core + 14 FB vehicle-spec fields) co-located in the component, two local `SelectField`/`InputField`
  helpers that duplicate this project's own `ui/select`/`ui/input` primitives, hero-shot reorder logic, and a
  20+-field payload mapping to `PublishVehicleRequest`.
- **Decomposition**: Move schema to `publisherFormSchema.ts` (mirrors `buildZodSchema.ts`'s existing convention).
  Extract `useHeroShotOrder(control, setValue)` hook. **Delete** the local `SelectField`/`InputField` — use the
  project's real primitives (removes ~65 lines and a DRY violation in the same move). Split markup into Compound
  Components (`PublishForm.Photos`/`.Vehicle`/`.Facebook`).
- **⚠ NO TESTS** — highest-risk item in this whole plan given zero coverage + revenue-facing. Write characterization
  tests covering: hero-shot reorder, the full field→payload mapping, and at least one happy-path submit, before any
  extraction starts.

---

## Stage 3 — High: compounding DRY debt with active correctness risk

Every item here is either (a) duplicated logic that has **already drifted** into inconsistent behavior, or
(b) duplicated logic that forces 2+ files to be edited in lockstep by hand every time a field changes. Shared
extractions are listed before their consumers — do the shared piece first, it's what the consumers build on.

### 3.1 — Shared `formatProductPrice()` — do FIRST, before 3.2/3.3/3.4

- **The bug, not a hypothetical**: `ProductCard.tsx:109-120` (try/catch, `es-AR`), `CatalogDetailView.tsx`
  (`formatCurrency`, `es-AR`), and `ProductPublicView.tsx:54-61` (`formatPrice`, **`es-VE`**,
  `maximumFractionDigits:0`) are three independent `Intl.NumberFormat` configs for the SAME `price_cents` field —
  different locale, different fraction-digit rules, different fallback behavior. This has already drifted; it isn't
  a risk, it's a live inconsistency.
- **Fix**: one `formatProductPrice(cents, currency, locale?)` in `lib/utils/currency.ts`. Also resolves the
  separately-flagged `js-hoist-intl` finding on 2 of these 3 files (formatter rebuilt every render).
- Confirm the INTENDED locale with the team before picking one — don't silently standardize on whichever is most
  common; this is exactly the kind of discrepancy step 6 of the protocol says to surface, not paper over.

### 3.2 — `ProductCard` (`components/catalog/ProductCard.tsx:68`)

- Cyclomatic **22/20**. Already this project's reference Container/Presentational example (genuinely side-effect-free)
  — the complexity is SRP violation _inside_ the presentational layer: 6 independent "what do I show" decisions
  computed and rendered in one pass (org-tag contrast color, subtitle, meta-cell filtering, price formatting
  fallback, image-vs-placeholder, actions-toolbar branching).
- **Decomposition**: Move `isLightColor` (WCAG luminance calc) to `lib/utils/color.ts` — generically useful,
  currently trapped here. Extract `buildProductCardViewModel(...)` — Adapter/ViewModel pure function returning
  `{subtitle, metaCells, price, imgSrc, badgeStatus}`; the component becomes render-only. `<ProductCardActions>` as
  its own component. Use §3.1's shared formatter.
- **Why this matters more than its complexity number suggests**: most-rendered component in the app — every card,
  every grid, every status view. A ViewModel extraction also reduces per-card render-body branching × N cards.
- **Tests**: ✓ `apps/web/tests/components/catalog/ProductCard.test.tsx`.

### 3.3 — `CatalogDetailView` (`components/catalog/CatalogDetailView.tsx:259`)

- Cyclomatic **33/39**, 579 lines. 3 queries + a breadcrumb effect, a full **image-normalization engine**
  (`getProductImages`, exported — merges `attributes.images`, resolves signed URLs, falls back to legacy
  `image_urls`, does URL→storage-key extraction that duplicates backend logic), inline loading/error UI, and two
  un-extracted DTO-shaping transforms (`publishVehicleData`, `attributeItems`).
- **Decomposition**: `useProductDetail(productId)` hook (3 queries + breadcrumb + `signedUrlMap`). Move
  `getProductImages`/`resolveSigned`/`extractStorageKeyFromPublicUrl` to `lib/utils/productImages.ts` — pure
  functions, reusable (the file's own comments already claim "same merge contract as the card, DataGrid..." — centralize
  it so that's actually enforced, not just documented). `<DetailPageSkeleton>`/error UI → own files. Use §3.1's
  shared formatter.
- **Tests**: ✓ two test files exist in different locations for the same component (`CatalogDetailView.test.tsx` and
  `__tests__/CatalogDetailView.test.tsx`) — worth consolidating into one location while you're in here, separately
  from the main extraction.

### 3.4 — `ProductPublicView` (`components/public/ProductPublicView.tsx:80`)

- Cyclomatic **26/27**, 416 lines. Image carousel state machine, WhatsApp message composition, clipboard copy with a
  manual `document.execCommand` fallback, a genuinely separate "export this listing" feature (fetch-all-images +
  Web Share API + JSZip fallback), and the 4th drifted price formatter.
- **Decomposition**: `useImageCarousel(images)` hook (check `ProductImageGallery` — seller-side gallery — for a
  possible 2nd dedup opportunity before assuming this is the only carousel in the app). `lib/utils/shareableListing.ts`
  — Facade fronting Web Share/clipboard/JSZip. `formatAttributeValue()` for a duplicated branch (same `"format" in
attr` logic appears twice in this one file). Use §3.1's shared formatter (4th and final site).
- **Tests**: ✓ has its own test file. Public-facing (external buyers via WhatsApp link).

### 3.5 — Shared `<ModalShell>` — do FIRST, before 3.6/3.7/3.8

- **Confirmed duplicate, 3 files, byte-for-byte equivalent shape**: `PublishModal.tsx:144`,
  `AppointmentForm.tsx:247`, `AppointmentDetailsModal.tsx:118` each hand-roll the same backdrop +
  `role="dialog"` centered box + close button. react-doctor's own `prefer-html-dialog` rule independently flags
  these exact 3 files.
- **Fix**: `<ModalShell>` (Container/Presentational) — backdrop, header, close button, scrollable content region as
  `children`. One extraction resolves 3 findings.

### 3.6 — `PublishModal` (`components/publisher/PublishModal.tsx:144`)

- Cyclomatic **19/14**, 339 lines. Vehicle-selection state, 3 separate mutations (publish/update/delete) with manual
  `invalidateQueries` each, the modal shell (now §3.5), a nested `CategoryBErrorBanner` sub-component with its own
  mutation.
- **Decomposition**: Adopt §3.5's `<ModalShell>`. `usePublishVehicleMutations(vehicleId, current)` bundling the 3
  mutations + shared invalidation. Move `CategoryBErrorBanner` to its own file.
- **⚠ NO TESTS** — the `ModalShell` adoption itself is low-risk (pure markup swap). Write characterization tests
  before the mutation-hook extraction specifically.

### 3.7 — `AppointmentForm` (`components/appointments/AppointmentForm.tsx:124`)

- Cyclomatic **17/16**, 549 lines. A raw CSS string (`FORM_STYLES`, ~35 lines) injected via `<style>` instead of
  Tailwind — the only file in this report doing that. `isWeekend` date-math + Zod `.refine()`. A local `submitError`
  state machine separate from RHF's own errors. The modal shell (now §3.5).
- **Decomposition**: Adopt `<ModalShell>` (deletes `FORM_STYLES` + ~40 lines together, since `ModalShell` uses real
  Tailwind classes). Extract schema to `appointmentFormSchema.ts`. Extract `classifyAppointmentError(error)` as a
  pure, independently-testable function.
- **Tests**: ✓ 3 test files found across different locations — worth consolidating separately from this extraction,
  but it does lower refactor risk here.

### 3.8 — `AppointmentDetailsModal` (`components/appointments/AppointmentDetailsModal.tsx:73`)

- Cyclomatic 16, cognitive **26** — the nesting reads worse than the branch count because 6 independently-conditional
  detail blocks (buyer contact, vehicle info, notes, action buttons) are flattened into one render tree alongside a
  3-way loading/not-found/loaded split. The modal shell (now §3.5), 3rd instance.
- **Decomposition**: Adopt `<ModalShell>`. Extract the loading/not-found/loaded branching into a
  `<LeadDetailsSection lead isLoading>` Container/Presentational so the main return only ever renders ONE shape.
  Extract `<BuyerContactInfo lead>`.
- **Tests**: ✓ `AppointmentDetailsModal.test.tsx` exists — pair this with §3.7 since they share the `ModalShell` fix.

### 3.9 — Shared `useOrganizationFormState()` — do FIRST, before 3.10/3.11

- **The duplication**: `EditOrganizationForm` (`organizations/[id]/edit/page.tsx`) and `AdminNewDealerPage`
  (`organizations/new/page.tsx`) each declare the **same 13 `useState` calls** mirroring every `Organization` field
  (name/code/color/description/website/street/city/state/postal/country/taxId/instagram/facebook) — only the initial
  values differ. Every new `Organization` field requires editing 2 files correctly in lockstep, and nothing enforces
  that today.
- **Fix**: `useOrganizationFormState(initial?: Partial<Organization>)` returning `{values, setField, toPayload}`,
  used by both pages. Unit-testable in isolation BEFORE either page is touched — do that first, independently, to
  de-risk both of the following items.
- **⚠ Do not confuse with §1.2's `useOrganizationTransfer`** — different domain, see the note there.

### 3.10 — `EditOrganizationForm` (`app/(admin)/admin/organizations/[id]/edit/page.tsx:70`)

- Cyclomatic **31/26**. Vertical assignment + a "cannot uncheck if vertical has products" business rule, the 13-field
  block (now §3.9), dirty-detection that only covers verticals (the 13 scalar fields always resubmit everything —
  worth deciding if that's intentional while you're in here), 2-mutation submit orchestration.
- **Decomposition**: Adopt §3.9. Extract `useVerticalAssignment(organization, verticalsData)` for the locked-if-has-
  products rule + dirty detection, independently testable.
- **⚠ NO TESTS** — but `useOrganizationFormState` is independently unit-tested per §3.9, which materially de-risks
  this item specifically.

### 3.11 — `AdminNewDealerPage` (`app/(admin)/admin/organizations/new/page.tsx:47`)

- Cyclomatic **19/14**, 364 lines. Permission-gate redirect effect, the same 13-field block (now §3.9), a fully
  inline broker-invite-list builder (draft inputs + add/validate-dedupe-by-email/remove). `isValidPhone` is imported
  from `OrganizationFormFields` for `brokerPhone` — not even an org field, a sign this sub-form doesn't belong here.
- **Decomposition**: Adopt §3.9. Extract `<BrokerInviteList brokers onChange>` as a genuinely reusable component —
  "invite people with name/email/phone, dedupe by email" is a shape likely to recur (team invites, contact lists),
  worth building properly rather than as a one-off.
- **⚠ NO TESTS**. Screen used rarely (org creation isn't a daily action) — real debt, lower urgency than §3.10.

### 3.12 — `OrganizationFormFields` (`components/admin/OrganizationFormFields.tsx:89`)

- Cyclomatic **17/12**, 330 lines. 20 individual `value`/`onChange*` props (one pair per field) + 4 independent
  `useState` toggles for collapsible sections.
- **Violation**: Interface Segregation — the 20-prop interface forces BOTH call sites (§3.10 and §3.11) to duplicate
  20-line prop-threading.
- **Decomposition**: Replace the 20 scalar props with one `value: OrganizationFormValues` + `onChange: (patch) =>
void` pair (same shape already established today for `StagedCatalogFilters`). Split into
  `IdentityFields`/`AddressFields`/`FiscalFields`/`SocialFields` (Compound Component). Reuse `SchemaFormSection`'s
  existing collapsible mechanism instead of 4 hand-rolled toggles.
- **Coordinate with §3.10/§3.11**: both call sites must update together since this changes the prop interface — do
  this AFTER both pages already consume `useOrganizationFormState` (§3.9), so the prop reshape lines up with the new
  state shape in one move instead of two.
- **Why it's still High despite no complexity flag on its own**: cleanest, lowest-risk, highest-value fix in this
  entire stage — pure interface reshaping, zero business logic change, and it's forcing active duplication onto 2
  files today.

### 3.13 — `AdminOrganizationDetailPage` (`app/(admin)/admin/organizations/[id]/page.tsx:56`)

- Cyclomatic **36/35**, 632 lines. Inline-rename flow, a clipboard "share contact info" flow + WhatsApp deep-link
  builder, full org info card, pending-invitation banner, and `FBAccountDefaultsSection` — already correctly
  extracted logically but still living in this file.
- **Decomposition, in order**:
  1. Move `FBAccountDefaultsSection` to its own file — **zero risk, no behavior change possible, do this regardless
     of test coverage status.** Removes ~110 lines for free.
  2. Extract `buildOrgContactText(org)` to `lib/utils/organizationContactText.ts` — shared with §3.14 (confirmed
     duplicate, see below).
  3. `useInlineRename(initial, onSave)` generic hook — likely reusable elsewhere once it exists, worth grepping for
     other inline-rename-on-click patterns after this lands.
  4. `<ShareContactMenu organization>` Container/Presentational.
- **⚠ NO TESTS** — do step 1 and 2 first (lowest risk), write characterization tests before steps 3-4.

### 3.14 — `AdminOrganizationsPage` (`app/(admin)/admin/organizations/page.tsx:25`)

- Size-only (>300 lines), not independently deep-dived — flagged here specifically because it duplicates
  `buildContactText` against §3.13, confirmed by direct comparison (same name, same algorithm, two files).
- **Decomposition**: consume the `buildOrgContactText()` extracted in §3.13 step 2. No further decomposition
  expected beyond that unless a closer read surfaces more.

---

## Stage 4 — Medium: real debt, contained risk or lower traffic

### 4.1 — `AvailabilityActions` (`components/catalog/AvailabilityActions.tsx:128`)

- Cyclomatic **28/23**. Gatekeeper for every product status transition (submit/reserve/pause/resume/sold). 5
  mutation hooks wired to an if/else-if dispatcher keyed on `selectedAction`, 4 stacked dialog flows.
- **Violation**: Open-Closed — adding a 6th availability action means editing this function's branches.
- **Decomposition**: Strategy pattern — `Record<AvailabilityAction, {mutate, ...}>` built from the 5 hooks; dispatch
  becomes `strategies[selectedAction].mutate(id)`, zero branches, O(1) extension. `useAvailabilityAction(status)`
  hook. Split the 4 dialogs into siblings (Compound Component, matching the shadcn `Dialog` convention already used
  in this codebase).
- **Tests**: ✓ `AvailabilityActions.test.tsx`.

### 4.2 — `DataGrid` (`components/datagrid/DataGrid.tsx:154`)

- Size-only, 547 lines. Signed-URL image resolution, TanStack column-meta guarding, a 7-column `ColumnDef[]` built
  inline every render, row virtualization, bulk-action eligibility filtering + 2 mutations, raw table markup.
- **Violation**: the eligibility-filter pattern (`selectedIds.filter(id => product?.status === X)`) is duplicated
  almost verbatim twice — would get worse with a 3rd bulk action.
- **Decomposition**: `columns.tsx`/`useProductColumns` (TanStack's own recommended external-columns pattern).
  `useBulkProductActions(data, selectedIds)` deduplicating the filter via one generic `filterEligible(data, ids,
statuses)`. `useVirtualizedRows()`, reusable by any future virtualized table.
- **Tests**: ✓ 2 test files + a dedicated `useDataGrid` hook test — good safety net.

### 4.3 — `EditFBAccountPage` (`app/(admin)/admin/fb-accounts/[id]/page.tsx:49`)

- Cyclomatic **28/27**, 532 lines. 4 mutations, a 5-field identity form with manual override-merge logic repeated 5x,
  an inline password-change sub-flow, an inline "add FB group" sub-flow.
- **Decomposition**: `useAccountIdentityForm(account)` for the override-fields. `<ChangePasswordPanel>` and
  `<FBGroupsPanel>` as self-contained panels, each owning their own sub-flow entirely.
- **⚠ NO TESTS** — narrow screen (bot-account tuning, not daily staff workflow). Write characterization tests first.

### 4.4 — `TwoFactorSetupForm` (`components/auth/dynamic/TwoFactorSetupForm.tsx:112`)

- Cyclomatic **20/19**, 659 lines. An explicit 8-state machine with 8 fully separate, mutually exclusive JSX blocks —
  3 of them (loading/verifying/disabling) are near-identical spinner copies.
- **Decomposition**: `<TwoFactorBusyState title subtitle>` replacing the 3 duplicated spinners. One component per
  remaining state, dispatched via a `STATE_VIEWS: Record<SetupState, Component>` lookup — the 300-line JSX chain
  becomes one line. `useTwoFactorSetup()` hook for the query-sync + 3 async handlers.
- **⚠ NO TESTS**, security-sensitive. Lower urgency despite the complexity score — low-traffic settings flow, not a
  daily screen. Write one characterization test per state before collapsing the dispatch.

### 4.5 — Shared `avatarDisplay.ts` — do FIRST, before 4.6/4.7

- **Confirmed duplicate**: `getInitials` exists byte-for-byte identically in both `DashboardPage` and `AnalyticsPage`.
  Both pages also separately hand-roll near-identical `Card`/`CardHead` and `KpiCard`/`SectionCard` wrapper
  components — same "bordered box with a title" shape, two implementations.
- **Fix**: `lib/utils/avatarDisplay.ts` (`getInitials`/`getAvatarGradient`). Consider also promoting `Card`/`CardHead`
  to a shared `components/dashboard/` location consumed by both pages.

### 4.6 — `DashboardPage` (`app/(admin)/dashboard/page.tsx:315`)

- Cyclomatic **16/17**, 528 lines (not flagged by `no-giant-component` — the file is mostly separate helper
  components, not one giant function). Private presentational-component library + formatting utilities, 2 data
  fetches + derived aggregation (the actual flagged logic).
- **Decomposition**: consume §4.5. `useDashboardData()` hook owning both queries + all derivation.
- **Tests**: ✓ `dashboard/page.test.tsx`. The real win here is the cross-file DRY fix, not the mild complexity number.

### 4.7 — `AnalyticsPage` (`app/(seller)/analytics/page.tsx:321`)

- Cyclomatic **18/18**. Same private-component-library pattern as `DashboardPage`, confirmed `getInitials` duplicate.
  3 return branches (loading/error/main) in one function body — cognitive outpaces cyclomatic because fetch+compute+
  branch are interleaved.
- **Decomposition**: consume §4.5. Merge `KpiCard`/`SectionCard` with `DashboardPage`'s `Card`/`CardHead`.
  `useAnalyticsData()` hook returning a `{status: "loading"|"error"|"ready"}` discriminated union, turning the
  3-branch render into a switch.
- **Tests**: ✓ `analytics/page.test.tsx`. Business-relevant (checked by managers regularly).

### 4.8 — `TeamLeadList` (`components/leads/TeamLeadList.tsx:53`)

- Size-only, 374 lines. Filter+pagination state, polling fetch, an inline "unread" business rule, a manual-refresh
  spin with an artificial 500ms delay, **hand-rolled CSV export with manual injection-escaping**, `STATUS_LABELS`
  rebuilt inside the component body every render.
- **Why the CSV part matters**: this is a second, independent implementation of CSV-formula-injection escaping,
  separate from the guard this same codebase already established server-side in `export_catalog_client_format.py`.
  Not yet duplicated client-side — but the next export feature is one copy-paste away from becoming a 3rd
  implementation if this isn't centralized now.
- **Decomposition**: Hoist `STATUS_LABELS`/`isLeadStatus` to module scope (trivial). `lib/utils/csvExport.ts` —
  `escapeCsvField` + `rowsToCsvBlob(headers, rows)` as a Facade. `useTeamLeadFilters()` hook.
  `useLeadListRefresh(refetch)` hook for the manual-refresh logic.
- **Tests**: ✓ `TeamLeadList.test.tsx`. Manager-facing, used regularly.

### 4.9 — `SchemaFieldRenderer` (`components/forms/schema/SchemaFieldRenderer.tsx:44`)

- Cyclomatic **16/18**, 344 lines. 6 sequential if-branches by field type, each returning a complete `<Controller>`
  render.
- **Violation**: Open-Closed — a type dispatcher implemented as an if-chain; every new `attribute_schema` field type
  means editing this function. DRY: the "keep an out-of-catalog current value selectable" pattern is reimplemented
  identically in 2 of the 6 branches.
- **Decomposition**: One component per field type, dispatched via a Strategy map keyed by
  `resolveFieldRendererKey(entry)` — a 10-line lookup replaces the 300-line if-chain. Extract
  `withSelectableCurrentValue(options, currentValue)` for the duplicated branch logic.
- **Tests**: ✓ `SchemaFieldRenderer.test.tsx`. This is the field-rendering engine for every dynamic category form —
  high reuse surface, the Strategy dispatch pays off every time a new field type is added.

### 4.10 — `CategoryFormModal` (`components/admin/category-form-modal.tsx:150`)

- Cyclomatic **17/17**, 357 lines. Two large hardcoded emoji-icon dictionaries (~75 lines of pure data), a
  `findRootCategory` tree-walk helper, icon-availability derivation, slug auto-generation.
- **Decomposition**: Move icon dictionaries to `lib/constants/categoryIcons.ts` (mirrors existing
  `fbVehicleOptions.ts`). Move `findRootCategory` + slug-generation to `lib/utils/categoryHelpers.ts` as pure
  functions. Extract `useAvailableCategoryIcons(parentId, categories)`.
- **⚠ NO TESTS**, but low-risk — pure-data and pure-function moves, no JSX tree change. Good quick win despite no
  safety net, precisely because nothing here is behavior-sensitive.

---

## Stage 5 — Low: polish, isolated screens, or product decisions (not refactors)

### 5.1 — `EditProductPage` (`app/(seller)/catalog/[id]/edit/page.tsx:56`)

- Cyclomatic **16/13**. Already better-factored than most of this report (pure helpers already extracted). Extract
  `useEffectiveProductCategory(product)` for the 3-step category-resolution fallback chain + its loading composition.
- **⚠ NO TESTS** — lowest complexity in the report, but write a test alongside any change; no safety net exists.

### 5.2 — `NicheCard` (`app/(seller)/categories/page.tsx:254`)

- Cyclomatic **17/16**. Visual-only complexity (repeated `cn(...)` active/inactive chains, not business logic).
  Split into `NicheCardHeader`/`Stats`/`Fields`/`Channels` (Compound Component) + an `activeTone()` helper.
- **⚠ NO TESTS**, isolated admin config screen — low blast radius even without one.

### 5.3 — `FilterPills` (`components/filters/FilterPills.tsx:35`)

- Cyclomatic 14, cognitive **21** (nested/sequential branching inside a loop, not raw branch count). Extract a pure
  `buildPillsForField(field, values, setFilter)` (Strategy map keyed by `filter_type`) — testable without rendering.
- **Tests**: ✓ existing test file — small, self-contained, the win is clarity, not urgency.

### 5.4 — `MemberForm` (`components/forms/MemberForm.tsx:75`)

- Cyclomatic **17/14**, already close to right-sized. Minor: 3 `onBlur` handlers doing the same one-liner error-clear
  — collapse into one effect, or leave as-is. Don't force a pattern onto a file this size.
- **Tests**: ✓ `tests/components/forms/MemberForm.test.tsx`.

### 5.5 — `LandingFeatures` (`components/landing/landing-features.tsx:24`)

- Size-only, 393 lines, zero hooks/props/business-logic. The clearest DRY case in the whole report: 3 structurally
  identical feature rows hand-duplicated as separate JSX trees instead of a `.map()` over data (the NESTED repeated
  items — channel grid, lead rows, bar chart — are already correctly data-driven, only the outer row isn't).
- **Decomposition**: `FEATURE_ROWS` data array + one `<FeatureRow>` component. Data-driven rendering, the same
  approach this file already uses one level deeper.
- **No test file, zero regression risk** — pure static marketing content, nothing to break but pixels.

### 5.6 — `ReviewQueuePage` (`app/(admin)/admin/review-queue/page.tsx:79`) — needs deeper investigation

- Flagged for both complexity (17/14) and size (>300 lines) in the full scan, but not deep-dived in this pass.
  Investigate actual responsibilities before committing to a decomposition plan — likely similar shape to the other
  admin pages in Stage 3, but confirm before assuming.

### 5.7 — `ProductsPage` (`app/(seller)/products/page.tsx:14`) — PRODUCT DECISION, not a refactor task

- Size-only, 322 lines. Investigation found this route is **not linked from anywhere in the app** (`Sidebar`, nav, or
  any `router.push`/`<Link>` — confirmed by repo-wide grep) and uses an entirely different, older API surface
  (`useProducts`, plain string `formData`, `alert()` for validation errors) than the real catalog screens
  (`useInfiniteProducts`, `UnifiedProductForm`, schema-driven attributes). Reads as a pre-`UnifiedProductForm`
  prototype nothing navigates to anymore.
- **Do not spend SOLID/DRY effort here before confirming with the team whether this is dead code.** It has a 4-test
  `page.test.tsx` despite being seemingly unreachable, which is itself worth asking about. If it turns out to be
  intentionally kept, THEN decompose: replace the inline form with `UnifiedProductForm` instead of maintaining a 2nd,
  drifted create-product flow (a feature-level DRY violation, not just a code-shape one).

---

## Summary table

| #    | Component                          | Complexity  | Stage        | Tests | Shared dependency               |
| ---- | ---------------------------------- | ----------- | ------------ | ----- | ------------------------------- |
| 1.1  | SortableRow + CategorySchemaEditor | 41/39, size | 1 — Critical | ✓     | —                               |
| 1.2  | UnifiedProductForm                 | 66/55       | 1 — Critical | ✓     | —                               |
| 1.3  | CatalogPage                        | 59/49       | 1 — Critical | ✓     | —                               |
| 2.1  | PublishForm                        | 34/33       | 2 — Critical | ⚠     | —                               |
| 3.1  | formatProductPrice (shared)        | —           | 3 — High     | —     | feeds 3.2/3.3/3.4               |
| 3.2  | ProductCard                        | 22/20       | 3 — High     | ✓     | needs 3.1                       |
| 3.3  | CatalogDetailView                  | 33/39       | 3 — High     | ✓     | needs 3.1                       |
| 3.4  | ProductPublicView                  | 26/27       | 3 — High     | ✓     | needs 3.1                       |
| 3.5  | ModalShell (shared)                | —           | 3 — High     | —     | feeds 3.6/3.7/3.8               |
| 3.6  | PublishModal                       | 19/14       | 3 — High     | ⚠     | needs 3.5                       |
| 3.7  | AppointmentForm                    | 17/16       | 3 — High     | ✓     | needs 3.5                       |
| 3.8  | AppointmentDetailsModal            | 16/26       | 3 — High     | ✓     | needs 3.5                       |
| 3.9  | useOrganizationFormState (shared)  | —           | 3 — High     | —     | feeds 3.10/3.11/3.12            |
| 3.10 | EditOrganizationForm               | 31/26       | 3 — High     | ⚠     | needs 3.9                       |
| 3.11 | AdminNewDealerPage                 | 19/14       | 3 — High     | ⚠     | needs 3.9                       |
| 3.12 | OrganizationFormFields             | 17/12       | 3 — High     | —     | needs 3.9+3.10+3.11 done        |
| 3.13 | AdminOrganizationDetailPage        | 36/35       | 3 — High     | ⚠     | feeds 3.14 (step 2)             |
| 3.14 | AdminOrganizationsPage             | size        | 3 — High     | —     | needs 3.13 step 2               |
| 4.1  | AvailabilityActions                | 28/23       | 4 — Medium   | ✓     | —                               |
| 4.2  | DataGrid                           | size        | 4 — Medium   | ✓     | —                               |
| 4.3  | EditFBAccountPage                  | 28/27       | 4 — Medium   | ⚠     | —                               |
| 4.4  | TwoFactorSetupForm                 | 20/19       | 4 — Medium   | ⚠     | —                               |
| 4.5  | avatarDisplay (shared)             | —           | 4 — Medium   | —     | feeds 4.6/4.7                   |
| 4.6  | DashboardPage                      | 16/17       | 4 — Medium   | ✓     | needs 4.5                       |
| 4.7  | AnalyticsPage                      | 18/18       | 4 — Medium   | ✓     | needs 4.5                       |
| 4.8  | TeamLeadList                       | size        | 4 — Medium   | ✓     | —                               |
| 4.9  | SchemaFieldRenderer                | 16/18       | 4 — Medium   | ✓     | —                               |
| 4.10 | CategoryFormModal                  | 17/17       | 4 — Medium   | ⚠     | —                               |
| 5.1  | EditProductPage                    | 16/13       | 5 — Low      | ⚠     | —                               |
| 5.2  | NicheCard                          | 17/16       | 5 — Low      | ⚠     | —                               |
| 5.3  | FilterPills                        | 14/21       | 5 — Low      | ✓     | —                               |
| 5.4  | MemberForm                         | 17/14       | 5 — Low      | ✓     | —                               |
| 5.5  | LandingFeatures                    | size        | 5 — Low      | —     | —                               |
| 5.6  | ReviewQueuePage                    | 17/14       | 5 — Low      | ?     | needs investigation             |
| 5.7  | ProductsPage                       | size        | 5 — Low      | ✓     | **confirm not dead code first** |

---

## Checklist (update as stages complete)

- [ ] Stage 1 — SortableRow + CategorySchemaEditor
- [ ] Stage 1 — UnifiedProductForm (continued)
- [ ] Stage 1 — CatalogPage (continued)
- [ ] Stage 2 — PublishForm (tests first)
- [ ] Stage 3 — formatProductPrice + 3 consumers
- [ ] Stage 3 — ModalShell + 3 consumers
- [ ] Stage 3 — useOrganizationFormState + 3 consumers
- [ ] Stage 3 — AdminOrganizationDetailPage + AdminOrganizationsPage
- [ ] Stage 4 — all 10 items
- [ ] Stage 5 — all 7 items (confirm ProductsPage status first)

---

**Last Updated**: 2026-10-03
**Maintained By**: Claude Code
