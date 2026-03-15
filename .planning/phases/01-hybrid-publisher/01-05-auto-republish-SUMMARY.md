---
plan: "05"
phase: 1
status: complete
completed: "2026-03-15"
commit: f9a6345
tests_added: 3
tests_passing: 422
---

# 01-05 Auto-Republish — SUMMARY

## What was built

- `ITaskDispatcher` port in `domain/ports/` — decouples use cases from Taskiq
- `PublisherDomainError`, `PublicationRepublishError`, `TaskDispatchError` in `domain/exceptions/publisher_exceptions.py`
- `AutoRepublishUseCase` — clones expiring listings (48h window), marks old EXPIRED, dispatches via `ITaskDispatcher`
- `TaskiqTaskDispatcher` — infra adapter wrapping `publish_vehicle_task.kiq()` with `TaskDispatchError` on failure
- `auto_republish_task` — injects `TaskiqTaskDispatcher` into use case (Taskiq scheduled task, every 6h)

## Key decisions

- `import logging` moved to module level (GGA violation fix)
- Lazy import removed — `ITaskDispatcher` injected via `__init__`, never lazy-imported in use case
- `except PublisherDomainError:` instead of bare `except Exception:` — loop resilience preserved but specific

## Tests

3 tests GREEN in `test_auto_republish.py`
