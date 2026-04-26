# Roadmap: ProSell SaaS MVP

## Overview

ProSell SaaS automates the complete vehicle sales cycle for dealerships: publish inventory to Facebook Marketplace, capture leads, confirm appointments — all from an internal panel. The roadmap executes in two delivery phases: Phase A (Core MVP) ships the closed loop publish → lead → appointment to the 5 active dealers and starts accumulating real market data. Phase B (Visibility) adds the public-facing catalog, landing page, AI-generated titles, and market intelligence built on those real data.

## Milestones

- ✅ **Milestone v1.0** - Phases 1, 2, 8, 9, 10 (complete)
- 🚧 **Milestone v1.1 — Generic Catalog** - Phases 11-14 (in progress)
- 📋 **Phase A — Core MVP** - Phases 3-5 (planned — depends on v1.1)
- 📋 **Phase B — Visibility** - Phases 6-7 (planned)

## Phases

- [x] **Phase 1: Hybrid Publisher** - Publish, update, delete, and auto-republish vehicle listings on FB Marketplace via Playwright (primary) and Graph API (secondary) (completed 2026-03-15)
- [x] **Phase 2: Catalog & Roles** - Role-based internal catalog showing inventory per dealer with publishing state; dealer without user account; seller-to-dealer assignment (completed 2026-03-30)
- [ ] **Phase 3: Scraping** - Automated dealer website sync and CarGurus market price extraction with deduplication and anti-detection
- [ ] **Phase 4: Leads & Appointments** - Capture FB leads via webhook + polling, manual entry, lead lifecycle, and appointment creation with dealer notifications
- [ ] **Phase 5: Dashboards** - Role-based dashboards for Admin, Manager, Vendedor, and Dealer with metrics
- [ ] **Phase 6: Market Intelligence** - Price benchmarking (own vs. market), segmented price history, and market position indicators
- [ ] **Phase 7: Visibility** - Temporal landing page, public vehicle catalog with SEO, and AI-generated listing titles
- [x] **Phase 8: Layout Shell + Vehicle Management** - Professional dashboard shell with role-based navigation, high-performance DataGrid, bulk CSV upload, image handling, and search/filter capabilities (completed 2026-03-27)
- [x] **Phase 9: Anti-patterns Fix** - Fix controlled components, FormField label placement, and toast notification issues (completed 2026-03-29)
- [x] **Phase 10: Contract Testing Skill** - Create skill for multi-layer contract testing (OpenAPI → Integration → E2E) (completed 2026-03-31)
- [x] **Phase 11: DB Migration — C3 Schema** - Migrate to categories+products+vehicles(C3) schema with proper foreign keys (completed 2026-04-10)
- [x] **Phase 12: Backend API — Categories/Products/Vehicles** - CRUD endpoints for categories, products, and vehicles with C3 validation (completed 2026-04-10)
- [ ] **Phase 13: Frontend — Vehicle Form, DataGrid, CSV Upload** - Update frontend components to use new C3 schema (in progress)
- [ ] **Phase 14: E2E Verification — Generic Catalog** - Verify end-to-end user flows work with C3 schema (planned)

## Phase Details

### Phase 1: Hybrid Publisher
**Goal**: Vendedores can publish any vehicle to Facebook Marketplace from the internal panel, keep listings current, and never let a 7-day post expire unattended
**Depends on**: Nothing (Facebook OAuth already complete, task queue already operational)
**Requirements**: PUBLISH-01, PUBLISH-02, PUBLISH-03, PUBLISH-04, PUBLISH-05, PUBLISH-06, PUBLISH-07, PUBLISH-09, PUBLISH-10
**Success Criteria** (what must be TRUE):
  1. Vendedor clicks "Publicar" on a vehicle and it appears on Facebook Marketplace within 2 minutes via Playwright
  2. System automatically detects Graph API availability and switches strategy without user intervention
  3. Vendedor can update price or description of an active listing and the change reflects on Facebook
  4. Vendedor marks a vehicle as sold and the Facebook listing is removed automatically
  5. Scheduler republishes any listing approaching 7-day expiry without manual action
**Plans**: 8 plans (Wave 0 + Waves 1-4)

Plans:
- [x] 01-00-wave0-infra-PLAN.md — Test stubs, broker migration (PubSub→ListQueue), publisher settings in config (completed 2026-03-15)
- [x] 01-01-publication-entity-PLAN.md — Publication entity + state machine + SQLAlchemy model + Alembic migration (completed 2026-03-15)
- [x] 01-02-image-pipeline-PLAN.md — ImagePipelineService (Pillow: compress/resize/JPG/strip-EXIF) (completed 2026-03-15)
- [x] 01-03-playwright-strategy-PLAN.md — PlaywrightPublisherService + PublisherStrategySelector + PublishVehicleUseCase (completed 2026-03-15)
- [x] 01-04-update-delete-PLAN.md — UpdateListingUseCase + DeleteListingUseCase + Taskiq tasks (completed 2026-03-15)
- [x] 01-05-auto-republish-PLAN.md — AutoRepublishUseCase + scheduled Taskiq task (every 6h) (completed 2026-03-15)
- [x] 01-06-graph-api-router-PLAN.md — GraphAPIPublisherService stub + publisher REST router + rate limiting (completed 2026-03-15)
- [x] 01-07-frontend-modal-PLAN.md — PublishModal + HeroShotSelector + PublicationStatus + catalog integration (completed 2026-03-15)

### Phase 2: Catalog & Roles
**Goal**: Every role sees exactly the inventory they own, at the right scope, with real-time publication status per vehicle
**Depends on**: Phase 1
**Requirements**: CATALOG-01, CATALOG-02, CATALOG-03, CATALOG-04, CATALOG-05, CATALOG-06, CATALOG-07
**Success Criteria** (what must be TRUE):
  1. Vendedor opens catalog and sees only vehicles from dealers assigned to them, each showing publication state (pending/published/failed/expired/sold)
  2. Admin opens catalog and sees all vehicles across all organizations
  3. Dealer logs in and can view and edit only their own inventory
  4. Admin creates a dealer tenant with no user account (tenant_id only) and it appears in catalog management
  5. Admin assigns a vendedor to a dealer; Manager can do the same for their team members
**Plans**: TBD (discuss-phase complete 2026-03-29, see `.planning/phases/02-catalog-roles/02-CONTEXT.md`)

### Phase 3: Scraping
**Goal**: ProSell's inventory stays synchronized with dealer websites automatically, and CarGurus price data is continuously collected for market benchmarking
**Depends on**: Phase 2
**Requirements**: SCRAPE-01, SCRAPE-02, SCRAPE-03, SCRAPE-04, SCRAPE-05, SCRAPE-06, SCRAPE-07
**Success Criteria** (what must be TRUE):
  1. Scraper runs daily and detects new vehicles added to a dealer website, creating them in ProSell inventory automatically
  2. When a vehicle is no longer on the dealer site, it is marked as sold in ProSell (and its active FB listing removed)
  3. CarGurus prices for comparable vehicles are stored in DB and available for price comparison
  4. Duplicate detection prevents the same vehicle from being created twice (by VIN or heuristic)
  5. Scraper operates without triggering blocks (rate limiting, rotating agents, incremental scraping)
**Plans**: TBD

### Phase 4: Leads & Appointments
**Goal**: Every buyer interaction with a Facebook listing becomes a tracked lead, and vendors can convert leads into confirmed appointments with dealers from the panel
**Depends on**: Phase 1
**Requirements**: LEAD-01, LEAD-02, LEAD-03, LEAD-04, LEAD-05, APPT-01, APPT-02, APPT-03, APPT-04
**Success Criteria** (what must be TRUE):
  1. When a buyer messages a Facebook listing, a Lead record is created automatically within 5 minutes (webhook or polling fallback)
  2. Vendedor can manually register a lead with name, contact, vehicle, source
  3. Lead state advances through new → contacted → qualified → appointment_set → lost with visible tracking
  4. Vendedor creates an appointment linking Lead + Vehicle + Dealer with date/time in one action
  5. Dealer receives an email notification when a cita is confirmed, including buyer contact info and vehicle details
**Plans**: TBD

### Phase 5: Dashboards
**Goal**: Every role has a focused view of the metrics relevant to their work — no shared noise, no missing data
**Depends on**: Phase 4
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Admin dashboard shows publications/day, global leads, per-vendedor performance, and API integration status
  2. Manager dashboard shows their team's metrics, assigned dealers, and pending publications
  3. Vendedor dashboard shows their active listings, assigned leads, today's appointments, and personal conversion rate
  4. Dealer dashboard shows their inventory and active FB listings without any access to lead data
**Plans**: TBD

### Phase 6: Market Intelligence
**Goal**: Vendedores can price vehicles competitively using real market data from CarGurus and see how their inventory compares to similar vehicles
**Depends on**: Phase 3 (CarGurus scraping)
**Requirements**: MI-01, MI-02, MI-03, MI-04, MI-05
**Success Criteria** (what must be TRUE):
  1. Vendedor views a vehicle and sees price range for comparable vehicles (±10% mileage, ±2 years)
  2. Vendedor sees market position indicator (overpriced/competitively priced/underpriced) with color coding
  3. Admin sees price trends over time for makes/models in their region
  4. System flags vehicles with outlier prices (>20% above/below market) for review
**Plans**: TBD

### Phase 7: Visibility
**Goal**: Public can discover ProSell inventory via search engines and social sharing, and AI helps optimize listing titles for visibility
**Depends on**: Phase 2 (catalog exists)
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04
**Success Criteria** (what must be TRUE):
  1. Public catalog page shows active vehicles with SEO-friendly URLs (/catalog/2020-honda-civic-abc123)
  2. Landing page ranks for "buy cars [city]" search terms with meta tags and structured data
  3. System generates optimized titles for FB listings (e.g., "2020 Honda Civic LX - Low Miles - Clean CarFax")
  4. Public vehicle page includes social sharing buttons (FB, WhatsApp, Email)
**Plans**: TBD

### Phase 8: Layout Shell + Vehicle Management
**Goal**: Professional dashboard shell with vehicle management CRUD, bulk upload, image handling, and search/filter capabilities using premium UI components (Shadcn UI, MagicUI, Radix UI)
**Depends on**: Phase 1 (for publication status display)
**Requirements**: CATALOG-01, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Seller logs in and sees sidebar with Inventario/Ventas groups (NOT Operations/Growth/System — corrected terminology from UX validation)
  2. DataGrid renders 1000+ vehicles at 60fps with only ~40 rows in DOM (virtualization working)
  3. Seller types "Toyota" in search → DataGrid filters instantly (0ms client-side latency)
  4. Seller presses Cmd+K → Command Palette appears with vehicle search + actions
  5. Seller drags 5 images onto dropzone → All upload in parallel with progress bars (0-100% per file)
  6. Middleware blocks seller from accessing /admin routes (redirects to /dashboard)
  7. Mobile user sees bottom navigation with 4 icons (Catálogo, Publicar, Leads, Más)
**Plans**: 5 plans (Wave 0: Test infrastructure | Wave 1: Layout shell | Wave 2: DataGrid + Search + Image Upload)

Plans:
- [x] 08-00-PLAN.md — Test infrastructure: 16 test stubs (13 component, 2 hook, 1 E2E) ✅ (2026-03-27)
- [x] 08-01-PLAN.md — Layout shell with route groups, sidebar (corrected terminology), header, mobile nav, middleware guards ✅ (2026-03-27)
- [x] 08-02-PLAN.md — DataGrid with TanStack Virtual, sorting, checkbox selection, StatusBadge (7 states), mobile cards ✅ (2026-03-27)
- [x] 08-03-PLAN.md — Hybrid search (client instant + server deep), Cmd+K CommandPalette, collapsible FilterSidebar, filter pills ✅ (2026-03-27)
- [x] 08-04-PLAN.md — Image upload with drag-drop, presigned URLs, Zustand progress store, sortable gallery, cover photo control ✅ (2026-03-27)

**Implementation Waves:**
- **Wave 1** (Plans 08-01, 08-02): MVP foundation — Layout shell + basic DataGrid for single vehicle upload
- **Wave 2** (Plans 08-03, 08-04): Enhanced UX — Search filters + image upload for UAT observation
- **Wave 3** (Future): Premium features — Advanced roles (Manager vs Dealer), bulk CSV upload

**Traceability:**
- Origin: UAT Phase 1 feedback (2026-03-15) — Request for advanced search, bulk actions, professional UI
- CONTEXT.md: 7-brain validation complete (UX, UI, Frontend, QA, Product, Growth, Backend)
- RESEARCH.md: Technical patterns validated (TanStack Virtual, Zustand, hybrid search, presigned URLs)
- Plans: Ready for execution with locked decisions from CONTEXT.md

### Phase 9: Anti-patterns Fix
**Goal**: Fix controlled component anti-patterns, FormField label placement issues, and toast notification problems identified during Phase 8 development
**Depends on**: Phase 8 (issues discovered during implementation)
**Requirements**: DASH-04 (UI polish)
**Success Criteria** (what must be TRUE):
  1. All Select components use SelectControlled wrapper (no controlled/uncontrolled warnings)
  2. All FormField components have labels rendered correctly (not empty)
  3. All toast notifications work correctly (sonner imported and configured)
  4. No console warnings about controlled/uncontrolled components
**Plans**: 1 plan (7 tasks)

Plans:
- [x] 09-01-PLAN.md — Fix Select components, FormField labels, toast notifications ✅ (2026-03-29)

### Phase 10: Contract Testing Skill
**Goal**: Create a reusable skill for multi-layer contract testing (OpenAPI → Integration → E2E) to prevent API contract drift
**Depends on**: Phase 8 (E2E tests established)
**Requirements**: CT-01, CT-02, CT-03
**Success Criteria** (what must be TRUE):
  1. Skill file exists at `.skills/contract-testing/SKILL.md` with clear instructions
  2. Skill includes Layer 1 (OpenAPI validator) and Layer 2 (Integration + Contract) patterns
  3. Skill includes example tests for categories and vehicles endpoints
  4. Skill is documented in CLAUDE.md for auto-loading
**Plans**: 1 plan (7 tasks)

Plans:
- [x] 10-01-PLAN.md — Create contract-testing skill with multi-layer patterns ✅ (2026-03-31)

### Phase 11: DB Migration — C3 Schema
**Goal**: Migrate database to categories+products+vehicles(C3) schema with proper foreign keys and CASCADE delete
**Depends on**: Phase 2 (catalog exists)
**Requirements**: CAT-01, CAT-02, PROD-01, PROD-02, VEH-01, VEH-02
**Success Criteria** (what must be TRUE):
  1. Categories table exists with id, name, slug, attribute_schema
  2. Products table exists with id, title, price_cents, category_id(FK)
  3. Vehicles table exists with id, product_id(FK), vin, year, make, model
  4. All foreign keys have CASCADE delete (delete product → delete vehicle)
  5. Alembic migration runs without errors and can be rolled back
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — C3 schema migration (categories, products, vehicles tables) ✅ (2026-04-10)
- [x] 11-02-PLAN.md — CASCADE delete + migration validation ✅ (2026-04-10)

### Phase 12: Backend API — Categories/Products/Vehicles
**Goal**: Implement CRUD endpoints for categories, products, and vehicles with C3 schema validation
**Depends on**: Phase 11 (C3 schema exists)
**Requirements**: CAT-03, CAT-04, PROD-03, PROD-04, VEH-03, VEH-04
**Success Criteria** (what must be TRUE):
  1. GET /api/v1/categories returns list of categories with attribute_schema
  2. POST /api/v1/products creates product with optional vehicle (if vin present)
  3. GET /api/v1/vehicles returns vehicles with joined product data
  4. POST /api/v1/vehicles/decode-vin decodes VIN via NHTSA API
  5. All endpoints validate input with Pydantic and return proper error messages
**Plans**: 5 plans

Plans:
- [x] 12-01-PLAN.md — Category CRUD endpoints + attribute_schema ✅ (2026-04-10)
- [x] 12-02-PLAN.md — Product CRUD endpoints + C3 validation ✅ (2026-04-10)
- [x] 12-03-PLAN.md — Vehicle CRUD endpoints + VIN decode ✅ (2026-04-10)
- [x] 12-04-PLAN.md — Typed DTOs + VehicleResponse ✅ (2026-04-10)
- [x] 12-05-PLAN.md — Integration tests + CASCADE delete ✅ (2026-04-10)

### Phase 13: Frontend — Vehicle Form, DataGrid, CSV Upload
**Goal**: Update all frontend components to use the new products+vehicles schema — VehicleForm, DataGrid, bulk CSV upload
**Depends on**: Phase 12 (API endpoints must be live)
**Requirements**: FE-01, FE-02, FE-03, FE-04
**Success Criteria** (what must be TRUE):
  1. VehicleForm submits `POST /api/v1/products` with `attributes.vin` for auto-vehicle creation (single-call pattern)
  2. Category dropdown in VehicleForm loads from `GET /api/v1/categories` with 5-minute client-side cache
  3. DataGrid renders vehicles from `GET /api/v1/vehicles` join query (includes product title, price, status)
  4. Bulk CSV upload maps CSV columns to products array with `attributes.vin` for auto-vehicle creation
  5. VIN decode flow still works end-to-end in VehicleForm (fields populated from NHTSA)
  6. Smoke test suite (20 tests) passes; existing E2E tests updated for C3 schema
**Plans**: 6 plans (Wave 1: API clients | Wave 2: VehicleForm | Wave 3: DataGrid | Wave 4: Upload | Wave 5: Smoke tests)

Plans:
- [x] 13-01-PLAN.md — Category & Product API clients (useCategories, useCreateProduct) with unit tests ✅ (2026-04-26)
- [ ] 13-02-PLAN.md — VehicleForm: category API integration + useDecodeVin hook with tests
- [ ] 13-03-PLAN.md — VehicleForm: product submit handler + VIN decode E2E verification
- [ ] 13-04-PLAN.md — DataGrid: C3 join data + infinite scroll + virtualization with tests
- [ ] 13-05-PLAN.md — BulkUploadCSV: products bulk API + CSV mapping with tests
- [ ] 13-06-PLAN.md — Smoke test suite (20 tests) + E2E test updates for C3 schema

**Implementation Waves:**
- **Wave 1** (Plan 13-01): API clients — Category & Product API with TDD tests
- **Wave 2** (Plans 13-02, 13-03): VehicleForm integration — Category loading + Product submit (split for scope)
- **Wave 3** (Plan 13-04): DataGrid integration — C3 join data + infinite scroll
- **Wave 4** (Plan 13-05): Bulk upload — Products bulk API + CSV mapping
- **Wave 5** (Plan 13-06): Smoke tests + E2E updates — 20 smoke tests + E2E updates

**Traceability:**
- Origin: Phase 12 backend complete (C3 schema, API endpoints)
- CONTEXT.md: 5 locked decisions (auto-create vehicle, category caching, infinite scroll, hardcoded attributes, smoke tests)
- RESEARCH.md: TDD pattern for test creation (test first, then code)
- Checker feedback: Nyquist compliance — test files created before implementation

### Phase 14: E2E Verification — Generic Catalog
**Goal**: Verify end-to-end user flows work correctly with the new C3 schema — no regressions, full coverage of new flows
**Depends on**: Phase 13 (frontend complete)
**Requirements**: All milestone v1.1 requirements (CAT, CTGY, PROD, VEH, FE, API)
**Success Criteria** (what must be TRUE):
  1. E2E test: Admin creates category → creates product under category → creates vehicle linked to product — full flow passes
  2. E2E test: User views DataGrid and sees vehicles from products+vehicles join (no broken UI)
  3. E2E test: VIN decode in VehicleForm populates all typed vehicle fields correctly
  4. E2E test: Bulk CSV upload creates products+vehicles records and they appear in DataGrid
  5. All 207 previously passing E2E tests still pass (no regressions)
  6. New E2E tests added for: category CRUD, product CRUD, vehicle CRUD via new form
**Plans**: TBD

---

## Progress

**Execution Order:** Phase A: 1 → 2 → 3 → 4 → 5 | Phase B: 6 → 7 | Milestone v1.1: 11 → 12 → 13 → 14

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Hybrid Publisher | 8/8 | Complete   | 2026-03-15 |
| 2. Catalog & Roles | 8/8 | Complete   | 2026-03-30 |
| 3. Scraping | 0/? | Not started | - |
| 4. Leads & Appointments | 0/? | Not started | - |
| 5. Dashboards | 0/? | Not started | - |
| 6. Market Intelligence | 0/? | Not started | - |
| 7. Visibility | 0/? | Not started | - |
| 8. Layout Shell + Vehicle Management | 5/5 | Complete   | 2026-03-27 |
| 9. Anti-patterns Fix | 1/1 (7 tasks) | Complete   | 2026-03-29 |
| 10. Contract Testing Skill | 1/1 (7 tasks) | Complete   | 2026-03-31 |
| 11. DB Migration — C3 Schema | 2/2 | Complete    | 2026-04-10 |
| 12. Backend API — Categories/Products/Vehicles | 5/5 | Complete    | 2026-04-10 |
| 13. Frontend — Vehicle Form, DataGrid, CSV | 1/6 | In Progress | 2026-04-26 |
| 14. E2E Verification — Generic Catalog | 0/? | Not started | - |

### Phase 8: Layout Shell + Vehicle Management

**Goal**: Create a professional dashboard shell with vehicle management CRUD, bulk upload, image handling, and search/filter capabilities using premium UI components (Shadcn UI, MagicUI, Radix UI).

**Purpose**: Transform the current basic catalog into a professional vehicle management dashboard that establishes the UX foundation for all future features. The layout shell provides role-based navigation, the DataGrid enables efficient inventory management, search/filtering provides quick discovery, and image upload supports quality vehicle listings.

**Depends on**: Phase 1 (Hybrid Publisher) — uses existing AuthProvider and ReactQueryProvider

**Requirements**: CATALOG-01, CATALOG-02, CATALOG-03, PUBLISH-10

**Success Criteria** (what must be TRUE):
  1. Seller logs in and sees sidebar with Inventario/Ventas groups (NOT Operations/Growth/System — corrected terminology from UX validation)
  2. DataGrid renders 1000+ vehicles at 60fps with only ~40 rows in DOM (virtualization working)
  3. Seller types "Toyota" in search → DataGrid filters instantly (0ms client-side latency)
  4. Seller presses Cmd+K → Command Palette appears with vehicle search + actions
  5. Seller drags 5 images onto dropzone → All upload in parallel with progress bars (0-100% per file)
  6. Middleware blocks seller from accessing /admin routes (redirects to /dashboard)
  7. Mobile user sees bottom navigation with 4 icons (Catálogo, Publicar, Leads, Más)

**Plans**: 5 plans (Wave 0: Test infrastructure | Wave 1: Layout shell | Wave 2: DataGrid + Search + Image Upload)

Plans:
- [x] 08-00-PLAN.md — Test infrastructure: 16 test stubs (13 component, 2 hook, 1 E2E) ✅ (2026-03-27)
- [x] 08-01-PLAN.md — Layout shell with route groups, sidebar (corrected terminology), header, mobile nav, middleware guards ✅ (2026-03-27)
- [x] 08-02-PLAN.md — DataGrid with TanStack Virtual, sorting, checkbox selection, StatusBadge (7 states), mobile cards ✅ (2026-03-27)
- [x] 08-03-PLAN.md — Hybrid search (client instant + server deep), Cmd+K CommandPalette, collapsible FilterSidebar, filter pills ✅ (2026-03-27)
- [x] 08-04-PLAN.md — Image upload with drag-drop, presigned URLs, Zustand progress store, sortable gallery, cover photo control ✅ (2026-03-27)

**Implementation Waves:**
- **Wave 1** (Plans 08-01, 08-02): MVP foundation — Layout shell + basic DataGrid for single vehicle upload
- **Wave 2** (Plans 08-03, 08-04): Enhanced UX — Search filters + image upload for UAT observation
- **Wave 3** (Future): Premium features — Advanced roles (Manager vs Dealer), bulk CSV upload

**Traceability**:
- Origin: UAT Phase 1 feedback (2026-03-15) — Request for advanced search, bulk actions, professional UI
- CONTEXT.md: 7-brain validation complete (UX, UI, Frontend, QA, Product, Growth, Backend)
- RESEARCH.md: Technical patterns validated (TanStack Virtual, Zustand, hybrid search, presigned URLs)
- Plans: Ready for execution with locked decisions from CONTEXT.md

---
*Last updated: 2026-04-12 — Phase 13 revised: 6 plans (Waves 1-5) with TDD pattern for Nyquist compliance*
