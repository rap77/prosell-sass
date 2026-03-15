---
plan: "04"
phase: 1
wave: 2
depends_on: ["01"]
autonomous: true
files_modified:
  - apps/api/src/prosell/application/use_cases/publisher/update_listing.py
  - apps/api/src/prosell/application/use_cases/publisher/delete_listing.py
  - apps/api/src/prosell/infrastructure/tasks/use_cases/update_listing_task.py
  - apps/api/src/prosell/infrastructure/tasks/use_cases/delete_listing_task.py
  - apps/api/tests/unit/application/publisher/test_publish_use_cases.py
requirements: [PUBLISH-04, PUBLISH-05]
estimated_tasks: 2

must_haves:
  truths:
    - "UpdateListingUseCase updates price/description on an existing PUBLISHED publication and dispatches update_listing_task"
    - "DeleteListingUseCase transitions publication to SOLD and dispatches delete_listing_task"
    - "update_listing_task calls service.update() with the new content"
    - "delete_listing_task calls service.delete() and marks publication SOLD in DB"
    - "Tests for update and delete use cases are GREEN"
  artifacts:
    - path: "apps/api/src/prosell/application/use_cases/publisher/update_listing.py"
      provides: "UpdateListingUseCase"
      exports: ["UpdateListingUseCase"]
    - path: "apps/api/src/prosell/application/use_cases/publisher/delete_listing.py"
      provides: "DeleteListingUseCase"
      exports: ["DeleteListingUseCase"]
  key_links:
    - from: "apps/api/src/prosell/application/use_cases/publisher/delete_listing.py"
      to: "apps/api/src/prosell/domain/entities/publication.py"
      via: "publication.mark_sold()"
      pattern: "mark_sold"
---

<objective>
Build the Update and Delete use cases for active FB Marketplace listings.

Purpose: A vendedor must be able to update a listing's price/description after publishing (market changes, pricing adjustments) and mark a vehicle as sold (removes listing from FB). Both are P0 — without them, the catalog is read-only after first publish.
Output: UpdateListingUseCase, DeleteListingUseCase, update_listing_task, delete_listing_task, GREEN tests.
</objective>

<execution_context>
@/home/rpadron/.claude/get-shit-done/workflows/execute-plan.md
@/home/rpadron/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-hybrid-publisher/01-CONTEXT.md
@apps/api/src/prosell/domain/entities/publication.py
@apps/api/src/prosell/domain/repositories/publication_repository.py
@apps/api/src/prosell/application/use_cases/publisher/publish_vehicle.py
@apps/api/src/prosell/infrastructure/tasks/use_cases/publish_vehicle_task.py
@apps/api/tests/unit/application/publisher/test_publish_use_cases.py

<interfaces>
From CONTEXT.md (locked decisions):
- Update flow: Vendedor opens "Actualizar" modal (shows FB price diff vs new price)
- Delete: secondary "Eliminar/Finalizar" button inside the "Actualizar" modal

From Publication entity:
```python
def mark_sold(self) -> None:
    self.status = PublicationStatus.SOLD
    self.sold_at = datetime.now(UTC)
    self.updated_at = datetime.now(UTC)
```
</interfaces>
</context>

<tasks>

<task id="04-01" name="Task 1: UpdateListingUseCase and update_listing_task" tdd="true">
  <objective>Implement UpdateListingUseCase (updates content fields on publication and dispatches task) and update_listing_task (calls service.update()).</objective>
  <files>
    <create>apps/api/src/prosell/application/use_cases/publisher/update_listing.py</create>
    <create>apps/api/src/prosell/infrastructure/tasks/use_cases/update_listing_task.py</create>
    <modify>apps/api/tests/unit/application/publisher/test_publish_use_cases.py</modify>
  </files>
  <behavior>
    - Test: UpdateListingUseCase.execute() loads publication by id, updates price_cents and description, saves, dispatches update_listing_task
    - Test: If publication status is not PUBLISHED, raises ValueError("Cannot update a non-published listing")
    - Test: update_listing_task.kiq() is called with correct publication_id
  </behavior>
  <implementation>
Add to `test_publish_use_cases.py` (the existing file, add new tests at the bottom):

```python
async def test_update_listing_use_case(mock_publication_repo):
    """UpdateListingUseCase updates publication fields and dispatches task."""
    from prosell.application.use_cases.publisher.update_listing import UpdateListingUseCase, UpdateListingRequest
    from prosell.domain.entities.publication import PublicationStatus
    import uuid

    pub_id = uuid.uuid4()
    mock_pub = Publication(
        id=pub_id,
        product_id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        seller_user_id=uuid.uuid4(),
        facebook_page_id=uuid.uuid4(),
        title="Test",
        price_cents=10000,
        zip_code="90210",
        status=PublicationStatus.PUBLISHED,
        fb_listing_id="fb_123",
        image_urls=[],
    )
    mock_publication_repo.get_by_id.return_value = mock_pub

    with patch("prosell.application.use_cases.publisher.update_listing.update_listing_task") as mock_task:
        mock_task.kiq = AsyncMock()
        use_case = UpdateListingUseCase(publication_repo=mock_publication_repo)
        request = UpdateListingRequest(
            publication_id=pub_id,
            price_cents=15000,
            description="Updated description",
        )
        result = await use_case.execute(request)

    mock_publication_repo.update.assert_called_once()
    mock_task.kiq.assert_called_once_with(publication_id=str(pub_id))
    assert result.status == "published"


async def test_delete_listing_transitions_to_sold(mock_publication_repo):
    """DeleteListingUseCase marks publication SOLD and dispatches delete task."""
    from prosell.application.use_cases.publisher.delete_listing import DeleteListingUseCase
    from prosell.domain.entities.publication import PublicationStatus
    import uuid

    pub_id = uuid.uuid4()
    mock_pub = Publication(
        id=pub_id,
        product_id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        seller_user_id=uuid.uuid4(),
        facebook_page_id=uuid.uuid4(),
        title="Test",
        price_cents=10000,
        zip_code="90210",
        status=PublicationStatus.PUBLISHED,
        fb_listing_id="fb_123",
        image_urls=[],
    )
    mock_publication_repo.get_by_id.return_value = mock_pub

    with patch("prosell.application.use_cases.publisher.delete_listing.delete_listing_task") as mock_task:
        mock_task.kiq = AsyncMock()
        use_case = DeleteListingUseCase(publication_repo=mock_publication_repo)
        result = await use_case.execute(pub_id)

    mock_publication_repo.update.assert_called_once()
    mock_task.kiq.assert_called_once_with(publication_id=str(pub_id))
    assert result.status == "sold"
```

Implement `update_listing.py`:
```python
from uuid import UUID
from pydantic import BaseModel, Field
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.application.dto.publisher.publish import PublicationResponse


class UpdateListingRequest(BaseModel):
    publication_id: UUID
    title: str | None = None
    description: str | None = None
    price_cents: int | None = Field(default=None, gt=0)


class UpdateListingUseCase:
    def __init__(self, publication_repo: IPublicationRepository) -> None:
        self._repo = publication_repo

    async def execute(self, request: UpdateListingRequest) -> PublicationResponse:
        publication = await self._repo.get_by_id(request.publication_id)
        if not publication:
            raise ValueError(f"Publication {request.publication_id} not found")
        if publication.status.value != "published":
            raise ValueError("Cannot update a non-published listing")

        # Apply updates
        if request.title is not None:
            publication.title = request.title
        if request.description is not None:
            publication.description = request.description
        if request.price_cents is not None:
            publication.price_cents = request.price_cents

        from datetime import UTC, datetime
        publication.updated_at = datetime.now(UTC)
        await self._repo.update(publication)

        from prosell.infrastructure.tasks.use_cases.update_listing_task import update_listing_task
        await update_listing_task.kiq(publication_id=str(publication.id))

        return PublicationResponse(
            id=publication.id,
            product_id=publication.product_id,
            status=publication.status.value,
            fb_listing_id=publication.fb_listing_id,
        )
```

Implement `update_listing_task.py` — mirrors `publish_vehicle_task.py` but calls `service.update()`:
```python
from prosell.infrastructure.tasks.broker import broker

@broker.task
async def update_listing_task(publication_id: str) -> dict:
    """Update existing FB Marketplace listing via publisher strategy."""
    # Same DI pattern as publish_vehicle_task: instantiate services manually
    # Get publication, get page token, call strategy.select(), service.update()
    # On success: update publication updated_at in DB
    # On failure: same Category A/B classification as publish_vehicle_task
    ...  # Full implementation mirrors publish_vehicle_task
```
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run pytest tests/unit/application/publisher/test_publish_use_cases.py::test_update_listing_use_case tests/unit/application/publisher/test_publish_use_cases.py::test_delete_listing_transitions_to_sold -v --tb=short</automated>
  </verify>
</task>

<task id="04-02" name="Task 2: DeleteListingUseCase and delete_listing_task">
  <objective>Implement DeleteListingUseCase (mark_sold + dispatch) and delete_listing_task (calls service.delete()).</objective>
  <files>
    <create>apps/api/src/prosell/application/use_cases/publisher/delete_listing.py</create>
    <create>apps/api/src/prosell/infrastructure/tasks/use_cases/delete_listing_task.py</create>
  </files>
  <implementation>
**delete_listing.py**:
```python
from uuid import UUID
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.application.dto.publisher.publish import PublicationResponse


class DeleteListingUseCase:
    def __init__(self, publication_repo: IPublicationRepository) -> None:
        self._repo = publication_repo

    async def execute(self, publication_id: UUID) -> PublicationResponse:
        publication = await self._repo.get_by_id(publication_id)
        if not publication:
            raise ValueError(f"Publication {publication_id} not found")

        # Mark SOLD in DB immediately (before FB delete — FB delete is best-effort)
        publication.mark_sold()
        await self._repo.update(publication)

        # Dispatch task to remove from Facebook
        from prosell.infrastructure.tasks.use_cases.delete_listing_task import delete_listing_task
        await delete_listing_task.kiq(publication_id=str(publication_id))

        return PublicationResponse(
            id=publication.id,
            product_id=publication.product_id,
            status=publication.status.value,
            fb_listing_id=publication.fb_listing_id,
        )
```

Design decision (Claude's Discretion): Mark SOLD in DB before the Taskiq task, not after. Rationale: if the FB delete fails, the listing is still sold in ProSell (the source of truth). A stale listing on FB for a sold vehicle is less harmful than ProSell showing an active listing for a sold vehicle.

**delete_listing_task.py**:
```python
from prosell.infrastructure.tasks.broker import broker

@broker.task
async def delete_listing_task(publication_id: str) -> dict:
    """Remove FB Marketplace listing via publisher strategy.

    Note: Publication is already SOLD in DB when this task runs.
    This task is best-effort — if FB delete fails, the vehicle is
    still marked sold in ProSell (prevents double-selling).
    """
    from uuid import UUID
    from prosell.infrastructure.database.session import async_session_factory
    from prosell.infrastructure.repositories.publication_repository_impl import SqlAlchemyPublicationRepository
    from prosell.infrastructure.repositories.facebook_page_repository_impl import SqlAlchemyFacebookPageRepository
    from prosell.infrastructure.services.token_encryption_service import TokenEncryptionService
    from prosell.infrastructure.services.playwright_publisher import PlaywrightPublisherService
    from prosell.infrastructure.services.graph_api_publisher import GraphAPIPublisherService
    from prosell.infrastructure.services.publisher_strategy import PublisherStrategySelector

    pub_id = UUID(publication_id)

    async with async_session_factory() as session:
        pub_repo = SqlAlchemyPublicationRepository(session)
        page_repo = SqlAlchemyFacebookPageRepository(session)
        encryption = TokenEncryptionService()

        publication = await pub_repo.get_by_id(pub_id)
        if not publication or not publication.fb_listing_id:
            return {"status": "skipped", "reason": "no fb_listing_id"}

        page = await page_repo.get_by_id(publication.facebook_page_id)
        if not page:
            return {"error": "FacebookPage not found"}
        access_token = encryption.decrypt(page.page_access_token_encrypted)

        playwright_svc = PlaywrightPublisherService()
        graph_api_svc = GraphAPIPublisherService(encryption)
        selector = PublisherStrategySelector(playwright_svc, graph_api_svc)
        service, _ = selector.select()

        try:
            await service.delete(publication, access_token)
            return {"status": "deleted", "fb_listing_id": publication.fb_listing_id}
        except Exception as exc:
            # Best-effort: log but don't fail — publication is already SOLD in DB
            return {"status": "fb_delete_failed", "error": str(exc)}
```
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run pytest tests/unit/application/publisher/ -v --tb=short</automated>
  </verify>
</task>

</tasks>

<verification>
After all tasks:

1. `uv run pytest tests/unit/application/publisher/ -v` — all tests GREEN including update and delete
2. `uv run pytest tests/unit/ -x --tb=short` — full unit suite passes
</verification>

<success_criteria>
- [ ] UpdateListingUseCase validates publication is PUBLISHED before updating
- [ ] DeleteListingUseCase calls mark_sold() before dispatching delete_listing_task (DB is source of truth)
- [ ] delete_listing_task is best-effort (failure doesn't propagate — vehicle already SOLD)
- [ ] Both tasks use same DI pattern as publish_vehicle_task (instantiate services manually in task context)
- [ ] 2 new tests GREEN in test_publish_use_cases.py
</success_criteria>

<output>
After completion, create `.planning/phases/01-hybrid-publisher/01-04-SUMMARY.md`
</output>
