# Prune Sold Product Galleries — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a product has been SOLD for 30 days, delete every stored image except its cover, to cut DigitalOcean Spaces storage cost.

**Architecture:** A periodic taskiq task runs a use case that asks the product repository for products `SOLD` longer than the grace period, then deletes their non-cover image objects via the storage service and rewrites each product's image list to keep only the cover. Returns are handled implicitly — a returned product leaves `SOLD`, so the query excludes it. The sweep is idempotent.

**Tech Stack:** Python 3.13, Pydantic v2 entities, SQLAlchemy 2.0 async, taskiq (Redis broker), pytest-asyncio. Storage: `IDOSpacesService` (DigitalOcean Spaces, S3-compatible).

---

## Known facts (verified in code)

- `Product` (`src/prosell/domain/entities/product.py`): `image_urls: list[str]` (gallery keys), `cover_image_key: str | None`, `status: ProductStatus`, `sold_at: datetime | None`. `mark_sold()` already sets `self.sold_at = datetime.now(UTC)` (line 267).
- `IDOSpacesService.delete_file(self, key: str) -> bool` — async, idempotent-friendly (missing object returns falsy, does not raise).
- `AbstractProductRepository` (`src/prosell/domain/repositories/product_repository.py`) + impl (`product_repository_impl.py`) use `select(ProductModel).where(...)`; status filters compare `ProductModel.status == status.value`; rows map to entities including `sold_at=product.sold_at`. `update(product)` persists an entity.
- Periodic tasks: `@broker.task` async functions in `src/prosell/infrastructure/tasks/use_cases/` (see `refresh_facebook_tokens.py`), scheduled externally by cron. Broker in `tasks/broker.py` (taskiq + `taskiq_redis`).
- TEST DB: integration tests use the Postgres test DB on `localhost:5433`; run `bash scripts/setup-test-db.sh` first (Docker). Unit tests need no DB.

## File structure

| File                                                                         | Responsibility                               | Action |
| ---------------------------------------------------------------------------- | -------------------------------------------- | ------ |
| `src/prosell/core/config.py`                                                 | `SOLD_IMAGE_GRACE_DAYS` setting (default 30) | Modify |
| `src/prosell/domain/repositories/product_repository.py`                      | add `get_sold_before(cutoff)` to the port    | Modify |
| `src/prosell/infrastructure/repositories/product_repository_impl.py`         | implement `get_sold_before`                  | Modify |
| `src/prosell/application/use_cases/product/prune_sold_product_images.py`     | the prune use case                           | Create |
| `src/prosell/infrastructure/tasks/use_cases/prune_sold_galleries_task.py`    | taskiq entrypoint                            | Create |
| `tests/unit/application/use_cases/product/test_prune_sold_product_images.py` | use-case unit tests                          | Create |
| `tests/integration/repositories/test_product_get_sold_before.py`             | repo integration test                        | Create |

---

## Task 1: Grace-period setting

**Files:** Modify `src/prosell/core/config.py`; Test: reuse existing config test or assert inline in Task 3.

- [ ] **Step 1: Add the setting**

In the `Settings` class (pydantic-settings) in `src/prosell/core/config.py`, add:

```python
    # Days a product must stay SOLD before its non-cover images are pruned.
    # Must be >= the return window (returns un-sell a product). Default 30.
    SOLD_IMAGE_GRACE_DAYS: int = 30
```

- [ ] **Step 2: Verify it loads**

Run: `cd apps/api && uv run python -c "from prosell.core.config import settings; print(settings.SOLD_IMAGE_GRACE_DAYS)"`
Expected: `30`

- [ ] **Step 3: Commit**

```bash
git add src/prosell/core/config.py
git commit -m "feat(api): add SOLD_IMAGE_GRACE_DAYS setting (default 30)"
```

---

## Task 2: Repository query — products SOLD before a cutoff

**Files:** Modify `product_repository.py` (port) + `product_repository_impl.py`; Test: `tests/integration/repositories/test_product_get_sold_before.py`

- [ ] **Step 1: Write the failing integration test**

```python
# tests/integration/repositories/test_product_get_sold_before.py
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.mark.asyncio
async def test_get_sold_before_returns_only_old_sold(db_session, test_organization):
    repo = SqlAlchemyProductRepository(db_session)
    now = datetime.now(UTC)

    async def _make(status: ProductStatus, sold_delta_days: int | None) -> Product:
        p = Product.create(
            tenant_id=test_organization.id,
            organization_id=test_organization.id,
            title="P",
            slug=f"p-{uuid4().hex[:8]}",
            description="d",
            price_cents=1000,
            currency="USD",
            category_id=uuid4(),
        )
        p.status = status
        p.sold_at = None if sold_delta_days is None else now - timedelta(days=sold_delta_days)
        return await repo.create(p)

    old_sold = await _make(ProductStatus.SOLD, 40)      # eligible
    recent_sold = await _make(ProductStatus.SOLD, 10)   # within grace
    published = await _make(ProductStatus.PUBLISHED, None)  # not sold

    cutoff = now - timedelta(days=30)
    result = await repo.get_sold_before(cutoff)
    ids = {p.id for p in result}

    assert old_sold.id in ids
    assert recent_sold.id not in ids
    assert published.id not in ids
```

- [ ] **Step 2: Run → FAIL**

Run: `cd apps/api && uv run pytest tests/integration/repositories/test_product_get_sold_before.py -v`
Expected: FAIL — `AttributeError: 'SqlAlchemyProductRepository' object has no attribute 'get_sold_before'`.
(If the DB is not up: `bash scripts/setup-test-db.sh` first.)

- [ ] **Step 3: Add the port method**

In `src/prosell/domain/repositories/product_repository.py`, inside `AbstractProductRepository`, add (keep the `from datetime import datetime` import at top):

```python
    async def get_sold_before(self, cutoff: datetime) -> list[Product]:
        """Return all products with status SOLD whose sold_at is strictly
        before `cutoff` (system-wide, no tenant filter — this is a
        maintenance sweep). Products that left SOLD (e.g. returned) are
        naturally excluded."""
        ...
```

- [ ] **Step 4: Implement in the adapter**

In `src/prosell/infrastructure/repositories/product_repository_impl.py`, mirror the existing `get_all` query + entity mapping (the class already maps `ProductModel` → `Product`; reuse the same private mapper used by `get_all`, e.g. `self._to_entity(row)`):

```python
    async def get_sold_before(self, cutoff: datetime) -> list[Product]:
        stmt = select(ProductModel).where(
            ProductModel.status == ProductStatus.SOLD.value,
            ProductModel.sold_at.is_not(None),
            ProductModel.sold_at < cutoff,
        )
        result = await self.session.execute(stmt)
        return [self._to_entity(row) for row in result.scalars().all()]
```

Ensure `from datetime import datetime` and `from prosell.domain.value_objects.product_status import ProductStatus` are imported (ProductStatus already is). Use whatever the existing mapper method is named (match `get_all`).

- [ ] **Step 5: Run → PASS**

Run: `cd apps/api && uv run pytest tests/integration/repositories/test_product_get_sold_before.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/prosell/domain/repositories/product_repository.py src/prosell/infrastructure/repositories/product_repository_impl.py tests/integration/repositories/test_product_get_sold_before.py
git commit -m "feat(api): product repo get_sold_before(cutoff) for image-prune sweep"
```

---

## Task 3: PruneSoldProductImagesUseCase

**Files:** Create `src/prosell/application/use_cases/product/prune_sold_product_images.py`; Test: `tests/unit/application/use_cases/product/test_prune_sold_product_images.py`

The use case depends on the repository port + the storage port (`IDOSpacesService`) — both mockable, so this is a pure UNIT test (no DB, no network).

- [ ] **Step 1: Write the failing unit test**

```python
# tests/unit/application/use_cases/product/test_prune_sold_product_images.py
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.prune_sold_product_images import (
    PruneSoldProductImagesUseCase,
)
from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_status import ProductStatus


def _sold_product(keys: list[str], cover: str | None) -> Product:
    p = Product.create(
        tenant_id=uuid4(),
        organization_id=uuid4(),
        title="P",
        slug=f"p-{uuid4().hex[:8]}",
        description="d",
        price_cents=1000,
        currency="USD",
        category_id=uuid4(),
    )
    p.status = ProductStatus.SOLD
    p.sold_at = datetime.now(UTC) - timedelta(days=40)
    p.image_urls = list(keys)
    p.cover_image_key = cover
    return p


@pytest.mark.asyncio
async def test_prune_deletes_non_cover_and_keeps_cover():
    product = _sold_product(["a.webp", "cover.webp", "b.webp"], "cover.webp")
    repo = AsyncMock()
    repo.get_sold_before.return_value = [product]
    storage = AsyncMock()
    storage.delete_file.return_value = True

    use_case = PruneSoldProductImagesUseCase(repo, storage, grace_days=30)
    summary = await use_case.execute()

    # only non-cover keys deleted
    deleted = {c.args[0] for c in storage.delete_file.call_args_list}
    assert deleted == {"a.webp", "b.webp"}
    # product image list now holds only the cover
    assert product.image_urls == ["cover.webp"]
    assert product.cover_image_key == "cover.webp"
    repo.update.assert_awaited_once_with(product)
    assert summary["products_pruned"] == 1
    assert summary["images_deleted"] == 2


@pytest.mark.asyncio
async def test_prune_is_noop_when_only_cover_remains():
    product = _sold_product(["cover.webp"], "cover.webp")
    repo = AsyncMock()
    repo.get_sold_before.return_value = [product]
    storage = AsyncMock()

    use_case = PruneSoldProductImagesUseCase(repo, storage, grace_days=30)
    summary = await use_case.execute()

    storage.delete_file.assert_not_awaited()
    repo.update.assert_not_awaited()
    assert summary["products_pruned"] == 0
    assert summary["images_deleted"] == 0


@pytest.mark.asyncio
async def test_prune_skips_product_without_cover():
    # No cover → do NOT delete everything (we'd lose the reference image).
    product = _sold_product(["a.webp", "b.webp"], None)
    repo = AsyncMock()
    repo.get_sold_before.return_value = [product]
    storage = AsyncMock()

    use_case = PruneSoldProductImagesUseCase(repo, storage, grace_days=30)
    summary = await use_case.execute()

    storage.delete_file.assert_not_awaited()
    repo.update.assert_not_awaited()
    assert summary["products_pruned"] == 0
```

- [ ] **Step 2: Run → FAIL**

Run: `cd apps/api && uv run pytest tests/unit/application/use_cases/product/test_prune_sold_product_images.py -v`
Expected: FAIL — module `prune_sold_product_images` not found.

- [ ] **Step 3: Implement the use case**

```python
# src/prosell/application/use_cases/product/prune_sold_product_images.py
"""Prune the galleries of long-sold products down to their cover image."""

from datetime import UTC, datetime, timedelta

from prosell.domain.ports.i_do_spaces_service import IDOSpacesService
from prosell.domain.repositories.product_repository import AbstractProductRepository


class PruneSoldProductImagesUseCase:
    """Delete every non-cover image of products that have been SOLD for at
    least `grace_days`, then rewrite the product's image list to the cover
    only. Idempotent: a product already holding just its cover is skipped;
    a product without a cover is skipped (never delete the last reference)."""

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        storage: IDOSpacesService,
        grace_days: int,
    ) -> None:
        self._products = product_repository
        self._storage = storage
        self._grace_days = grace_days

    async def execute(self) -> dict[str, int]:
        cutoff = datetime.now(UTC) - timedelta(days=self._grace_days)
        products = await self._products.get_sold_before(cutoff)

        products_pruned = 0
        images_deleted = 0

        for product in products:
            cover = product.cover_image_key
            if cover is None:
                continue  # never delete the only reference
            to_delete = [k for k in product.image_urls if k != cover]
            if not to_delete:
                continue  # already pruned

            for key in to_delete:
                await self._storage.delete_file(key)
                images_deleted += 1

            product.image_urls = [cover]
            await self._products.update(product)
            products_pruned += 1

        return {"products_pruned": products_pruned, "images_deleted": images_deleted}
```

NOTE: confirm the storage port path/name — the impl `DOSpacesService` implements `IDOSpacesService` (grep showed `class DOSpacesService(IDOSpacesService)`); import the port from its actual module under `src/prosell/domain/ports/`. If the port is named differently, import that and keep the `delete_file(key) -> bool` contract.

- [ ] **Step 4: Run → PASS**

Run: `cd apps/api && uv run pytest tests/unit/application/use_cases/product/test_prune_sold_product_images.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/prosell/application/use_cases/product/prune_sold_product_images.py tests/unit/application/use_cases/product/test_prune_sold_product_images.py
git commit -m "feat(api): PruneSoldProductImagesUseCase (keep cover, delete rest)"
```

---

## Task 4: taskiq scheduled entrypoint

**Files:** Create `src/prosell/infrastructure/tasks/use_cases/prune_sold_galleries_task.py`

This wires the use case to concrete adapters and exposes it as a `@broker.task`. Scheduling is external (cron → dispatch), matching `refresh_facebook_tokens.py`.

- [ ] **Step 1: Implement the task**

```python
# src/prosell/infrastructure/tasks/use_cases/prune_sold_galleries_task.py
"""Scheduled task: prune long-sold products' galleries to the cover only.

Scheduled to run daily via cron (mirrors refresh_facebook_tokens_task).
"""

from prosell.application.use_cases.product.prune_sold_product_images import (
    PruneSoldProductImagesUseCase,
)
from prosell.core.config import settings
from prosell.infrastructure.database.session import async_session_maker
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)
from prosell.infrastructure.services.do_spaces_service import DOSpacesService
from prosell.infrastructure.tasks.broker import broker


@broker.task
async def prune_sold_galleries_task() -> dict[str, int]:
    async with async_session_maker() as session:
        use_case = PruneSoldProductImagesUseCase(
            SqlAlchemyProductRepository(session),
            DOSpacesService(),
            grace_days=settings.SOLD_IMAGE_GRACE_DAYS,
        )
        summary = await use_case.execute()
        await session.commit()
    return summary
```

NOTE: match `DOSpacesService()` construction to how it is built elsewhere (it may need settings/credentials passed — copy the construction used in `image_router.py` or a DI provider). If a DI provider exists, reuse it instead of `DOSpacesService()`.

- [ ] **Step 2: Verify it imports (no runtime broker needed)**

Run: `cd apps/api && uv run python -c "from prosell.infrastructure.tasks.use_cases.prune_sold_galleries_task import prune_sold_galleries_task; print('ok')"`
Expected: `ok`

- [ ] **Step 3: Register the daily schedule**

Add the daily cron invocation where the other scheduled tasks are wired (mirror how `refresh_facebook_tokens_task` is scheduled — search: `rg -n "refresh_facebook_tokens" src/ docker/ scripts/`). If schedules live in a worker/cron config, add `prune_sold_galleries_task` once per day. If there is no schedule registry yet, document the cron entry in the deploy config and leave the task dispatchable.

- [ ] **Step 4: Lint + typecheck**

Run: `cd apps/api && uv run ruff check src tests && uv run ruff format --check src tests && uv run pyright`
Expected: clean (0 errors).

- [ ] **Step 5: Commit**

```bash
git add src/prosell/infrastructure/tasks/use_cases/prune_sold_galleries_task.py
git commit -m "feat(api): daily taskiq sweep to prune sold product galleries"
```

---

## Self-review (plan author)

- **Spec coverage:** §4 prune mechanism → Tasks 2-4; 30-day grace period → Task 1 setting + Task 3 cutoff; "returns excluded" → Task 2 query (status=SOLD only) + tested; idempotent → Task 3 tests (only-cover no-op); cover preserved + no-cover skip → Task 3 tests; storage delete → Task 3 via `IDOSpacesService.delete_file`. §6 verify-items resolved: `sold_at` already exists (mark_sold sets it — no migration), taskiq is the scheduler, image model = `image_urls` + `cover_image_key`.
- **Placeholders:** none — every step has concrete code/commands. Two NOTEs flag exact-name confirmations (the repo's private entity-mapper method name; the storage port module path / `DOSpacesService` construction) — these are "match the existing pattern", not missing logic.
- **Type consistency:** `get_sold_before(cutoff: datetime) -> list[Product]`, `delete_file(key: str) -> bool`, `execute() -> dict[str,int]`, `image_urls: list[str]`, `cover_image_key: str | None` used consistently across tasks.
- **Out of scope (per spec):** WebP (separate plan), no backfill, no next/image serving.
