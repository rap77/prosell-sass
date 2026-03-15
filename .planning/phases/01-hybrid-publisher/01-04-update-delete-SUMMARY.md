---
plan: 01-04-update-delete
phase: 01-hybrid-publisher
status: complete
completed: 2026-03-15
tasks_completed: 2/2
tests_before: 415
tests_after: 415
---

# Summary: 01-04 Update & Delete Use Cases

## What Was Built

`UpdateListingUseCase` and `DeleteListingUseCase` — complete CRUD lifecycle for active FB Marketplace listings.

## Key Files Created

- `apps/api/src/prosell/application/use_cases/publisher/update_listing.py` — UpdateListingUseCase with status validation
- `apps/api/src/prosell/application/use_cases/publisher/delete_listing.py` — DeleteListingUseCase with best-effort FB delete
- `apps/api/src/prosell/infrastructure/tasks/use_cases/update_listing_task.py` — Taskiq task for async listing updates
- `apps/api/src/prosell/infrastructure/tasks/use_cases/delete_listing_task.py` — Taskiq task for async listing removal

## Decisions Made

- **Lazy imports throughout**: application layer uses `from ... import task` inside method bodies to preserve Clean Architecture (no infrastructure imports at module level)
- **`UpdateListingRequest` inherits `DomainModel`**: consistent with project standards (no direct Pydantic imports in application/infrastructure)
- **Delete is best-effort on FB**: publication marked SOLD in DB before dispatching FB delete task — prevents double-selling even if FB task fails
- **Category A/B error handling in tasks**: same pattern as `publish_vehicle_task` — captcha/ban = Category B (block), transient = Category A (return error for caller)

## Test Results

415 passed, 1 skipped, 7 xfailed — 0 regressions
5 real tests in `test_publish_use_cases.py` covering create, dispatch, update, update validation, delete

## GGA Violations Fixed

- `MagicMock` in `publish_vehicle_task.py` → replaced with `NullGraphAPIPublisherService` (proper null object pattern)
- Module-level infrastructure imports in use cases → converted to lazy imports
- Test patch targets updated to point to source module (lazy import compatibility)
