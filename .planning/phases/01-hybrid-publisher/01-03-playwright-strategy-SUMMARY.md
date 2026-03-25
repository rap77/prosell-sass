---
phase: 01-hybrid-publisher
plan: "03"
subsystem: api
tags: [playwright, taskiq, publisher, strategy-pattern, use-case, dto, facebook-marketplace]

requires:
  - phase: 01-hybrid-publisher/01-00
    provides: broker (ListQueueBroker), publisher_engine + graph_api_approved settings
  - phase: 01-hybrid-publisher/01-01
    provides: Publication entity with state machine (mark_publishing, mark_published, mark_failed)
  - phase: 01-hybrid-publisher/01-02
    provides: ImagePipelineService (compress, resize, JPG, strip EXIF)

provides:
  - PlaywrightPublisherService implementing IPublisherService (anti-detection patterns, Phase 1 stubs)
  - PublisherStrategySelector selecting playwright vs graph_api from settings.publisher_engine
  - PublishVehicleRequest + PublicationResponse DTOs (Pydantic v2)
  - PublishVehicleUseCase creating Publication in PENDING state and dispatching task
  - publish_vehicle_task: downloads images, processes via ImagePipeline, calls publisher service

affects:
  - 01-04 (expiry scheduler — depends on Publication state machine + task dispatch pattern)
  - 01-05 (republication — reuses publish_vehicle_task and PublisherStrategySelector)
  - 01-06 (FastAPI endpoints — wires PublishVehicleUseCase via DI)

tech-stack:
  added: []
  patterns:
    - "Lazy import in execute() for Clean Architecture: application layer avoids module-level infra imports"
    - "Two-phase commit in task: mark_publishing() before calling service, then mark_published() on success"
    - "publish_vehicle_task patched at infrastructure module path for testability"
    - "Image lifecycle: use case stores source URLs only; task downloads + processes in worker context"
    - "Strategy selector receives both services at construction time (dependency injection, not service locator)"

key-files:
  created:
    - apps/api/src/prosell/infrastructure/services/publisher_strategy.py
    - apps/api/src/prosell/infrastructure/services/playwright_publisher.py
    - apps/api/src/prosell/application/dto/publisher/publish.py
    - apps/api/src/prosell/application/use_cases/publisher/publish_vehicle.py
    - apps/api/src/prosell/infrastructure/tasks/use_cases/publish_vehicle_task.py
  modified:
    - apps/api/tests/unit/infrastructure/test_publisher_strategy.py
    - apps/api/tests/unit/application/publisher/test_publish_use_cases.py

key-decisions:
  - "[01-03] publish_vehicle_task uses async_session_maker (from session.py) not async_session_factory — consistent with actual session module"
  - "[01-03] PlaywrightPublisherService.publish/update/delete raise NotImplementedError in Phase 1 — live FB credentials required for real implementation"
  - "[01-03] GraphAPIPublisherService placeholder via MagicMock in task for Phase 1 — real implementation in Plan 06"
  - "[01-03] Lazy import of publish_vehicle_task inside execute() preserves Clean Architecture dependency direction"

patterns-established:
  - "Task receives only publication_id — never access tokens or image bytes in payload"
  - "Strategy selector always gets both concrete services injected; settings.select() is pure logic"
  - "Category A failures retry with exponential backoff (60s/300s/900s); Category B sets blocked_until_confirmed=True"

requirements-completed: [PUBLISH-01, PUBLISH-03]

duration: 22min
completed: 2026-03-15
---

# Phase 1 Plan 03: Playwright Strategy Summary

**PublisherStrategySelector + PlaywrightPublisherService + PublishVehicleUseCase + publish_vehicle_task — core publish flow from API call to task dispatch with image pipeline in worker context**

## Performance

- **Duration:** 22 min
- **Started:** 2026-03-15T14:16:06Z
- **Completed:** 2026-03-15T14:38:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- PublisherStrategySelector selects playwright vs graph_api from `settings.publisher_engine` (playwright/graph_api/auto modes)
- PlaywrightPublisherService implements IPublisherService with anti-detection patterns (stealth context, human-like typing, webdriver hiding)
- PublishVehicleUseCase creates Publication in PENDING state and dispatches publish_vehicle_task via lazy import
- publish_vehicle_task handles full image lifecycle: download via httpx → process via ImagePipelineService → pass bytes to service.publish()
- 5 tests GREEN (3 strategy + 2 use case); total unit suite: 415 passed, 7 xfailed

## Task Commits

Each task committed atomically:

1. **Task 03-01: PublisherStrategySelector and strategy tests** - `TBD` (feat)
2. **Task 03-02: PlaywrightPublisherService and publish DTOs** - `TBD` (feat)
3. **Task 03-03: PublishVehicleUseCase, Taskiq task, and use case tests** - `TBD` (feat)

**Plan metadata:** `TBD` (docs: complete plan)

## Files Created/Modified

- `apps/api/src/prosell/infrastructure/services/publisher_strategy.py` - Selects engine from settings.publisher_engine; supports playwright/graph_api/auto
- `apps/api/src/prosell/infrastructure/services/playwright_publisher.py` - IPublisherService impl with anti-detection; publish/update/delete raise NotImplementedError (Phase 1)
- `apps/api/src/prosell/application/dto/publisher/publish.py` - PublishVehicleRequest (min_length=1 image_urls, hero_shot_index) + PublicationResponse
- `apps/api/src/prosell/application/use_cases/publisher/publish_vehicle.py` - Creates Publication PENDING + dispatches task; no image processing
- `apps/api/src/prosell/infrastructure/tasks/use_cases/publish_vehicle_task.py` - Downloads images, processes via pipeline, selects strategy, handles Category A/B errors
- `apps/api/tests/unit/infrastructure/test_publisher_strategy.py` - 3 real tests replacing xfail stubs
- `apps/api/tests/unit/application/publisher/test_publish_use_cases.py` - 2 new tests for PublishVehicleUseCase

## Decisions Made

- `publish_vehicle_task` uses `async_session_maker` (the actual exported name in `session.py`), not `async_session_factory` referenced in plan — consistent with codebase
- `PlaywrightPublisherService.publish()` raises `NotImplementedError` in Phase 1 — real Playwright form-filling requires live FB credentials and is a manual integration task
- `GraphAPIPublisherService` does not exist yet (Plan 06). Task uses MagicMock placeholder, which is never called since `graph_api_approved=False` by default
- Lazy import of `publish_vehicle_task` inside `execute()` preserves Clean Architecture (application layer must not import infrastructure at module level). Tests patch the infrastructure module path directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed patch target for publish_vehicle_task in tests**
- **Found during:** Task 03-03 (first test run)
- **Issue:** Plan's test code patched `prosell.application.use_cases.publisher.publish_vehicle.publish_vehicle_task` — but the lazy import creates a local binding inside `execute()`, not a module-level attribute. `patch()` raised `AttributeError`.
- **Fix:** Used lazy import `from prosell.infrastructure.tasks.use_cases.publish_vehicle_task import publish_vehicle_task` inside `execute()` so Python's import cache means the patch on the infrastructure module path takes effect. Tests patch `prosell.infrastructure.tasks.use_cases.publish_vehicle_task.publish_vehicle_task`.
- **Files modified:** `publish_vehicle.py`, `test_publish_use_cases.py`
- **Verification:** Both tests pass; 415 total unit tests pass
- **Committed in:** Task 03-03 commit

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in patch target)
**Impact on plan:** Fix necessary for tests to run. No scope creep. Architecture preserved.

## Issues Encountered

- `test_publish_use_cases.py` had already been updated by a previous agent with real tests for `update_listing` and `delete_listing` (not xfail stubs as indicated by plan). These existing tests pass and were preserved.

## User Setup Required

None - no external service configuration required for Phase 1 scaffolding.

## Next Phase Readiness

- PublisherStrategySelector ready for Plan 06 wiring (add GraphAPIPublisherService when implemented)
- publish_vehicle_task ready for integration once FB session cookies are available (manual integration test)
- Plan 04 (expiry scheduler) can proceed — depends only on Publication entity (already complete)

---
*Phase: 01-hybrid-publisher*
*Completed: 2026-03-15*
