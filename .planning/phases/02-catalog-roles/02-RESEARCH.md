# Phase 02: Catalog & Roles - Research

**Researched:** 2026-03-29
**Domain:** Multi-tenant catalog with role-based access control, M:N relationships, dynamic filtering
**Confidence:** HIGH

## Summary

Phase 02 implements the internal catalog system with role-based access control, enabling dealers (organizations) to manage their vehicle inventory and ProSell users to view assigned inventories. The phase introduces three new entities (Dealer, UserDealer for M:N relationship, and extended Vehicle queries) with cursor-based pagination and dynamic field-based filtering.

**Primary recommendation:** Follow existing Clean Architecture patterns from Phase 1 (Publication, Organization, Team entities) — domain entities with SQLAlchemy 2.0 async repositories, `select()` statements with tenant isolation, and interface-based dependency injection.

**Key technical challenges:**
1. **M:N relationship implementation** — UserDealer junction table following TeamMember pattern
2. **Role-based query filtering** — Subquery pattern for dealer access control
3. **Dynamic filtering** — Category.field_config-driven query building
4. **Cursor-based pagination** — Phase 8 Brain #5 consistency requirement

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Área 1: Filtrado por rol/organización**
- Backend query forcing with role-specific SQL patterns (Admin sees all, Vendedor sees assigned dealers, Dealer sees own)
- JWT structure without dealer_id (M:N requires dynamic lookup)
- Admin override: role=admin skips dealer_id filtering
- Error handling: 401 for unauthorized access, fail fast

**Área 2: Dealer (Organization) entity & creación**
- New independent entity (not flag in Organization)
- Full production-ready fields from start (location, timezone, settings JSONB)
- UI creation via modal (reusing PublishModal pattern)
- Slug generation: auto from name + editable, unique per tenant_id

**Área 3: Asignación vendedor-dealer (M:N)**
- M:N relationship confirmed (one seller ↔ multiple dealers)
- UserDealer junction table with audit fields (assigned_at, assigned_by)
- UI: Both dropdown in user form + bulk actions from DataGrid
- Free assignment changes: admin can add/remove anytime, historical preservation

**Área 4: Backend API endpoints**
- Role-specific endpoints: Admin `/api/vehicles`, Vendedor `/api/vehicles` (with/without dealer_id), Dealer `/api/dealers/{id}/vehicles`
- Cursor-based pagination: `next_cursor`, `has_more`, `limit` parameters
- Publication state as array (respects Phase 1 Publication entity)
- Dynamic filters via field_config (MercadoLibre/Amazon style)
- Order by dealer for ProSell (dealer_id, then created_at DESC)

### Claude's Discretion

None — all 4 areas locked by user decisions.

### Deferred Ideas (OUT OF SCOPE)

None deferred.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| **CATALOG-01** | Vendedor ve catálogo interno de vehículos de sus dealers asignados con estado de publicación | UserDealer M:N subquery pattern, Publication state array from Phase 1 |
| **CATALOG-02** | Admin ProSell ve catálogo global de todas las organizaciones | Admin override pattern (skip dealer_id filter) |
| **CATALOG-03** | Dealer ve y modifica solo su propio inventario | Dealer-specific endpoint `/api/dealers/{id}/vehicles` |
| **CATALOG-04** | Cada vehículo muestra precio propio vs precio promedio de mercado (delta %) | Deferred to Phase 6 (Market Intelligence) — requires CarGurus scraped data |
| **CATALOG-05** | Admin puede crear un dealer sin cuenta de usuario | Dealer entity independent from User entity (tenant_id only) |
| **CATALOG-06** | Vendedor usa su propia cuenta de Facebook para publicar | Already implemented in Phase 1 (seller_user_id in Publication) |
| **CATALOG-07** | Admin puede asignar vendedores a dealers; Manager puede asignar vendedores de su equipo | UserDealer M:N with bulk actions UI |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **SQLAlchemy** | 2.0.36+ | ORM with async support | Project uses `Mapped[]`, `mapped_column()`, `select()` pattern |
| **Pydantic** | 2.12+ | Domain entity validation | All entities inherit from `DomainModel` (BaseModel) |
| **asyncpg** | 0.30.0 | PostgreSQL async driver | Required for SQLAlchemy async engine |
| **FastAPI** | 0.115+ | API endpoints with dependency injection | Existing routers follow `Depends()` pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **pytest-asyncio** | 0.24.0 | Async test fixtures | `asyncio_mode=auto` in pyproject.toml |
| **Alembic** | 1.14.0 | Database migrations | Create new tables: dealers, user_dealers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| M:N junction table | Embedded JSONB array | Lost queryability, no audit trail, no FK constraints |
| Subquery filtering | Multiple API calls | N+1 problem, slower, inconsistent snapshots |
| Cursor pagination | Offset pagination | O(N) performance, deep pagination issues |

**Installation:**
```bash
# Already installed in apps/api/pyproject.toml
# No new dependencies required
```

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/prosell/
├── domain/
│   ├── entities/
│   │   ├── dealer.py              # NEW: Dealer (Organization) entity
│   │   └── user_dealer.py          # NEW: UserDealer junction entity
│   ├── repositories/
│   │   ├── dealer_repository.py    # NEW: AbstractDealerRepository
│   │   └── user_dealer_repository.py # NEW: AbstractUserDealerRepository
│   └── exceptions/
│       └── dealer_exceptions.py    # NEW: DealerNotFound, SlugNotUnique
├── infrastructure/
│   ├── models/
│   │   ├── dealer_model.py         # NEW: SQLAlchemy ORM model
│   │   └── user_dealer_model.py    # NEW: Junction table model
│   ├── repositories/
│   │   ├── dealer_repository_impl.py   # NEW: Async SQL implementation
│   │   └── user_dealer_repository_impl.py
│   └── api/routers/
│       └── dealer_router.py        # NEW: FastAPI router
└── application/use_cases/
    ├── create_dealer.py            # NEW: Use case
    ├── assign_user_dealer.py       # NEW: M:N assignment
    └── get_vehicle_catalog.py      # NEW: Role-based filtering
```

### Pattern 1: Clean Architecture Entity (Domain Layer)

**What:** Pure Python domain entities with no external dependencies, business logic encapsulated.

**When to use:** ALL domain entities (Dealer, UserDealer, Vehicle queries).

**Example:**
```python
# Source: Existing prosell/domain/entities/organization.py
from datetime import UTC, datetime
from uuid import UUID, uuid4
from pydantic import Field
from prosell.domain.base import DomainModel

class Dealer(DomainModel):
    """Dealer entity (aka Organization)."""

    # Identity
    id: UUID
    tenant_id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)

    # Location
    location_address: str | None = None
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None

    # Business
    timezone: str = "America/Montevideo"
    settings: dict[str, object] = Field(default_factory=dict)

    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(cls, name: str, tenant_id: UUID, slug: str | None = None) -> "Dealer":
        """Factory method for new dealer creation."""
        return cls(
            id=uuid4(),
            name=name,
            tenant_id=tenant_id,
            slug=slug or cls._generate_slug(name),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    @staticmethod
    def _generate_slug(name: str) -> str:
        """Generate SEO-friendly slug from name."""
        return name.lower().replace(" ", "-")
```

### Pattern 2: M:N Junction Table (TeamMember Reference)

**What:** SQLAlchemy junction table with audit fields, composite unique constraint.

**When to use:** UserDealer M:N relationship.

**Example:**
```python
# Source: Existing prosell/infrastructure/models/team_model.py
from datetime import datetime
from uuid import UUID
from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

class UserDealerModel(Base):
    """Junction table for User ↔ Dealer M:N relationship."""

    __tablename__ = "user_dealers"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dealer_id: Mapped[UUID] = mapped_column(
        ForeignKey("dealers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)

    # Audit
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )
    assigned_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Composite unique constraint (prevent duplicate assignments)
    __table_args__ = (
        Index("ix_user_dealers_user_dealer", "user_id", "dealer_id", unique=True),
    )
```

### Pattern 3: Role-Based Query Filtering (Repository Layer)

**What:** Dynamic SQL queries based on JWT role, tenant isolation always enforced.

**When to use:** Vehicle catalog queries in `VehicleRepository`.

**Example:**
```python
# Source: Existing prosell/infrastructure/repositories/organization_repository_impl.py
from sqlalchemy import select, and_
from prosell.domain.entities.user import User

class SqlAlchemyVehicleRepository(AbstractVehicleRepository):
    async def get_catalog_for_user(
        self,
        user: User,
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[Vehicle], str | None, bool]:
        """
        Get vehicle catalog based on user role.

        Returns: (vehicles, next_cursor, has_more)
        """
        # Base query with tenant isolation (ALWAYS enforced)
        stmt = select(VehicleModel).join(ProductModel).where(
            ProductModel.tenant_id == user.tenant_id,
        )

        # Role-based filtering
        if user.has_role("admin"):
            # Admin sees all vehicles in tenant (no dealer filter)
            pass
        elif user.has_role("dealer"):
            # Dealer sees only their vehicles
            stmt = stmt.where(ProductModel.organization_id == user.dealer_id)
        else:  # seller, manager
            # ProSell users see assigned dealers
            user_dealer_ids = await self._get_user_dealer_ids(user.id, user.tenant_id)
            if not user_dealer_ids:
                raise Unauthorized("No dealers assigned to user")
            stmt = stmt.where(ProductModel.organization_id.in_(user_dealer_ids))

        # Cursor pagination
        if cursor:
            stmt = stmt.where(VehicleModel.id > decode_cursor(cursor))

        # Order by dealer, then created_at DESC (CONTEXT decision)
        stmt = stmt.order_by(
            ProductModel.organization_id,
            VehicleModel.created_at.desc(),
        ).limit(limit + 1)  # Fetch +1 to check has_more

        result = await self.session.execute(stmt)
        models = result.scalars().all()

        has_more = len(models) > limit
        if has_more:
            models = models[:limit]
            next_cursor = encode_cursor(models[-1].id)
        else:
            next_cursor = None

        vehicles = [self._to_entity(m) for m in models]
        return vehicles, next_cursor, has_more

    async def _get_user_dealer_ids(self, user_id: UUID, tenant_id: UUID) -> list[UUID]:
        """Subquery to fetch user's assigned dealer IDs."""
        stmt = select(UserDealerModel.dealer_id).where(
            UserDealerModel.user_id == user_id,
            UserDealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
```

### Anti-Patterns to Avoid

- **Direct ORM relationships in domain:** Domain entities should NOT have `relationship()` — use lazy-loaded IDs only
- **JWT-embedded dealer_id:** CONTEXT decision explicitly rejects this (M:N requires dynamic lookup)
- **Offset pagination:** CONTEXT requires cursor-based pagination — use `WHERE id > cursor` pattern
- **Skipping tenant_id filter:** ALL queries must filter by tenant_id (multi-tenancy hard constraint)
- **JSONB for filterable fields:** Use indexed columns (make, model, year) not JSONB for performance

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| M:N relationship management | Custom join queries | SQLAlchemy `relationship()` with `secondary` | Handles cascade deletes, FK constraints, composite uniqueness |
| Slug generation | Regex transformation | `slugify()` library | Handles Unicode, edge cases, collisions |
| Cursor encoding | Base64 manually | `itsdangerous.URLSafeSerializer` | Tamper-proof, expiration support |
| Dynamic filtering | String concatenation | SQLAlchemy expression building | SQL injection protection, type safety |

**Key insight:** SQLAlchemy 2.0 async with `select()` is battle-tested — hand-rolled query builders are brittle and insecure.

## Common Pitfalls

### Pitfall 1: N+1 Query Problem with M:N Relationships

**What goes wrong:** Fetching vehicles then querying publications for each vehicle individually causes 1 + N queries.

**Why it happens:** Not using eager loading (`selectinload()` or `subqueryload()`).

**How to avoid:** Always preload relationships in async context.

**Example:**
```python
# BAD: N+1 queries
vehicles = await session.execute(select(VehicleModel))
for v in vehicles.scalars():
    publications = await v.awaitable_attrs.publications  # N queries!

# GOOD: 1 query with eager loading
from sqlalchemy.orm import selectinload
stmt = select(VehicleModel).options(
    selectinload(VehicleModel.product).selectinload(ProductModel.publications)
)
result = await session.execute(stmt)
vehicles = result.scalars().all()  # All publications preloaded
```

**Warning signs:** Database logs show many similar queries, slow response times.

### Pitfall 2: Forgetting Tenant Isolation

**What goes wrong:** User from Tenant A sees Tenant B's data (security breach).

**Why it happens:** Missing `WHERE tenant_id = :current_tenant_id` in queries.

**How to avoid:** Create a repository base class that auto-filters by tenant_id.

**Example:**
```python
class SqlAlchemyBaseRepository:
    def __init__(self, session: AsyncSession, tenant_id: UUID):
        self.session = session
        self.tenant_id = tenant_id

    def _tenant_filter(self, model):
        """Automatically apply tenant isolation."""
        return model.tenant_id == self.tenant_id
```

**Warning signs:** Tests show cross-tenant data leakage, admin endpoints return wrong data.

### Pitfall 3: Cursor Pagination Inconsistency

**What goes wrong:** Pagination breaks when ordering by non-unique columns (duplicates cause skipped/missing rows).

**Why it happens:** Cursor requires unique ordering key to be stable.

**How to avoid:** Always order by (cursor_column, id) for uniqueness.

**Example:**
```python
# BAD: Unstable cursor (created_at may have duplicates)
stmt = stmt.order_by(VehicleModel.created_at.desc()).where(
    VehicleModel.created_at < decode_cursor(cursor)
)

# GOOD: Stable cursor (id is unique)
stmt = stmt.order_by(VehicleModel.created_at.desc(), VehicleModel.id).where(
    VehicleModel.created_at < decode_cursor(cursor) |
    (VehicleModel.created_at == decode_cursor(cursor)) & (VehicleModel.id < decode_cursor_id(cursor))
)
```

**Warning signs:** Pagination skips rows, duplicate rows across pages, "has_more" incorrect.

### Pitfall 4: Dynamic Filter SQL Injection

**What goes wrong:** User-controlled filter values concatenated into SQL queries.

**Why it happens:** Building filter strings instead of using SQLAlchemy expressions.

**How to avoid:** Always use `select().where()` with parameterized expressions.

**Example:**
```python
# BAD: SQL injection risk
query = f"SELECT * FROM vehicles WHERE make = '{user_make}'"

# GOOD: Parameterized (safe)
stmt = select(VehicleModel).where(VehicleModel.make == user_make)
```

**Warning signs:** Security scanner warnings, unexpected query errors, data exfiltration.

## Code Examples

Verified patterns from existing codebase:

### Repository Interface (Domain Layer)

```python
# Source: prosell/domain/repositories/organization_repository.py
from abc import ABC, abstractmethod
from uuid import UUID
from prosell.domain.entities.dealer import Dealer

class AbstractDealerRepository(ABC):
    """Repository interface for Dealer entities."""

    @abstractmethod
    async def create(self, dealer: Dealer) -> Dealer:
        """Create a new dealer."""
        pass

    @abstractmethod
    async def get_by_id(self, dealer_id: UUID, tenant_id: UUID) -> Dealer | None:
        """Get dealer by ID with tenant isolation."""
        pass

    @abstractmethod
    async def get_by_slug(self, slug: str, tenant_id: UUID) -> Dealer | None:
        """Get dealer by slug (unique per tenant)."""
        pass

    @abstractmethod
    async def exists_by_slug(self, slug: str, tenant_id: UUID) -> bool:
        """Check if slug exists (for validation)."""
        pass
```

### SQLAlchemy Async Repository Implementation

```python
# Source: prosell/infrastructure/repositories/organization_repository_impl.py
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

class SqlAlchemyDealerRepository(AbstractDealerRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, dealer: Dealer) -> Dealer:
        model = DealerModel(
            id=dealer.id,
            tenant_id=dealer.tenant_id,
            name=dealer.name,
            slug=dealer.slug,
            location_address=dealer.location_address,
            # ... map all fields
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def exists_by_slug(self, slug: str, tenant_id: UUID) -> bool:
        stmt = select(func.count(DealerModel.id)).where(
            DealerModel.slug == slug,
            DealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0
        return count > 0

    def _to_entity(self, model: DealerModel) -> Dealer:
        """Convert ORM model to domain entity."""
        return Dealer.model_validate(model, from_attributes=True)
```

### Cursor Pagination Helper

```python
# Source: Phase 8 Brain #5 decision (cursor-based pagination)
from base64 import urlsafe_b64encode, urlsafe_b64decode
from uuid import UUID

def encode_cursor(vehicle_id: UUID) -> str:
    """Encode vehicle ID as base64 cursor."""
    return urlsafe_b64encode(str(vehicle_id).encode()).decode().rstrip("=")

def decode_cursor(cursor: str) -> UUID:
    """Decode base64 cursor to vehicle ID."""
    padded = cursor + "=" * (-len(cursor) % 4)
    return UUID(urlsafe_b64decode(padded).decode())

# Response DTO
class CatalogResponse(BaseModel):
    items: list[VehicleDTO]
    next_cursor: str | None
    has_more: bool
    total_count: int  # Optional: for UI display
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Offset pagination (`OFFSET 50 LIMIT 10`) | Cursor pagination (`WHERE id > cursor LIMIT 10`) | Phase 8 Brain #5 | O(1) performance for deep pages, consistent results |
| JWT-embedded dealer_id | Dynamic UserDealer lookup | Phase 02 CONTEXT decision | Supports M:N relationships, audit trail |
| Hardcoded filter columns | field_config dynamic filtering | Phase 02 | Scalable to other categories (Real Estate, Electronics) |
| ORM relationship loading | Async eager loading with `selectinload()` | SQLAlchemy 2.0 | Prevents N+1 queries in async context |

**Deprecated/outdated:**
- **sync SQLAlchemy:** Replaced by `sqlalchemy.ext.asyncio` (Python 3.13 free-threading)
- **Query.join() syntax:** Replaced by `select().join()` in SQLAlchemy 2.0
- **session.query():** Replaced by `select()` with `session.execute()`

## Open Questions

1. **Cursor ordering for multi-column sorts**
   - What we know: CONTEXT requires `ORDER BY dealer_id, created_at DESC`
   - What's unclear: How to encode composite cursor (dealer_id + vehicle_id)
   - Recommendation: Use tuple encoding `(dealer_id, vehicle_id)` or single `vehicle_id` if unique

2. **Filter performance with field_config JSONB**
   - What we know: Category.field_config stores filter definitions
   - What's unclear: Performance impact of JSONB queries vs indexed columns
   - Recommendation: Benchmark both approaches in Wave 0, index common fields (make, model, year)

3. **Publication state array size**
   - What we know: CONTEXT requires publications array in response
   - What's unclear: Max publications per vehicle (could grow large with auto-republish)
   - Recommendation: Limit to last 5 publications, add `/api/vehicles/{id}/publications` endpoint for full history

## Validation Architecture

> Nyquist validation is ENABLED (workflow.nyquist_validation not set to false in config.json)

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 8.3.0 + pytest-asyncio 0.24.0 |
| Config file | `apps/api/pyproject.toml` (asyncio_mode=auto) |
| Quick run command | `pytest apps/api/tests/unit/domain/test_dealer_entity.py -x -v` |
| Full suite command | `pytest apps/api/tests/ -x --cov=prosell --cov-report=term-missing` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CATALOG-01 | Vendedor ve vehículos de dealers asignados | integration | `pytest apps/api/tests/integration/test_vehicle_catalog.py::test_seller_sees_assigned_dealers -x` | ❌ Wave 0 |
| CATALOG-02 | Admin ve todos los vehículos | integration | `pytest apps/api/tests/integration/test_vehicle_catalog.py::test_admin_sees_all_vehicles -x` | ❌ Wave 0 |
| CATALOG-03 | Dealer ve solo su inventario | integration | `pytest apps/api/tests/integration/test_vehicle_catalog.py::test_dealer_sees_own_inventory -x` | ❌ Wave 0 |
| CATALOG-05 | Admin crea dealer sin usuario | unit | `pytest apps/api/tests/unit/domain/test_dealer_entity.py::test_dealer_create_factory -x` | ❌ Wave 0 |
| CATALOG-07 | Admin asigna vendedores a dealers | integration | `pytest apps/api/tests/integration/test_user_dealer_api.py::test_assign_seller_to_dealer -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pytest apps/api/tests/unit/domain/ -x -v` (unit tests only, < 30s)
- **Per wave merge:** `pytest apps/api/tests/ -x --cov=prosell` (full suite with coverage)
- **Phase gate:** Full suite green + coverage >= 80% before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/tests/unit/domain/test_dealer_entity.py` — Dealer entity unit tests (create, slug validation, update methods)
- [ ] `apps/api/tests/unit/domain/test_user_dealer_entity.py` — UserDealer entity unit tests (assign, remove validation)
- [ ] `apps/api/tests/integration/test_vehicle_catalog.py` — Role-based catalog filtering tests
- [ ] `apps/api/tests/integration/test_user_dealer_api.py` — M:N assignment API tests
- [ ] `apps/api/tests/integration/test_dealer_api.py` — Dealer CRUD API tests
- [ ] `apps/api/tests/conftest.py` — Shared fixtures for dealer, user_dealer test data
- [ ] Framework install: Already installed (pytest, pytest-asyncio, httpx, factory-boy, faker)

### Critical Test Scenarios

**Dealer Entity:**
- `test_dealer_create_factory` — Factory method creates valid dealer with generated slug
- `test_dealer_slug_validation` — Slug must be unique per tenant_id
- `test_dealer_location_update` — Lat/lng validation for map coordinates
- `test_dealer_timezone_default` — Default timezone is America/Montevideo

**UserDealer M:N:**
- `test_assign_user_to_dealer` — Assignment creates UserDealer with audit fields
- `test_user_dealer_unique_constraint` — Duplicate assignment raises error
- `test_remove_user_from_dealer` — Removal preserves historical record
- `test_get_user_dealer_ids` — Subquery returns correct dealer IDs

**Role-Based Filtering:**
- `test_admin_sees_all_vehicles` — Admin query skips dealer_id filter
- `test_seller_sees_assigned_dealers` — Seller query uses IN subquery
- `test_dealer_sees_own_inventory` — Dealer query filters by organization_id
- `test_unauthorized_empty_assignments` — 401 when user has no dealers assigned

**Cursor Pagination:**
- `test_cursor_pagination_consistency` — No duplicates/skips across pages
- `test_cursor_encoding_decoding` — Base64 encode/decode roundtrip
- `test_has_more_flag` — Correctly detects last page
- `test_cursor_with_filters` — Works with dynamic filters applied

**Dynamic Filters:**
- `test_filter_by_make_model` — field_config filters work correctly
- `test_filter_price_range` — Numeric range filters validated
- `test_filter_with_invalid_field` — Non-filterable fields rejected

## Sources

### Primary (HIGH confidence)

- **Existing codebase patterns** — Verified Organization, Team, TeamMember, Vehicle, Publication implementations
- **SQLAlchemy 2.0 async patterns** — `apps/api/src/prosell/infrastructure/repositories/` (select(), Mapped[], mapped_column)
- **Project CONTEXT.md** — User decisions locked, no ambiguity in scope
- **Project CLAUDE.md** — Tech stack 2026, Clean Architecture constraints

### Secondary (MEDIUM confidence)

- **Phase 8 Brain #5 decision** — Cursor-based pagination requirement (from BRAIN-FEED.md)
- **Phase 1 Publication entity** — State machine, status array pattern (verified in code)
- **Pytest async patterns** — `apps/api/pyproject.toml` (pytest-asyncio configuration)

### Tertiary (LOW confidence)

- **Web search attempted** — Rate-limited (429 error), fell back to existing codebase knowledge
- **Cursor pagination best practices** — Based on CONTEXT requirements and Phase 8 patterns

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — All libraries verified in pyproject.toml, patterns match existing code
- Architecture: **HIGH** — Clean Architecture, M:N patterns verified in Team/TeamMember entities
- Pitfalls: **HIGH** — N+1 queries, tenant isolation, cursor consistency verified in existing code
- Validation: **HIGH** — pytest-asyncio configured, test fixtures exist in conftest.py

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (30 days - stable tech stack, no major updates expected)

---

**Traceability:**
- Researcher: GSD Phase Researcher
- Phase: 02 - Catalog & Roles
- Requirements: CATALOG-01 through CATALOG-07
- Context file: `.planning/phases/02-catalog-roles/02-CONTEXT.md`
- Next step: `/gsd:plan-phase 2` to create execution plans
