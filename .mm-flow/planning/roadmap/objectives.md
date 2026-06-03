# Objective Roadmap — ProSell SaaS

_Generated: 2026-05-30_

## Status summary

| Category | Count |
|----------|-------:|
| Active | 2 |
| Paused | 1 |
| Planned | 5 |
| Done | 12 |

_Updated: 2026-06-03 — `a11y-hardening` demoted to paused while P0 incident `product-image-association-bug` is open._

---

## Objectives

### 🚀 Active Objectives

#### 1. Production Deploy
| | |
|---|---|
| **Status** | `active` |
| **Priority** | `critical` |
| **Ready Now** | YES |
| **MVP** | YES |
| **Dependencies** | None |
| **Why it matters** | The entire MVP is verified green (1124 Python tests, 840 frontend tests, E2E 20/20) but sitting in staging. Production deploy is the single remaining step to deliver value to real users. |
| **Evidence** | `docs/mvp-status.md` (98% release ready, staging verified 2026-05-27), `DEPLOY.md` (deployment guide complete), `HANDOFF-RELEASE.md` (semaphore all green) |

**Actionable plans:**
- Execute `alembic upgrade head` on production database
- Run `init_data.py` to seed admin + org
- Verify health endpoints: `https://api.prosellweb.com/api/v1/health` and `https://prosellweb.com`

---

#### 2. Product Image Association Bug (P0 prod incident)
| | |
|---|---|
| **Status** | `active` |
| **Priority** | `critical` |
| **Ready Now** | YES (root cause identified, plan approved) |
| **MVP** | YES (blocks user-visible functionality in production) |
| **Dependencies** | None (independent of all other objectives) |
| **Why it matters** | Products created via drag-and-drop in `/catalog/create` upload images to DO Spaces successfully, but the catalog grid shows a placeholder instead. Root cause: frontend sends `image_urls` nested in `attributes` JSONB; backend signed-URL endpoint reads from top-level `products.image_urls` column which is never populated. Three inconsistent storage locations coexist (top-level column, nested attributes, dead `product_images` table). |
| **Evidence** | `.mm-flow/planning/changes/product-image-association-bug/{requirements,design}.md` (root cause + plan), engram observation id 1579 |

**Actionable plans:**
- TDD RED: 3 failing tests (create_persists_image_urls, get_image_urls_returns_signed, bulk_upload_persists_image_urls)
- TDD GREEN: modify `CreateProductRequest` DTO + `create_product.py` + `create/page.tsx:59` + `bulk_upload_vehicles.py`
- Alembic backfill migration: copy `attributes->>'image_urls'` → `products.image_urls` for existing rows
- Alembic drop migration: remove `product_images` legacy table
- Deploy: local → staging (manual smoke test) → prod (maintenance window with `alembic upgrade head` + API restart)

---

### ⏸ Paused Objectives

#### 3. A11y Hardening (WCAG AA)
| | |
|---|---|
| **Status** | `paused` (was `active`, demoted 2026-06-03 while P0 incident is open) |
| **Priority** | `high` |
| **Ready Now** | YES (independent work, no dependencies) |
| **MVP** | NO (non-blocking technical debt) |
| **Dependencies** | None |
| **Why it matters** | Sidebar dark mode contrast is 2.4:1 (minimum WCAG AA is 4.5:1). This is a legal/accessibility risk for public-facing software. Additionally, dashboard has `<h3>` without preceding `<h2>`, and two `<aside>` elements lack differentiating `aria-label`. |
| **Evidence** | `docs/mvp-status.md` (deuda técnica section) |

**Why paused:** P0 production incident `product-image-association-bug` is taking precedence. Resume when image-bug is shipped to prod.

**Actionable plans (when resumed):**
- Fix `--ps-text-disabled` / `--ps-bg-sidebar` contrast ratio in dark mode
- Add proper heading hierarchy (h2 before h3) in dashboard
- Add `aria-label` to `<aside>` elements

---

### 📋 Planned Objectives (Blocked on Production)

#### 4. Phase 3: Scraping
| | |
|---|---|
| **Status** | `planned` |
| **Priority** | `high` |
| **Ready Now** | NO (depends on production) |
| **MVP** | NO (Phase 3 scope) |
| **Dependencies** | Phase 2 (Catalog & Roles) — COMPLETED, Phase 1 (Hybrid Publisher) — COMPLETED |
| **Why it matters** | Automated dealer website sync + CarGurus market price extraction for market intelligence. Addresses the "muerte por exito" problem — without scraping, the system cannot scale beyond ~10 dealers manually. |
| **Evidence** | `docs/PRPs/sprint-7-phase4-scraping-prp.md` (45.9KB PRP exists), `ROADMAP.md` Phase 3 |

**Success Criteria (what must be TRUE):**
1. Scraper runs daily and detects new vehicles added to dealer website, creating them in ProSell inventory automatically
2. When a vehicle is no longer on the dealer site, it is marked as sold in ProSell (and its active FB listing removed)
3. CarGurus prices for comparable vehicles are stored in DB and available for price comparison
4. Duplicate detection prevents the same vehicle from being created twice (by VIN or heuristic)
5. Scraper operates without triggering blocks (rate limiting, rotating agents, incremental scraping)

---

#### 5. Phase 4: Leads & Appointments UI Polish
| | |
|---|---|
| **Status** | `planned` |
| **Priority** | `high` |
| **Ready Now** | NO (MVP flow verified but needs hardening) |
| **MVP** | YES (core flow exists) |
| **Dependencies** | Phase 1 (Hybrid Publisher) — COMPLETED |
| **Why it matters** | The lead capture → appointment confirmation flow is verified in E2E but the broader API coverage and edge cases need hardening before scaling. |
| **Evidence** | `docs/mvp-status.md` (Leads 95%, Appointments 92%) |

**Success Criteria (what must be TRUE):**
1. FB leads captured via webhook/polling create Lead records within 5 minutes
2. Manual lead entry with name, contact, vehicle, source works end-to-end
3. Lead state advances through lifecycle: new → contacted → qualified → appointment_set → lost
4. Appointment creation links Lead + Vehicle + Dealer with date/time in one action
5. Dealer receives email notification when appointment confirmed (needs SendGrid wiring)

---

#### 6. Phase 5: Dashboards
| | |
|---|---|
| **Status** | `planned` |
| **Priority** | `medium` |
| **Ready Now** | NO |
| **MVP** | NO (Phase 5 scope, post-MVP) |
| **Dependencies** | Phase 4 (Leads & Appointments) |
| **Why it matters** | Role-based dashboards (Admin, Manager, Vendedor, Dealer) with focused metrics per role. Currently no dashboards exist — all roles see the same admin view. |
| **Evidence** | `docs/PRPs/sprint-7-phase5-dashboards-prp.md` (40.7KB PRP exists), `ROADMAP.md` Phase 5 |

**Success Criteria (what must be TRUE):**
1. Admin dashboard shows publications/day, global leads, per-vendedor performance, API integration status
2. Manager dashboard shows their team's metrics, assigned dealers, pending publications
3. Vendedor dashboard shows their active listings, assigned leads, today's appointments, personal conversion rate
4. Dealer dashboard shows their inventory and active FB listings without any access to lead data

---

#### 7. Phase 6: Market Intelligence
| | |
|---|---|
| **Status** | `planned` |
| **Priority** | `medium` |
| **Ready Now** | NO |
| **MVP** | NO (Phase 3 is prerequisite) |
| **Dependencies** | Phase 3 (Scraping) |
| **Why it matters** | Price benchmarking (own vs. market), segmented price history, market position indicators — the core value proposition for dealers is knowing if their price is competitive. |
| **Evidence** | `ROADMAP.md` Phase 6 |

**Success Criteria (what must be TRUE):**
1. Vendedor views a vehicle and sees price range for comparable vehicles (±10% mileage, ±2 years)
2. Vendedor sees market position indicator (overpriced/competitively priced/underpriced) with color coding
3. Admin sees price trends over time for makes/models in their region
4. System flags vehicles with outlier prices (>20% above/below market) for review

---

#### 8. Phase 7: Visibility (Public Catalog + Landing + AI Titles)
| | |
|---|---|
| **Status** | `planned` |
| **Priority** | `medium` |
| **Ready Now** | NO |
| **MVP** | NO (Phase 2 is prerequisite) |
| **Dependencies** | Phase 2 (Catalog & Roles) — COMPLETED |
| **Why it matters** | Public catalog for SEO distribution, AI-generated listing titles for better CTR, social sharing. First external-facing surface after internal operational panel. |
| **Evidence** | `ROADMAP.md` Phase 7 |

**Success Criteria (what must be TRUE):**
1. Public catalog page shows active vehicles with SEO-friendly URLs (/catalog/2020-honda-civic-abc123)
2. Landing page ranks for "buy cars [city]" search terms with meta tags and structured data
3. System generates optimized titles for FB listings (e.g., "2020 Honda Civic LX - Low Miles - Clean CarFax")
4. Public vehicle page includes social sharing buttons (FB, WhatsApp, Email)

---

#### 9. Facebook OAuth + Graph API Integration
| | |
|---|---|
| **Status** | `planned` |
| **Priority** | `high` |
| **Ready Now** | NO (Meta App Review required) |
| **MVP** | NO (Playwright fallback is operational) |
| **Dependencies** | Meta App Review approval |
| **Why it matters** | Graph API is the sustainable publishing path. Playwright is the bridge until Graph API is approved. Current publishing uses Playwright as primary. |
| **Evidence** | `docs/PRPs/sprint-7-phase2-facebook-oauth-prp.md` (36.7KB PRP exists), `docs/PRPs/sprint-7-phase3-graphapi-playwright-prp.md` (43.7KB PRP exists) |

---

#### 10. AI Assistant (Claude Integration)
| | |
|---|---|
| **Status** | `planned` |
| **Priority** | `low` |
| **Ready Now** | NO |
| **MVP** | NO (Phase 6 is prerequisite) |
| **Dependencies** | Phase 6 (Market Intelligence) + Claude API key |
| **Why it matters** | Conversational AI agent for price recommendations and market analysis. Requires sufficient market data first (Phase 6). |
| **Evidence** | `docs/PRPs/sprint-7-phase6-ai-assistant-prp.md` (32.9KB PRP exists) |

---

### ✅ Done Objectives

| # | Objective | Completed | Evidence |
|---:|-----------|-----------|----------|
| 1 | Phase 1: Hybrid Publisher (Playwright + Graph API) | 2026-03-15 | 8/8 plans complete |
| 2 | Phase 2: Catalog & Roles | 2026-03-30 | 8/8 plans complete |
| 3 | Phase 8: Layout Shell + Vehicle Management | 2026-03-27 | 5/5 plans complete |
| 4 | Phase 9: Anti-patterns Fix | 2026-03-29 | 1/1 plans complete |
| 5 | Phase 10: Contract Testing Skill | 2026-03-31 | 1/1 plans complete |
| 6 | Phase 11: DB Migration — C3 Schema | 2026-04-10 | 2/2 plans complete |
| 7 | Phase 12: Backend API — Categories/Products/Vehicles | 2026-04-10 | 5/5 plans complete |
| 8 | Phase 13: Frontend — Vehicle Form, DataGrid, CSV Upload | 2026-04-26 | 6/6 plans complete |
| 9 | Milestone C: UX Completion (M3, M2, M1, A1, A2, A3, A4, C1) | 2026-05-21 | 8/8 tasks complete |
| 10 | Auth System (JWT, OAuth, 2FA, dynamic cookies) | 2026-05-28 | 95% verified, 1124 pytest passing |
| 11 | Organizations & Teams (seeding, invitations) | 2026-05-28 | 95% verified |
| 12 | E2E Verification (integrated-critical-path, integrated-flow, staging-smoke) | 2026-05-27 | 20/20 tests passing |

---

## MVP vs v1 Scope Differentiation

### MVP Scope (Done ✅)
- Internal catalog management (C3 model)
- Multiniche-ready catalog foundation
- Lead creation/capture and lifecycle management
- Appointment creation and dealer-facing management
- Operational UI for sellers/vendedores/dealers
- Hybrid publishing via Playwright (Graph API pending Meta approval)

### v1 Scope (Planned)
- Public marketplace/catalog experience for SEO
- Full scraping automation (Phase 3)
- Market intelligence and price benchmarking (Phase 6)
- Role-based dashboards (Phase 5)
- AI-powered price recommendations
- WhatsApp/SMS notifications (advanced)
- Stripe wallet and token system

---

## Dependency Graph

```
[Production Deploy] (critical path) ✓ deployed 2026-05-27
       │
       ├──► [Product Image Bug] (P0 incident, no deps)  ← ACTIVE
       │
       ├──► [A11y Hardening] ← PAUSED
       │
       ▼
[Phase 3: Scraping] ─────────────────────────────────────────► [Phase 6: Market Intelligence]
       │                                                          │
       ▼                                                          │
[Phase 4: Leads & Appointments]                                   │
       │                                                          │
       ▼                                                          │
[Phase 5: Dashboards] ◄────────────────────────────────────────────┘
       │
       │
[Phase 7: Visibility] ◄── (depends on Phase 2 ✓)
       │
       ▼
[Facebook OAuth + Graph API] (depends on Meta App Review)
       │
       ▼
[AI Assistant] ◄── (depends on Phase 6 + Claude API key)
```

---

## Recommended Next Active Objective

**`product-image-association-bug`** — Why:
1. **P0 in production** — real users cannot see product images, blocking the core catalog use case
2. No dependencies (can ship independently of everything else)
3. Root cause already identified, plan approved, 9 ACs defined
4. Estimated work: ~2.5 hours end-to-end (TDD + deploy)
5. After shipping: resume `A11y Hardening` (was paused to make room)
