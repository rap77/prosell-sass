---
plan: "05"
phase: 1
wave: 3
depends_on: ["03", "04"]
autonomous: true
files_modified:
  - apps/api/src/prosell/application/use_cases/publisher/auto_republish.py
  - apps/api/src/prosell/infrastructure/tasks/use_cases/auto_republish_task.py
  - apps/api/tests/unit/application/publisher/test_auto_republish.py
requirements: [PUBLISH-06]
estimated_tasks: 2

must_haves:
  truths:
    - "AutoRepublishUseCase queries publications with expires_at < now+48h and status=PUBLISHED"
    - "For each expiring listing: creates a new Publication clone, marks old one EXPIRED, dispatches publish_vehicle_task for the clone"
    - "auto_republish_task runs via Taskiq scheduler (not triggered manually)"
    - "Scheduler runs every 6 hours matching the token refresh schedule"
    - "All 3 tests in test_auto_republish.py are GREEN"
  artifacts:
    - path: "apps/api/src/prosell/application/use_cases/publisher/auto_republish.py"
      provides: "AutoRepublishUseCase with expiry detection logic"
      exports: ["AutoRepublishUseCase"]
    - path: "apps/api/src/prosell/infrastructure/tasks/use_cases/auto_republish_task.py"
      provides: "Taskiq scheduled task — runs every 6 hours"
      exports: ["auto_republish_task"]
  key_links:
    - from: "apps/api/src/prosell/infrastructure/tasks/use_cases/auto_republish_task.py"
      to: "apps/api/src/prosell/application/use_cases/publisher/auto_republish.py"
      via: "AutoRepublishUseCase().execute()"
      pattern: "AutoRepublishUseCase"
    - from: "apps/api/src/prosell/application/use_cases/publisher/auto_republish.py"
      to: "apps/api/src/prosell/domain/repositories/publication_repository.py"
      via: "IPublicationRepository.get_approaching_expiry(hours_before=48)"
      pattern: "get_approaching_expiry"
---

<objective>
Build the auto-republish system that prevents any FB Marketplace listing from expiring without replacement.

Purpose: FB posts expire after 7 days. Without this scheduler, every listing would die silently and dealers would lose market visibility. This is P0 for ongoing operations.
Output: AutoRepublishUseCase (clone + expire + dispatch pattern), auto_republish_task (Taskiq scheduler, every 6h), GREEN tests.
</objective>

<execution_context>
@/home/rpadron/.claude/get-shit-done/workflows/execute-plan.md
@/home/rpadron/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-hybrid-publisher/01-RESEARCH.md
@apps/api/src/prosell/domain/entities/publication.py
@apps/api/src/prosell/domain/repositories/publication_repository.py
@apps/api/src/prosell/infrastructure/tasks/use_cases/refresh_facebook_tokens.py
@apps/api/src/prosell/infrastructure/tasks/use_cases/publish_vehicle_task.py
@apps/api/tests/unit/application/publisher/test_auto_republish.py

<interfaces>
From IPublicationRepository (created in Plan 01):
```python
async def get_approaching_expiry(self, hours_before: int = 48) -> list[Publication]:
    """Query: status=PUBLISHED AND expires_at < NOW() + hours_before hours"""
```

From Publication entity:
```python
def mark_expired(self) -> None:
    self.status = PublicationStatus.EXPIRED
    self.updated_at = datetime.now(UTC)
```
</interfaces>
</context>

<tasks>

<task id="05-01" name="Task 1: AutoRepublishUseCase with clone-expire-dispatch pattern" tdd="true">
  <objective>Implement AutoRepublishUseCase: query expiring listings, clone each as new PENDING publication, mark old as EXPIRED, dispatch publish tasks.</objective>
  <files>
    <create>apps/api/src/prosell/application/use_cases/publisher/auto_republish.py</create>
    <modify>apps/api/tests/unit/application/publisher/test_auto_republish.py</modify>
  </files>
  <behavior>
    - Test: AutoRepublishUseCase.execute() calls get_approaching_expiry(hours_before=48)
    - Test: For each expiring publication, creates a new Publication with same content (new id, status=PENDING)
    - Test: Old publication is marked EXPIRED via mark_expired() and repo.update()
    - Test: publish_vehicle_task.kiq() is called once per expiring listing with the new publication_id
    - Test: Returns dict with {"checked": N, "republished": M} stats
  </behavior>
  <implementation>
Replace xfail stubs in `test_auto_republish.py`:

```python
"""Tests for AutoRepublishUseCase — PUBLISH-06."""
import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4
from datetime import UTC, datetime, timedelta
from prosell.application.use_cases.publisher.auto_republish import AutoRepublishUseCase
from prosell.domain.entities.publication import Publication, PublicationStatus


def make_expiring_publication() -> Publication:
    return Publication(
        id=uuid4(),
        product_id=uuid4(),
        tenant_id=uuid4(),
        seller_user_id=uuid4(),
        facebook_page_id=uuid4(),
        title="2020 Toyota Camry",
        price_cents=2500000,
        zip_code="90210",
        status=PublicationStatus.PUBLISHED,
        fb_listing_id="fb_abc123",
        image_urls=["https://example.com/img.jpg"],
        published_at=datetime.now(UTC) - timedelta(days=6),
        expires_at=datetime.now(UTC) + timedelta(hours=24),  # 24h left — within 48h window
    )


async def test_auto_republish_detects_listings_within_48h():
    """AutoRepublishUseCase calls get_approaching_expiry(hours_before=48)."""
    repo = AsyncMock()
    repo.get_approaching_expiry.return_value = []
    repo.create.return_value = None

    with patch("prosell.application.use_cases.publisher.auto_republish.publish_vehicle_task"):
        use_case = AutoRepublishUseCase(publication_repo=repo)
        result = await use_case.execute()

    repo.get_approaching_expiry.assert_called_once_with(hours_before=48)
    assert result["checked"] == 0


async def test_auto_republish_clones_and_creates_new_publication():
    """AutoRepublishUseCase creates new Publication with same content but new id."""
    repo = AsyncMock()
    expiring = make_expiring_publication()
    repo.get_approaching_expiry.return_value = [expiring]

    new_pub = Publication(
        id=uuid4(),  # new id
        product_id=expiring.product_id,
        tenant_id=expiring.tenant_id,
        seller_user_id=expiring.seller_user_id,
        facebook_page_id=expiring.facebook_page_id,
        title=expiring.title,
        price_cents=expiring.price_cents,
        zip_code=expiring.zip_code,
        image_urls=expiring.image_urls,
    )
    repo.create.return_value = new_pub

    with patch("prosell.application.use_cases.publisher.auto_republish.publish_vehicle_task") as mock_task:
        mock_task.kiq = AsyncMock()
        use_case = AutoRepublishUseCase(publication_repo=repo)
        result = await use_case.execute()

    repo.create.assert_called_once()
    assert result["republished"] == 1


async def test_auto_republish_marks_old_publication_expired():
    """AutoRepublishUseCase marks old publication EXPIRED after cloning."""
    repo = AsyncMock()
    expiring = make_expiring_publication()
    repo.get_approaching_expiry.return_value = [expiring]
    repo.create.return_value = Publication(
        id=uuid4(), product_id=expiring.product_id, tenant_id=expiring.tenant_id,
        seller_user_id=expiring.seller_user_id, facebook_page_id=expiring.facebook_page_id,
        title=expiring.title, price_cents=expiring.price_cents, zip_code=expiring.zip_code,
    )

    with patch("prosell.application.use_cases.publisher.auto_republish.publish_vehicle_task") as mock_task:
        mock_task.kiq = AsyncMock()
        use_case = AutoRepublishUseCase(publication_repo=repo)
        await use_case.execute()

    # The old publication should have been updated (marked EXPIRED)
    assert repo.update.called
    updated_pub = repo.update.call_args[0][0]
    assert updated_pub.status == PublicationStatus.EXPIRED
```

Implement `auto_republish.py`:

```python
"""AutoRepublishUseCase — detects expiring listings and creates replacements."""
from prosell.domain.entities.publication import Publication
from prosell.domain.repositories.publication_repository import IPublicationRepository


class AutoRepublishUseCase:
    """Queries listings approaching 7-day expiry and creates replacement publications.

    Design (Claude's Discretion):
    - Window: 48 hours before expiry (gives 8 scheduler runs to catch each listing at 6h intervals)
    - Pattern: clone → expire old → dispatch new (not update old publication record)
    - Reason for clone: new publication has its own lifecycle, error tracking, strategy log.
      The old one becomes EXPIRED in history (audit trail).
    """

    def __init__(self, publication_repo: IPublicationRepository) -> None:
        self._repo = publication_repo

    async def execute(self) -> dict[str, int]:
        expiring = await self._repo.get_approaching_expiry(hours_before=48)
        republished = 0

        for old_pub in expiring:
            try:
                # Clone content into new publication (new id, PENDING status)
                new_pub = Publication(
                    product_id=old_pub.product_id,
                    tenant_id=old_pub.tenant_id,
                    seller_user_id=old_pub.seller_user_id,
                    facebook_page_id=old_pub.facebook_page_id,
                    title=old_pub.title,
                    description=old_pub.description,
                    price_cents=old_pub.price_cents,
                    zip_code=old_pub.zip_code,
                    image_urls=list(old_pub.image_urls),
                    hero_shot_url=old_pub.hero_shot_url,
                )
                new_pub = await self._repo.create(new_pub)

                # Mark old as EXPIRED
                old_pub.mark_expired()
                await self._repo.update(old_pub)

                # Dispatch publish task for the new publication
                from prosell.infrastructure.tasks.use_cases.publish_vehicle_task import publish_vehicle_task
                await publish_vehicle_task.kiq(publication_id=str(new_pub.id))

                republished += 1
            except Exception:
                # Continue processing remaining listings even if one fails
                pass

        return {"checked": len(expiring), "republished": republished}
```
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run pytest tests/unit/application/publisher/test_auto_republish.py -v --tb=short</automated>
  </verify>
</task>

<task id="05-02" name="Task 2: Taskiq scheduled task for auto-republish (every 6h)">
  <objective>Create auto_republish_task as a Taskiq scheduled task that runs every 6 hours via cron-style schedule.</objective>
  <files>
    <create>apps/api/src/prosell/infrastructure/tasks/use_cases/auto_republish_task.py</create>
  </files>
  <implementation>
Follow the exact same task DI pattern as `publish_vehicle_task.py` (instantiate dependencies manually inside the task — no FastAPI DI injection).

```python
"""Scheduled Taskiq task for auto-republish of expiring FB Marketplace listings.

Scheduled to run every 6 hours (same cadence as token refresh).
Rationale: 7-day FB post expiry with 48h warning window gives 8 scheduler
runs per listing — sufficient redundancy if one run is missed.
"""
from prosell.infrastructure.tasks.broker import broker


@broker.task
async def auto_republish_task() -> dict:
    """Detect listings approaching 7-day expiry and republish them.

    Runs every 6 hours via Taskiq scheduler (cron configuration in worker.py).
    Uses manual DI (not FastAPI Depends) — task runs in worker process.
    """
    from prosell.infrastructure.database.session import async_session_factory
    from prosell.infrastructure.repositories.publication_repository_impl import SqlAlchemyPublicationRepository
    from prosell.application.use_cases.publisher.auto_republish import AutoRepublishUseCase

    async with async_session_factory() as session:
        pub_repo = SqlAlchemyPublicationRepository(session)
        use_case = AutoRepublishUseCase(publication_repo=pub_repo)
        result = await use_case.execute()
        return result
```

After creating the task, register it in the scheduler. Check `worker.py` for how `refresh_facebook_tokens` is scheduled. Add `auto_republish_task` with the same 6-hour cron pattern. If `worker.py` uses `TaskiqScheduler` with cron strings, add:

```python
# In worker.py or a schedules config file:
ScheduledTask(
    task=auto_republish_task,
    schedule=[CronTrigger(hour="*/6")],  # Every 6 hours
)
```

Read `worker.py` first to understand the exact scheduler registration pattern used.
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run python -c "from prosell.infrastructure.tasks.use_cases.auto_republish_task import auto_republish_task; print(auto_republish_task.task_name)"</automated>
  </verify>
</task>

</tasks>

<verification>
After all tasks:

1. `uv run pytest tests/unit/application/publisher/test_auto_republish.py -v` — all 3 tests GREEN
2. `uv run python -c "from prosell.infrastructure.tasks.use_cases.auto_republish_task import auto_republish_task; print('ok')"` — no ImportError
3. `uv run pytest tests/unit/ -x --tb=short` — full suite passes
</verification>

<success_criteria>
- [ ] AutoRepublishUseCase creates a clone Publication (new id, PENDING status) for each expiring listing
- [ ] Old publication is marked EXPIRED after clone is dispatched
- [ ] auto_republish_task is registered with 6-hour schedule in worker
- [ ] AutoRepublishUseCase continues processing remaining listings even if one fails (try/except per listing)
- [ ] All 3 tests GREEN
</success_criteria>

<output>
After completion, create `.planning/phases/01-hybrid-publisher/01-05-SUMMARY.md`
</output>
