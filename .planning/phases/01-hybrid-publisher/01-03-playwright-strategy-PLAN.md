---
plan: "03"
phase: 1
wave: 2
depends_on: ["01", "02"]
autonomous: true
files_modified:
  - apps/api/src/prosell/infrastructure/services/playwright_publisher.py
  - apps/api/src/prosell/infrastructure/services/publisher_strategy.py
  - apps/api/src/prosell/application/use_cases/publisher/__init__.py
  - apps/api/src/prosell/application/use_cases/publisher/publish_vehicle.py
  - apps/api/src/prosell/application/dto/publisher/__init__.py
  - apps/api/src/prosell/application/dto/publisher/publish.py
  - apps/api/src/prosell/infrastructure/tasks/use_cases/publish_vehicle_task.py
  - apps/api/tests/unit/application/publisher/test_publish_use_cases.py
  - apps/api/tests/unit/infrastructure/test_publisher_strategy.py
requirements: [PUBLISH-01, PUBLISH-03]
estimated_tasks: 3

must_haves:
  truths:
    - "PublisherStrategySelector returns PlaywrightPublisherService when PUBLISHER_ENGINE=playwright"
    - "PublisherStrategySelector returns PlaywrightPublisherService when PUBLISHER_ENGINE=auto and graph_api_approved=False"
    - "PublishVehicleUseCase creates a Publication record with status PENDING, validates image URLs, then dispatches publish_vehicle_task"
    - "publish_vehicle_task marks publication PUBLISHING before calling the publisher service"
    - "publish_vehicle_task downloads and processes images itself (ImagePipeline runs in task context, not in use case)"
    - "Strategy tests (3 tests) are GREEN"
    - "Publish use case tests (2 tests) are GREEN"
  artifacts:
    - path: "apps/api/src/prosell/infrastructure/services/playwright_publisher.py"
      provides: "PlaywrightPublisherService — Playwright automation with anti-detection"
      exports: ["PlaywrightPublisherService"]
    - path: "apps/api/src/prosell/infrastructure/services/publisher_strategy.py"
      provides: "PublisherStrategySelector — selects engine from settings.publisher_engine"
      exports: ["PublisherStrategySelector"]
    - path: "apps/api/src/prosell/application/use_cases/publisher/publish_vehicle.py"
      provides: "PublishVehicleUseCase — creates Publication + dispatches task"
      exports: ["PublishVehicleUseCase"]
    - path: "apps/api/src/prosell/infrastructure/tasks/use_cases/publish_vehicle_task.py"
      provides: "Taskiq task that downloads+processes images and runs the actual Playwright session"
      exports: ["publish_vehicle_task"]
  key_links:
    - from: "apps/api/src/prosell/application/use_cases/publisher/publish_vehicle.py"
      to: "apps/api/src/prosell/infrastructure/tasks/use_cases/publish_vehicle_task.py"
      via: "await publish_vehicle_task.kiq(publication_id=str(publication.id))"
      pattern: "publish_vehicle_task\\.kiq"
    - from: "apps/api/src/prosell/infrastructure/tasks/use_cases/publish_vehicle_task.py"
      to: "apps/api/src/prosell/infrastructure/services/publisher_strategy.py"
      via: "strategy_selector.select() inside task"
      pattern: "strategy_selector\\.select"
    - from: "apps/api/src/prosell/infrastructure/tasks/use_cases/publish_vehicle_task.py"
      to: "apps/api/src/prosell/infrastructure/services/image_pipeline.py"
      via: "ImagePipelineService().process() called per URL in publication.image_urls"
      pattern: "image_pipeline\\.process|ImagePipelineService"
---

<objective>
Build the Playwright publisher service, strategy selector, and PublishVehicleUseCase — the core publish flow from API call to browser automation.

Purpose: This is the P0 feature of the entire phase. When a vendedor clicks "Publicar", this chain executes: use case creates Publication record → dispatches Taskiq task → task downloads+processes images → task runs Playwright → listing goes live on Facebook.
Output: PlaywrightPublisherService with anti-detection, PublisherStrategySelector, PublishVehicleUseCase, publish_vehicle_task, DTOs, and passing unit tests.
</objective>

<execution_context>
@/home/rpadron/.claude/get-shit-done/workflows/execute-plan.md
@/home/rpadron/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-hybrid-publisher/01-RESEARCH.md
@apps/api/src/prosell/domain/entities/publication.py
@apps/api/src/prosell/domain/repositories/publication_repository.py
@apps/api/src/prosell/domain/ports/i_publisher_service.py
@apps/api/src/prosell/domain/ports/i_image_pipeline.py
@apps/api/src/prosell/infrastructure/tasks/broker.py
@apps/api/src/prosell/infrastructure/tasks/use_cases/refresh_facebook_tokens.py
@apps/api/src/prosell/application/use_cases/facebook/oauth_callback.py
@apps/api/tests/unit/application/publisher/test_publish_use_cases.py
@apps/api/tests/unit/infrastructure/test_publisher_strategy.py

<interfaces>
From apps/api/src/prosell/domain/ports/i_publisher_service.py:
```python
class IPublisherService(ABC):
    @abstractmethod
    async def publish(self, publication: Publication, access_token: str, image_bytes_list: list[bytes]) -> str:
        """Returns fb_listing_id."""
    @abstractmethod
    async def update(self, publication: Publication, access_token: str, image_bytes_list: list[bytes]) -> None: ...
    @abstractmethod
    async def delete(self, publication: Publication, access_token: str) -> None: ...
```

From apps/api/src/prosell/domain/entities/publication.py:
```python
class Publication(DomainModel):
    id: UUID
    product_id: UUID
    tenant_id: UUID
    seller_user_id: UUID
    facebook_page_id: UUID
    status: PublicationStatus = PublicationStatus.PENDING
    fb_listing_id: str | None = None
    title: str
    description: str | None = None
    price_cents: int
    zip_code: str
    image_urls: list[str]
    # Methods: mark_published, mark_failed, mark_publishing, increment_retry, etc.
```

From apps/api/src/prosell/infrastructure/tasks/broker.py:
```python
from taskiq_redis import ListQueueBroker
broker = ListQueueBroker(url=settings.redis_url)  # supports .with_labels(delay=timedelta(...))
```

Image lifecycle note:
- `publication.image_urls` stores the SOURCE URLs (scraper URLs or manually uploaded URLs)
- The use case ONLY validates these URLs are reachable (no byte processing at use case time)
- The Taskiq task downloads each URL, processes bytes through ImagePipeline (compress, resize, JPG, strip EXIF), and passes the processed bytes directly to `service.publish()`
- This keeps the task self-contained (no bytes serialized into Taskiq payload, no DO Spaces dependency in Phase 1)
</interfaces>
</context>

<tasks>

<task id="03-01" name="Task 1: PublisherStrategySelector and strategy tests">
  <objective>Implement PublisherStrategySelector and make the 3 strategy unit tests GREEN.</objective>
  <files>
    <create>apps/api/src/prosell/infrastructure/services/publisher_strategy.py</create>
    <modify>apps/api/tests/unit/infrastructure/test_publisher_strategy.py</modify>
  </files>
  <implementation>
First, update `test_publisher_strategy.py` — replace xfail stubs with real tests using `unittest.mock`:

```python
"""Tests for PublisherStrategySelector — PUBLISH-03."""
import pytest
from unittest.mock import MagicMock
from prosell.infrastructure.services.publisher_strategy import PublisherStrategySelector
from prosell.domain.ports.i_publisher_service import IPublisherService


def test_strategy_selector_returns_playwright_when_flag_is_playwright():
    playwright_svc = MagicMock(spec=IPublisherService)
    graph_api_svc = MagicMock(spec=IPublisherService)
    selector = PublisherStrategySelector(playwright_svc, graph_api_svc)

    with patch("prosell.infrastructure.services.publisher_strategy.settings") as s:
        s.publisher_engine = "playwright"
        s.graph_api_approved = False
        service, name = selector.select()

    assert service is playwright_svc
    assert name == "playwright"
```

Write similar tests for `auto + approved=False → playwright` and `auto + approved=True → graph_api`.

Then implement `publisher_strategy.py` following Pattern 2 from RESEARCH.md exactly:

```python
from prosell.core.config import settings
from prosell.domain.ports.i_publisher_service import IPublisherService

class PublisherStrategySelector:
    def __init__(self, playwright_service: IPublisherService, graph_api_service: IPublisherService) -> None:
        self._playwright = playwright_service
        self._graph_api = graph_api_service

    def select(self) -> tuple[IPublisherService, str]:
        engine = settings.publisher_engine
        if engine == "graph_api":
            return self._graph_api, "graph_api"
        elif engine == "playwright":
            return self._playwright, "playwright"
        else:  # auto
            if getattr(settings, "graph_api_approved", False):
                return self._graph_api, "graph_api"
            return self._playwright, "playwright"
```
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run pytest tests/unit/infrastructure/test_publisher_strategy.py -v --tb=short</automated>
  </verify>
</task>

<task id="03-02" name="Task 2: PlaywrightPublisherService and publish DTOs">
  <objective>Implement PlaywrightPublisherService with anti-detection patterns and create the publish/update/delete DTOs.</objective>
  <files>
    <create>apps/api/src/prosell/infrastructure/services/playwright_publisher.py</create>
    <create>apps/api/src/prosell/application/dto/publisher/__init__.py</create>
    <create>apps/api/src/prosell/application/dto/publisher/publish.py</create>
  </files>
  <implementation>
**playwright_publisher.py** — Follow Pattern 3 from RESEARCH.md. Critical anti-detection patterns:

```python
"""Playwright-based Facebook Marketplace publisher."""
from __future__ import annotations
import asyncio
import random
from playwright.async_api import async_playwright, BrowserContext, Page
from prosell.domain.entities.publication import Publication, PublicationErrorCategory
from prosell.domain.ports.i_publisher_service import IPublisherService


class PlaywrightPublisherService(IPublisherService):
    """Facebook Marketplace publisher using Playwright browser automation.

    Anti-detection techniques:
    - Standard viewport (1280x900) to match real desktop browser
    - Human-like typing (50-150ms per character random delay)
    - navigator.webdriver property hidden via init script
    - US locale and timezone to match expected FB user
    - Each publication gets its own browser context (no cookie contamination)
    """

    FB_MARKETPLACE_VEHICLE_URL = "https://www.facebook.com/marketplace/create/vehicle"
    FB_LOGIN_URL = "https://www.facebook.com/login"

    async def _create_stealth_context(self, browser) -> BrowserContext:
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
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        )
        return context

    async def _human_type(self, page: Page, selector: str, text: str) -> None:
        """Type with human-like delays (50-150ms per keystroke)."""
        await page.click(selector)
        for char in text:
            await page.keyboard.type(char)
            await asyncio.sleep(random.uniform(0.05, 0.15))

    async def _load_cookies(self, context: BrowserContext, cookies_json: str) -> None:
        """Load session cookies to avoid re-login."""
        import json
        cookies = json.loads(cookies_json)
        await context.add_cookies(cookies)

    async def publish(
        self,
        publication: Publication,
        access_token: str,  # Used for cookie auth in Phase 1
        image_bytes_list: list[bytes],
    ) -> str:
        """Publish vehicle listing to Facebook Marketplace.

        Phase 1: Uses session cookies for authentication (re-login each session).
        Returns: fb_listing_id (the URL fragment or numeric ID of the listing)

        Raises:
            PlaywrightPublisherError with error_category on failure.
        """
        # Phase 1 implementation: navigate to FB Marketplace vehicle form,
        # fill fields with human-like typing, upload images, submit.
        # Returns the fb_listing_id extracted from the redirect URL.
        raise NotImplementedError(
            "PlaywrightPublisherService.publish() — Phase 1 implementation pending. "
            "Requires real FB session cookies. Use integration test or manual test."
        )

    async def update(self, publication: Publication, access_token: str, image_bytes_list: list[bytes]) -> None:
        raise NotImplementedError("PlaywrightPublisherService.update() — Phase 1 pending.")

    async def delete(self, publication: Publication, access_token: str) -> None:
        raise NotImplementedError("PlaywrightPublisherService.delete() — Phase 1 pending.")
```

Note: `publish()`, `update()`, `delete()` raise `NotImplementedError` in Phase 1. The Playwright interaction with real FB requires live credentials and real browser testing. Unit tests mock this service. The actual Playwright form-filling implementation is a manual integration task (listed in VALIDATION.md as manual-only).

**dto/publisher/__init__.py**: empty file.

**dto/publisher/publish.py**:
```python
"""DTOs for the publisher flow."""
from uuid import UUID
from pydantic import BaseModel, Field


class PublishVehicleRequest(BaseModel):
    product_id: UUID
    tenant_id: UUID
    facebook_page_id: UUID
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    price_cents: int = Field(..., gt=0)
    zip_code: str = Field(..., min_length=5, max_length=10)
    image_urls: list[str] = Field(..., min_length=1)  # At least one image
    hero_shot_index: int = Field(default=0, ge=0)


class PublicationResponse(BaseModel):
    id: UUID
    product_id: UUID
    status: str
    strategy_used: str | None = None
    fb_listing_id: str | None = None
    error_message: str | None = None
    error_category: str | None = None
    blocked_until_confirmed: bool = False
```
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run python -c "from prosell.infrastructure.services.playwright_publisher import PlaywrightPublisherService; from prosell.infrastructure.services.publisher_strategy import PublisherStrategySelector; print('imports ok')"</automated>
  </verify>
</task>

<task id="03-03" name="Task 3: PublishVehicleUseCase, Taskiq task, and use case tests">
  <objective>Implement PublishVehicleUseCase (creates Publication + dispatches task) and publish_vehicle_task (downloads+processes images, then runs the publisher service). Make 2 publish use case tests GREEN.</objective>
  <files>
    <create>apps/api/src/prosell/application/use_cases/publisher/__init__.py</create>
    <create>apps/api/src/prosell/application/use_cases/publisher/publish_vehicle.py</create>
    <create>apps/api/src/prosell/infrastructure/tasks/use_cases/publish_vehicle_task.py</create>
    <modify>apps/api/tests/unit/application/publisher/test_publish_use_cases.py</modify>
  </files>
  <implementation>
**Image lifecycle design decision** (documented here so executor doesn't repeat the bytes-discard bug):

The use case does NOT process images — it only validates they exist and stores source URLs. The Taskiq task downloads and processes images in its own execution context:

```
API call → PublishVehicleUseCase.execute()
              └─ validates image_urls are present (Pydantic min_length=1)
              └─ creates Publication(image_urls=ordered_source_urls)  ← stores SOURCE URLs
              └─ await publish_vehicle_task.kiq(publication_id=...)
                      └─ task runs (worker context):
                            └─ loads publication from DB (gets source image_urls)
                            └─ downloads each URL with httpx
                            └─ processes each with ImagePipelineService (compress, resize, JPG, strip EXIF)
                            └─ passes processed bytes list to service.publish(publication, token, image_bytes_list)
```

This design:
- Keeps the use case fast (no image downloads in request/response cycle)
- Keeps the task self-contained (no external storage dependency in Phase 1)
- Avoids serializing image bytes into Taskiq payload (too large, not supported)
- Matches the `IPublisherService.publish(image_bytes_list)` contract correctly

First update `test_publish_use_cases.py` with real tests (replace xfail stubs):

```python
"""Tests for PublishVehicleUseCase — PUBLISH-01."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from prosell.application.use_cases.publisher.publish_vehicle import PublishVehicleUseCase
from prosell.application.dto.publisher.publish import PublishVehicleRequest
from prosell.domain.entities.publication import Publication, PublicationStatus


@pytest.fixture
def mock_publication_repo():
    repo = AsyncMock()
    repo.create.return_value = Publication(
        id=uuid4(),
        product_id=uuid4(),
        tenant_id=uuid4(),
        seller_user_id=uuid4(),
        facebook_page_id=uuid4(),
        title="2020 Toyota Camry",
        price_cents=2500000,
        zip_code="90210",
        image_urls=["https://example.com/img1.jpg"],
    )
    return repo


async def test_publish_vehicle_creates_publication_record(mock_publication_repo):
    """PublishVehicleUseCase creates Publication in PENDING state before dispatching task."""
    with patch("prosell.application.use_cases.publisher.publish_vehicle.publish_vehicle_task") as mock_task:
        mock_task.kiq = AsyncMock()
        use_case = PublishVehicleUseCase(
            publication_repo=mock_publication_repo,
            seller_user_id=uuid4(),
        )
        request = PublishVehicleRequest(
            product_id=uuid4(),
            tenant_id=uuid4(),
            facebook_page_id=uuid4(),
            title="2020 Toyota Camry",
            price_cents=2500000,
            zip_code="90210",
            image_urls=["https://example.com/img1.jpg"],
        )
        result = await use_case.execute(request)

    mock_publication_repo.create.assert_called_once()
    mock_task.kiq.assert_called_once()
    assert result.status == "pending"


async def test_publish_vehicle_dispatches_task_with_publication_id(mock_publication_repo):
    """publish_vehicle_task.kiq() is called with the correct publication_id after create."""
    created_pub = mock_publication_repo.create.return_value
    with patch("prosell.application.use_cases.publisher.publish_vehicle.publish_vehicle_task") as mock_task:
        mock_task.kiq = AsyncMock()
        use_case = PublishVehicleUseCase(
            publication_repo=mock_publication_repo,
            seller_user_id=uuid4(),
        )
        request = PublishVehicleRequest(
            product_id=uuid4(),
            tenant_id=uuid4(),
            facebook_page_id=uuid4(),
            title="Test",
            price_cents=10000,
            zip_code="90210",
            image_urls=["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
        )
        await use_case.execute(request)

    mock_task.kiq.assert_called_once_with(publication_id=str(created_pub.id))
```

Then implement `publish_vehicle.py` (no image processing — use case is intentionally thin):

```python
"""PublishVehicleUseCase — creates Publication and dispatches Taskiq task."""
from uuid import UUID
from prosell.domain.entities.publication import Publication
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.application.dto.publisher.publish import PublishVehicleRequest, PublicationResponse


class PublishVehicleUseCase:
    def __init__(
        self,
        publication_repo: IPublicationRepository,
        seller_user_id: UUID,
    ) -> None:
        self._repo = publication_repo
        self._seller_user_id = seller_user_id

    async def execute(self, request: PublishVehicleRequest) -> PublicationResponse:
        # 1. Reorder image_urls so hero shot is at index 0
        ordered_urls = list(request.image_urls)
        if request.hero_shot_index > 0 and request.hero_shot_index < len(ordered_urls):
            hero = ordered_urls.pop(request.hero_shot_index)
            ordered_urls.insert(0, hero)

        # 2. Create Publication record in PENDING state (stores SOURCE URLs — not processed bytes)
        #    The Taskiq task handles image downloading + processing in its own context.
        publication = Publication(
            product_id=request.product_id,
            tenant_id=request.tenant_id,
            seller_user_id=self._seller_user_id,
            facebook_page_id=request.facebook_page_id,
            title=request.title,
            description=request.description,
            price_cents=request.price_cents,
            zip_code=request.zip_code,
            image_urls=ordered_urls,
            hero_shot_url=ordered_urls[0] if ordered_urls else None,
        )
        publication = await self._repo.create(publication)

        # 3. Dispatch Taskiq task with publication_id only (never pass tokens or bytes)
        from prosell.infrastructure.tasks.use_cases.publish_vehicle_task import publish_vehicle_task
        await publish_vehicle_task.kiq(publication_id=str(publication.id))

        return PublicationResponse(
            id=publication.id,
            product_id=publication.product_id,
            status=publication.status.value,
        )
```

Then implement `publish_vehicle_task.py` (downloads and processes images before calling the publisher):

```python
"""Taskiq task for publishing vehicle listings via Playwright."""
from prosell.infrastructure.tasks.broker import broker


@broker.task
async def publish_vehicle_task(publication_id: str) -> dict:
    """Execute publication via selected publisher strategy.

    Image lifecycle:
    1. Load publication from DB (contains source image_urls stored by use case)
    2. Download each URL with httpx
    3. Process each with ImagePipelineService (compress < 1MB, resize 1080px, JPG, strip EXIF)
    4. Pass processed bytes list to service.publish(publication, access_token, image_bytes_list)

    This ensures images are always freshly processed at task execution time.
    No intermediate storage (DO Spaces) required in Phase 1.
    """
    from uuid import UUID
    from prosell.infrastructure.database.session import async_session_factory
    from prosell.infrastructure.repositories.publication_repository_impl import SqlAlchemyPublicationRepository
    from prosell.infrastructure.repositories.facebook_page_repository_impl import SqlAlchemyFacebookPageRepository
    from prosell.infrastructure.services.token_encryption_service import TokenEncryptionService
    from prosell.infrastructure.services.playwright_publisher import PlaywrightPublisherService
    from prosell.infrastructure.services.graph_api_publisher import GraphAPIPublisherService
    from prosell.infrastructure.services.publisher_strategy import PublisherStrategySelector
    from prosell.infrastructure.services.image_pipeline import ImagePipelineService
    from prosell.domain.entities.publication import PublicationStatus, PublicationErrorCategory
    import httpx

    pub_id = UUID(publication_id)

    async with async_session_factory() as session:
        pub_repo = SqlAlchemyPublicationRepository(session)
        page_repo = SqlAlchemyFacebookPageRepository(session)
        encryption = TokenEncryptionService()

        publication = await pub_repo.get_by_id(pub_id)
        if not publication:
            return {"error": f"Publication {publication_id} not found"}

        # Check Category B lock — never retry if blocked
        if publication.blocked_until_confirmed:
            return {"status": "blocked", "publication_id": publication_id}

        # Mark PUBLISHING (two-phase commit pattern from RESEARCH.md)
        publication.mark_publishing()
        await pub_repo.update(publication)

        try:
            # Get page access token (decrypted in task context)
            page = await page_repo.get_by_id(publication.facebook_page_id)
            if not page:
                raise ValueError(f"FacebookPage {publication.facebook_page_id} not found")
            access_token = encryption.decrypt(page.page_access_token_encrypted)

            # Download and process images (source URLs are stored in publication.image_urls)
            image_pipeline = ImagePipelineService()
            image_bytes_list: list[bytes] = []
            async with httpx.AsyncClient(timeout=30.0) as client:
                for url in publication.image_urls:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    processed = await image_pipeline.process(resp.content)
                    image_bytes_list.append(processed)

            # Select strategy
            playwright_svc = PlaywrightPublisherService()
            graph_api_svc = GraphAPIPublisherService(encryption)
            selector = PublisherStrategySelector(playwright_svc, graph_api_svc)
            service, engine_name = selector.select()

            # Execute publish with processed image bytes
            import playwright as pw_module
            engine_version = f"{engine_name}_v{pw_module.__version__}" if engine_name == "playwright" else engine_name
            fb_listing_id = await service.publish(publication, access_token, image_bytes_list)

            # Mark PUBLISHED
            publication.mark_published(fb_listing_id, engine_name, engine_version)
            await pub_repo.update(publication)
            return {"status": "published", "fb_listing_id": fb_listing_id}

        except Exception as exc:
            # Classify error
            err_str = str(exc).lower()
            if "captcha" in err_str or "checkpoint" in err_str or "ban" in err_str:
                publication.mark_failed(PublicationErrorCategory.B, str(exc))
                await pub_repo.update(publication)
                return {"status": "failed", "category": "B", "error": str(exc)}
            else:
                # Category A — schedule retry with exponential backoff
                publication.increment_retry()
                await pub_repo.update(publication)

                if publication.retry_count < 3:
                    from datetime import timedelta
                    delays = [60, 300, 900]
                    delay = delays[publication.retry_count - 1]
                    await publish_vehicle_task.kicker().with_labels(
                        delay=timedelta(seconds=delay)
                    ).kiq(publication_id=publication_id)
                    return {"status": "retry_scheduled", "retry_count": publication.retry_count}
                else:
                    publication.mark_failed(PublicationErrorCategory.A, str(exc), "Max retries exceeded")
                    await pub_repo.update(publication)
                    return {"status": "failed", "category": "A", "error": str(exc)}
```

Note: `async_session_factory` must exist in `infrastructure/database/session.py`. Check the existing session module to confirm the name — adapt if different.

Note on `PublishVehicleUseCase` changes: the use case no longer takes `image_pipeline` as a constructor argument (image processing moved to the task). Update `get_publish_vehicle_use_case` in `dependencies.py` (Plan 06) accordingly — remove the `image_pipeline` dependency injection there.
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run pytest tests/unit/application/publisher/test_publish_use_cases.py tests/unit/infrastructure/test_publisher_strategy.py -v --tb=short</automated>
  </verify>
</task>

</tasks>

<verification>
After all tasks complete:

1. `uv run pytest tests/unit/application/publisher/test_publish_use_cases.py -v` — 2 tests GREEN
2. `uv run pytest tests/unit/infrastructure/test_publisher_strategy.py -v` — 3 tests GREEN
3. `uv run pytest tests/unit/ -x --tb=short` — all unit tests pass
</verification>

<success_criteria>
- [ ] PublisherStrategySelector.select() returns correct service based on settings.publisher_engine
- [ ] PublishVehicleUseCase creates Publication in PENDING state and dispatches publish_vehicle_task (no image processing in use case)
- [ ] publish_vehicle_task downloads source URLs, processes with ImagePipelineService, passes bytes to service.publish()
- [ ] publish_vehicle_task marks PUBLISHING before calling service, handles Category A/B errors differently
- [ ] PlaywrightPublisherService exists, implements IPublisherService, anti-detection patterns present
- [ ] DTOs PublishVehicleRequest and PublicationResponse defined with Pydantic
- [ ] 5 unit tests GREEN (2 use case + 3 strategy)
</success_criteria>

<output>
After completion, create `.planning/phases/01-hybrid-publisher/01-03-SUMMARY.md`
</output>
