---
phase: 01-hybrid-publisher
plan: "01"
subsystem: database
tags: [publication, state-machine, sqlalchemy, alembic, pydantic, clean-architecture]

requires: []
provides:
  - Publication domain entity with 6-state machine (pending/publishing/published/failed/expired/sold)
  - PublicationStatus and PublicationErrorCategory enums
  - IPublicationRepository interface with get_approaching_expiry()
  - IPublisherService port (Playwright/GraphAPI adapter contract)
  - IImagePipeline port (image processing contract)
  - PublicationModel SQLAlchemy ORM with all fields and indexes
  - SqlAlchemyPublicationRepository with mapper helpers
  - publications table in PostgreSQL with indexes (including expires_at for scheduler)
affects:
  - 01-02-publish-use-case (needs Publication entity and IPublisherService)
  - 01-03-playwright-adapter (implements IPublisherService)
  - 01-04-graph-api-adapter (implements IPublisherService)
  - 01-05-scheduler (queries get_approaching_expiry())
  - 01-06-retry-use-case (uses mark_failed, increment_retry)
  - 01-07-api-endpoints (returns Publication entities)

tech-stack:
  added: []
  patterns:
    - "Publication state machine: 6 states with explicit transition methods (mark_published, mark_failed, mark_sold, mark_expired)"
    - "Error categorization: A=transient (retryable), B=blocking (requires human confirmation)"
    - "Scheduler expiry query: get_approaching_expiry(hours_before=48) — indexed by expires_at"
    - "mapper helpers: _to_entity() and _to_model() in repository impl"

key-files:
  created:
    - apps/api/src/prosell/domain/entities/publication.py
    - apps/api/src/prosell/domain/repositories/publication_repository.py
    - apps/api/src/prosell/domain/ports/i_publisher_service.py
    - apps/api/src/prosell/domain/ports/i_image_pipeline.py
    - apps/api/src/prosell/infrastructure/models/publication_model.py
    - apps/api/src/prosell/infrastructure/repositories/publication_repository_impl.py
    - apps/api/alembic/versions/20260315_1200-d2e3f4g5h6i7_add_publications_table.py
    - apps/api/tests/unit/domain/test_publication_entity.py
  modified:
    - apps/api/src/prosell/infrastructure/models/__init__.py

key-decisions:
  - "mark_published() sets expires_at = published_at + 7 days — FB Marketplace auto-expires listings in 7 days"
  - "Error Category B (blocking) sets blocked_until_confirmed=True — captcha/policy violations need human review before retry"
  - "expires_at column indexed — scheduler query performance critical at scale"
  - "IPublisherService port in domain layer — Playwright and GraphAPI adapters are both valid implementations"
  - "Migration written manually (not autogenerate) — Docker not available during planning, ensures portability"

patterns-established:
  - "State machine methods: direct field mutation via self.field = value in DomainModel entities"
  - "Repository interface in domain/repositories/, implementation in infrastructure/repositories/"
  - "Ports in domain/ports/ — pure ABC interfaces with no infrastructure imports"
  - "TDD RED/GREEN: write failing tests first, implement entity, verify GREEN"

requirements-completed: [PUBLISH-07]

duration: 23min
completed: 2026-03-15
---

# Phase 1 Plan 01: Publication Entity Summary

**Publication domain entity with 6-state machine, IPublisherService/IImagePipeline ports, SQLAlchemy ORM model, and publications table migration (d2e3f4g5h6i7) — the data backbone for all FB Marketplace publishing in Phase 1**

## Performance

- **Duration:** 23 min
- **Started:** 2026-03-15T12:07:07Z
- **Completed:** 2026-03-15T12:30:16Z
- **Tasks:** 3 completed
- **Files modified:** 9 (7 created, 2 modified)

## Accomplishments

- Publication entity with 6-state machine and all transition methods (mark_published, mark_failed, mark_publishing, mark_sold, mark_expired, increment_retry, unlock_from_category_b)
- IPublicationRepository, IPublisherService, IImagePipeline ports defined as ABCs in domain layer
- PublicationModel ORM with all fields, FKs, and critical expires_at index for scheduler
- Alembic migration applied at head (d2e3f4g5h6i7) — publications table live in DB
- 10 unit tests GREEN covering all state machine transitions

## Task Commits

Each task was committed atomically:

1. **Task 1: Domain layer — Publication entity, ports, repository interface** - `ce734c4` (feat/test — TDD)
2. **Task 2: SQLAlchemy model and repository implementation** - `61fcc41` (feat)
3. **Task 3: Alembic migration for publications table** - `ddc6d8e` (feat)

## Files Created/Modified

- `apps/api/src/prosell/domain/entities/publication.py` — Publication entity with 6-state machine, PublicationStatus + PublicationErrorCategory enums
- `apps/api/src/prosell/domain/repositories/publication_repository.py` — IPublicationRepository ABC with get_approaching_expiry()
- `apps/api/src/prosell/domain/ports/i_publisher_service.py` — IPublisherService port (publish/update/delete)
- `apps/api/src/prosell/domain/ports/i_image_pipeline.py` — IImagePipeline port (already existed, kept)
- `apps/api/src/prosell/infrastructure/models/publication_model.py` — PublicationModel with JSONB image_urls, indexed expires_at
- `apps/api/src/prosell/infrastructure/repositories/publication_repository_impl.py` — SqlAlchemyPublicationRepository with mapper helpers
- `apps/api/src/prosell/infrastructure/models/__init__.py` — Added PublicationModel import for Alembic autogenerate
- `apps/api/alembic/versions/20260315_1200-d2e3f4g5h6i7_add_publications_table.py` — Migration creating publications table
- `apps/api/tests/unit/domain/test_publication_entity.py` — 10 unit tests covering state machine

## Decisions Made

- **7-day expiry window:** mark_published() sets expires_at = published_at + 7 days — FB Marketplace auto-expires listings in 7 days, scheduler must republish before then
- **Error categorization:** Category B (blocking) sets blocked_until_confirmed=True — captcha and policy violations require human confirmation before retry (vs Category A transient errors which auto-retry)
- **expires_at index:** Critical for scheduler performance — the get_approaching_expiry() query filters on (status=published AND expires_at < now+48h)
- **Manual migration:** Docker Desktop was not running during execution — migration written manually following existing patterns, then applied after starting Docker

## Deviations from Plan

None — plan executed exactly as written.

The `i_image_pipeline.py` file already existed from prior work (previous session). Kept as-is since it matched the plan's specification exactly.

## Issues Encountered

- **Docker not running:** Docker Desktop needed manual startup (not running in WSL2). Started it mid-Task 3 and applied migration successfully.
- **Pre-commit GGA stash conflicts:** Pre-commit hook runs GGA twice (staged + unstaged). Pre-existing `test_image_pipeline.py` (untracked) was being reviewed with the staged migration. Resolved by staging the file with fixed `@pytest.mark.asyncio` decorators.

## Next Phase Readiness

- Publication entity and repository interface ready for use by publish use case (Plan 02)
- IPublisherService port ready for Playwright adapter implementation (Plan 03)
- publications table in DB ready for integration tests
- No blockers for Plan 02

---
*Phase: 01-hybrid-publisher*
*Completed: 2026-03-15*

## Self-Check: PASSED

- apps/api/src/prosell/domain/entities/publication.py: FOUND
- apps/api/src/prosell/domain/repositories/publication_repository.py: FOUND
- apps/api/src/prosell/infrastructure/models/publication_model.py: FOUND
- apps/api/alembic/versions/20260315_1200-d2e3f4g5h6i7_add_publications_table.py: FOUND
- Commit ce734c4 (Task 1): FOUND
- Commit 61fcc41 (Task 2): FOUND
- Commit ddc6d8e (Task 3): FOUND
