# Roadmap: ProSell SaaS MVP

## Overview

ProSell SaaS automates the complete vehicle sales cycle for dealerships: publish inventory to Facebook Marketplace, capture leads, confirm appointments — all from an internal panel. The roadmap executes in two delivery phases: Phase A (Core MVP) ships the closed loop publish → lead → appointment to the 5 active dealers and starts accumulating real market data. Phase B (Visibility) adds the public-facing catalog, landing page, AI-generated titles, and market intelligence built on those real data.

## Milestones

- 🚧 **Phase A — Core MVP** - Phases 1-5 (in progress)
- 📋 **Phase B — Visibility** - Phases 6-7 (planned)

## Phases

- [ ] **Phase 1: Hybrid Publisher** - Publish, update, delete, and auto-republish vehicle listings on FB Marketplace via Playwright (primary) and Graph API (secondary)
- [ ] **Phase 2: Catalog & Roles** - Role-based internal catalog showing inventory per dealer with publishing state; dealer without user account; seller-to-dealer assignment
- [ ] **Phase 3: Scraping** - Automated dealer website sync and CarGurus market price extraction with deduplication and anti-detection
- [ ] **Phase 4: Leads & Appointments** - Capture FB leads via webhook + polling, manual entry, lead lifecycle, and appointment creation with dealer notifications
- [ ] **Phase 5: Dashboards** - Role-based dashboards for Admin, Manager, Vendedor, and Dealer with metrics
- [ ] **Phase 6: Market Intelligence** - Price benchmarking (own vs. market), segmented price history, and market position indicators
- [ ] **Phase 7: Visibility** - Temporal landing page, public vehicle catalog with SEO, and AI-generated listing titles

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
- [ ] 01-00-wave0-infra-PLAN.md — Test stubs, broker migration (PubSub→ListQueue), publisher settings in config
- [ ] 01-01-publication-entity-PLAN.md — Publication entity + state machine + SQLAlchemy model + Alembic migration
- [ ] 01-02-image-pipeline-PLAN.md — ImagePipelineService (Pillow: compress/resize/JPG/strip-EXIF)
- [ ] 01-03-playwright-strategy-PLAN.md — PlaywrightPublisherService + PublisherStrategySelector + PublishVehicleUseCase
- [ ] 01-04-update-delete-PLAN.md — UpdateListingUseCase + DeleteListingUseCase + Taskiq tasks
- [ ] 01-05-auto-republish-PLAN.md — AutoRepublishUseCase + scheduled Taskiq task (every 6h)
- [ ] 01-06-graph-api-router-PLAN.md — GraphAPIPublisherService stub + publisher REST router + rate limiting
- [ ] 01-07-frontend-modal-PLAN.md — PublishModal + HeroShotSelector + PublicationStatus + catalog integration

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
**Plans**: TBD

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
  2. Vendedor can manually register a lead with name, contact, vehicle, and source
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
**Goal**: Every vehicle in the catalog displays its price position relative to the market so vendedores and admins can act on pricing without leaving the panel
**Depends on**: Phase 3
**Requirements**: MKTL-01, MKTL-02, MKTL-03
**Success Criteria** (what must be TRUE):
  1. Each vehicle in the catalog shows a BAJO / EN RANGO / ALTO badge compared to market average from CarGurus data
  2. Market average is calculated per year/make/model/mileage/condition segment (not a global average)
  3. Admin can see a price history chart for any segment over the last N weeks
**Plans**: TBD

### Phase 7: Visibility
**Goal**: ProSell has a public presence — a landing page that demonstrates the service value and a public vehicle catalog discoverable by buyers
**Depends on**: Phase 5, Phase 6
**Requirements**: LAND-01, LAND-02, CAT-PUBLIC-01, CAT-PUBLIC-02, CAT-PUBLIC-03, CAT-PUBLIC-04, PUBLISH-08
**Success Criteria** (what must be TRUE):
  1. Public landing page shows a live list of available vehicles and real-time service metrics (publications/day, time-to-publish)
  2. Public catalog is accessible by URL, filterable by make/model/year/price/condition, with a page per dealer/organization
  3. Each vehicle page has unique SEO metadata (title, description, OG tags) and loads with LCP under 2.5s
  4. System generates AI-optimized titles and descriptions for listings automatically before publishing to Facebook
**Plans**: TBD

## Progress

**Execution Order:** Phase A: 1 → 2 → 3 → 4 → 5 | Phase B: 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Hybrid Publisher | 3/8 | In Progress|  |
| 2. Catalog & Roles | 0/? | Not started | - |
| 3. Scraping | 0/? | Not started | - |
| 4. Leads & Appointments | 0/? | Not started | - |
| 5. Dashboards | 0/? | Not started | - |
| 6. Market Intelligence | 0/? | Not started | - |
| 7. Visibility | 0/? | Not started | - |
