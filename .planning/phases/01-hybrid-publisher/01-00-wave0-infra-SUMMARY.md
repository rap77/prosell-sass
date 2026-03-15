---
phase: 01-hybrid-publisher
plan: "00"
subsystem: infra
tags: [taskiq, redis, pillow, playwright, facebook-sdk, pytest, xfail]

# Dependency graph
requires: []
provides:
  - ListQueueBroker replacing PubSubBroker (delayed task support for exponential backoff)
  - publisher_engine and graph_api_approved feature flags in Settings
  - 7 xfail test stub files covering all 9 Phase 1 requirements (PUBLISH-01 through PUBLISH-10)
affects:
  - 01-01-publication-entity
  - 01-02-image-pipeline
  - 01-03-playwright-strategy
  - 01-04-update-delete
  - 01-05-auto-republish
  - 01-06-graph-api-router

# Tech tracking
tech-stack:
  added:
    - playwright>=1.42.0 (declared in pyproject.toml)
    - Pillow>=12.0.0 (declared in pyproject.toml)
    - facebook-sdk>=3.1.0 (declared in pyproject.toml)
    - ListQueueBroker (taskiq_redis) — replaces PubSubBroker
  patterns:
    - xfail stub pattern for TDD gating across plans
    - Feature flag via Pydantic BaseSettings (Literal enum + bool)

key-files:
  created:
    - apps/api/tests/unit/application/publisher/__init__.py
    - apps/api/tests/unit/application/publisher/test_publish_use_cases.py
    - apps/api/tests/unit/application/publisher/test_auto_republish.py
    - apps/api/tests/unit/infrastructure/test_publisher_strategy.py
    - apps/api/tests/unit/infrastructure/test_graph_api_publisher.py
    - apps/api/tests/unit/infrastructure/test_rate_limiting.py
  modified:
    - apps/api/pyproject.toml (playwright, Pillow, facebook-sdk declared)
    - apps/api/src/prosell/infrastructure/tasks/broker.py (PubSubBroker → ListQueueBroker)
    - apps/api/src/prosell/core/config.py (publisher_engine + graph_api_approved fields)
    - apps/api/tests/unit/domain/test_publication_entity.py (xfail stubs)
    - apps/api/tests/unit/infrastructure/test_image_pipeline.py (xfail stubs)

key-decisions:
  - "ListQueueBroker replaces PubSubBroker — only List-based broker supports .with_labels(delay=timedelta(...)); PubSubBroker silently ignores delays"
  - "publisher_engine defaults to 'auto'; graph_api_approved defaults to False — Playwright is primary until FB App Review clears"
  - "All 9 Phase 1 requirements stubbed as xfail in wave0 — stubs become GREEN as implementation plans execute"
  - "Test stubs import only pytest (zero domain deps) — keeps stubs valid even before implementation exists"

patterns-established:
  - "xfail stub pattern: @pytest.mark.xfail(reason='Not implemented yet — Plan XX') + pytest.fail('stub') body"
  - "Feature flags via Pydantic Literal fields in Settings — auto-read from env vars PUBLISHER_ENGINE / GRAPH_API_APPROVED"

requirements-completed: [PUBLISH-01, PUBLISH-02, PUBLISH-03, PUBLISH-04, PUBLISH-05, PUBLISH-06, PUBLISH-07, PUBLISH-09, PUBLISH-10]

# Metrics
duration: 45min
completed: 2026-03-15
---

# Phase 1 Plan 00: Wave 0 Infrastructure Summary

**ListQueueBroker migration + publisher feature flags + 7 xfail test stub files gating all 9 Phase 1 requirements**

## Performance

- **Duration:** ~45 min (split across two sessions)
- **Started:** 2026-03-15T13:00:00Z
- **Completed:** 2026-03-15T14:30:00Z
- **Tasks:** 3 (broker migration, config extension, stub files)
- **Files modified:** 9

## Accomplishments

- Migrated `broker.py` from `PubSubBroker` to `ListQueueBroker` — fixes silent delay drops in exponential backoff retry chains
- Extended `Settings` with `publisher_engine: Literal["playwright", "graph_api", "auto"]` and `graph_api_approved: bool` feature flags
- Created 7 test stub files (14 xfail tests total) covering all 9 Phase 1 requirements — stubs serve as living spec for plans 01-01 through 01-06
- Declared `playwright`, `Pillow`, and `facebook-sdk` in `pyproject.toml`
- Full test suite passes: 407 passed + 14 xfailed (0 failures)

## Task Commits

Each task was committed atomically:

1. **Task 1+2: broker + config (prior session)** - `877319f` (feat)
2. **Task 3: publisher test stubs** - `587669c` (feat)

## Files Created/Modified

- `apps/api/src/prosell/infrastructure/tasks/broker.py` - PubSubBroker → ListQueueBroker
- `apps/api/src/prosell/core/config.py` - publisher_engine + graph_api_approved fields
- `apps/api/pyproject.toml` - playwright, Pillow, facebook-sdk declared
- `apps/api/tests/unit/domain/test_publication_entity.py` - xfail stubs (PUBLISH-07)
- `apps/api/tests/unit/infrastructure/test_image_pipeline.py` - xfail stubs (PUBLISH-10)
- `apps/api/tests/unit/application/publisher/__init__.py` - new package
- `apps/api/tests/unit/application/publisher/test_publish_use_cases.py` - xfail stubs (PUBLISH-01, 04, 05)
- `apps/api/tests/unit/application/publisher/test_auto_republish.py` - xfail stubs (PUBLISH-06)
- `apps/api/tests/unit/infrastructure/test_publisher_strategy.py` - xfail stubs (PUBLISH-03)
- `apps/api/tests/unit/infrastructure/test_graph_api_publisher.py` - xfail stubs (PUBLISH-02)
- `apps/api/tests/unit/infrastructure/test_rate_limiting.py` - xfail stubs (PUBLISH-09)

## Decisions Made

- `ListQueueBroker` over `PubSubBroker`: the pub/sub variant silently ignores `.with_labels(delay=...)` — only list-queue brokers actually enqueue delayed messages.
- `publisher_engine` defaults to `"auto"` with `graph_api_approved=False` so Playwright is always the live path until FB App Review completes.
- Stubs import only `pytest` (no domain imports) so they remain parseable before the implementations they test exist.

## Deviations from Plan

None — plan executed exactly as written. Task 3 was split across two sessions due to rate limit, but all files match the plan spec.

## Issues Encountered

- `ruff-format` reformatted stub files on first commit attempt (added blank lines after module docstrings). Re-staged formatted files and committed successfully on second attempt. No logic changes.

## Next Phase Readiness

- Wave 0 infrastructure is fully complete — all subsequent plans can write tests against the stubs
- Plans 01-01 and 01-02 already complete (Publication entity, ImagePipeline)
- Wave 2 ready to start: 01-03 (playwright-strategy) and 01-04 (update-delete)

---
*Phase: 01-hybrid-publisher*
*Completed: 2026-03-15*
