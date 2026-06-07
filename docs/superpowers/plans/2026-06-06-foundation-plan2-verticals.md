# Foundation Plan 2 — Global Verticals, Org↔Vertical M2M, Read-API & Update Composition

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Foundation: make categories GLOBAL templates, let an organization operate in N verticals (M2M), expose a read-API that drives the frontend (presentation + filters + category tree), and move product-title recomposition on UPDATE into a dedicated use case.

**Architecture:** Verticals are root `Category` rows (`level 0`) with `tenant_id = NULL` (global templates). `organization_vertical` links an org to the verticals it enabled. The presentation contract (added in Plan 1) is resolved with ancestor inheritance. A new `UpdateProductUseCase` mirrors `CreateProductUseCase` and recomposes the title via the existing `template_composer.resolve_title`.

**Tech Stack:** Python 3.13, Pydantic v2 entities, SQLAlchemy 2.0 (`Mapped`, JSONB), Alembic, FastAPI, pytest (unit + integration on test DB `localhost:5433`).

**Branch:** `feat/category-presentation-foundation` (continues Plan 1).

**Prereqs / known facts (from Plan 1):**
- `Category` entity (pydantic `DomainModel`): `tenant_id: UUID`, `parent_id`, `level`, `field_config`, `attribute_schema`, `presentation: dict|None`. `Category.create(name, slug, tenant_id, parent_id=None, level=0, **kwargs)`.
- `CategoryModel`: `tenant_id` non-nullable today; `updated_at` already uses `onupdate=func.now()` (Plan 1 fix).
- `AbstractCategoryRepository` has `get_by_id(id, tenant_id)`, `get_children(parent_id, tenant_id)`, `get_tree(tenant_id)`, `get_ancestor_ids(id, tenant_id)`.
- `template_composer.resolve_title(presentation, attributes, fallback)` exists and is unit-tested.
- `CreateProductUseCase` (create_product.py) is the mirror to copy for `UpdateProductUseCase`.
- TEST DB: after a model column/table change, recreate schema: connect `postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test`, run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` then `Base.metadata.create_all`. Start DB with `bash scripts/setup-test-db.sh`.
- Alembic dev apply may fail locally (alembic.ini creds); verify migrations against the test DB / by review.

**Scope note:** This plan completes the Foundation spec's deferred items (§3.1 global-ization, §3.3 filterable, §3.4 M2M, §5 read-API, §4 update composition). Data backfill/seeding of real global templates is a separate ops step (see Task 7) — the app is not fully in production, so a clean reseed is acceptable.

---

## File structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/prosell/domain/entities/category.py` | `tenant_id` optional | Modify |
| `src/prosell/infrastructure/models/category_model.py` | `tenant_id` nullable | Modify |
| `src/prosell/domain/entities/organization_vertical.py` | M2M entity | Create |
| `src/prosell/infrastructure/models/organization_vertical_model.py` | M2M table | Create |
| `src/prosell/domain/repositories/organization_vertical_repository.py` | M2M port | Create |
| `src/prosell/infrastructure/repositories/organization_vertical_repository_impl.py` | M2M adapter | Create |
| `alembic/versions/<rev>_global_categories_and_org_verticals.py` | migration | Create |
| `src/prosell/domain/services/presentation_resolver.py` | inherit presentation + filter fields | Create |
| `src/prosell/application/use_cases/organization/list_org_verticals.py` | read-API use case | Create |
| `src/prosell/application/dto/organization/verticals.py` | read-API DTOs | Create |
| `src/prosell/infrastructure/api/routers/organization_router.py` (or existing) | `GET /organizations/{id}/verticals` | Modify/Create |
| `src/prosell/application/use_cases/product/update_product.py` | update + title recompose | Create |
| `src/prosell/infrastructure/api/routers/product_router.py` | PATCH delegates to use case | Modify |

---

## Task 1: Make `Category.tenant_id` nullable (global templates)

**Files:** `category.py`, `category_model.py`, migration; Test: `tests/unit/domain/entities/test_category_global.py`

- [ ] **Step 1: Failing test**

```python
# tests/unit/domain/entities/test_category_global.py
from prosell.domain.entities.category import Category

def test_global_category_has_no_tenant():
    cat = Category.create(name="Vehicles", slug="vehicles", tenant_id=None)
    assert cat.tenant_id is None
    assert cat.level == 0
```

- [ ] **Step 2: Run → FAIL** — `Category.create` requires `tenant_id: UUID` / pydantic rejects None.
Run: `cd apps/api && uv run pytest tests/unit/domain/entities/test_category_global.py -v`

- [ ] **Step 3: Implement**
In `category.py`: change `tenant_id: UUID` → `tenant_id: UUID | None = None`. Change `Category.create(..., tenant_id: UUID | None, ...)` signature accordingly.
In `category_model.py`: change the `tenant_id` column to `nullable=True` (keep the index).

- [ ] **Step 4: Run → PASS**. Then recreate the test DB schema (model changed): use the DROP SCHEMA snippet above.

- [ ] **Step 5: Migration**
Run: `uv run alembic revision -m "global categories: tenant_id nullable + organization_vertical"` (note path). In `upgrade()`:
```python
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

def upgrade() -> None:
    op.alter_column("categories", "tenant_id", existing_type=postgresql.UUID(), nullable=True)
    op.create_table(
        "organization_vertical",
        sa.Column("organization_id", postgresql.UUID(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("root_category_id", postgresql.UUID(), sa.ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("enabled_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

def downgrade() -> None:
    op.drop_table("organization_vertical")
    op.alter_column("categories", "tenant_id", existing_type=postgresql.UUID(), nullable=False)
```
(This migration also creates the Task 2 table — they ship together.)

- [ ] **Step 6: Commit** — `feat(api): categories become global templates (tenant_id nullable) + organization_vertical table`

---

## Task 2: `organization_vertical` entity, model, repository

**Files:** entity, model, port, impl; Test: `tests/integration/repositories/test_organization_vertical_repository.py`

- [ ] **Step 1: Failing integration test**

```python
# tests/integration/repositories/test_organization_vertical_repository.py
import pytest
from uuid import uuid4
from prosell.domain.entities.category import Category
from prosell.infrastructure.repositories.category_repository_impl import SqlAlchemyCategoryRepository
from prosell.infrastructure.repositories.organization_vertical_repository_impl import (
    SqlAlchemyOrganizationVerticalRepository,
)

@pytest.mark.asyncio
async def test_enable_and_list_verticals(db_session, test_organization):
    cat_repo = SqlAlchemyCategoryRepository(db_session)
    vehicles = await cat_repo.create(Category.create(name="Vehicles", slug=f"veh-{uuid4().hex[:6]}", tenant_id=None, level=0))
    realestate = await cat_repo.create(Category.create(name="Real Estate", slug=f"re-{uuid4().hex[:6]}", tenant_id=None, level=0))

    repo = SqlAlchemyOrganizationVerticalRepository(db_session)
    await repo.enable(test_organization.id, vehicles.id)
    await repo.enable(test_organization.id, realestate.id)

    ids = await repo.list_root_category_ids(test_organization.id)
    assert vehicles.id in ids and realestate.id in ids
```

- [ ] **Step 2: Run → FAIL** (module/table missing). Recreate test DB schema first.

- [ ] **Step 3: Implement entity** `src/prosell/domain/entities/organization_vertical.py`
```python
from datetime import UTC, datetime
from uuid import UUID
from pydantic import Field
from prosell.domain.base import DomainModel

class OrganizationVertical(DomainModel):
    organization_id: UUID
    root_category_id: UUID
    enabled_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
```

- [ ] **Step 4: Implement model** `src/prosell/infrastructure/models/organization_vertical_model.py`
```python
from datetime import datetime
from uuid import UUID
from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from prosell.infrastructure.database.base import Base

class OrganizationVerticalModel(Base):
    __tablename__ = "organization_vertical"
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True)
    root_category_id: Mapped[UUID] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)
    enabled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
```
Ensure it's imported in `prosell/infrastructure/models/__init__.py` so `create_all`/Alembic sees it.

- [ ] **Step 5: Implement port + adapter**
Port `src/prosell/domain/repositories/organization_vertical_repository.py`:
```python
from typing import Protocol
from uuid import UUID

class AbstractOrganizationVerticalRepository(Protocol):
    async def enable(self, organization_id: UUID, root_category_id: UUID) -> None: ...
    async def list_root_category_ids(self, organization_id: UUID) -> list[UUID]: ...
```
Adapter `src/prosell/infrastructure/repositories/organization_vertical_repository_impl.py`:
```python
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from prosell.infrastructure.models.organization_vertical_model import OrganizationVerticalModel

class SqlAlchemyOrganizationVerticalRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def enable(self, organization_id: UUID, root_category_id: UUID) -> None:
        stmt = pg_insert(OrganizationVerticalModel).values(
            organization_id=organization_id, root_category_id=root_category_id,
        ).on_conflict_do_nothing()
        await self.session.execute(stmt)
        await self.session.flush()

    async def list_root_category_ids(self, organization_id: UUID) -> list[UUID]:
        stmt = select(OrganizationVerticalModel.root_category_id).where(
            OrganizationVerticalModel.organization_id == organization_id
        )
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]
```

- [ ] **Step 6: Run → PASS**. **Step 7: Commit** — `feat(api): organization_vertical entity/model/repository`

---

## Task 3: Presentation inheritance + filter-field resolvers (pure)

**Files:** `src/prosell/domain/services/presentation_resolver.py`; Test: `tests/unit/domain/services/test_presentation_resolver.py`

- [ ] **Step 1: Failing test**
```python
from prosell.domain.services.presentation_resolver import resolve_presentation, filter_fields

def test_resolve_presentation_prefers_own():
    own = {"title_template": "{a}"}
    assert resolve_presentation(own, [None, {"title_template": "{b}"}]) == own

def test_resolve_presentation_inherits_nearest_ancestor():
    # ancestors ordered nearest-first; first non-None wins
    assert resolve_presentation(None, [None, {"title_template": "{b}"}]) == {"title_template": "{b}"}

def test_resolve_presentation_none_when_no_source():
    assert resolve_presentation(None, [None, None]) is None

def test_filter_fields_extracts_filterable_only():
    schema = {
        "make": {"type": "string", "filterable": True, "filter_type": "select"},
        "year": {"type": "number", "filterable": True, "filter_type": "range"},
        "mileage": {"type": "number"},
    }
    out = filter_fields(schema)
    assert out == [
        {"field": "make", "filter_type": "select"},
        {"field": "year", "filter_type": "range"},
    ]
```

- [ ] **Step 2: Run → FAIL**. **Step 3: Implement**
```python
# src/prosell/domain/services/presentation_resolver.py
from collections.abc import Mapping, Sequence

def resolve_presentation(
    own: Mapping[str, object] | None,
    ancestors_nearest_first: Sequence[Mapping[str, object] | None],
) -> Mapping[str, object] | None:
    """Own presentation wins; else the nearest ancestor that has one."""
    if own:
        return own
    for anc in ancestors_nearest_first:
        if anc:
            return anc
    return None

def filter_fields(attribute_schema: Mapping[str, object]) -> list[dict[str, str]]:
    """Extract the filterable fields (in declared order) for the catalog UI."""
    out: list[dict[str, str]] = []
    for name, defn in attribute_schema.items():
        if isinstance(defn, dict) and defn.get("filterable"):
            out.append({"field": name, "filter_type": str(defn.get("filter_type", "text"))})
    return out
```

- [ ] **Step 4: Run → PASS**. **Step 5: Commit** — `feat(api): presentation inheritance + filter-field resolvers`

---

## Task 4: Read-API `GET /api/v1/organizations/{id}/verticals`

**Files:** DTO, use case, router; Test: `tests/integration/api/test_org_verticals.py`

- [ ] **Step 1: Failing integration test** — use the existing `async_client_as_admin` + `admin_user` fixtures (see `tests/integration/api/test_product_c3.py`). Seed via db: create two global root categories with `presentation`, one child under one of them, enable both for the admin's org (org id == tenant_id), then GET and assert structure. If the API client and db_session don't share a session in this harness, seed through repos within the same override session used by the client (mirror test_product_c3 setup).

```python
# Skeleton (adapt fixtures to the project's API test harness):
@pytest.mark.asyncio
async def test_list_org_verticals_returns_enabled_with_subtree(async_client_as_admin, admin_user, db_session):
    # ... seed two global root categories (tenant_id=None) with presentation,
    #     one child, enable both for admin_user.tenant_id ...
    resp = await async_client_as_admin.get(f"/api/v1/organizations/{admin_user.tenant_id}/verticals")
    assert resp.status_code == 200
    body = resp.json()
    slugs = {v["slug"] for v in body["verticals"]}
    assert "vehicles" in slugs
```

- [ ] **Step 2: Run → FAIL** (404, no route). **Step 3: Implement DTO** `src/prosell/application/dto/organization/verticals.py`
```python
from uuid import UUID
from pydantic import BaseModel

class CategoryNode(BaseModel):
    id: UUID
    name: str
    slug: str
    attribute_schema: dict = {}
    presentation: dict | None = None
    filter_fields: list[dict] = []

class VerticalResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    presentation: dict | None = None
    categories: list[CategoryNode] = []

class OrgVerticalsResponse(BaseModel):
    verticals: list[VerticalResponse]
```

- [ ] **Step 4: Implement use case** `src/prosell/application/use_cases/organization/list_org_verticals.py`
For each enabled root id: load the root (`category_repo.get_by_id(root_id, UUID(int=0))` — tenant filter skipped for globals), then `get_children(root_id, UUID(int=0))`. Resolve each node's presentation via `resolve_presentation(node.presentation, [root.presentation])` and `filter_fields(node.attribute_schema)`. Assemble DTOs.
NOTE: confirm `get_by_id`/`get_children` accept `UUID(int=0)` to bypass the tenant filter for global rows (they do in the product repo pattern); if the category repo enforces tenant, add a tenant-agnostic read or pass the sentinel.

- [ ] **Step 5: Implement endpoint** — add to the organization router (or create one, registered in `main.py` like the others):
```python
@router.get("/{organization_id}/verticals", response_model=OrgVerticalsResponse)
async def list_org_verticals(organization_id: UUID, current_user: User = Depends(get_current_auth_user_from_cookie), db: AsyncSession = Depends(get_async_session)) -> OrgVerticalsResponse:
    if current_user.tenant_id != organization_id:
        raise HTTPException(status_code=403, detail="Cannot read another org's verticals")
    use_case = ListOrgVerticalsUseCase(SqlAlchemyOrganizationVerticalRepository(db), SqlAlchemyCategoryRepository(db))
    return await use_case.execute(organization_id)
```

- [ ] **Step 6: Run → PASS**. **Step 7: Commit** — `feat(api): GET /organizations/{id}/verticals read-API`

---

## Task 5: `UpdateProductUseCase` with server-side title recomposition

**Files:** `src/prosell/application/use_cases/product/update_product.py`, `product_router.py`; Test: `tests/integration/use_cases/test_update_product_use_case.py` + update the existing PATCH unit tests.

**Why a use case:** Plan 1 deferred update-composition because adding an inline category DB call to the PATCH router broke unit tests that mock only the product repo. A use case (taking product_repo + category_repo) is the clean home, mirrors `CreateProductUseCase`, and the router delegates to it.

- [ ] **Step 1: Failing integration test**
```python
@pytest.mark.asyncio
async def test_update_recomposes_title_from_template(db_session, test_organization, test_category):
    test_category.presentation = {"title_template": "{year} {make} {model}"}
    await db_session.flush()
    # create a product (via CreateProductUseCase) with model=Civic, then update model=Accord
    # assert the persisted title becomes "2020 Honda Accord"
```

- [ ] **Step 2: Run → FAIL**. **Step 3: Implement** `UpdateProductUseCase` mirroring `CreateProductUseCase`: load product, load category, apply the request's set fields (title/description/price/category/condition/attributes/image_urls/cover_image_key with the SAME cross-field cover checks the router does today — move `_merged_image_url_candidates` logic or import it), then `product.title = resolve_title(category.presentation, product.attributes or {}, fallback=product.title)`, then `repo.update(product)`.

- [ ] **Step 4: Wire the router** — replace the inline field-by-field block in `product_router.py` PATCH with a delegation to `UpdateProductUseCase(SqlAlchemyProductRepository(db), SqlAlchemyCategoryRepository(db)).execute(product_id, tenant_id, request)`. Keep `validate_image_urls_for_tenant` at the router boundary.

- [ ] **Step 5: Fix the unit tests** in `tests/unit/api/routers/test_update_product_cover_legacy_data.py` — they `patch(...SqlAlchemyProductRepository)`; now also patch `...SqlAlchemyCategoryRepository` to return a category with `presentation=None` (so `resolve_title` falls back to the existing title and the cover assertions are unchanged).

- [ ] **Step 6: Run** the PATCH unit tests + the new integration test → PASS. **Step 7: Commit** — `feat(api): UpdateProductUseCase recomposes title; PATCH delegates to it`

---

## Task 6: Audit category reads for tenant filters

- [ ] Grep category reads for hard tenant filters that would now exclude global (NULL-tenant) rows:
Run: `rg -n "tenant_id" src/prosell/infrastructure/repositories/category_repository_impl.py`
- [ ] For any read that products/verticals depend on, ensure NULL-tenant (global) categories are returned (e.g., `WHERE tenant_id == :t OR tenant_id IS NULL`, or use the `UUID(int=0)` bypass already present in `get_by_id`). Add/adjust a test if behavior changes.
- [ ] **Commit** — `fix(api): category reads include global (null-tenant) templates`

---

## Task 7: Seed global vertical templates (ops / data)

Not code-under-test — a seed/migration-data step. Decide in execution: extend `init_data.py` (ORM seeding) to insert the global Vehicles vertical (root category, `tenant_id=NULL`, with `presentation` + `attribute_schema` incl. `filterable` flags) and enable it for existing orgs via `organization_vertical`. Because the app is not fully in production, a clean reseed of category data is acceptable. Backfill existing `Product.category_id` to the global category ids and recompose titles.

- [ ] Implement the seed, run it against dev, verify the catalog renders. **Commit** — `chore(api): seed global Vehicles vertical template`

---

## Self-review (plan author)
- **Spec coverage:** §3.1 global-ization (T1), §3.4 M2M (T1+T2), §3.3 filterable (T3 + read-API T4), §5 read-API (T4), §4 update composition (T5), migration risk (T1+T6+T7). No silent gaps.
- **Placeholders:** the read-API integration test (T4 step 1) and the seed (T7) are intentionally adapt-to-harness/ops; every code task has concrete code. The T4 test skeleton must be fleshed out against the project's API test fixtures at execution.
- **Type consistency:** `resolve_title(presentation, attributes, fallback)`, `resolve_presentation(own, ancestors)`, `filter_fields(schema)`, repo `list_root_category_ids(org_id)` / `enable(org_id, root_id)` used consistently across tasks.
