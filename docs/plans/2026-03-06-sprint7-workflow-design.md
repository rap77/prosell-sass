# Sprint 7+ Marketplace - Workflow Design Document

**Date**: 2026-03-06
**Sprint**: 7+ (Marketplace Integration - Facebook)
**Timeline**: 7 weeks (Mar 10 - Abr 28, 2026)
**Status**: APPROVED
**Author**: Claude Code + User

---

## Executive Summary

Sprint 7+ is CRITICAL to prevent "death by success" - without automation, the business will collapse under operational load as dealers scale from 5 to 20+. This document defines the workflow architecture for implementing marketplace integration with Facebook.

**Key Decision**: Hybrid approach (Playwright first → Graph API after App Review) allows immediate progress without waiting for Facebook approval.

---

## Table of Contents

1. [Context](#1-context)
2. [Workflow Strategy](#2-workflow-strategy)
3. [PRP Structure](#3-prp-structure)
4. [Dependencies](#4-dependencies)
5. [Checkpoints & Success Criteria](#5-checkpoints--success-criteria)
6. [Risk Mitigation](#6-risk-mitigation)
7. [Publication Architecture](#7-publication-architecture)
8. [Anti-Detection Strategy](#8-anti-detection-strategy)
9. [Testing Strategy](#9-testing-strategy)
10. [Definition of Done](#10-definition-of-done)

---

## 1. Context

### 1.1 Current State

**Last Completed Sprint**: Sprint 5-6 (Products, Categories, Vehicles) ✅ Merged to main

**Problem**: "Death by Success"
```
HOY:     5 dealers × 15 autos = ~75 pubs/día (manageable)
+3 MESES: 10 dealers × 15 autos = ~150 pubs/día (IMPOSSIBLE)
+6 MESES: 20 dealers × 15 autos = ~225 pubs/día (COLLAPSE)
```

### 1.2 Business Model

**Servicios Gestionados** (NOT SaaS self-service):

```
Dealer (entrega inventario)
    ↓
Admin ProSell (carga/valida/scraping)
    ↓
Vendedor ProSell (publica usando SU cuenta Facebook)
    ↓
Facebook Marketplace
    ↓
Leads → WhatsApp/Messenger → Asistente IA → n8n → Odoo CRM
```

### 1.3 Technical Stack 2026

| Layer | Technology |
|-------|------------|
| Backend | Python 3.13+, FastAPI 0.115+, SQLAlchemy 2.0+ |
| Frontend | Next.js 16+, React 19, TypeScript 5.5+ |
| Task Queue | Taskiq (pending spike) or Celery |
| Scraping | Playwright (async) |
| Database | PostgreSQL 17 |
| Cache/Queue | Redis 7.4+ |

---

## 2. Workflow Strategy

### 2.1 Chosen Approach: Option B (Ramas por fase + PRPs por fase)

**Justification**:
- Small batches → Fail fast, learn early
- Assumption testing at each phase
- Avoid "Build Trap" (waterfall disguised as agile)
- Product Kata: Analyze → Identify obstacle → Adjust next phase

### 2.2 Flow per PRP

**For SPIKE Phases (1, 2, 3, 6)**:
```
Spike (2-3 days) → Design document → PRP → Implementation → Code review → Merge
```

**For STANDARD Phases (4, 7)**:
```
Design document → PRP → Implementation → Code review → Merge
```

**For UX-FIRST Phase (5)**:
```
UX Mockups → Approval → Design document → PRP → Implementation → Merge
```

### 2.3 Branching Strategy

```
feature/sprint-7-prp-taskqueue          → PRP 1
feature/sprint-7-prp-facebook-oauth     → PRP 2
feature/sprint-7-prp-graphapi           → PRP 3
feature/sprint-7-prp-scraping           → PRP 4
feature/sprint-7-prp-dashboards         → PRP 5
feature/sprint-7-prp-ai-assistant       → PRP 6
feature/sprint-7-prp-integration        → PRP 7
```

Each PRP = 1 feature branch, merged when complete.

---

## 3. PRP Structure

### 3.1 PRP Overview

| # | PRP | Duration | Approach |
|---|-----|----------|----------|
| **1** | Task Queue + Multi-Idioma | 1 week | Spike |
| **2** | Facebook OAuth | 1 week | Spike |
| **3** | Graph API + Playwright (Hybrid) | 1 week | Spike |
| **4** | Scraping System | 1 week | Standard |
| **5** | Dashboards + Leads | 1.5 weeks | UX First |
| **6** | Asistente IA + n8n/Odoo | 1 week | Spike |
| **7** | Integration + Testing | 0.5 weeks | Standard |

**Total**: ~7 weeks

### 3.2 Detailed Scope per PRP

#### PRP 1: Task Queue + Multi-Idioma

| Component | Scope | Deliverables |
|-----------|-------|--------------|
| Spike | Taskiq vs Celery | Decision document + POC code |
| Setup | Redis broker + worker | `apps/api/src/prosell/infrastructure/tasks/` |
| Circuit Breakers | Facebook API failures | `apps/api/src/prosell/infrastructure/circuit_breakers/` |
| Health Checks | `/health/integrations` endpoint | Functional + tests |
| Scheduler | Scheduled tasks (republish) | Configured + test |
| Multi-Idioma | `MultiLanguageString`, i18n infra | `apps/api/src/prosell/infrastructure/i18n/` |
| Locales | es.json + en.json | UI labels, validation messages |
| Language Detection | Header → Query param → User DB | `get_user_language()` function |
| Tests | Unit + integration | Coverage >80% |

#### PRP 2: Facebook OAuth

| Component | Scope | Deliverables |
|-----------|-------|--------------|
| Spike | OAuth flow dinámico | Functional POC + doc |
| DB Models | `FacebookAccount`, `FacebookPage` | Migration + models |
| OAuth Flow | Vendedor autorización | `/auth/facebook` endpoint |
| Token Management | Refresh automático (48hs before expiry) | Background task |
| Webhook Listener | Actualizaciones FB | `/webhooks/facebook` |
| Tests | E2E OAuth flow | Playwright + unitarios |

#### PRP 3: Graph API + Playwright (Hybrid)

| Component | Scope | Deliverables |
|-----------|-------|--------------|
| Spike | Playwright en FB Marketplace | Anti-detection validation |
| Playwright Publisher | `PlaywrightFBPublisher` (PRIMARY) | `publish_marketplace_listing()` |
| Graph API Client | `FacebookGraphAPIClient` (SECONDARY) | For post-approval migration |
| Feature Flag | `USE_PLAYWRIGHT=true/false` | Dynamic switching |
| Rate Limiter | Token bucket algorithm | `FacebookRateLimiter` |
| Publisher Interface | Unified `FacebookPublisher` | Fallback logic (Graph → Playwright) |
| Image Upload | Multiple photos upload | Handler + tests |
| Error Handling | Retries + fallback + circuit breaker | Complete strategy |
| Anti-Detection | Human-like behavior | Realistic UA, timing, mouse movement |
| Tests | Both approaches | E2E Playwright + Graph API mock |

**PHASE 2 (Post-Sprint 7+)**: Migrate to Graph API when App Review approved. Keep Playwright as fallback.

#### PRP 4: Scraping System

| Component | Scope | Deliverables |
|-----------|-------|--------------|
| Change Detector | Daily cron detection | `@task(schedule=[...])` |
| Scraper | Playwright incremental | `scrape_dealer_website()` |
| Deduplication | VIN/URL-based | `find_product_by_vin_or_url()` |
| AI Extraction | Non-structured sites | `AIExtractionAgent` |
| Tests | Scrapers mocked | Various sites (easy/hard) |

#### PRP 5: Dashboards + Leads

| Component | Scope | Deliverables |
|-----------|-------|--------------|
| UX Mockups | Wireframes | Figma/diagrams approval |
| Dashboard Admin | Global view | `/dashboard/admin` |
| Dashboard Manager | Team assigned | `/dashboard/manager` |
| Dashboard Vendedor | Personal metrics | `/dashboard/seller` |
| Dashboard Dealer | Own inventory | `/dashboard/dealer` |
| Leads View | Assigned leads (by role) | Table + filters |
| Multi-Idioma UI | es/en switching | Component integration |
| Tests | Component tests | Vitest + E2E |

#### PRP 6: Asistente IA + n8n/Odoo

| Component | Scope | Deliverables |
|-----------|-------|--------------|
| Spike | OpenAI/Claude API | Intent analysis, effective prompts |
| `AIVendorAssistant` | Complete class | `analyze_intent()`, `offer_alternatives()`, `schedule_appointment()` |
| Similar Products | Vector/keyword search | `find_similar_products()` |
| Lead Webhook | `/webhooks/lead-qualified` | n8n integration |
| n8n Workflow | Configuration | Create lead in Odoo |
| Tests | E2E conversation | Playwright + mocks |

#### PRP 7: Integration + Testing

| Component | Scope | Deliverables |
|-----------|-------|--------------|
| End-to-End | Complete flow | Product → FB → Lead |
| Load Testing | Scalability | 150 pubs/day simulated |
| Bug Fixes | Issues found | All resolved |
| Documentation | README + handoff | Doc for next session |
| Canary Deployment | 1 real dealer | 48h monitoring |

---

## 4. Dependencies

### 4.1 Dependency Graph

```
PRP 1 (Task Queue + Multi-Idioma)
├── CRITICAL for: PRP 2, 3, 4 (all use tasks)
└── Multi-Idioma CRITICAL for: PRP 3 (FB masters), PRP 5 (Dashboard UI)

PRP 2 (Facebook OAuth)
├── CRITICAL for: PRP 3 (Graph API needs token)
└── CRITICAL for: PRP 5 (Dashboard shows connected accounts)

PRP 3 (Graph API + Playwright)
├── DEPENDS on: PRP 1 (Task Queue for async publish)
├── DEPENDS on: PRP 2 (OAuth token)
└── USED by: PRP 5 (Dashboard shows publications)

PRP 4 (Scraping System)
├── DEPENDS on: PRP 1 (Task Queue for async scraping)
├── INDEPENDENT of: PRP 2, 3 (no FB needed)
└── FEEDS: PRP 5 (Dashboard shows scraped inventory)

PRP 5 (Dashboards + Leads)
├── DEPENDS on: PRP 2, 3, 4 (data from these sources)
├── DEPENDS on: PRP 1 (Multi-Idioma for UI)
└── FEEDS: PRP 6 (AI Assistant needs to see leads)

PRP 6 (Asistente IA + n8n)
├── DEPENDS on: PRP 5 (Leads view exists)
└── INTEGRATED with: n8n (Odoo CRM)

PRP 7 (Integration + Testing)
├── DEPENDS on: ALL previous
└── CLOSES the sprint
```

### 4.2 Simplified View

```
1 → 2 → 3 ↘
   ↓     ↶  5 → 6 → 7
   4 ↗ ↗
1 ↘ ↛ ↛ (Multi-Idioma affects 3, 5)
```

---

## 5. Checkpoints & Success Criteria

### 5.1 Per-PRP Checkpoints

| PRP | Checkpoint | Go/No-Go Criteria |
|-----|------------|-------------------|
| **1** | Spike complete | ✅ Task Queue worker functional + 1 scheduled task runs |
| **2** | OAuth flow validated | ✅ Vendedor can authorize, token saved, refresh works |
| **3** | Publish tested | ✅ 10 consecutive successful publications without ban |
| **4** | Scraper works | ✅ Deduplication works, 2 sites scraped (easy + hard) |
| **5** | UX approved | ✅ 4 dashboards functional (Admin, Manager, Vendedor, Dealer) |
| **6** | AI qualifies correctly | ✅ 5 test leads classified correctly |
| **7** | E2E works | ✅ 1 real dealer uses system for 48h without critical bugs |

### 5.2 Global Success Metrics

| Metric | Current | Target (6 weeks) | Target (12 weeks) |
|--------|---------|------------------|-------------------|
| **Publications/day** | ~75 manual | ~75 auto <30s | 150+ auto |
| **Time-to-publish** | Minutes | <30 seconds | <30 seconds |
| **API Success Rate** | N/A | >99.9% | >99.9% |
| **Churn Rate** | 0% | 0% | <5% |
| **Dealer Satisfaction** | 7/10 | 9/10 | 9/10 |

### 5.3 Decision Gates (Go/No-Go)

```
AFTER PRP 1 (Task Queue):
├── Task Queue works without bugs?
├── Scheduler executes scheduled tasks?
├── Multi-Idioma implemented?
└── If NO → Stop and fix before PRP 2

AFTER PRP 2 (OAuth):
├── Vendedor can authorize FB account?
├── Token refresh works?
└── If NO → Stop and fix before PRP 3

AFTER PRP 3 (Graph API + Playwright):
├── FB publications work?
├── Rate limiting doesn't ban account?
└── If NO → Stop and fix before PRP 4

AFTER PRP 5 (Dashboards):
├── 4 dashboards are usable?
├── Multi-idioma works in UI?
└── If NO → Rework UX before PRP 6
```

---

## 6. Risk Mitigation

### 6.1 Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| **1** | Playwright banned by FB (bot detection) | Medium | **HIGH** | Anti-detection strategies (realistic UA, timing, mouse movement) |
| **2** | Taskiq/Celery doesn't work with FastAPI async | Low | **HIGH** | Spike PRP 1 validates before commit |
| **3** | Rate limiting bans account | Medium | **MEDIUM** | Spike PRP 3 tests real limits. Circuit breaker. |
| **4** | Scraping fails on dynamic sites | Medium | **MEDIUM** | AI Extraction Agent as fallback |
| **5** | OpenAI/Claude costs explode | Medium | **MEDIUM** | Spike PRP 6 measures real cost. Budget cap. |
| **6** | n8n integration fails | Low | **LOW** | n8n is stable. Spike in PRP 6. |
| **7** | Sprint exceeds 7 weeks | Medium | **HIGH** | Feature creep control. Daily standups. |
| **8** | Multi-idioma doubles UI work | High | **MEDIUM** | Reusable components. i18n battle-tested lib. |

### 6.2 Contingency Plans

```
IF Playwright BANNED (Risk 1):
├── PLAN A: Multiple FB accounts (load balancing)
├── PLAN B: Reduce publication frequency
├── PLAN C: Migrate to Graph API early (if approved)
└── Trigger: Detection in PRP 3

IF Task Queue FAILS (Risk 2):
├── PLAN A: Switch to Celery (if Taskiq spike fails)
├── PLAN B: Native AsyncIO (less robust, but works)
└── Trigger: Spike PRP 1

IF Rate Limiting BANS (Risk 3):
├── PLAN A: Circuit breaker detects and stops
├── PLAN B: Multiple FB accounts (load balancing)
├── PLAN C: Reduce publication frequency
└── Trigger: Spike PRP 3

IF OpenAI costs EXPLODE (Risk 5):
├── PLAN A: Claude API (cheaper for simple prompts)
├── PLAN B: Smaller models (gpt-3.5 instead of gpt-4)
├── PLAN C: Rate limiting per lead
└── Trigger: Spike PRP 6 (measure real cost)
```

### 6.3 Early Actions (Day 1-2)

| Action | Due Date | Owner |
|--------|----------|-------|
| Create Facebook App | Day 1 | Dev |
| Configure OAuth redirect | Day 1 | Dev |
| Submit App Review (permissions) | Day 2 | Dev |
| Setup Redis for Task Queue | Day 2 | Dev |
| Create OpenAI/Claude account | Day 2 | Dev |
| Setup n8n instance | Day 3 | Dev |

---

## 7. Publication Architecture

### 7.1 Hybrid Strategy (Playwright → Graph API)

```
PHASE 1 (Sprint 7+): Playwright Automation
├── Publish immediately (no App Review wait)
├── Playwright simulates real user in FB Marketplace
├── Submit App Review in parallel (Day 1)
└── Duration: Until App Review approved (14-30 days)

PHASE 2 (Post-Sprint 7+): Graph API Migration
├── App Review approved → migrate to Graph API
├── Keep Playwright as fallback
├── A/B test: publish with both, compare success rate
└── If Graph API fails → fallback to Playwright
```

### 7.2 Publisher Interface (Unified Fallback)

```python
class FacebookPublisher:
    """Hybrid publisher with automatic fallback"""

    def __init__(self):
        self.graph_api_client = FacebookGraphAPIClient()
        self.playwright_publisher = PlaywrightFBPublisher()

    async def publish(self, product: Product) -> str:
        """Try Graph API first, fallback to Playwright"""
        if settings.USE_GRAPH_API:
            try:
                return await self.graph_api_client.publish(product)
            except Exception as e:
                logger.warning(f"Graph API failed: {e}, falling back to Playwright")

        # Fallback a Playwright
        return await self.playwright_publisher.publish(product)
```

### 7.3 Feature Flag Configuration

```python
# settings.py
USE_GRAPH_API = os.getenv("USE_GRAPH_API", "false").lower() == "true"
USE_PLAYWRIGHT = os.getenv("USE_PLAYWRIGHT", "true").lower() == "true"

# Migration strategy:
# PHASE 1: USE_GRAPH_API=false, USE_PLAYWRIGHT=true
# PHASE 2: USE_GRAPH_API=true, USE_PLAYWRIGHT=true (A/B test)
# PHASE 3: USE_GRAPH_API=true, USE_PLAYWRIGHT=false (Graph API primary)
```

---

## 8. Anti-Detection Strategy

### 8.1 Techniques (Priority Order)

| Technique | Implementation | Priority |
|-----------|----------------|----------|
| **1. Realistic User Agent** | Rotate UAs (Chrome, Firefox, Safari) | CRITICAL |
| **2. Realistic Viewport** | Common resolutions (1920x1080, 1366x768) | CRITICAL |
| **3. Human-like Timing** | Random delays (2-5s) between actions | CRITICAL |
| **4. Mouse Movement** | Natural Bezier curves, no teleport | CRITICAL |
| **5. Headless Detection** | Use `launch({headless: "new"})` or xvfb | CRITICAL |
| **6. Browser Fingerprint** | `playwright-extra` with `stealth` plugin | HIGH |
| **7. Session Persistence** | Save cookies/session, reuse | HIGH |
| **8. Random Action Order** | Don't always fill forms in same order | MEDIUM |
| **9. Typos Occasional** | Rarely make mistakes and correct (backspace) | LOW |
| **10. Scroll Behavior** | Natural scroll (no jump to element) | MEDIUM |

### 8.2 Implementation Example

```python
class PlaywrightFBPublisher:
    """Publisher with anti-detection"""

    def __init__(self):
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...",
        ]

    async def create_context(self, browser):
        """Create undetectable browser context"""
        ua = random.choice(self.user_agents)
        viewport = random.choice([
            {"width": 1920, "height": 1080},
            {"width": 1366, "height": 768},
        ])

        context = await browser.new_context(
            user_agent=ua,
            viewport=viewport,
            locale="es-ES",
            timezone_id="America/Argentina/Buenos_Aires",
            storage_state="fb_session.json"  # Reuse session
        )
        return context

    async def human_type(self, element, text: str):
        """Type like human (not instant)"""
        for char in text:
            await element.type(char, delay=random.randint(50, 150))

    async def human_click(self, page, selector: str):
        """Click with natural mouse movement"""
        element = await page.query_selector(selector)
        box = await element.bounding_box()

        # Bezier curve movement
        await page.mouse.move(
            box["x"] + box["width"] / 2,
            box["y"] + box["height"] / 2,
            steps=random.randint(10, 20)
        )

        await asyncio.sleep(random.uniform(0.5, 2.0))
        await element.click()

    async def publish_marketplace_listing(self, product: Product):
        """Publish with human behavior"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=False,  # Or xvfb in production
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                ]
            )

            context = await self.create_context(browser)
            page = await context.new_page()

            await page.goto("https://www.facebook.com/marketplace/create")

            # Random delays between actions
            await asyncio.sleep(random.uniform(2, 5))

            # Fill form like human
            await self.human_type(await page.query_selector("#title"), product.title)
            await asyncio.sleep(random.uniform(1, 3))

            # Submit with final delay
            await asyncio.sleep(random.uniform(2, 4))
            await self.human_click(page, "#publish-button")

            # Save session
            await context.storage_state(path="fb_session.json")

            await browser.close()
```

### 8.3 Recommended Libraries

```bash
# Anti-detection plugins
uv add playwright-extra
uv add playwright-extra-plugin-stealth

# For realistic data
uv add faker  # names, emails, etc.
```

### 8.4 Anti-Detection Tests

```python
@pytest.mark.asyncio
async def test_playwright_not_detected():
    """Verify FB doesn't detect bot"""
    publisher = PlaywrightFBPublisher()

    result = await publisher.publish(test_product)

    assert result["status"] == "published"
    assert "captcha" not in result.lower()
    assert "blocked" not in result.lower()
```

---

## 9. Testing Strategy

### 9.1 Testing Pyramid

```
        /\
       /  \    E2E Tests (Playwright)
      /────\   - Publication complete
     /      \  - OAuth flow
    /        \ - Scraping complete
   /──────────\
  /            \  Component Tests
 /  Unitarios   \ - Dashboard components
/   (pytest)     \ - Publisher classes
\                 / - Scraper modules
 \               /
  \_____________/
```

### 9.2 Coverage Targets

| Layer | Tool | Target | Type |
|------|------|--------|------|
| Unit | pytest (backend), vitest (frontend) | >80% | Auto CI |
| Integration | pytest + DB fixtures | >70% | Auto CI |
| Component | Testing Library | >60% | Auto CI |
| E2E | Playwright | Critical paths | Auto CI |
| Load | k6/locust | 150 pubs/day | Manual pre-merge |
| Manual | Exploratory | Per phase | QA manual |

### 9.3 Critical Tests (Must Have)

| PRP | Critical Test | Description |
|-----|---------------|-------------|
| **1** | `test_task_queue_worker_executes` | Task enqueued → executed |
| **1** | `test_multi_language_string_validation` | Multi-language works |
| **2** | `test_facebook_oauth_flow_e2e` | Auth complete |
| **2** | `test_token_refresh_before_expiry` | Auto refresh |
| **3** | `test_playwright_publish_success` | Playwright publication |
| **3** | `test_graph_api_publish_success` | Graph API publication |
| **4** | `test_scraper_deduplication` | No duplicates |
| **4** | `test_ai_extraction_agent` | Extracts correctly |
| **5** | `test_dashboard_admin_visible` | Admin sees all |
| **5** | `test_dashboard_dealer_only_own` | Dealer sees only own |
| **6** | `test_ai_assistant_qualifies_lead` | Classifies correctly |
| **7** | `test_e2e_product_to_facebook` | Complete flow |

---

## 10. Definition of Done

### 10.1 PRP Definition of Done

For a PRP to be complete, ALL of the following must be ✅:

**Code**
- [ ] Complete implementation per PRP
- [ ] Unit tests (>80% coverage of new code)
- [ ] Integration tests where applicable
- [ ] E2E tests for critical flows
- [ ] Linting passes (ruff, eslint, prettier)
- [ ] Type checking passes (pyright, tsc)
- [ ] GGA code review approved

**Documentation**
- [ ] Design doc written
- [ ] Internal README (if applicable)
- [ ] Comments in complex code
- [ ] Changelog updated

**Quality Gates**
- [ ] All tests pass locally
- [ ] Tests pass in CI
- [ ] Performance acceptable (if applicable)
- [ ] Security scan no critical issues
- [ ] Manual QA if applicable

**Integration**
- [ ] Merged to main (or feature branch ready)
- [ ] Deployed to staging
- [ ] Smoke test successful on staging
- [ ] Handoff doc written (if applicable)

---

## Appendices

### A. Documentation Structure

```
docs/
├── plans/
│   ├── 2026-03-06-sprint7-overview.md              (This doc)
│   ├── 2026-03-06-phase1-taskqueue-spike.md
│   ├── 2026-03-06-phase1-taskqueue-design.md
│   ├── 2026-03-06-phase2-facebook-spike.md
│   ├── 2026-03-06-phase2-facebook-design.md
│   ├── 2026-03-06-phase3-graphapi-spike.md
│   ├── 2026-03-06-phase3-graphapi-design.md
│   ├── 2026-03-06-phase4-scraping-design.md
│   ├── 2026-03-06-phase5-dashboards-ux.md
│   ├── 2026-03-06-phase5-dashboards-design.md
│   ├── 2026-03-06-phase6-ai-assistant-spike.md
│   ├── 2026-03-06-phase6-ai-assistant-design.md
│   └── 2026-03-06-phase7-integration-design.md
│
└── prps/
    ├── sprint-7-phase1-taskqueue-prp.md
    ├── sprint-7-phase2-facebook-oauth-prp.md
    ├── sprint-7-phase3-graphapi-prp.md
    ├── sprint-7-phase4-scraping-prp.md
    ├── sprint-7-phase5-dashboards-prp.md
    ├── sprint-7-phase6-ai-assistant-prp.md
    └── sprint-7-phase7-integration-prp.md
```

### B. Key Architectural Decisions

| # | Decision | Justification |
|---|----------|---------------|
| 1 | **OPCIÓN B**: Phases + PRPs | Small batches, fail fast, validated learning |
| 2 | **Task Queue** in PRP 1 | Foundation for all async work |
| 3 | **Hybrid Playwright/Graph API** | Not blocked by App Review |
| 4 | **Multi-Idioma** in PRP 1 | Cross-cutting concern, affects everything |
| 5 | **UX first** for Dashboards | No UI rework later |
| 6 | **Spikes** for unknowns | Mitigate technical risk early |

---

**Document Status**: ✅ APPROVED
**Next Step**: Generate PRPs using `/generate-prp` skill
**Date**: 2026-03-06
