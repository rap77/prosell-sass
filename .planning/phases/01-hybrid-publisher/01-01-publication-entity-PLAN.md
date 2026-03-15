---
plan: "01"
phase: 1
wave: 1
depends_on: ["00"]
autonomous: true
files_modified:
  - apps/api/src/prosell/domain/entities/publication.py
  - apps/api/src/prosell/domain/repositories/publication_repository.py
  - apps/api/src/prosell/domain/ports/i_publisher_service.py
  - apps/api/src/prosell/domain/ports/i_image_pipeline.py
  - apps/api/src/prosell/infrastructure/models/publication_model.py
  - apps/api/src/prosell/infrastructure/repositories/publication_repository_impl.py
  - apps/api/src/prosell/infrastructure/models/__init__.py
  - apps/api/alembic/versions/XXXX_add_publications_table.py
  - apps/api/tests/unit/domain/test_publication_entity.py
requirements: [PUBLISH-07]
estimated_tasks: 3

must_haves:
  truths:
    - "Publication entity has 6 states: pending/publishing/published/failed/expired/sold"
    - "mark_published() sets expires_at = published_at + 7 days"
    - "mark_failed(BLOCKING) sets blocked_until_confirmed=True"
    - "is_approaching_expiry(48) returns True when expires_at < now + 48h and status is PUBLISHED"
    - "publications table exists in DB with all fields and indexes"
    - "All 5 unit tests in test_publication_entity.py pass (GREEN, not xfail)"
  artifacts:
    - path: "apps/api/src/prosell/domain/entities/publication.py"
      provides: "Publication entity + PublicationStatus + PublicationErrorCategory enums"
      exports: ["Publication", "PublicationStatus", "PublicationErrorCategory"]
    - path: "apps/api/src/prosell/domain/repositories/publication_repository.py"
      provides: "IPublicationRepository interface"
      exports: ["IPublicationRepository"]
    - path: "apps/api/src/prosell/domain/ports/i_publisher_service.py"
      provides: "IPublisherService port"
      exports: ["IPublisherService"]
    - path: "apps/api/src/prosell/infrastructure/models/publication_model.py"
      provides: "PublicationModel SQLAlchemy ORM"
      contains: "class PublicationModel"
  key_links:
    - from: "apps/api/src/prosell/infrastructure/models/publication_model.py"
      to: "apps/api/src/prosell/infrastructure/database/base.py"
      via: "inherits Base"
      pattern: "class PublicationModel\\(Base\\)"
    - from: "apps/api/src/prosell/infrastructure/repositories/publication_repository_impl.py"
      to: "apps/api/src/prosell/domain/repositories/publication_repository.py"
      via: "implements IPublicationRepository"
      pattern: "IPublicationRepository"
---

<objective>
Build the Publication domain entity and its persistence layer — the data backbone that every other plan in Phase 1 depends on.

Purpose: Without this entity, there is no lifecycle tracking for FB listings. The state machine (pending → published → failed → expired → sold) is the source of truth for retry logic, scheduler, and UI badges.
Output: Publication entity with state machine, IPublicationRepository interface, IPublisherService and IImagePipeline ports, SQLAlchemy model, repository implementation, Alembic migration.
</objective>

<execution_context>
@/home/rpadron/.claude/get-shit-done/workflows/execute-plan.md
@/home/rpadron/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-hybrid-publisher/01-RESEARCH.md
@apps/api/src/prosell/domain/base.py
@apps/api/src/prosell/domain/entities/product.py
@apps/api/src/prosell/domain/repositories/facebook_page_repository.py
@apps/api/src/prosell/infrastructure/models/facebook_account_model.py
@apps/api/src/prosell/infrastructure/repositories/facebook_account_repository_impl.py
@apps/api/tests/unit/domain/test_publication_entity.py

<interfaces>
<!-- Key contracts from existing domain layer -->

From apps/api/src/prosell/domain/base.py:
```python
class DomainModel(BaseModel):
    model_config = ConfigDict(
        frozen=False,
        str_strip_whitespace=True,
        validate_assignment=True,
        from_attributes=True,
    )
```

From apps/api/src/prosell/infrastructure/database/base.py:
```python
# SQLAlchemy declarative base — all models inherit from Base
class Base(DeclarativeBase): ...
```

From apps/api/src/prosell/infrastructure/models/facebook_account_model.py:
```python
class FacebookPageModel(Base):
    __tablename__ = "facebook_pages"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    page_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    page_access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
```
</interfaces>
</context>

<tasks>

<task id="01-01" name="Task 1: Domain layer — Publication entity, ports, and repository interface" tdd="true">
  <objective>Create the pure domain contracts: Publication entity state machine, IPublicationRepository interface, IPublisherService port, IImagePipeline port.</objective>
  <files>
    <create>apps/api/src/prosell/domain/entities/publication.py</create>
    <create>apps/api/src/prosell/domain/repositories/publication_repository.py</create>
    <create>apps/api/src/prosell/domain/ports/i_publisher_service.py</create>
    <create>apps/api/src/prosell/domain/ports/i_image_pipeline.py</create>
  </files>
  <behavior>
    - Test: new Publication with no explicit status defaults to PublicationStatus.PENDING
    - Test: mark_published("fb_123", "playwright", "playwright_v1.42") sets status=PUBLISHED, fb_listing_id="fb_123", expires_at=published_at+7days
    - Test: mark_failed(PublicationErrorCategory.B, "captcha detected") sets status=FAILED, blocked_until_confirmed=True
    - Test: mark_failed(PublicationErrorCategory.A, "timeout") sets status=FAILED, blocked_until_confirmed=False
    - Test: is_approaching_expiry(hours_before=48) returns True when expires_at is 24h from now and status=PUBLISHED
    - Test: mark_sold() sets status=SOLD, sold_at is not None
  </behavior>
  <implementation>
**publication.py** — Follow the pattern from `product.py` (DomainModel subclass). No external imports beyond Python stdlib and `prosell.domain.base`.

```python
from enum import StrEnum
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4
from pydantic import Field
from prosell.domain.base import DomainModel

class PublicationStatus(StrEnum):
    PENDING = "pending"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    EXPIRED = "expired"
    SOLD = "sold"

class PublicationErrorCategory(StrEnum):
    A = "transient"
    B = "blocking"

class Publication(DomainModel):
    id: UUID = Field(default_factory=uuid4)
    product_id: UUID
    tenant_id: UUID
    seller_user_id: UUID
    facebook_page_id: UUID

    status: PublicationStatus = PublicationStatus.PENDING
    strategy_used: str | None = None
    engine_version: str | None = None
    fb_listing_id: str | None = None

    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    price_cents: int = Field(..., gt=0)
    zip_code: str = Field(..., min_length=5, max_length=10)
    image_urls: list[str] = Field(default_factory=list)
    hero_shot_url: str | None = None

    published_at: datetime | None = None
    expires_at: datetime | None = None
    sold_at: datetime | None = None

    error_category: PublicationErrorCategory | None = None
    error_message: str | None = None
    error_detail: str | None = None
    retry_count: int = 0
    last_retry_at: datetime | None = None
    blocked_until_confirmed: bool = False

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def mark_published(self, fb_listing_id: str, strategy: str, engine_version: str) -> None: ...
    def mark_failed(self, category: PublicationErrorCategory, message: str, detail: str = "") -> None: ...
    def mark_publishing(self) -> None: ...
    def increment_retry(self) -> None: ...
    def unlock_from_category_b(self) -> None: ...
    def mark_sold(self) -> None: ...
    def mark_expired(self) -> None: ...
    def is_approaching_expiry(self, hours_before: int = 48) -> bool: ...
```

**publication_repository.py** — ABC with abstractmethods following the same pattern as `facebook_page_repository.py`:
- `create(publication) -> Publication`
- `get_by_id(publication_id) -> Publication | None`
- `get_by_product_id(product_id) -> list[Publication]`
- `get_active_by_seller(seller_user_id) -> list[Publication]`
- `get_approaching_expiry(hours_before: int = 48) -> list[Publication]` — used by scheduler
- `update(publication) -> Publication`

**i_publisher_service.py** — ABC port for both Playwright and Graph API adapters:
```python
from abc import ABC, abstractmethod
from prosell.domain.entities.publication import Publication

class IPublisherService(ABC):
    @abstractmethod
    async def publish(self, publication: Publication, access_token: str, image_bytes_list: list[bytes]) -> str:
        """Publish vehicle listing. Returns fb_listing_id."""

    @abstractmethod
    async def update(self, publication: Publication, access_token: str, image_bytes_list: list[bytes]) -> None:
        """Update existing listing on Facebook."""

    @abstractmethod
    async def delete(self, publication: Publication, access_token: str) -> None:
        """Delete/remove listing from Facebook."""
```

**i_image_pipeline.py** — Port for image processing:
```python
from abc import ABC, abstractmethod

class IImagePipeline(ABC):
    @abstractmethod
    async def process(self, image_bytes: bytes) -> bytes:
        """Compress, resize to 1080px, convert to JPG, strip EXIF. Returns processed bytes."""
```

Write the tests in `test_publication_entity.py` first (RED), then implement the entity methods (GREEN).
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run pytest tests/unit/domain/test_publication_entity.py -v --tb=short</automated>
  </verify>
</task>

<task id="01-02" name="Task 2: SQLAlchemy model and repository implementation">
  <objective>Create PublicationModel (ORM) and SqlAlchemyPublicationRepository with all query methods the use cases and scheduler need.</objective>
  <files>
    <create>apps/api/src/prosell/infrastructure/models/publication_model.py</create>
    <create>apps/api/src/prosell/infrastructure/repositories/publication_repository_impl.py</create>
    <modify>apps/api/src/prosell/infrastructure/models/__init__.py</modify>
  </files>
  <implementation>
**publication_model.py** — Follow exact same pattern as `FacebookAccountModel`. Use `Mapped[]` and `mapped_column()` throughout. Table name: `publications`.

Critical fields and their DB types:
- `id: Mapped[UUID]` — primary_key=True, default=uuid4
- `product_id: Mapped[UUID]` — ForeignKey("products.id", ondelete="CASCADE"), index=True
- `tenant_id: Mapped[UUID]` — ForeignKey("organizations.id", ondelete="CASCADE"), index=True
- `seller_user_id: Mapped[UUID | None]` — ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
- `facebook_page_id: Mapped[UUID | None]` — ForeignKey("facebook_pages.id", ondelete="SET NULL"), nullable=True, index=True
- `status: Mapped[str]` — String(50), default="pending", index=True
- `strategy_used: Mapped[str | None]` — String(50), nullable=True
- `engine_version: Mapped[str | None]` — String(100), nullable=True
- `fb_listing_id: Mapped[str | None]` — String(255), nullable=True, index=True
- `title: Mapped[str]` — String(500)
- `description: Mapped[str | None]` — Text, nullable=True
- `price_cents: Mapped[int]` — Integer
- `zip_code: Mapped[str]` — String(20)
- `image_urls: Mapped[list]` — JSON, default=list
- `hero_shot_url: Mapped[str | None]` — String(500), nullable=True
- `published_at: Mapped[datetime | None]` — DateTime(timezone=True), nullable=True
- `expires_at: Mapped[datetime | None]` — DateTime(timezone=True), nullable=True, index=True (scheduler queries this)
- `sold_at: Mapped[datetime | None]` — DateTime(timezone=True), nullable=True
- `error_category: Mapped[str | None]` — String(50), nullable=True
- `error_message: Mapped[str | None]` — Text, nullable=True
- `error_detail: Mapped[str | None]` — Text, nullable=True
- `retry_count: Mapped[int]` — Integer, default=0
- `last_retry_at: Mapped[datetime | None]` — DateTime(timezone=True), nullable=True
- `blocked_until_confirmed: Mapped[bool]` — Boolean, default=False
- `created_at: Mapped[datetime]` — DateTime(timezone=True), server_default="now()"
- `updated_at: Mapped[datetime]` — DateTime(timezone=True), server_default="now()"

**publication_repository_impl.py** — `SqlAlchemyPublicationRepository(IPublicationRepository)`:
- Constructor: `__init__(self, session: AsyncSession)`
- `create()`: `session.add(model)` + `await session.flush()` + return entity
- `get_by_id()`: `select(PublicationModel).where(PublicationModel.id == publication_id)`
- `get_approaching_expiry()`: `select(PublicationModel).where(PublicationModel.status == "published", PublicationModel.expires_at < datetime.now(UTC) + timedelta(hours=hours_before))` — this is the scheduler's query
- `update()`: load model by id, update all fields from entity, flush
- Mapper helper `_to_entity(model)` and `_to_model(entity)` following the same pattern as `product_repository_impl.py`

**models/__init__.py** — Add import of `PublicationModel` so Alembic autogenerate detects it.
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run python -c "from prosell.infrastructure.models.publication_model import PublicationModel; print(PublicationModel.__tablename__)"</automated>
  </verify>
</task>

<task id="01-03" name="Task 3: Alembic migration for publications table">
  <objective>Generate and apply the Alembic migration that creates the publications table in PostgreSQL.</objective>
  <files>
    <create>apps/api/alembic/versions/XXXX_add_publications_table.py</create>
  </files>
  <implementation>
Run Alembic autogenerate from the `apps/api` directory:

```bash
cd /home/rpadron/proy/prosell-sass/apps/api
uv run alembic revision --autogenerate -m "add_publications_table"
```

This generates a migration file under `alembic/versions/`. Review the generated file to confirm it contains:
- `op.create_table("publications", ...)` with all columns
- Indexes on `product_id`, `tenant_id`, `seller_user_id`, `facebook_page_id`, `status`, `fb_listing_id`, `expires_at`
- Foreign keys to `products.id`, `organizations.id`, `users.id`, `facebook_pages.id`

Then apply:
```bash
cd /home/rpadron/proy/prosell-sass/apps/api
uv run alembic upgrade head
```

If the DB Docker container is not running, start it first:
```bash
docker start prosell-db
```

If autogenerate produces an empty migration (no detected changes), it means `PublicationModel` is not imported in `alembic/env.py` or `models/__init__.py`. Fix the import chain and retry.
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/api && uv run alembic current 2>&1 | head -5</automated>
  </verify>
</task>

</tasks>

<verification>
After all tasks complete:

1. `uv run pytest tests/unit/domain/test_publication_entity.py -v` — all 5 tests GREEN (not xfail)
2. `uv run python -c "from prosell.domain.entities.publication import Publication, PublicationStatus; p = Publication(product_id=__import__('uuid').uuid4(), tenant_id=__import__('uuid').uuid4(), seller_user_id=__import__('uuid').uuid4(), facebook_page_id=__import__('uuid').uuid4(), title='Test', price_cents=10000, zip_code='90210'); print(p.status)"` prints `pending`
3. `uv run alembic current` shows head at the publications migration
4. `uv run pytest tests/unit/ -x --tb=short` — all tests pass
</verification>

<success_criteria>
- [ ] Publication entity has 6-state machine with all transition methods implemented
- [ ] IPublisherService and IImagePipeline ports defined as ABCs in domain/ports/
- [ ] IPublicationRepository interface defines all needed query methods including get_approaching_expiry()
- [ ] PublicationModel has expires_at indexed (required for scheduler query performance)
- [ ] Alembic migration applied — publications table exists in DB
- [ ] 5 tests in test_publication_entity.py are GREEN
</success_criteria>

<output>
After completion, create `.planning/phases/01-hybrid-publisher/01-01-SUMMARY.md`
</output>
