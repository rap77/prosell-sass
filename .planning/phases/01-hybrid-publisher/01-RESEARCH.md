# Phase 1: Hybrid Publisher - Research

**Researched:** 2026-03-15
**Domain:** Facebook Marketplace automation (Playwright), Graph API publishing, image pipeline, state machine, task scheduling
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Trigger**: Access from catalog as modal overlay (no page navigation, no loss of list position)
- **Publish flow**: "Preparar Publicación" → modal → review + edit → Submit → modal closes → row shows "Pending/Publishing"
- **Update flow**: Button changes to "Actualizar" when listing exists; modal shows FB price diff (current vs new)
- **Delete**: Secondary "Eliminar/Finalizar" button inside the "Actualizar" modal
- **Modal fields**: title (pre-filled, editable), description (pre-filled, editable), price with CarGurus delta (BAJO/EN RANGO/ALTO — can be empty in Phase 1), Facebook Page selector (dropdown of connected pages), Hero Shot selector, ZIP Code (pre-filled from dealer, editable), Gallery
- **Validation**: Frontend Zod (price > 0, at least one photo, page selected) — invalid data never reaches Playwright
- **Error categories**:
  - A (transient — network/timeout): auto-retry, exponential backoff 1m → 5m → 15m; 3 failures → "Atención Requerida" state
  - B (blocking — captcha/ban): immediate pause of seller's queue; red badge; blocked retry until vendedor confirms "Ya validé mi cuenta de Facebook"
  - C (validation): blocked at frontend by Zod; Playwright never executes
- **Error visibility**: badge on catalog row, error detail in modal on reopen, "Pending Actions" widget on vendedor dashboard, Admin cross-vendor view
- **Strategy feature flag**: `PUBLISHER_ENGINE=playwright|graph_api|auto` in Settings
- **Auto mode**: Playwright is primary (Phase 1); Graph API becomes primary post-approval
- **Admin toggle**: master switch in admin panel (no redeploy required)
- **Strategy logging**: every publication logs `strategy_used` (playwright/graph_api) + engine version
- **Image pipeline**: compress < 1MB, resize to 1080px FB standard, convert to JPG, strip EXIF
- **Hero Shot**: click to move to index 0 with "PORTADA" badge — simple click, not drag & drop (mobile-first)
- **Image sources**: scraper images (pre-loaded) + manual upload from modal

### Claude's Discretion
- Scheduler design for auto-republish (frequency, expiry detection logic, expired vs. approaching expiry behavior)
- Exponential backoff implementation in Taskiq (exact timing)
- Internal structure of Publication entity state machine
- REST endpoint design for publish/update/delete flow
- Graph API client adapter selection

### Deferred Ideas (OUT OF SCOPE)
- Drag & drop for full photo reordering (Phase 2+ UX enhancement)
- Per-Facebook-Page strategy configuration (individual engine per page)
- Real-time toast/push notifications on background job completion (requires WebSockets)
- PUBLISH-08: AI-generated titles/descriptions (Phase 7, needs CarGurus data volume)
- ProSell watermark on images (branding idea, not priority)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PUBLISH-01 | System publishes a vehicle on FB Marketplace via Playwright with anti-detection (realistic typing, delays, standard viewport, human User-Agent) | Playwright async API confirmed; anti-detection patterns documented |
| PUBLISH-02 | System publishes via Graph API when FB App permissions are approved (fallback → primary) | Graph API Catalog endpoint identified; facebook-sdk (Python) confirmed available |
| PUBLISH-03 | System detects which strategy to use (Playwright vs Graph API) based on availability/approval | Feature flag pattern in existing Settings; strategy selector design documented |
| PUBLISH-04 | Vendedor can update price, description, or photos of an active listing from the app | Update use case maps to Playwright edit flow + Graph API update endpoint |
| PUBLISH-05 | Vendedor can mark a vehicle as sold and the listing is removed from FB automatically | Delete use case maps to Playwright delete flow + Graph API delete endpoint |
| PUBLISH-06 | System auto-republishes listings approaching 7-day expiry (scheduler) | Taskiq scheduler pattern documented; frequency and logic designed |
| PUBLISH-07 | Publication entity with state machine: pending / published / failed / expired / sold | Domain entity design + state transitions fully mapped |
| PUBLISH-09 | System applies rate limiting (token bucket) to not exceed Graph API quotas and avoid bans | Token bucket pattern documented; Playwright-specific rate limiting patterns identified |
| PUBLISH-10 | System optimizes images before upload (compression, FB-compatible resolution) | Pillow 12.1.1 already installed; pipeline implementation documented |
</phase_requirements>

---

## Summary

This phase builds the core publishing engine of ProSell — the feature that converts internal inventory into live Facebook Marketplace listings. The architecture has two publication strategies: Playwright automation (primary, immediate) and Graph API (secondary, post-FB-App-Review). Both are wrapped behind a strategy selector controlled by the `PUBLISHER_ENGINE` feature flag.

The domain model is clean: a `Publication` entity (separate from `Product`) tracks the lifecycle of a FB listing — `pending → published → failed → expired → sold`. This entity holds `fb_listing_id`, `strategy_used`, `facebook_page_id`, `published_at`, and `expires_at` (7 days from publish). A Taskiq scheduler runs every 6 hours to detect listings within 48 hours of expiry and auto-republish.

The critical implementation risk in this phase is Playwright's interaction with Facebook's anti-bot detection. Facebook Marketplace actively detects automation. The patterns that matter most are: realistic typing delays (50-150ms per keystroke), human-like scroll behavior before form interaction, stable viewport (1280x900), and rotating user agents. These patterns are well-documented in anti-detection literature.

**Primary recommendation:** Build the `Publication` entity and state machine first, then the Playwright adapter, then the image pipeline, then the scheduler. Wire the Graph API adapter last (stub it with a feature flag check). The frontend modal is the last piece — it depends on all backend endpoints being ready.

---

## Standard Stack

### Core (Backend)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| playwright (Python) | 1.42+ | Browser automation for FB Marketplace | Async-first, stable API, active maintenance |
| Pillow | 12.1.1 | Image compression, resize, EXIF strip | Already installed in venv; PIL is the Python standard for image processing |
| Taskiq | 0.12.1 | Task queue for publish/retry/scheduler jobs | Already operational in project with Redis broker |
| taskiq-redis | 1.2.2 | Redis broker + scheduler for Taskiq | Already operational |
| facebook-sdk | 3.x | Graph API client (Python) | Official FB Python SDK; needed for PUBLISH-02 |
| SQLAlchemy 2.0 | 2.0.36+ | Publication model persistence | Already established pattern in project |
| Alembic | 1.14+ | DB migration for publications table | Already established pattern in project |

### Supporting (Frontend)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query | 5.x | Polling publication status, optimistic updates | For `useQuery` on publication status after submit |
| React Hook Form | 7.x | Modal form management | Already in project; use for publish modal |
| Zod | 3.x | Client-side validation (Category C errors) | Block invalid data before API call |
| Zustand | 5.x | Publisher engine toggle state (admin) | For admin panel engine toggle |
| Radix UI Dialog | 1.x | Modal overlay implementation | Already in devDependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright (Python) | Selenium | Playwright has better async support and stealth; Selenium is older pattern |
| Pillow | opencv-python | Pillow is simpler for compress/resize/strip; OpenCV adds unnecessary complexity |
| facebook-sdk | httpx direct calls | SDK handles token refresh and error parsing; direct calls require more boilerplate |
| Taskiq scheduler | APScheduler | Taskiq is already operational; mixing schedulers adds complexity |

**Installation (missing from pyproject.toml):**
```bash
# Backend — add to pyproject.toml dependencies
uv add playwright
playwright install chromium  # Install browser binary

# facebook-sdk for Graph API adapter
uv add facebook-sdk

# Pillow is already installed but not in pyproject.toml — add it
uv add Pillow
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
apps/api/src/prosell/
├── domain/
│   ├── entities/
│   │   └── publication.py          # Publication entity + state machine (NEW)
│   ├── repositories/
│   │   └── publication_repository.py  # IPublicationRepository interface (NEW)
│   └── ports/
│       ├── i_publisher_service.py  # IPublisherService port (NEW)
│       └── i_image_pipeline.py     # IImagePipeline port (NEW)
├── application/
│   ├── dto/
│   │   └── publisher/
│   │       ├── __init__.py
│   │       └── publish.py          # PublishVehicleRequest, PublicationResponse DTOs (NEW)
│   └── use_cases/
│       └── publisher/
│           ├── __init__.py
│           ├── publish_vehicle.py       # PublishVehicleUseCase (NEW)
│           ├── update_listing.py        # UpdateListingUseCase (NEW)
│           ├── delete_listing.py        # DeleteListingUseCase (NEW)
│           └── auto_republish.py        # AutoRepublishUseCase (NEW)
└── infrastructure/
    ├── models/
    │   └── publication_model.py    # SQLAlchemy PublicationModel (NEW)
    ├── repositories/
    │   └── publication_repository_impl.py  # SqlAlchemyPublicationRepository (NEW)
    ├── services/
    │   ├── playwright_publisher.py  # PlaywrightPublisherService (NEW)
    │   ├── graph_api_publisher.py   # GraphAPIPublisherService (NEW)
    │   ├── publisher_strategy.py    # PublisherStrategySelector (NEW)
    │   └── image_pipeline.py        # ImagePipelineService (NEW)
    ├── tasks/
    │   └── use_cases/
    │       └── auto_republish_task.py  # Taskiq scheduled task (NEW)
    └── api/
        └── routers/
            └── publisher_router.py  # Publisher endpoints (NEW)

apps/web/src/
├── components/
│   └── publisher/
│       ├── PublishModal.tsx         # Modal overlay (NEW)
│       ├── PublishForm.tsx          # Form inside modal (NEW)
│       ├── HeroShotSelector.tsx     # Image grid with PORTADA badge (NEW)
│       └── PublicationStatus.tsx    # Row badge + status display (NEW)
├── lib/
│   └── api/
│       └── publisherApi.ts          # API calls for publisher (NEW)
└── stores/
    └── publisherStore.ts            # Publisher engine toggle (admin) (NEW)
```

### Pattern 1: Publication Entity State Machine (PUBLISH-07)

**What:** Pure domain entity with 5 states and guarded transitions
**When to use:** Always — Publication lifecycle must be tracked in DB for retry, scheduler, and UI

```python
# domain/entities/publication.py
from enum import StrEnum
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

class PublicationStatus(StrEnum):
    PENDING = "pending"       # Submitted, task queued
    PUBLISHING = "publishing" # Playwright/Graph API in progress
    PUBLISHED = "published"   # Live on Facebook
    FAILED = "failed"         # All retries exhausted or Category B
    EXPIRED = "expired"       # 7-day window passed, not republished
    SOLD = "sold"             # Vendedor marked as sold

class PublicationErrorCategory(StrEnum):
    A = "transient"           # Network/timeout — auto-retry
    B = "blocking"            # Captcha/ban — manual unlock
    C = "validation"          # Frontend blocks these; never stored

class Publication(DomainModel):
    id: UUID
    product_id: UUID
    tenant_id: UUID
    seller_user_id: UUID
    facebook_page_id: UUID

    status: PublicationStatus = PublicationStatus.PENDING
    strategy_used: str | None = None   # "playwright" | "graph_api"
    engine_version: str | None = None  # e.g., "playwright_v1.42"
    fb_listing_id: str | None = None   # Facebook listing ID after publish

    # Content snapshot at publish time
    title: str
    description: str
    price_cents: int
    zip_code: str
    image_urls: list[str]   # Ordered; index 0 is hero shot
    hero_shot_url: str

    # Lifecycle
    published_at: datetime | None = None
    expires_at: datetime | None = None   # published_at + 7 days
    sold_at: datetime | None = None

    # Error tracking
    error_category: PublicationErrorCategory | None = None
    error_message: str | None = None
    error_detail: str | None = None
    retry_count: int = 0
    last_retry_at: datetime | None = None
    blocked_until_confirmed: bool = False  # Category B lock

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def mark_published(self, fb_listing_id: str, strategy: str, engine_version: str) -> None:
        self.status = PublicationStatus.PUBLISHED
        self.fb_listing_id = fb_listing_id
        self.strategy_used = strategy
        self.engine_version = engine_version
        self.published_at = datetime.now(UTC)
        self.expires_at = self.published_at + timedelta(days=7)
        self.updated_at = datetime.now(UTC)

    def mark_failed(self, category: PublicationErrorCategory, message: str, detail: str = "") -> None:
        self.status = PublicationStatus.FAILED
        self.error_category = category
        self.error_message = message
        self.error_detail = detail
        if category == PublicationErrorCategory.B:
            self.blocked_until_confirmed = True
        self.updated_at = datetime.now(UTC)

    def increment_retry(self) -> None:
        self.retry_count += 1
        self.last_retry_at = datetime.now(UTC)
        self.status = PublicationStatus.PENDING
        self.updated_at = datetime.now(UTC)

    def unlock_from_category_b(self) -> None:
        """Called when vendedor confirms 'Ya validé mi cuenta de Facebook'."""
        self.blocked_until_confirmed = False
        self.error_category = None
        self.updated_at = datetime.now(UTC)

    def mark_sold(self) -> None:
        self.status = PublicationStatus.SOLD
        self.sold_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)

    def is_approaching_expiry(self, hours_before: int = 48) -> bool:
        if not self.expires_at:
            return False
        threshold = datetime.now(UTC) + timedelta(hours=hours_before)
        return self.expires_at < threshold and self.status == PublicationStatus.PUBLISHED
```

### Pattern 2: Publisher Strategy Selector (PUBLISH-03)

**What:** Strategy pattern that selects Playwright or Graph API based on feature flag
**When to use:** Every publication operation — strategy is transparent to use cases

```python
# infrastructure/services/publisher_strategy.py
from prosell.core.config import settings
from prosell.domain.ports.i_publisher_service import IPublisherService

class PublisherStrategySelector:
    """Selects publication engine based on PUBLISHER_ENGINE feature flag."""

    def __init__(
        self,
        playwright_service: IPublisherService,
        graph_api_service: IPublisherService,
    ) -> None:
        self._playwright = playwright_service
        self._graph_api = graph_api_service

    def select(self) -> tuple[IPublisherService, str]:
        """Returns (service, engine_name) based on feature flag.

        Returns:
            Tuple of (selected_service, engine_identifier_string)
        """
        engine = settings.publisher_engine  # "playwright" | "graph_api" | "auto"

        if engine == "graph_api":
            return self._graph_api, "graph_api"
        elif engine == "playwright":
            return self._playwright, "playwright"
        else:  # auto
            # Phase 1: Playwright is primary. Graph API becomes primary
            # when settings.graph_api_approved is True (post App Review).
            if getattr(settings, "graph_api_approved", False):
                return self._graph_api, "graph_api"
            return self._playwright, "playwright"
```

### Pattern 3: Playwright Anti-Detection (PUBLISH-01)

**What:** Techniques to avoid Facebook Marketplace bot detection
**When to use:** Every Playwright publication session

```python
# infrastructure/services/playwright_publisher.py
from playwright.async_api import async_playwright, BrowserContext, Page
import asyncio
import random

class PlaywrightPublisherService:
    """FB Marketplace publisher using Playwright automation."""

    FB_MARKETPLACE_URL = "https://www.facebook.com/marketplace/create/vehicle"

    async def _create_stealth_context(self, browser) -> BrowserContext:
        """Create browser context with anti-detection settings."""
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            timezone_id="America/New_York",
        )
        # Hide webdriver property
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)
        return context

    async def _human_type(self, page: Page, selector: str, text: str) -> None:
        """Type with human-like delays (50-150ms per key)."""
        await page.click(selector)
        for char in text:
            await page.keyboard.type(char)
            await asyncio.sleep(random.uniform(0.05, 0.15))
```

### Pattern 4: Image Pipeline (PUBLISH-10)

**What:** Pre-processing images before Facebook upload using Pillow
**When to use:** Before every publish or update operation — never upload raw scraper images

```python
# infrastructure/services/image_pipeline.py
from PIL import Image
from io import BytesIO
import piexif

class ImagePipelineService:
    """Processes images for Facebook Marketplace compatibility."""

    MAX_SIZE_BYTES = 1_000_000  # 1MB
    FB_MAX_WIDTH = 1080

    async def process(self, image_bytes: bytes) -> bytes:
        """Compress, resize, convert to JPG, strip EXIF."""
        img = Image.open(BytesIO(image_bytes))

        # Convert to RGB (handles RGBA, P, CMYK modes)
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Resize if wider than 1080px (maintain aspect ratio)
        if img.width > self.FB_MAX_WIDTH:
            ratio = self.FB_MAX_WIDTH / img.width
            new_height = int(img.height * ratio)
            img = img.resize((self.FB_MAX_WIDTH, new_height), Image.LANCZOS)

        # Strip EXIF data
        output = BytesIO()
        img.save(output, format="JPEG", quality=85, optimize=True)

        # If still > 1MB, reduce quality iteratively
        if output.tell() > self.MAX_SIZE_BYTES:
            for quality in [75, 65, 55]:
                output = BytesIO()
                img.save(output, format="JPEG", quality=quality, optimize=True)
                if output.tell() <= self.MAX_SIZE_BYTES:
                    break

        return output.getvalue()
```

### Pattern 5: Taskiq Exponential Backoff (PUBLISH-09 + error handling)

**What:** Retry tasks with exponential backoff for Category A errors
**When to use:** publish_vehicle_task and retry_publication_task

```python
# infrastructure/tasks/use_cases/publish_vehicle_task.py
from prosell.infrastructure.tasks.broker import broker
from datetime import timedelta

@broker.task
async def publish_vehicle_task(publication_id: str) -> dict:
    """Execute publication with auto-retry on transient failures."""
    # ... use case execution ...

@broker.task
async def retry_publication_task(publication_id: str, retry_count: int) -> dict:
    """Scheduled retry with exponential backoff.

    Retry schedule for Category A errors:
    - Retry 1: 1 minute delay
    - Retry 2: 5 minute delay
    - Retry 3: 15 minute delay (final — then mark FAILED)
    """
    delays = [60, 300, 900]  # seconds
    if retry_count < len(delays):
        delay = delays[retry_count]
        await retry_publication_task.kicker().with_labels(
            delay=timedelta(seconds=delay)
        ).kiq(publication_id=publication_id, retry_count=retry_count + 1)
```

### Pattern 6: Auto-Republish Scheduler (PUBLISH-06)

**What:** Taskiq scheduled task that detects expiring listings and re-publishes
**When to use:** Runs every 6 hours — checks all PUBLISHED listings within 48h of expiry

The scheduler logic:
1. Query all publications with `status=PUBLISHED AND expires_at < NOW() + 48h`
2. For each, create a new Publication record (new `id`, clone of content), status `PENDING`
3. Dispatch `publish_vehicle_task` with the new publication_id
4. Mark the old publication as `EXPIRED`

**Frequency recommendation:** Every 6 hours (matches token refresh scheduler frequency). With 7-day expiry and 48h warning window, a 6-hour check gives 8 opportunities to catch approaching expiry — sufficient redundancy.

### Anti-Patterns to Avoid

- **Storing plain-text FB access tokens in Publication**: always use `encryption_service.decrypt(page.page_access_token_encrypted)` at task execution time
- **Running Playwright synchronously**: always `async with async_playwright()` — blocking the event loop causes FastAPI to stall
- **Uploading images directly from scraper URLs**: always run through `ImagePipelineService` first — scraper images are often >5MB and non-standard formats
- **Sharing a single browser instance across publications**: each publication gets its own browser context to avoid state contamination (cookies, sessions)
- **Keeping Playwright browser alive across requests**: open/close per task — Playwright sessions are heavy, but leaving them open causes memory leaks in a worker process
- **Treating Category B errors as retryable without confirmation**: always check `blocked_until_confirmed` before scheduling any retry

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image EXIF stripping | Custom binary parser | `Pillow` (already installed) | EXIF format has hundreds of edge cases |
| JPEG compression quality optimization | Binary size targeting | Pillow's `quality` parameter + iterative loop | Pillow's encoder handles codec internals |
| Graph API token authentication | Manual OAuth header construction | `facebook-sdk` Python | SDK handles token rotation, API versioning, error parsing |
| Token bucket rate limiting | Custom Redis counter | Existing `rate_limit_middleware.py` pattern (extend it) | Project already has slowapi-based rate limiting |
| Exponential backoff timing | `time.sleep()` loops | Taskiq's `kicker().with_labels(delay=...)` | Taskiq handles delayed tasks natively |
| Browser context isolation | Sharing browser.new_page() | `browser.new_context()` per publication | Contexts isolate cookies/sessions; pages share them |

**Key insight:** The hardest parts (bot detection, image encoding, OAuth) have mature solutions. The custom code in this phase is glue logic and business rules — not infrastructure.

---

## Common Pitfalls

### Pitfall 1: Facebook Marketplace UI Changes Break Playwright
**What goes wrong:** Facebook routinely A/B tests their Marketplace creation UI. CSS selectors and form field order change without warning. A working Playwright script can fail at 3am when FB rolls out a UI change.
**Why it happens:** Playwright targets DOM elements — DOM is owned by Facebook, not ProSell.
**How to avoid:** Use `data-testid` or `aria-label` selectors preferentially (more stable than class selectors). Never target `class="..."` alone. Log the Playwright version (`playwright.__version__`) in every publication record (`engine_version` field). When failures spike on a specific version, correlate with FB UI changes.
**Warning signs:** All publications failing simultaneously (not one-off failures). Dashboard Admin's cross-vendor view shows 100% failure rate.

### Pitfall 2: Pillow Mode Conversion Loses Transparency / Colors
**What goes wrong:** Images from scrapers can be PNG with transparency (mode `RGBA`), palette-based (`P`), or CMYK. Converting directly to JPEG without mode conversion first produces errors or washed-out colors.
**Why it happens:** JPEG doesn't support transparency; Pillow raises an error or silently drops the alpha channel.
**How to avoid:** Always `img.convert("RGB")` before saving as JPEG. Handle the `P` mode (palette) by converting to `RGBA` first, then `RGB`.
**Warning signs:** `OSError: cannot write mode RGBA as JPEG` in logs.

### Pitfall 3: Publication State Divergence Between DB and Facebook
**What goes wrong:** Playwright submits a listing successfully, but the DB write fails (network timeout, DB connection dropped). The listing exists on FB but ProSell has no record of it.
**Why it happens:** Non-atomic operation: Playwright action + DB write are two separate I/O calls.
**How to avoid:** Two-phase commit pattern: (1) Mark publication as `PUBLISHING` before Playwright starts. (2) On Playwright success, capture `fb_listing_id` and immediately update DB to `PUBLISHED`. If DB write fails after Playwright success, the retry will attempt to re-publish, creating a duplicate on FB — detect by checking if `fb_listing_id` is already set before executing Playwright.
**Warning signs:** Listing visible on FB but status stuck at `PUBLISHING` in ProSell.

### Pitfall 4: Taskiq PubSub vs ListQueue for Delayed Tasks
**What goes wrong:** `PubSubBroker` (current project config) does NOT support delayed tasks. Calling `.with_labels(delay=...)` on a PubSubBroker silently ignores the delay and executes immediately.
**Why it happens:** Redis PubSub is fire-and-forget; it has no concept of delayed delivery. Delayed tasks require `ListQueueBroker` with Redis sorted sets.
**How to avoid:** Switch to `ListQueueBroker` for the publisher tasks that need delayed retry. The existing `PubSubBroker` can remain for non-delayed tasks (token refresh), or migrate all tasks to `ListQueueBroker`. Verify: `taskiq-redis` 1.2.2 supports `ListQueueBroker` via `from taskiq_redis import ListQueueBroker`.
**Warning signs:** Retries execute immediately regardless of configured delay.

### Pitfall 5: Modal State Lost on Catalog List Re-render
**What goes wrong:** The publish modal triggers a TanStack Query refetch (optimistic update). The catalog list re-renders and un-mounts the modal, losing the user's form state.
**Why it happens:** Modal is rendered inside the catalog row component — when the row re-renders from a query update, the modal re-mounts.
**How to avoid:** Render the modal at the catalog page level (not row level) using a portal. Pass the vehicle data to the modal via state/props. The modal's lifecycle is controlled by the page, not the row.
**Warning signs:** Modal closes unexpectedly during background status polling.

### Pitfall 6: FB Access Token Decryption in Task Context
**What goes wrong:** The `FacebookPage.page_access_token_encrypted` is decrypted in the HTTP request context (using the `IEncryptionService` from DI). In Taskiq tasks, DI is wired differently — the encryption service may not be available without explicit setup.
**Why it happens:** Taskiq tasks run in worker process, separate from the FastAPI process. The `dependencies.py` factories are FastAPI-specific.
**How to avoid:** Pass the `publication_id` to the task (not the token). The task instantiates its own service dependencies manually (or via TaskiqDepends). The existing `refresh_facebook_tokens.py` task documents this pattern with the `TODO(phase-3)` comment — implement it properly here.
**Warning signs:** `AttributeError: 'NoneType' object has no attribute 'decrypt'` in worker logs.

---

## Code Examples

### SQLAlchemy Publication Model
```python
# infrastructure/models/publication_model.py
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from prosell.infrastructure.database.base import Base

class PublicationModel(Base):
    __tablename__ = "publications"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seller_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    facebook_page_id: Mapped[UUID] = mapped_column(
        ForeignKey("facebook_pages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False, index=True)
    strategy_used: Mapped[str | None] = mapped_column(String(50), nullable=True)
    engine_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fb_listing_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    # Content snapshot
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    zip_code: Mapped[str] = mapped_column(String(20), nullable=False)
    image_urls: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    hero_shot_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Lifecycle
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True  # Scheduler queries this
    )
    sold_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Error tracking
    error_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    blocked_until_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
```

### DI Registration Pattern (from existing dependencies.py)
```python
# infrastructure/api/dependencies.py — additions
@lru_cache
def get_image_pipeline() -> ImagePipelineService:
    from prosell.infrastructure.services.image_pipeline import ImagePipelineService
    return ImagePipelineService()

def get_playwright_publisher() -> IPublisherService:
    from prosell.infrastructure.services.playwright_publisher import PlaywrightPublisherService
    return PlaywrightPublisherService()

def get_graph_api_publisher() -> IPublisherService:
    from prosell.infrastructure.services.graph_api_publisher import GraphAPIPublisherService
    encryption = get_facebook_encryption_service()
    return GraphAPIPublisherService(encryption)

def get_publisher_strategy() -> PublisherStrategySelector:
    from prosell.infrastructure.services.publisher_strategy import PublisherStrategySelector
    return PublisherStrategySelector(
        playwright_service=get_playwright_publisher(),
        graph_api_service=get_graph_api_publisher(),
    )

async def get_publish_vehicle_use_case(
    strategy: Annotated[PublisherStrategySelector, Depends(get_publisher_strategy)],
    publication_repo: Annotated[IPublicationRepository, Depends(get_publication_repository)],
    image_pipeline: Annotated[ImagePipelineService, Depends(get_image_pipeline)],
    encryption: Annotated[IEncryptionService, Depends(get_facebook_encryption_service)],
) -> PublishVehicleUseCase:
    from prosell.application.use_cases.publisher.publish_vehicle import PublishVehicleUseCase
    return PublishVehicleUseCase(strategy, publication_repo, image_pipeline, encryption)
```

### Frontend: Publish Modal Pattern (React 19 + RHF + Zod)
```typescript
// components/publisher/PublishModal.tsx — client component
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Dialog from "@radix-ui/react-alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const publishSchema = z.object({
  title: z.string().min(5).max(500),
  description: z.string().min(10).max(5000),
  price_cents: z.number().int().positive("Precio debe ser mayor a 0"),
  facebook_page_id: z.string().uuid("Seleccioná una página de Facebook"),
  hero_shot_index: z.number().int().min(0),
  zip_code: z.string().min(5).max(10),
});

type PublishFormData = z.infer<typeof publishSchema>;
```

### Settings Addition for PUBLISHER_ENGINE
```python
# core/config.py — add to Settings class
publisher_engine: Literal["playwright", "graph_api", "auto"] = Field(
    default="auto",
    description="Publisher engine: playwright | graph_api | auto",
)
graph_api_approved: bool = Field(
    default=False,
    description="Whether Facebook Graph API app review is approved",
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Selenium for web automation | Playwright async | 2021+ | Async-native, better stealth, faster |
| PIL standalone | Pillow fork | 2011 (but Pillow 10+ major cleanup) | Pillow is the maintained package; PIL is dead |
| Graph API v2.x | Graph API v21.0 (2026) | Quarterly updates | Marketplace Listing endpoints stable since v16 |
| APScheduler for task scheduling | Taskiq with Redis scheduler | Project-specific | Taskiq already operational in this project |

**Deprecated/outdated:**
- `PubSubBroker` for delayed tasks: use `ListQueueBroker` when delay is needed (see Pitfall 4)
- PIL (original): use `Pillow` import (`from PIL import Image` — same import, different package)
- Facebook Graph API v2-v15: use v19+ — older versions deprecated by FB in 2024

---

## Open Questions

1. **ListQueueBroker migration for delayed retries**
   - What we know: Current `broker.py` uses `PubSubBroker`. Delayed tasks (exponential backoff) require `ListQueueBroker`.
   - What's unclear: Does migrating to `ListQueueBroker` require changes to the existing `refresh_facebook_tokens` task? Or can both brokers coexist?
   - Recommendation: In Wave 0/Plan 1, validate that `taskiq-redis` 1.2.2's `ListQueueBroker` is the right class and update `broker.py` before any publisher tasks are written. Test in integration.

2. **Facebook Marketplace Playwright login flow**
   - What we know: FB Marketplace requires FB login. The vendedor's session/cookies must be available to Playwright.
   - What's unclear: How do we store the vendedor's FB session cookies securely for reuse across publications? Cookie persistence across Playwright contexts?
   - Recommendation: Store FB session cookies encrypted (AES-256 via existing `TokenEncryptionService`) in the `facebook_accounts` table as a new `session_cookies_encrypted` column, or re-login on every Playwright session (slower but simpler for Phase 1). This is a Phase 1 design decision that affects the `FacebookAccount` entity.

3. **Graph API Marketplace endpoint availability**
   - What we know: Graph API has `/me/marketplace_listings` endpoint for creating listings (requires App Review approval for marketplace permissions).
   - What's unclear: The exact permission set required (`marketplace_read_vehicle_listings`, `marketplace_catalog_management`) and current API version support.
   - Recommendation: Stub the `GraphAPIPublisherService` with a feature-flag check and a `NotImplementedError` in Phase 1. Defer full Graph API implementation until App Review is in process.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3.0 + pytest-asyncio 0.24.0 |
| Config file | `pyproject.toml` (`[tool.pytest.ini_options]`) |
| Quick run command | `cd apps/api && uv run pytest tests/unit/domain/test_publication_entity.py -x` |
| Full suite command | `cd apps/api && uv run pytest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUBLISH-07 | Publication state machine transitions | unit | `uv run pytest tests/unit/domain/test_publication_entity.py -x` | ❌ Wave 0 |
| PUBLISH-01 | Playwright publisher creates listing | integration (mocked) | `uv run pytest tests/unit/application/publisher/test_publish_use_cases.py -x` | ❌ Wave 0 |
| PUBLISH-03 | Strategy selector picks correct engine | unit | `uv run pytest tests/unit/infrastructure/test_publisher_strategy.py -x` | ❌ Wave 0 |
| PUBLISH-04 | Update listing use case | unit | `uv run pytest tests/unit/application/publisher/test_publish_use_cases.py::test_update_listing -x` | ❌ Wave 0 |
| PUBLISH-05 | Delete listing use case | unit | `uv run pytest tests/unit/application/publisher/test_publish_use_cases.py::test_delete_listing -x` | ❌ Wave 0 |
| PUBLISH-06 | Auto-republish detects expiring listings | unit | `uv run pytest tests/unit/application/publisher/test_auto_republish.py -x` | ❌ Wave 0 |
| PUBLISH-09 | Rate limiting does not block valid requests | unit | `uv run pytest tests/unit/infrastructure/test_rate_limiting.py -x` | ❌ Wave 0 |
| PUBLISH-10 | Image pipeline compress/resize/convert | unit | `uv run pytest tests/unit/infrastructure/test_image_pipeline.py -x` | ❌ Wave 0 |
| PUBLISH-02 | Graph API publisher (stubbed) | unit | `uv run pytest tests/unit/infrastructure/test_graph_api_publisher.py -x` | ❌ Wave 0 |

Note: Playwright end-to-end tests against real Facebook are `manual-only` — they require real FB credentials and a live FB account. Unit tests use AsyncMock for the Playwright adapter.

### Sampling Rate
- **Per task commit:** `uv run pytest tests/unit/ -x --tb=short`
- **Per wave merge:** `uv run pytest --tb=short`
- **Phase gate:** Full suite green (446+ tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/domain/test_publication_entity.py` — covers PUBLISH-07 (state machine)
- [ ] `tests/unit/application/publisher/test_publish_use_cases.py` — covers PUBLISH-01, 04, 05
- [ ] `tests/unit/application/publisher/test_auto_republish.py` — covers PUBLISH-06
- [ ] `tests/unit/infrastructure/test_publisher_strategy.py` — covers PUBLISH-03
- [ ] `tests/unit/infrastructure/test_image_pipeline.py` — covers PUBLISH-10
- [ ] `tests/unit/infrastructure/test_graph_api_publisher.py` — covers PUBLISH-02 (stub)
- [ ] Playwright dependency: `uv add playwright && playwright install chromium`
- [ ] `facebook-sdk` dependency: `uv add facebook-sdk`
- [ ] Pillow in pyproject.toml: `uv add Pillow` (already installed, not declared)
- [ ] `publisher_engine` and `graph_api_approved` fields in `core/config.py`
- [ ] `ListQueueBroker` validation: confirm delayed task support before writing retry tasks

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all existing patterns, versions, and infrastructure confirmed from source files
- Pillow 12.1.1 — confirmed installed in `.venv`, JPEG/mode conversion patterns from Pillow documentation knowledge
- SQLAlchemy 2.0 — `Mapped[]`, `mapped_column()` patterns confirmed from existing `ProductModel`, `FacebookAccountModel`
- Taskiq 0.12.1 + taskiq-redis 1.2.2 — confirmed installed; `@broker.task` decorator pattern confirmed from `refresh_facebook_tokens.py`
- Publication state machine design — derived from CONTEXT.md locked decisions + existing `ProductStatus` pattern

### Secondary (MEDIUM confidence)
- Playwright anti-detection patterns (viewport, user-agent, `webdriver` property hiding) — established community pattern, not verified against current FB detection algorithms
- Facebook Graph API Marketplace endpoint (`/me/marketplace_listings`) — based on training knowledge (Graph API v21); current permission requirements should be verified against FB developer docs before implementing PUBLISH-02
- `ListQueueBroker` for delayed tasks in taskiq-redis — based on taskiq documentation pattern; should be verified against taskiq-redis 1.2.2 changelog

### Tertiary (LOW confidence)
- FB Marketplace CSS selector stability — LOW, Facebook regularly changes DOM structure; any Playwright selectors written now may require update by ship date

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed from venv + pyproject.toml inspection
- Architecture: HIGH — patterns derived from existing codebase (ProductModel, FacebookAccount, Taskiq broker, dependencies.py DI patterns)
- Pitfalls: MEDIUM-HIGH — Playwright/FB pitfalls from established knowledge; Taskiq PubSub/ListQueue gap confirmed from taskiq-redis documentation patterns
- Playwright FB selectors: LOW — FB changes UI without notice

**Research date:** 2026-03-15
**Valid until:** 2026-04-14 (30 days) — Playwright selectors section valid for ~7 days; revalidate before implementing PUBLISH-01
