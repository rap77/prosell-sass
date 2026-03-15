---
plan: "00"
phase: 1
wave: 0
depends_on: []
autonomous: true
files_modified:
  - apps/api/pyproject.toml
  - apps/api/src/prosell/infrastructure/tasks/broker.py
  - apps/api/src/prosell/core/config.py
  - apps/api/tests/unit/domain/test_publication_entity.py
  - apps/api/tests/unit/application/publisher/test_publish_use_cases.py
  - apps/api/tests/unit/application/publisher/test_auto_republish.py
  - apps/api/tests/unit/infrastructure/test_publisher_strategy.py
  - apps/api/tests/unit/infrastructure/test_image_pipeline.py
  - apps/api/tests/unit/infrastructure/test_graph_api_publisher.py
  - apps/api/tests/unit/infrastructure/test_rate_limiting.py
requirements: [PUBLISH-01, PUBLISH-02, PUBLISH-03, PUBLISH-04, PUBLISH-05, PUBLISH-06, PUBLISH-07, PUBLISH-09, PUBLISH-10]
estimated_tasks: 3

must_haves:
  truths:
    - "All 7 stub test files exist and each file has at least one pytest test (all xfail)"
    - "playwright, Pillow, and facebook-sdk are declared in pyproject.toml"
    - "broker.py uses ListQueueBroker (not PubSubBroker) so delayed tasks work"
    - "Settings.publisher_engine and Settings.graph_api_approved fields exist in config.py"
    - "Full test suite (446+ tests) still passes after broker migration"
  artifacts:
    - path: "apps/api/tests/unit/domain/test_publication_entity.py"
      provides: "Test stubs for PUBLISH-07 (state machine)"
    - path: "apps/api/tests/unit/application/publisher/test_publish_use_cases.py"
      provides: "Test stubs for PUBLISH-01, PUBLISH-04, PUBLISH-05"
    - path: "apps/api/tests/unit/application/publisher/test_auto_republish.py"
      provides: "Test stubs for PUBLISH-06"
    - path: "apps/api/tests/unit/infrastructure/test_publisher_strategy.py"
      provides: "Test stubs for PUBLISH-03"
    - path: "apps/api/tests/unit/infrastructure/test_image_pipeline.py"
      provides: "Test stubs for PUBLISH-10"
    - path: "apps/api/tests/unit/infrastructure/test_graph_api_publisher.py"
      provides: "Test stubs for PUBLISH-02"
    - path: "apps/api/tests/unit/infrastructure/test_rate_limiting.py"
      provides: "Test stubs for PUBLISH-09"
  key_links:
    - from: "apps/api/src/prosell/infrastructure/tasks/broker.py"
      to: "ListQueueBroker"
      via: "from taskiq_redis import ListQueueBroker"
      pattern: "ListQueueBroker"
    - from: "apps/api/src/prosell/core/config.py"
      to: "publisher_engine field"
      via: "Literal['playwright', 'graph_api', 'auto']"
      pattern: "publisher_engine"
---

<objective>
Wave 0: infrastructure prerequisites and test stubs that all subsequent plans depend on.

Purpose: Without this plan, later plans cannot write tests (stubs missing), the retry system silently drops delays (PubSubBroker bug), and the feature flag config doesn't exist. This plan gates everything.
Output: 7 test stub files (all xfail), pyproject.toml with 3 new deps declared, broker migrated to ListQueueBroker, config extended with publisher settings.
</objective>

<execution_context>
@/home/rpadron/.claude/get-shit-done/workflows/execute-plan.md
@/home/rpadron/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-hybrid-publisher/01-CONTEXT.md
@.planning/phases/01-hybrid-publisher/01-VALIDATION.md
@apps/api/src/prosell/infrastructure/tasks/broker.py
@apps/api/src/prosell/core/config.py
@apps/api/pyproject.toml
</context>

<tasks>

<task id="00-01" name="Task 1: Add dependencies and migrate broker to ListQueueBroker">
  <objective>Add playwright, Pillow, facebook-sdk to pyproject.toml and migrate broker.py from PubSubBroker to ListQueueBroker so delayed retry tasks work correctly.</objective>
  <files>
    <modify>apps/api/pyproject.toml</modify>
    <modify>apps/api/src/prosell/infrastructure/tasks/broker.py</modify>
  </files>
  <implementation>
**pyproject.toml** — In the `[project]` `dependencies` array, add these three entries:
```
"playwright>=1.42.0",
"Pillow>=12.0.0",
"facebook-sdk>=3.1.0",
```
Pillow is already installed in the venv but undeclared — just add the declaration. playwright and facebook-sdk are new packages that need `uv add` after declaring.

**broker.py** — Replace `PubSubBroker` with `ListQueueBroker`. The current file imports `PubSubBroker` from `taskiq_redis`. The new file must:
1. Import `ListQueueBroker` from `taskiq_redis` instead of `PubSubBroker`
2. Use `ListQueueBroker(url=settings.redis_url)` in the else branch
3. Keep `InMemoryBroker` for testing environment unchanged
4. Keep `TaskiqDepends` import and `__all__`

Critical: `ListQueueBroker` is the only Taskiq-Redis broker that supports `.with_labels(delay=timedelta(...))` for delayed tasks. `PubSubBroker` silently ignores delays.

After editing pyproject.toml, run: `cd apps/api && uv sync && playwright install chromium`

After broker.py change, verify existing tasks still register: `cd apps/api && uv run python -c "from prosell.infrastructure.tasks.broker import broker; print(type(broker).__name__)"`
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run python -c "from prosell.infrastructure.tasks.broker import broker; print(type(broker).__name__)" 2>&1 | grep -E "ListQueueBroker|InMemoryBroker"</automated>
  </verify>
</task>

<task id="00-02" name="Task 2: Add publisher_engine settings to config.py">
  <objective>Add PUBLISHER_ENGINE feature flag fields to Settings so the strategy selector and admin toggle have a config source.</objective>
  <files>
    <modify>apps/api/src/prosell/core/config.py</modify>
  </files>
  <implementation>
Read the full `config.py` first. Locate the Settings class. Add a new section `# PUBLISHER ENGINE` after the existing sections. Add these two fields:

```python
# =============================================================================
# PUBLISHER ENGINE
# =============================================================================
publisher_engine: Literal["playwright", "graph_api", "auto"] = Field(
    default="auto",
    description="Publisher engine: playwright | graph_api | auto",
)
graph_api_approved: bool = Field(
    default=False,
    description="Whether Facebook Graph API app review is approved. "
                "When True in auto mode, Graph API becomes primary.",
)
```

The `Literal` is already imported at the top of config.py. No new imports needed.

These fields are read from environment variables `PUBLISHER_ENGINE` and `GRAPH_API_APPROVED` automatically by Pydantic BaseSettings.
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run python -c "from prosell.core.config import settings; print(settings.publisher_engine, settings.graph_api_approved)"</automated>
  </verify>
</task>

<task id="00-03" name="Task 3: Create test stub files (all xfail) for all 9 requirements">
  <objective>Create 7 test stub files covering all 9 Phase 1 requirements. Each stub has at least one xfail test that documents the expected behavior. These become GREEN when the implementation plans run.</objective>
  <files>
    <create>apps/api/tests/unit/domain/test_publication_entity.py</create>
    <create>apps/api/tests/unit/application/publisher/__init__.py</create>
    <create>apps/api/tests/unit/application/publisher/test_publish_use_cases.py</create>
    <create>apps/api/tests/unit/application/publisher/test_auto_republish.py</create>
    <create>apps/api/tests/unit/infrastructure/test_publisher_strategy.py</create>
    <create>apps/api/tests/unit/infrastructure/test_image_pipeline.py</create>
    <create>apps/api/tests/unit/infrastructure/test_graph_api_publisher.py</create>
    <create>apps/api/tests/unit/infrastructure/test_rate_limiting.py</create>
  </files>
  <implementation>
Create each file with `pytest.mark.xfail(reason="Not implemented yet — Plan 0N")` stubs. The test function bodies call `pytest.fail("stub")` so they are always xfail, never accidentally green.

**tests/unit/domain/test_publication_entity.py** (PUBLISH-07):
```python
"""Tests for Publication entity state machine — PUBLISH-07."""
import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 01")
def test_publication_initial_state_is_pending():
    """New Publication starts in PENDING status."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 01")
def test_mark_published_sets_expires_at_7_days():
    """mark_published() sets expires_at to published_at + 7 days."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 01")
def test_mark_failed_category_b_sets_blocked_flag():
    """mark_failed(BLOCKING) sets blocked_until_confirmed=True."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 01")
def test_is_approaching_expiry_within_48h():
    """is_approaching_expiry() returns True when expires_at < now + 48h."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 01")
def test_mark_sold_transitions_to_sold_status():
    """mark_sold() transitions status to SOLD."""
    pytest.fail("stub")
```

**tests/unit/application/publisher/__init__.py**: empty file.

**tests/unit/application/publisher/test_publish_use_cases.py** (PUBLISH-01, PUBLISH-04, PUBLISH-05):
```python
"""Tests for PublishVehicleUseCase, UpdateListingUseCase, DeleteListingUseCase."""
import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 03")
async def test_publish_vehicle_creates_publication_record():
    """PublishVehicleUseCase creates a Publication with status PENDING then dispatches task."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 03")
async def test_publish_vehicle_processes_images_before_dispatch():
    """ImagePipeline is called for each image before Playwright task."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 04")
async def test_update_listing_use_case():
    """UpdateListingUseCase updates price/description on existing PUBLISHED listing."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 04")
async def test_delete_listing_transitions_to_sold():
    """DeleteListingUseCase marks listing SOLD and dispatches FB delete task."""
    pytest.fail("stub")
```

**tests/unit/application/publisher/test_auto_republish.py** (PUBLISH-06):
```python
"""Tests for AutoRepublishUseCase — PUBLISH-06."""
import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 05")
async def test_auto_republish_detects_listings_within_48h():
    """AutoRepublishUseCase finds listings where expires_at < now + 48h."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 05")
async def test_auto_republish_clones_and_creates_new_publication():
    """AutoRepublishUseCase creates new Publication cloned from expiring one."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 05")
async def test_auto_republish_marks_old_publication_expired():
    """AutoRepublishUseCase marks old publication EXPIRED after cloning."""
    pytest.fail("stub")
```

**tests/unit/infrastructure/test_publisher_strategy.py** (PUBLISH-03):
```python
"""Tests for PublisherStrategySelector — PUBLISH-03."""
import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 03")
def test_strategy_selector_returns_playwright_when_flag_is_playwright():
    """PUBLISHER_ENGINE=playwright always returns PlaywrightPublisherService."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 03")
def test_strategy_selector_auto_returns_playwright_when_graph_api_not_approved():
    """PUBLISHER_ENGINE=auto + graph_api_approved=False → playwright."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 03")
def test_strategy_selector_auto_returns_graph_api_when_approved():
    """PUBLISHER_ENGINE=auto + graph_api_approved=True → graph_api."""
    pytest.fail("stub")
```

**tests/unit/infrastructure/test_image_pipeline.py** (PUBLISH-10):
```python
"""Tests for ImagePipelineService — PUBLISH-10."""
import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 02")
async def test_image_pipeline_converts_rgba_to_rgb():
    """PNG with alpha channel is converted to RGB JPEG."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02")
async def test_image_pipeline_resizes_wide_images():
    """Images wider than 1080px are resized maintaining aspect ratio."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02")
async def test_image_pipeline_output_under_1mb():
    """Processed output is always under 1MB."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02")
async def test_image_pipeline_strips_exif():
    """EXIF data is stripped from output JPEG."""
    pytest.fail("stub")
```

**tests/unit/infrastructure/test_graph_api_publisher.py** (PUBLISH-02):
```python
"""Tests for GraphAPIPublisherService stub — PUBLISH-02."""
import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 06")
async def test_graph_api_publisher_raises_not_implemented():
    """GraphAPIPublisherService.publish() raises NotImplementedError in Phase 1."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 06")
def test_graph_api_publisher_implements_i_publisher_service():
    """GraphAPIPublisherService implements IPublisherService interface."""
    pytest.fail("stub")
```

**tests/unit/infrastructure/test_rate_limiting.py** (PUBLISH-09):
```python
"""Tests for publisher rate limiting — PUBLISH-09."""
import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 06")
async def test_rate_limiter_allows_first_request():
    """Token bucket allows the first publication request through."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 06")
async def test_rate_limiter_blocks_after_quota_exceeded():
    """Token bucket blocks requests when quota is exceeded."""
    pytest.fail("stub")
```

All files must use pytest idioms consistent with the project's `pyproject.toml` config (`asyncio_mode=auto`). No imports from domain/infra modules — these are pure stubs that import only `pytest`.
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run pytest tests/unit/domain/test_publication_entity.py tests/unit/application/publisher/ tests/unit/infrastructure/test_publisher_strategy.py tests/unit/infrastructure/test_image_pipeline.py tests/unit/infrastructure/test_graph_api_publisher.py tests/unit/infrastructure/test_rate_limiting.py -v --tb=short 2>&1 | tail -20</automated>
  </verify>
</task>

</tasks>

<verification>
After all tasks complete:

1. `cd apps/api && uv run python -c "from prosell.infrastructure.tasks.broker import broker; print(type(broker).__name__)"` outputs `ListQueueBroker` (or `InMemoryBroker` in test env)
2. `cd apps/api && uv run python -c "from prosell.core.config import settings; print(settings.publisher_engine)"` outputs `auto`
3. `cd apps/api && uv run pytest tests/unit/ -x --tb=short` — all 446+ existing tests pass, 7 new test files show xfail (not error)
4. `cd apps/api && uv run python -c "import playwright; print('ok')"` — no ImportError
</verification>

<success_criteria>
- [ ] `broker.py` imports `ListQueueBroker` (not `PubSubBroker`)
- [ ] `config.py` has `publisher_engine: Literal["playwright", "graph_api", "auto"]` field
- [ ] `config.py` has `graph_api_approved: bool` field
- [ ] `pyproject.toml` declares `playwright>=1.42.0`, `Pillow>=12.0.0`, `facebook-sdk>=3.1.0`
- [ ] 7 test files exist under `tests/unit/domain/` and `tests/unit/application/publisher/` and `tests/unit/infrastructure/`
- [ ] All existing 446+ tests still pass
- [ ] New stub tests show as xfail (not error/failed)
</success_criteria>

<output>
After completion, create `.planning/phases/01-hybrid-publisher/01-00-SUMMARY.md`
</output>
