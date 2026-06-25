# Bulk Upload Generalization — Backend Implementation Plan (PR1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Generalize `POST /api/v1/products/bulk-upload` to work with any product category (not just vehicles) by making `CSVProductParser` schema-aware, and expose new `GET/PATCH /api/v1/categories/{id}/schema` endpoints for prosell-superadmin schema maintenance with per-type migration warnings and an audit log.

**Architecture:** `CSVProductParser` (domain service) is rewritten to accept `AbstractCategoryRepository`; it pre-loads each unique category's `attribute_schema` and validates per-row attributes against it. Two new DB tables (`bulk_upload_errors` for 24h CSV download, `category_schema_changes` for audit) are added. `PatchCategorySchemaUseCase` (application layer) detects breaking type changes, counts affected products via SQL, and applies attribute casts on `?force=true`.

**Tech Stack:** Python 3.13, FastAPI 0.115+, Pydantic 2.12+, SQLAlchemy 2.0 async, pytest-asyncio (`asyncio_mode=auto`), Alembic, PostgreSQL 17 JSONB.

## Global Constraints

- `max_rows = 5000` (raised from 1000 — constant change)
- All I/O with `async def`; repositories always `await`-ed
- `ruff check . && ruff format .` must pass before every commit
- TDD: write failing test, run it, implement minimal code, run again to pass
- Run tests from `apps/api/`: `uv run pytest <path> -v`
- Integration tests require `localhost:5433`; they are auto-skipped when unreachable
- `tests/integration/bulk_upload/conftest.py` provides `async_client` (SUPER_ADMIN role)
- Auth pattern: `app.dependency_overrides[get_current_auth_user_from_cookie]` — no real JWT
- Conventional commits, no `Co-Authored-By`
- Never `--no-verify`; fix violations in place

---

## File Map

### New files

| File                                                                  | Purpose                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------- |
| `src/prosell/application/dto/product/bulk_upload_result.py`           | `BulkUploadRowError`, `BulkUploadUploadResult`          |
| `alembic/versions/20260625_0001_schema_tables.py`                     | `bulk_upload_errors` + `category_schema_changes` tables |
| `alembic/versions/20260625_0002_vehicle_vin_required.py`              | Data migration: `vin.required=true` in vehicle schemas  |
| `src/prosell/infrastructure/models/bulk_upload_error_model.py`        | ORM model for `bulk_upload_errors`                      |
| `src/prosell/infrastructure/models/category_schema_change_model.py`   | ORM model for `category_schema_changes`                 |
| `src/prosell/application/use_cases/category/patch_category_schema.py` | Use case with migration warnings + audit log            |
| `tests/integration/bulk_upload/test_bulk_upload_endpoint.py`          | Integration tests for `POST /bulk-upload`               |
| `tests/integration/bulk_upload/test_bulk_upload_errors_csv.py`        | Integration tests for `GET /bulk-upload/errors.csv`     |
| `tests/integration/api/test_category_schema.py`                       | Integration tests for all `/schema` endpoints           |
| `tests/integration/api/test_category_schema_auth.py`                  | Auth/permission tests for schema endpoints              |

### Modified files

| File                                                                | What changes                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/prosell/domain/services/csv_product_parser.py`                 | Full rewrite: schema-aware, removes VIN coupling         |
| `src/prosell/application/use_cases/product/bulk_upload_products.py` | New error types, upload_id generation, error persistence |
| `src/prosell/application/dto/product/__init__.py`                   | Export new DTOs                                          |
| `src/prosell/infrastructure/models/__init__.py`                     | Register new ORM models                                  |
| `src/prosell/infrastructure/api/routers/product_router.py`          | Update bulk-upload endpoint, add errors.csv endpoint     |
| `src/prosell/infrastructure/api/routers/category_router.py`         | Add 5 new `/schema` endpoints                            |
| `tests/unit/services/test_csv_product_parser.py`                    | Full rewrite matching new behavior                       |

---

## Task 1: New DTOs for bulk upload response

**Files:**

- Create: `apps/api/src/prosell/application/dto/product/bulk_upload_result.py`
- Modify: `apps/api/src/prosell/application/dto/product/__init__.py`

**Interfaces:**

- Produces: `BulkUploadRowError` (used by Tasks 3, 4, 5), `BulkUploadUploadResult` (used by Task 5 router endpoint)

No TDD for pure data models — pyright validates shape at type-check time. Write code and commit.

- [x] **Step 1: Create bulk_upload_result.py**

```python
# apps/api/src/prosell/application/dto/product/bulk_upload_result.py
"""DTOs for the generalized bulk upload response."""

from uuid import UUID

from pydantic import BaseModel, Field


class BulkUploadRowError(BaseModel):
    """Per-row error from CSV bulk upload validation."""

    row_number: int = Field(description="1-indexed row number (row 1 = header)")
    column: str | None = Field(
        default=None,
        description="Column name, e.g. 'attributes.vin' or 'price'. None = row-level error.",
    )
    message: str = Field(description="User-facing error message")
    raw_row: dict[str, str] = Field(
        default_factory=dict,
        description="Original unprocessed CSV row values",
    )


class BulkUploadUploadResult(BaseModel):
    """Response shape for POST /api/v1/products/bulk-upload."""

    upload_id: UUID = Field(description="ID for GET /bulk-upload/errors.csv?upload_id=X")
    total_rows: int
    created_count: int
    failed_count: int
    errors: list[BulkUploadRowError]
```

- [x] **Step 2: Export from package `__init__.py`**

Add to `apps/api/src/prosell/application/dto/product/__init__.py` after the existing `from prosell.application.dto.product.bulk_upload import (...)` block:

```python
from prosell.application.dto.product.bulk_upload_result import (
    BulkUploadRowError,
    BulkUploadUploadResult,
)
```

Add `"BulkUploadRowError"` and `"BulkUploadUploadResult"` to `__all__`.

- [x] **Step 3: Verify type-check passes**

```bash
cd apps/api && uv run pyright src/prosell/application/dto/product/
```

Expected: 0 errors.

- [x] **Step 4: Commit**

```bash
git add apps/api/src/prosell/application/dto/product/bulk_upload_result.py \
        apps/api/src/prosell/application/dto/product/__init__.py
git commit -m "feat(dto): add BulkUploadRowError + BulkUploadUploadResult DTOs"
```

---

## Task 2: DB migrations + ORM models

**Files:**

- Create: `apps/api/alembic/versions/20260625_0001_schema_tables.py`
- Create: `apps/api/alembic/versions/20260625_0002_vehicle_vin_required.py`
- Create: `apps/api/src/prosell/infrastructure/models/bulk_upload_error_model.py`
- Create: `apps/api/src/prosell/infrastructure/models/category_schema_change_model.py`
- Modify: `apps/api/src/prosell/infrastructure/models/__init__.py`

**Interfaces:**

- Produces: `BulkUploadErrorModel`, `CategorySchemaChangeModel` (used by Tasks 4 and 6)

No TDD — integration tests in Tasks 5/7 exercise the tables against a real DB.

- [x] **Step 1: Create migration 0001 — new tables**

```python
# apps/api/alembic/versions/20260625_0001_schema_tables.py
"""Add bulk_upload_errors and category_schema_changes tables

Revision ID: schema_tables_20260625
Revises: products_mkt_published_20260619
Create Date: 2026-06-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "schema_tables_20260625"
down_revision: str | Sequence[str] | None = "products_mkt_published_20260619"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "bulk_upload_errors",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload", JSONB, nullable=False),
    )
    op.create_index("ix_bulk_upload_errors_tenant_id", "bulk_upload_errors", ["tenant_id"])
    op.create_index("ix_bulk_upload_errors_expires_at", "bulk_upload_errors", ["expires_at"])

    op.create_table(
        "category_schema_changes",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("category_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("changed_by_user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("previous_attributes", JSONB, nullable=True),
        sa.Column("new_attributes", JSONB, nullable=False),
        sa.Column(
            "migration_applied",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "migration_warnings",
            JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "change_summary",
            sa.Text(),
            nullable=False,
            server_default=sa.text("''"),
        ),
    )
    op.create_index(
        "ix_category_schema_changes_category_id",
        "category_schema_changes",
        ["category_id"],
    )
    op.create_index(
        "ix_category_schema_changes_changed_at",
        "category_schema_changes",
        ["changed_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_category_schema_changes_changed_at", table_name="category_schema_changes")
    op.drop_index("ix_category_schema_changes_category_id", table_name="category_schema_changes")
    op.drop_table("category_schema_changes")
    op.drop_index("ix_bulk_upload_errors_expires_at", table_name="bulk_upload_errors")
    op.drop_index("ix_bulk_upload_errors_tenant_id", table_name="bulk_upload_errors")
    op.drop_table("bulk_upload_errors")
```

- [x] **Step 2: Create migration 0002 — data migration for vehicle vin**

```python
# apps/api/alembic/versions/20260625_0002_vehicle_vin_required.py
"""Data migration: set required=true for 'vin' key in vehicle attribute_schema

Any category whose attribute_schema already contains a 'vin' key gets
required=true. Ensures legacy vehicle CSVs still pass schema validation
after CSVProductParser is generalized (no longer hardcodes VIN as required).

Revision ID: vehicle_vin_required_20260625
Revises: schema_tables_20260625
Create Date: 2026-06-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "vehicle_vin_required_20260625"
down_revision: str | Sequence[str] | None = "schema_tables_20260625"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text("""
            UPDATE categories
            SET attribute_schema = jsonb_set(
                attribute_schema,
                '{vin,required}',
                'true'::jsonb
            )
            WHERE attribute_schema ? 'vin'
        """)
    )


def downgrade() -> None:
    op.execute(
        sa.text("""
            UPDATE categories
            SET attribute_schema = jsonb_set(
                attribute_schema,
                '{vin,required}',
                'false'::jsonb
            )
            WHERE attribute_schema -> 'vin' ? 'required'
        """)
    )
```

- [x] **Step 3: Create BulkUploadErrorModel**

```python
# apps/api/src/prosell/infrastructure/models/bulk_upload_error_model.py
"""ORM model for bulk_upload_errors table."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class BulkUploadErrorModel(Base):
    """Stores per-upload error payloads for 24h CSV download."""

    __tablename__ = "bulk_upload_errors"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    category_id: Mapped[UUID] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    payload: Mapped[list] = mapped_column(JSONB, nullable=False)
```

- [x] **Step 4: Create CategorySchemaChangeModel**

```python
# apps/api/src/prosell/infrastructure/models/category_schema_change_model.py
"""ORM model for category_schema_changes audit log."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class CategorySchemaChangeModel(Base):
    """Append-only audit log for category attribute_schema changes."""

    __tablename__ = "category_schema_changes"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    category_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    changed_by_user_id: Mapped[UUID] = mapped_column(nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False, index=True
    )
    previous_attributes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_attributes: Mapped[dict] = mapped_column(JSONB, nullable=False)
    migration_applied: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    migration_warnings: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    change_summary: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("''")
    )
```

- [x] **Step 5: Register models in `__init__.py`**

Add to `apps/api/src/prosell/infrastructure/models/__init__.py`:

```python
from prosell.infrastructure.models.bulk_upload_error_model import BulkUploadErrorModel
from prosell.infrastructure.models.category_schema_change_model import CategorySchemaChangeModel
```

Add both to `__all__`.

- [x] **Step 6: Verify migration chain is valid**

```bash
cd apps/api && uv run python -m pytest tests/unit/test_alembic_migration_chain.py -v
```

Expected: PASS (chain is valid).

- [x] **Step 7: Commit**

```bash
git add apps/api/alembic/versions/20260625_0001_schema_tables.py \
        apps/api/alembic/versions/20260625_0002_vehicle_vin_required.py \
        apps/api/src/prosell/infrastructure/models/bulk_upload_error_model.py \
        apps/api/src/prosell/infrastructure/models/category_schema_change_model.py \
        apps/api/src/prosell/infrastructure/models/__init__.py
git commit -m "feat(db): add bulk_upload_errors + category_schema_changes tables, vehicle vin required migration"
```

---

## Task 3: Rewrite CSVProductParser (schema-aware)

**Files:**

- Modify: `apps/api/src/prosell/domain/services/csv_product_parser.py`
- Modify: `apps/api/tests/unit/services/test_csv_product_parser.py`

**Interfaces:**

- Consumes: `AbstractCategoryRepository.get_by_id_or_global(category_id, tenant_id) -> Category | None`
- Produces: `CSVRowError` (dataclass, domain-local), `ParsedProductRow` (no `vin` field — VIN in `attributes`), `CSVParseResult.errors: list[CSVRowError]`

- [x] **Step 1: Write failing unit tests**

Fully replace `apps/api/tests/unit/services/test_csv_product_parser.py`:

```python
"""Unit tests for the schema-aware CSVProductParser."""

from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest

from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.services.csv_product_parser import (
    CSVParseError,
    CSVProductParser,
    CSVRowError,
    ParsedProductRow,
)


@pytest.fixture
def tenant_id() -> UUID:
    return uuid4()


@pytest.fixture
def org_id() -> UUID:
    return uuid4()


@pytest.fixture
def category_id() -> UUID:
    return uuid4()


@pytest.fixture
def vehicle_schema() -> dict:
    return {
        "vin": {"type": "string", "required": True},
        "year": {"type": "number", "required": False},
        "mileage": {"type": "number", "required": False},
        "is_certified": {"type": "boolean", "required": False},
    }


def _make_category_repo(category_id: UUID, schema: dict) -> AbstractCategoryRepository:
    mock = AsyncMock(spec=AbstractCategoryRepository)
    cat = MagicMock()
    cat.attribute_schema = schema
    mock.get_by_id_or_global.return_value = cat
    return mock


# ── Missing universal column ──────────────────────────────────────────────────

async def test_missing_title_column_raises(tenant_id, org_id, category_id, vehicle_schema):
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = f"price,category_id\n18500,{category_id}\n"
    with pytest.raises(CSVParseError, match="Missing required columns"):
        await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)


async def test_missing_price_column_raises(tenant_id, org_id, category_id, vehicle_schema):
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = f"title,category_id\nHonda Civic,{category_id}\n"
    with pytest.raises(CSVParseError, match="Missing required columns"):
        await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)


async def test_missing_category_id_column_raises(tenant_id, org_id, category_id, vehicle_schema):
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = "title,price\nHonda Civic,18500\n"
    with pytest.raises(CSVParseError, match="Missing required columns"):
        await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)


# ── Multi-category rejection ──────────────────────────────────────────────────

async def test_multiple_categories_raises(tenant_id, org_id, vehicle_schema):
    cat_a, cat_b = uuid4(), uuid4()
    repo = AsyncMock(spec=AbstractCategoryRepository)
    cat = MagicMock()
    cat.attribute_schema = vehicle_schema
    repo.get_by_id_or_global.return_value = cat

    csv = (
        f"title,price,category_id\n"
        f"Car A,1000,{cat_a}\n"
        f"Car B,2000,{cat_b}\n"
    )
    with pytest.raises(CSVParseError, match="multiple categories"):
        await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)


# ── Unknown category ──────────────────────────────────────────────────────────

async def test_unknown_category_raises(tenant_id, org_id, category_id):
    repo = AsyncMock(spec=AbstractCategoryRepository)
    repo.get_by_id_or_global.return_value = None
    csv = f"title,price,category_id\nFoo,100,{category_id}\n"
    with pytest.raises(CSVParseError, match="[Uu]nknown category"):
        await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)


# ── Max rows ──────────────────────────────────────────────────────────────────

async def test_max_rows_exceeded_raises(tenant_id, org_id, category_id, vehicle_schema):
    repo = _make_category_repo(category_id, vehicle_schema)
    rows = "\n".join(f"Row {i},100,{category_id}" for i in range(6))
    csv = f"title,price,category_id\n{rows}\n"
    with pytest.raises(CSVParseError, match="Too many rows"):
        await CSVProductParser(category_repository=repo, max_rows=5).parse_csv(
            csv, tenant_id, org_id
        )


# ── Required schema field missing → per-row error ────────────────────────────

async def test_required_schema_field_missing_is_row_error(
    tenant_id, org_id, category_id, vehicle_schema
):
    repo = _make_category_repo(category_id, vehicle_schema)
    # vin is required but not in this CSV
    csv = f"title,price,category_id\n2020 Civic,18500,{category_id}\n"
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 1
    assert result.products == []
    err = result.errors[0]
    assert err.row_number == 2
    assert err.column == "attributes.vin"
    assert "vin" in err.message


# ── Type mismatch → per-row error ─────────────────────────────────────────────

async def test_number_type_mismatch_is_row_error(tenant_id, org_id, category_id, vehicle_schema):
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = (
        f"title,price,category_id,vin,year\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456,not_a_number\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 1
    err = result.errors[0]
    assert err.column == "attributes.year"
    assert "number" in err.message.lower()


async def test_boolean_type_mismatch_is_row_error(tenant_id, org_id, category_id, vehicle_schema):
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = (
        f"title,price,category_id,vin,is_certified\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456,maybe\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 1
    err = result.errors[0]
    assert err.column == "attributes.is_certified"


# ── Legacy vehicle CSV still works ────────────────────────────────────────────

async def test_legacy_vehicle_csv_backward_compat(tenant_id, org_id, category_id, vehicle_schema):
    """vin as a top-level CSV column goes into attributes['vin']."""
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = (
        f"vin,title,price,category_id\n"
        f"1HGCM82633A123456,2020 Honda Civic,18500,{category_id}\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 0
    assert len(result.products) == 1
    product = result.products[0]
    assert product.attributes["vin"] == "1HGCM82633A123456"
    assert product.price_cents == 1_850_000


# ── Type coercion ─────────────────────────────────────────────────────────────

async def test_number_column_coerced_to_float(tenant_id, org_id, category_id, vehicle_schema):
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = (
        f"title,price,category_id,vin,mileage\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456,50000\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 0
    assert result.products[0].attributes["mileage"] == 50000.0


async def test_boolean_true_coerced(tenant_id, org_id, category_id, vehicle_schema):
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = (
        f"title,price,category_id,vin,is_certified\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456,true\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 0
    assert result.products[0].attributes["is_certified"] is True


# ── Unknown columns accepted as string ────────────────────────────────────────

async def test_unknown_column_accepted_as_string(tenant_id, org_id, category_id, vehicle_schema):
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = (
        f"title,price,category_id,vin,unknown_field\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456,some_value\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.failed_count == 0
    assert result.products[0].attributes["unknown_field"] == "some_value"


# ── Partial success: some rows OK, some error ─────────────────────────────────

async def test_partial_success_accumulates_both(tenant_id, org_id, category_id, vehicle_schema):
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = (
        f"title,price,category_id,vin\n"
        f"Good row,18500,{category_id},1HGCM82633A123456\n"
        f"Bad row,18500,{category_id},\n"  # vin is empty → required missing
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    assert result.total_rows == 2
    assert len(result.products) == 1
    assert result.failed_count == 1


# ── to_create_product_request no longer injects vin ──────────────────────────

async def test_to_create_product_request_does_not_inject_vin(
    tenant_id, org_id, category_id, vehicle_schema
):
    repo = _make_category_repo(category_id, vehicle_schema)
    csv = (
        f"title,price,category_id,vin\n"
        f"2020 Civic,18500,{category_id},1HGCM82633A123456\n"
    )
    result = await CSVProductParser(category_repository=repo).parse_csv(csv, tenant_id, org_id)
    row = result.products[0]
    req = row.to_create_product_request(tenant_id=tenant_id, organization_id=org_id)
    # vin is in attributes (from CSV column), not injected separately
    assert req.attributes.get("vin") == "1HGCM82633A123456"
    # attributes dict has exactly what was in CSV (no vin double-injection)
    assert list(req.attributes.keys()) == ["vin"]
```

- [x] **Step 2: Run tests — they must ALL FAIL**

```bash
cd apps/api && uv run pytest tests/unit/services/test_csv_product_parser.py -v
```

Expected: multiple failures (ImportError `CSVRowError` or AttributeError since parser doesn't accept `category_repository` yet).

- [x] **Step 3: Rewrite csv_product_parser.py**

Fully replace `apps/api/src/prosell/domain/services/csv_product_parser.py`:

```python
"""Schema-aware CSV Product Parser.

Validates CSV rows against a category's attribute_schema fetched from the
repository. Universal columns (title, price, category_id) are always required.
All other CSV columns go into the product's `attributes` dict and are
validated (type + required) against the schema.
"""

import csv
from dataclasses import dataclass, field
from io import StringIO
from typing import TYPE_CHECKING
from uuid import UUID

from prosell.domain.value_objects.product_condition import ProductCondition

if TYPE_CHECKING:
    from prosell.application.dto.product.create import CreateProductRequest
    from prosell.domain.repositories.category_repository import AbstractCategoryRepository

UNIVERSAL_COLUMNS = {"title", "price", "category_id"}
KNOWN_PRODUCT_COLUMNS = {
    "description",
    "condition",
    "currency",
    "location_city",
    "location_state",
    "location_zip",
}
ALL_KNOWN_COLUMNS = UNIVERSAL_COLUMNS | KNOWN_PRODUCT_COLUMNS


@dataclass
class CSVRowError:
    """Per-row parse/validation error."""

    row_number: int
    column: str | None  # e.g. "attributes.vin", "price", or None (row-level)
    message: str
    raw_row: dict[str, str]


@dataclass
class ParsedProductRow:
    """A successfully parsed product row from CSV."""

    row_number: int
    title: str
    price_cents: int
    category_id: UUID
    description: str | None = None
    condition: str = "used"
    currency: str = "USD"
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None
    attributes: dict[str, object] = field(default_factory=dict)

    def to_create_product_request(
        self,
        tenant_id: UUID,
        organization_id: UUID,
    ) -> "CreateProductRequest":
        from prosell.application.dto.product.create import CreateProductRequest

        return CreateProductRequest(
            title=self.title,
            price_cents=self.price_cents,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=self.category_id,
            description=self.description,
            condition=ProductCondition(self.condition),
            currency=self.currency,
            location_city=self.location_city,
            location_state=self.location_state,
            location_zip=self.location_zip,
            attributes=self.attributes,
        )


@dataclass
class CSVParseResult:
    """Result of CSV parsing operation."""

    total_rows: int
    products: list[ParsedProductRow]
    failed_count: int
    errors: list[CSVRowError]


class CSVParseError(Exception):
    """Raised for file-level failures: bad structure, multi-category, unknown category."""

    pass


class CSVProductParser:
    """Schema-aware CSV parser for bulk product upload.

    Fetches the category's attribute_schema from the repository (one query
    per unique category_id in the file) and validates every non-universal
    column against it. The file must contain exactly one unique category_id.
    """

    def __init__(
        self,
        category_repository: "AbstractCategoryRepository",
        max_rows: int = 5000,
    ) -> None:
        self._category_repository = category_repository
        self.max_rows = max_rows

    async def parse_csv(
        self,
        csv_content: str,
        tenant_id: UUID,
        organization_id: UUID,  # noqa: ARG002 — kept for interface compat
    ) -> CSVParseResult:
        csv_file = StringIO(csv_content)

        # Step 1: Validate universal columns exist in header
        column_errors = self._validate_columns(csv_file)
        if column_errors:
            raise CSVParseError(f"CSV validation failed: {'; '.join(column_errors)}")

        csv_file.seek(0)
        reader = csv.DictReader(csv_file)
        rows = list(reader)

        # Step 2: Enforce row limit
        if len(rows) > self.max_rows:
            raise CSVParseError(
                f"Too many rows: {len(rows)} exceeds maximum of {self.max_rows}"
            )

        # Step 3: Collect unique category_ids from the CSV
        category_id_strs: set[str] = set()
        for row in rows:
            cid = (row.get("category_id") or "").strip()
            if cid:
                category_id_strs.add(cid)

        if len(category_id_strs) > 1:
            raise CSVParseError(
                f"CSV contains multiple categories: {', '.join(sorted(category_id_strs))}. "
                "Split into separate CSVs, one per category."
            )

        # Step 4: Load schema for the single category
        schemas: dict[UUID, dict] = {}
        for cid_str in category_id_strs:
            try:
                cid = UUID(cid_str)
            except ValueError:
                raise CSVParseError(f"Invalid category_id UUID: {cid_str!r}")

            category = await self._category_repository.get_by_id_or_global(cid, tenant_id)
            if not category:
                raise CSVParseError(f"Unknown category_id: {cid_str!r}")
            schemas[cid] = category.attribute_schema or {}

        # Step 5: Parse rows
        products: list[ParsedProductRow] = []
        all_errors: list[CSVRowError] = []

        for idx, row in enumerate(rows, start=2):
            cid_str = (row.get("category_id") or "").strip()
            try:
                cid = UUID(cid_str)
            except ValueError:
                all_errors.append(
                    CSVRowError(
                        row_number=idx,
                        column="category_id",
                        message=f"Invalid category_id UUID: {cid_str!r}",
                        raw_row=dict(row),
                    )
                )
                continue

            schema = schemas.get(cid, {})
            product, row_errors = self._parse_row(row=row, row_number=idx, schema=schema)
            if row_errors:
                all_errors.extend(row_errors)
            elif product:
                products.append(product)

        return CSVParseResult(
            total_rows=len(rows),
            products=products,
            failed_count=len(all_errors),
            errors=all_errors,
        )

    def _validate_columns(self, csv_file: StringIO) -> list[str]:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None:
            return ["Empty CSV file"]
        present = set(reader.fieldnames)
        missing = UNIVERSAL_COLUMNS - present
        return [f"Missing required columns: {', '.join(sorted(missing))}"] if missing else []

    def _parse_row(
        self,
        row: dict[str, str | None],
        row_number: int,
        schema: dict,
    ) -> tuple[ParsedProductRow | None, list[CSVRowError]]:
        errors: list[CSVRowError] = []
        raw = {k: (v or "") for k, v in row.items()}

        # -- Universal fields --
        title = (row.get("title") or "").strip()
        if not title:
            errors.append(
                CSVRowError(
                    row_number=row_number,
                    column="title",
                    message="title is required and cannot be empty",
                    raw_row=raw,
                )
            )

        price_str = (row.get("price") or "").strip()
        price_cents = 0
        try:
            price_dollars = float(price_str)
            if price_dollars < 0:
                raise ValueError("Price cannot be negative")
            price_cents = round(price_dollars * 100)
        except (ValueError, TypeError):
            errors.append(
                CSVRowError(
                    row_number=row_number,
                    column="price",
                    message=f"Invalid price: {price_str!r}",
                    raw_row=raw,
                )
            )

        category_id_str = (row.get("category_id") or "").strip()
        category_id: UUID | None = None
        try:
            category_id = UUID(category_id_str)
        except (ValueError, AttributeError):
            errors.append(
                CSVRowError(
                    row_number=row_number,
                    column="category_id",
                    message=f"Invalid category_id UUID: {category_id_str!r}",
                    raw_row=raw,
                )
            )

        if errors:
            return None, errors

        # -- Attribute columns --
        attributes: dict[str, object] = {}
        for col_name, col_value in row.items():
            if col_name in ALL_KNOWN_COLUMNS:
                continue
            value_str = (col_value or "").strip()
            if not value_str:
                continue
            if col_name in schema:
                field_type = str(schema[col_name].get("type", "string"))
                try:
                    attributes[col_name] = self._coerce_value(col_name, value_str, field_type)
                except ValueError as e:
                    errors.append(
                        CSVRowError(
                            row_number=row_number,
                            column=f"attributes.{col_name}",
                            message=str(e),
                            raw_row=raw,
                        )
                    )
            else:
                # Unknown column → accept as string (log warning in caller if needed)
                attributes[col_name] = value_str

        # -- Required schema fields --
        for field_name, field_def in schema.items():
            if field_def.get("required", False) and field_name not in attributes:
                errors.append(
                    CSVRowError(
                        row_number=row_number,
                        column=f"attributes.{field_name}",
                        message=f"Required attribute '{field_name}' is missing",
                        raw_row=raw,
                    )
                )

        if errors:
            return None, errors

        assert category_id is not None  # guaranteed above by early return
        return (
            ParsedProductRow(
                row_number=row_number,
                title=title,
                price_cents=price_cents,
                category_id=category_id,
                description=(row.get("description") or "").strip() or None,
                condition=(row.get("condition") or "used").strip() or "used",
                currency=(row.get("currency") or "USD").strip() or "USD",
                location_city=(row.get("location_city") or "").strip() or None,
                location_state=(row.get("location_state") or "").strip() or None,
                location_zip=(row.get("location_zip") or "").strip() or None,
                attributes=attributes,
            ),
            [],
        )

    @staticmethod
    def _coerce_value(col_name: str, value: str, field_type: str) -> object:
        """Coerce a CSV string to the schema-declared type. Raises ValueError on failure."""
        if field_type == "number":
            try:
                return float(value)
            except (ValueError, TypeError):
                raise ValueError(
                    f"Column '{col_name}' must be a number, got: {value!r}"
                )
        if field_type == "boolean":
            if value.lower() in ("true", "1", "yes"):
                return True
            if value.lower() in ("false", "0", "no"):
                return False
            raise ValueError(
                f"Column '{col_name}' must be boolean (true/false/1/0/yes/no), got: {value!r}"
            )
        return value  # string, array, object, or unknown → keep as string
```

- [x] **Step 4: Run tests — they must ALL PASS**

```bash
cd apps/api && uv run pytest tests/unit/services/test_csv_product_parser.py -v
```

Expected: all green.

- [x] **Step 5: Run full unit suite to check no regressions**

```bash
cd apps/api && uv run pytest tests/unit/ -v --tb=short
```

Expected: all green (the old VIN-specific tests are replaced by the new ones).

- [x] **Step 6: Lint**

```bash
cd apps/api && ruff check src/prosell/domain/services/csv_product_parser.py && ruff format src/prosell/domain/services/csv_product_parser.py
```

- [x] **Step 7: Commit**

```bash
git add apps/api/src/prosell/domain/services/csv_product_parser.py \
        apps/api/tests/unit/services/test_csv_product_parser.py
git commit -m "feat(parser): rewrite CSVProductParser as schema-aware, remove VIN coupling"
```

---

## Task 4: Update BulkUploadProductsUseCase

**Files:**

- Modify: `apps/api/src/prosell/application/use_cases/product/bulk_upload_products.py`

**Interfaces:**

- Consumes: `ParsedProductRow` (no `vin` field now), `BulkUploadRowError` from Task 1
- Produces: `BulkUploadResult` dataclass now wraps `BulkUploadUploadResult` — see Note below

**Note:** `BulkUploadProductsUseCase.execute()` returns a `BulkUploadResult` dataclass (existing). The router wraps it into `BulkUploadUploadResult` (with upload_id) in Task 5. This keeps the use case unaware of upload_id storage.

- [x] **Step 1: Write failing test**

`apps/api/tests/unit/application/use_cases/product/test_bulk_upload_products.py` — add a test that the error dict no longer references `vin`:

```python
# Add this test to the existing file
async def test_error_does_not_reference_vin(
    product_repository,
    category_repository,
    csv_parser,
):
    """Error entries use row_number + message, not vin (VIN is now in attributes)."""
    from prosell.application.use_cases.product.bulk_upload_products import (
        BulkUploadProductsUseCase,
    )
    from prosell.domain.services.csv_product_parser import ParsedProductRow

    bad_row = ParsedProductRow(
        row_number=2,
        title="Bad Product",
        price_cents=100,
        category_id=uuid4(),
        attributes={},  # missing vin — but use case shouldn't care about vin
    )
    category_repository.get_by_id.return_value = None  # category not found → error

    use_case = BulkUploadProductsUseCase(
        product_repository=product_repository,
        category_repository=category_repository,
        csv_parser=csv_parser,
    )
    result = await use_case.execute(
        parsed_products=[bad_row],
        tenant_id=uuid4(),
        organization_id=uuid4(),
    )
    assert result.failed_count == 1
    error = result.errors[0]
    assert error["row_number"] == 2
    assert "vin" not in error  # vin is gone from error dict
```

- [x] **Step 2: Run the test — it must FAIL**

```bash
cd apps/api && uv run pytest tests/unit/application/use_cases/product/test_bulk_upload_products.py -v -k "test_error_does_not_reference_vin"
```

Expected: FAIL (current code still puts `vin` in error dict).

- [x] **Step 3: Update use case**

Replace the full file `apps/api/src/prosell/application/use_cases/product/bulk_upload_products.py`:

```python
"""Bulk upload products use case."""

from dataclasses import dataclass
from uuid import UUID

from prosell.domain.entities.product import Product
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.csv_product_parser import CSVProductParser, ParsedProductRow


@dataclass
class BulkUploadResult:
    """Result of bulk product upload operation (excludes upload_id — added by router)."""

    total_count: int
    created_count: int
    failed_count: int
    errors: list[dict[str, str | int]]


class BulkUploadProductsUseCase:
    """Use case for bulk uploading products from CSV."""

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        category_repository: AbstractCategoryRepository,
        csv_parser: CSVProductParser,
    ) -> None:
        self.product_repository = product_repository
        self.category_repository = category_repository
        self.csv_parser = csv_parser

    async def execute(
        self,
        parsed_products: list[ParsedProductRow],
        tenant_id: UUID,
        organization_id: UUID,
    ) -> BulkUploadResult:
        total_count = len(parsed_products)
        created_count = 0
        failed_count = 0
        errors: list[dict[str, str | int]] = []

        for parsed_product in parsed_products:
            try:
                request = parsed_product.to_create_product_request(
                    tenant_id=tenant_id,
                    organization_id=organization_id,
                )

                category = await self.category_repository.get_by_id(
                    request.category_id,
                    request.tenant_id or UUID(int=0),
                )
                if not category:
                    raise CategoryNotFoundError(f"Category not found: {request.category_id}")

                product_tenant_id = request.tenant_id or category.tenant_id
                if product_tenant_id is None:
                    raise ValueError(
                        "Cannot create a product without a tenant: tenant_id is required"
                    )
                product_organization_id = request.organization_id or product_tenant_id

                product = Product.create(
                    title=request.title,
                    price_cents=request.price_cents,
                    tenant_id=product_tenant_id,
                    organization_id=product_organization_id,
                    category_id=request.category_id,
                    condition=request.condition,
                    slug=request.slug,
                    description=request.description,
                    currency=request.currency,
                    attributes=request.attributes,
                    location_city=request.location_city,
                    location_state=request.location_state,
                    location_zip=request.location_zip,
                )

                await self.product_repository.create(product)
                created_count += 1

            except (CategoryNotFoundError, ValueError, KeyError) as e:
                failed_count += 1
                error_dict: dict[str, str | int] = {
                    "row_number": parsed_product.row_number,
                    "message": str(e),
                }
                errors.append(error_dict)

        return BulkUploadResult(
            total_count=total_count,
            created_count=created_count,
            failed_count=failed_count,
            errors=errors,
        )
```

- [x] **Step 4: Run the test — it must PASS**

```bash
cd apps/api && uv run pytest tests/unit/application/use_cases/product/test_bulk_upload_products.py -v
```

Expected: all green.

- [x] **Step 5: Commit**

```bash
git add apps/api/src/prosell/application/use_cases/product/bulk_upload_products.py \
        apps/api/tests/unit/application/use_cases/product/test_bulk_upload_products.py
git commit -m "feat(usecase): update BulkUploadProductsUseCase — remove VIN from error dict"
```

---

## Task 5: Update bulk-upload endpoint + add errors.csv endpoint

**Files:**

- Modify: `apps/api/src/prosell/infrastructure/api/routers/product_router.py`
- Create: `apps/api/tests/integration/bulk_upload/test_bulk_upload_endpoint.py`
- Create: `apps/api/tests/integration/bulk_upload/test_bulk_upload_errors_csv.py`

**Interfaces:**

- Consumes: `BulkUploadUploadResult` from Task 1, `BulkUploadErrorModel` from Task 2, `CSVProductParser` with `category_repository` from Task 3
- Produces: `POST /api/v1/products/bulk-upload` → `BulkUploadUploadResult` (201), `GET /api/v1/products/bulk-upload/errors.csv?upload_id=X` → CSV file (200) or 404/403

- [x] **Step 1: Write failing integration tests for POST /bulk-upload**

Create `apps/api/tests/integration/bulk_upload/test_bulk_upload_endpoint.py`:

```python
"""Integration tests for POST /api/v1/products/bulk-upload (schema-aware)."""

import io
from uuid import UUID, uuid4

import pytest

pytestmark = pytest.mark.asyncio


async def _make_csv(category_id: UUID, rows: list[str]) -> bytes:
    lines = ["title,price,category_id,vin"] + rows
    return "\n".join(lines).encode()


async def test_happy_path_201_no_errors(async_client, db_session, test_user):
    """Valid CSV with vehicle schema → 201, created_count=1, failed_count=0."""
    from prosell.domain.entities.category import Category
    from prosell.infrastructure.repositories.category_repository_impl import (
        SqlAlchemyCategoryRepository,
    )

    # Create a vehicle category with vin required
    repo = SqlAlchemyCategoryRepository(db_session)
    cat = Category.create(
        name="Test Vehicles",
        slug=f"test-vehicles-{uuid4().hex[:6]}",
        tenant_id=test_user.tenant_id,
        attribute_schema={"vin": {"type": "string", "required": True}},
    )
    await repo.create(cat)
    await db_session.flush()

    csv_bytes = await _make_csv(cat.id, [f"2020 Civic,18500,{cat.id},1HGCM82633A123456"])
    response = await async_client.post(
        "/api/v1/products/bulk-upload",
        files={"csv_file": ("products.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["created_count"] == 1
    assert data["failed_count"] == 0
    assert "upload_id" in data
    assert isinstance(UUID(data["upload_id"]), UUID)


async def test_partial_success_stores_errors(async_client, db_session, test_user):
    """Row with missing required vin → 201 with failed_count=1, errors stored."""
    from prosell.domain.entities.category import Category
    from prosell.infrastructure.repositories.category_repository_impl import (
        SqlAlchemyCategoryRepository,
    )

    repo = SqlAlchemyCategoryRepository(db_session)
    cat = Category.create(
        name="Vehicles 2",
        slug=f"vehicles-2-{uuid4().hex[:6]}",
        tenant_id=test_user.tenant_id,
        attribute_schema={"vin": {"type": "string", "required": True}},
    )
    await repo.create(cat)
    await db_session.flush()

    # First row OK, second row missing vin
    csv_content = (
        f"title,price,category_id,vin\n"
        f"Good Car,18500,{cat.id},1HGCM82633A123456\n"
        f"Bad Car,18500,{cat.id},\n"
    )
    response = await async_client.post(
        "/api/v1/products/bulk-upload",
        files={"csv_file": ("p.csv", io.BytesIO(csv_content.encode()), "text/csv")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["created_count"] == 1
    assert data["failed_count"] == 1
    assert len(data["errors"]) == 1
    assert data["errors"][0]["column"] == "attributes.vin"


async def test_multi_category_csv_returns_422(async_client, db_session, test_user):
    """CSV with two different category_ids → 422 top-level error."""
    cat_a, cat_b = uuid4(), uuid4()
    csv_content = (
        f"title,price,category_id\n"
        f"Car A,1000,{cat_a}\n"
        f"Car B,2000,{cat_b}\n"
    )
    response = await async_client.post(
        "/api/v1/products/bulk-upload",
        files={"csv_file": ("p.csv", io.BytesIO(csv_content.encode()), "text/csv")},
    )
    assert response.status_code == 422


async def test_max_rows_exceeded_returns_422(async_client, db_session, test_user):
    """CSV with more than 5000 rows → 422."""
    cat_id = uuid4()
    rows = "\n".join(f"Row {i},100,{cat_id}" for i in range(5001))
    csv_content = f"title,price,category_id\n{rows}"
    response = await async_client.post(
        "/api/v1/products/bulk-upload",
        files={"csv_file": ("p.csv", io.BytesIO(csv_content.encode()), "text/csv")},
    )
    assert response.status_code == 422


async def test_non_csv_file_returns_422(async_client):
    response = await async_client.post(
        "/api/v1/products/bulk-upload",
        files={"csv_file": ("data.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert response.status_code == 422
```

- [x] **Step 2: Write failing integration tests for GET /bulk-upload/errors.csv**

Create `apps/api/tests/integration/bulk_upload/test_bulk_upload_errors_csv.py`:

```python
"""Integration tests for GET /api/v1/products/bulk-upload/errors.csv."""

import io
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

pytestmark = pytest.mark.asyncio


async def test_valid_upload_id_returns_csv(async_client, db_session, test_user):
    """Store errors manually, then download CSV."""
    from prosell.infrastructure.models.bulk_upload_error_model import BulkUploadErrorModel

    upload_id = uuid4()
    record = BulkUploadErrorModel(
        id=upload_id,
        tenant_id=test_user.tenant_id,
        category_id=uuid4(),
        expires_at=datetime.now(UTC) + timedelta(hours=24),
        payload=[
            {
                "row_number": 2,
                "column": "attributes.vin",
                "message": "Required attribute 'vin' is missing",
                "raw_row": {"title": "Bad Car", "price": "18500"},
            }
        ],
    )
    db_session.add(record)
    await db_session.flush()

    response = await async_client.get(
        f"/api/v1/products/bulk-upload/errors.csv?upload_id={upload_id}"
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.text
    assert "row_number" in content
    assert "attributes.vin" in content


async def test_missing_upload_id_returns_404(async_client):
    response = await async_client.get(
        f"/api/v1/products/bulk-upload/errors.csv?upload_id={uuid4()}"
    )
    assert response.status_code == 404


async def test_wrong_tenant_returns_404(async_client, db_session, test_user):
    """upload_id exists but belongs to a different tenant → 404."""
    from prosell.infrastructure.models.bulk_upload_error_model import BulkUploadErrorModel

    upload_id = uuid4()
    record = BulkUploadErrorModel(
        id=upload_id,
        tenant_id=uuid4(),  # different tenant!
        category_id=uuid4(),
        expires_at=datetime.now(UTC) + timedelta(hours=24),
        payload=[],
    )
    db_session.add(record)
    await db_session.flush()

    response = await async_client.get(
        f"/api/v1/products/bulk-upload/errors.csv?upload_id={upload_id}"
    )
    assert response.status_code == 404
```

- [x] **Step 3: Run both test files — they must FAIL**

```bash
cd apps/api && uv run pytest tests/integration/bulk_upload/test_bulk_upload_endpoint.py tests/integration/bulk_upload/test_bulk_upload_errors_csv.py -v
```

Expected: failures (endpoints not updated yet).

- [x] **Step 4: Update product_router.py — bulk-upload endpoint**

Find the `bulk_upload_products` function (around line 238) and replace it:

```python
@router.post("/bulk-upload", response_model=BulkUploadUploadResult, status_code=status.HTTP_201_CREATED)
async def bulk_upload_products(
    current_user: CurrentUser,
    db: DbSession,
    csv_file: UploadFile = File(..., description="CSV file with product data"),
) -> BulkUploadUploadResult:
    """
    Bulk upload products from CSV file.

    CSV format:
    - Required columns: title, price, category_id
    - Optional columns: description, condition, currency, location_city, location_state,
      location_zip
    - Additional columns (matching category attribute_schema): validated per-schema

    Single category per file. Returns upload_id for GET /bulk-upload/errors.csv.
    """
    import csv as csv_module
    import io
    from datetime import UTC, datetime, timedelta
    from uuid import uuid4

    from sqlalchemy import insert

    from prosell.application.dto.product.bulk_upload_result import (
        BulkUploadRowError,
        BulkUploadUploadResult,
    )
    from prosell.domain.services.csv_product_parser import CSVParseError, CSVProductParser
    from prosell.infrastructure.models.bulk_upload_error_model import BulkUploadErrorModel

    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    if not csv_file.filename or not csv_file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only CSV files are supported",
        )

    content = await csv_file.read()
    csv_content = content.decode("utf-8")

    product_repo = SqlAlchemyProductRepository(db)
    category_repo = SqlAlchemyCategoryRepository(db)
    csv_parser = CSVProductParser(category_repository=category_repo)
    use_case = BulkUploadProductsUseCase(product_repo, category_repo, csv_parser)

    try:
        parse_result = await csv_parser.parse_csv(
            csv_content=csv_content,
            tenant_id=current_user.tenant_id,
            organization_id=current_user.tenant_id,
        )
    except CSVParseError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e

    upload_result = await use_case.execute(
        parsed_products=parse_result.products,
        tenant_id=current_user.tenant_id,
        organization_id=current_user.tenant_id,
    )

    # Merge parser row errors + use case creation errors into unified list
    all_errors: list[BulkUploadRowError] = [
        BulkUploadRowError(
            row_number=e.row_number,
            column=e.column,
            message=e.message,
            raw_row=e.raw_row,
        )
        for e in parse_result.errors
    ] + [
        BulkUploadRowError(
            row_number=e["row_number"],
            message=e["message"],
        )
        for e in upload_result.errors
    ]

    upload_id = uuid4()

    # Persist errors for 24h CSV download
    if all_errors:
        # Determine category_id from first row (file is single-category)
        first_cid_str = ""
        for line in io.StringIO(csv_content):
            reader_row = next(csv_module.DictReader(io.StringIO(csv_content)), None)
            if reader_row:
                first_cid_str = reader_row.get("category_id", "")
            break

        try:
            from uuid import UUID as _UUID
            cat_id = _UUID(first_cid_str)
        except (ValueError, TypeError):
            cat_id = uuid4()

        await db.execute(
            insert(BulkUploadErrorModel).values(
                id=upload_id,
                tenant_id=current_user.tenant_id,
                category_id=cat_id,
                expires_at=datetime.now(UTC) + timedelta(hours=24),
                payload=[e.model_dump() for e in all_errors],
            )
        )

    total_failed = len(all_errors)
    return BulkUploadUploadResult(
        upload_id=upload_id,
        total_rows=parse_result.total_rows,
        created_count=upload_result.created_count,
        failed_count=total_failed,
        errors=all_errors,
    )
```

Add the import for `BulkUploadUploadResult` at the top of the router file (near existing imports):

```python
from prosell.application.dto.product.bulk_upload_result import (
    BulkUploadRowError,
    BulkUploadUploadResult,
)
```

- [x] **Step 5: Add errors.csv endpoint**

After the updated `bulk_upload_products` function, add:

```python
@router.get("/bulk-upload/errors.csv")
async def download_bulk_upload_errors(
    upload_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    """
    Download failed rows from a previous bulk upload as CSV.

    The upload_id is returned in the POST /bulk-upload response.
    Records expire after 24 hours.
    """
    import csv as csv_module
    import io
    from datetime import UTC, datetime

    from fastapi.responses import StreamingResponse
    from sqlalchemy import delete, select

    from prosell.infrastructure.models.bulk_upload_error_model import BulkUploadErrorModel

    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    stmt = select(BulkUploadErrorModel).where(
        BulkUploadErrorModel.id == upload_id,
        BulkUploadErrorModel.tenant_id == current_user.tenant_id,
        BulkUploadErrorModel.expires_at > datetime.now(UTC),
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")

    errors: list[dict] = record.payload or []

    # Build CSV in-memory
    output = io.StringIO()
    if errors:
        all_keys = list(dict.fromkeys(["row_number", "column", "message"] + list((errors[0].get("raw_row") or {}).keys())))
        writer = csv_module.DictWriter(output, fieldnames=all_keys, extrasaction="ignore")
        writer.writeheader()
        for err in errors:
            row = {"row_number": err.get("row_number"), "column": err.get("column"), "message": err.get("message")}
            row.update(err.get("raw_row") or {})
            writer.writerow(row)
    else:
        output.write("row_number,column,message\n")

    # Clean up on download
    await db.execute(delete(BulkUploadErrorModel).where(BulkUploadErrorModel.id == upload_id))

    csv_bytes = output.getvalue().encode("utf-8")
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="bulk-upload-errors-{upload_id}.csv"'},
    )
```

Also add `Response` to the FastAPI imports at the top of the router.

- [x] **Step 6: Run integration tests — they must PASS**

```bash
cd apps/api && uv run pytest tests/integration/bulk_upload/test_bulk_upload_endpoint.py tests/integration/bulk_upload/test_bulk_upload_errors_csv.py -v
```

Expected: all green.

- [x] **Step 7: Commit**

```bash
git add apps/api/src/prosell/infrastructure/api/routers/product_router.py \
        apps/api/tests/integration/bulk_upload/test_bulk_upload_endpoint.py \
        apps/api/tests/integration/bulk_upload/test_bulk_upload_errors_csv.py
git commit -m "feat(router): update bulk-upload endpoint (schema-aware), add errors.csv download"
```

---

## Task 6: PatchCategorySchemaUseCase

**Files:**

- Create: `apps/api/src/prosell/application/use_cases/category/patch_category_schema.py`

**Interfaces:**

- Produces: `PatchCategorySchemaUseCase.execute(category_id, tenant_id, new_schema, force, user_id, session) -> PatchSchemaResult`
- `PatchSchemaResult` has `schema`, `schema_version` (ISO timestamp), `migration_warnings: list[str]`, `requires_force: bool`

- [x] **Step 1: Write the use case**

Create `apps/api/src/prosell/application/use_cases/category/patch_category_schema.py`:

```python
"""PatchCategorySchemaUseCase — apply schema change with migration warnings and audit log."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.repositories.category_repository import AbstractCategoryRepository

logger = logging.getLogger(__name__)

_AUTO_MIGRATE_PAIRS: frozenset[tuple[str, str]] = frozenset(
    {
        ("number", "string"),
        ("string", "number"),
        ("boolean", "string"),
    }
)
_FORCE_REQUIRED_PAIRS: frozenset[tuple[str, str]] = frozenset(
    {
        ("string", "boolean"),
    }
)


@dataclass
class PatchSchemaResult:
    schema: dict[str, Any]
    schema_version: str  # ISO timestamp of updated_at
    migration_warnings: list[str] = field(default_factory=list)
    requires_force: bool = False


class PatchCategorySchemaUseCase:
    """
    Replaces category attribute_schema with migration warnings and audit log.

    Two-step client flow:
    1. PATCH without ?force=true → 422 with migration_warnings if any risky change detected
    2. PATCH with ?force=true → applies schema, migrates compatible type casts, writes audit log
    """

    def __init__(
        self,
        category_repository: AbstractCategoryRepository,
        session: AsyncSession,
    ) -> None:
        self._repo = category_repository
        self._session = session

    async def execute(
        self,
        category_id: UUID,
        tenant_id: UUID,
        new_schema: dict[str, Any],
        force: bool,
        user_id: UUID,
    ) -> PatchSchemaResult:
        category = await self._repo.get_by_id_or_global(category_id, tenant_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )

        old_schema: dict[str, Any] = category.attribute_schema or {}

        # Detect migration warnings
        warnings, requires_force = await self._detect_warnings(
            category_id=category_id,
            old_schema=old_schema,
            new_schema=new_schema,
        )

        if warnings and not force:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "migration_warnings": warnings,
                    "requires_force": requires_force,
                    "hint": "Re-send with ?force=true to apply",
                },
            )

        # Apply schema
        category.attribute_schema = new_schema
        category.updated_at = datetime.now(UTC)
        updated_category = await self._repo.update(category)

        # Migrate product attribute values for compatible type changes
        if force:
            await self._apply_compatible_migrations(
                category_id=category_id,
                old_schema=old_schema,
                new_schema=new_schema,
            )

        # Write audit log
        await self._write_audit_log(
            category_id=category_id,
            user_id=user_id,
            old_schema=old_schema,
            new_schema=new_schema,
            migration_applied=force and bool(warnings),
            warnings=warnings,
        )

        return PatchSchemaResult(
            schema=updated_category.attribute_schema,
            schema_version=updated_category.updated_at.isoformat(),
            migration_warnings=warnings,
            requires_force=False,
        )

    async def _detect_warnings(
        self,
        category_id: UUID,
        old_schema: dict,
        new_schema: dict,
    ) -> tuple[list[str], bool]:
        warnings: list[str] = []
        requires_force = False

        for field_name, new_def in new_schema.items():
            old_def = old_schema.get(field_name)
            if old_def is None:
                continue  # new field — no warning

            old_type = str(old_def.get("type", "string"))
            new_type = str(new_def.get("type", "string"))
            old_required = bool(old_def.get("required", False))
            new_required = bool(new_def.get("required", False))

            if old_type != new_type:
                count = await self._count_products_with_attribute(category_id, field_name)
                if (old_type, new_type) in _FORCE_REQUIRED_PAIRS:
                    requires_force = True
                    warnings.append(
                        f"'{field_name}' type {old_type}→{new_type} requires ?force=true "
                        f"({count} products affected, conversion is heuristic)"
                    )
                elif (old_type, new_type) in _AUTO_MIGRATE_PAIRS:
                    warnings.append(
                        f"'{field_name}' type {old_type}→{new_type} "
                        f"({count} products will be auto-migrated)"
                    )
                else:
                    requires_force = True
                    warnings.append(
                        f"'{field_name}' type {old_type}→{new_type} requires ?force=true "
                        f"({count} products affected)"
                    )

            if not old_required and new_required:
                missing_count = await self._count_products_missing_attribute(
                    category_id, field_name
                )
                if missing_count > 0:
                    requires_force = True
                    warnings.append(
                        f"'{field_name}' changed to required=true but "
                        f"{missing_count} products are missing this attribute — requires ?force=true"
                    )

        return warnings, requires_force

    async def _count_products_with_attribute(self, category_id: UUID, field_name: str) -> int:
        result = await self._session.execute(
            text(
                "SELECT COUNT(*) FROM products "
                "WHERE category_id = :cid AND attributes ? :fname AND tenant_id IS NOT NULL"
            ).bindparams(cid=str(category_id), fname=field_name)
        )
        return result.scalar() or 0

    async def _count_products_missing_attribute(
        self, category_id: UUID, field_name: str
    ) -> int:
        result = await self._session.execute(
            text(
                "SELECT COUNT(*) FROM products "
                "WHERE category_id = :cid AND NOT (attributes ? :fname)"
            ).bindparams(cid=str(category_id), fname=field_name)
        )
        return result.scalar() or 0

    async def _apply_compatible_migrations(
        self,
        category_id: UUID,
        old_schema: dict,
        new_schema: dict,
    ) -> None:
        """Cast product attribute values for auto-migratable type changes."""
        for field_name, new_def in new_schema.items():
            old_def = old_schema.get(field_name)
            if old_def is None:
                continue
            old_type = str(old_def.get("type", "string"))
            new_type = str(new_def.get("type", "string"))
            if old_type == new_type:
                continue
            if (old_type, new_type) not in _AUTO_MIGRATE_PAIRS:
                continue

            if new_type == "string":
                # Cast to text string
                await self._session.execute(
                    text(
                        "UPDATE products "
                        "SET attributes = jsonb_set(attributes, ARRAY[:fname], "
                        "to_jsonb((attributes->>:fname)::text)) "
                        "WHERE category_id = :cid AND attributes ? :fname"
                    ).bindparams(fname=field_name, cid=str(category_id))
                )
            elif new_type == "number":
                # Cast to numeric (only rows where value is numeric-parseable)
                await self._session.execute(
                    text(
                        "UPDATE products "
                        "SET attributes = jsonb_set(attributes, ARRAY[:fname], "
                        "to_jsonb((attributes->>:fname)::numeric)) "
                        "WHERE category_id = :cid AND attributes ? :fname "
                        "AND (attributes->>:fname) ~ '^[0-9]+(\\.[0-9]+)?$'"
                    ).bindparams(fname=field_name, cid=str(category_id))
                )

    async def _write_audit_log(
        self,
        category_id: UUID,
        user_id: UUID,
        old_schema: dict,
        new_schema: dict,
        migration_applied: bool,
        warnings: list[str],
    ) -> None:
        from prosell.infrastructure.models.category_schema_change_model import (
            CategorySchemaChangeModel,
        )

        # Build human-readable change summary
        added = [k for k in new_schema if k not in old_schema]
        removed = [k for k in old_schema if k not in new_schema]
        changed = [
            k for k in new_schema
            if k in old_schema and old_schema[k] != new_schema[k]
        ]
        parts = []
        if added:
            parts.append(f"added: {', '.join(added)}")
        if removed:
            parts.append(f"removed: {', '.join(removed)}")
        if changed:
            parts.append(f"changed: {', '.join(changed)}")
        summary = "; ".join(parts) or "no structural changes"

        await self._session.execute(
            insert(CategorySchemaChangeModel).values(
                id=uuid4(),
                category_id=category_id,
                changed_by_user_id=user_id,
                changed_at=datetime.now(UTC),
                previous_attributes=old_schema or None,
                new_attributes=new_schema,
                migration_applied=migration_applied,
                migration_warnings=warnings,
                change_summary=summary,
            )
        )
```

- [x] **Step 2: No dedicated unit test for this use case** — integration tests in Task 7 exercise all paths (including migration warnings + force flow). The SQL queries are infrastructure concerns that unit tests can't easily verify.

- [x] **Step 3: Lint**

```bash
cd apps/api && ruff check src/prosell/application/use_cases/category/patch_category_schema.py && ruff format src/prosell/application/use_cases/category/patch_category_schema.py
```

- [x] **Step 4: Commit**

```bash
git add apps/api/src/prosell/application/use_cases/category/patch_category_schema.py
git commit -m "feat(usecase): add PatchCategorySchemaUseCase with migration warnings + audit log"
```

---

## Task 7: Category schema router endpoints + integration tests

**Files:**

- Modify: `apps/api/src/prosell/infrastructure/api/routers/category_router.py`
- Create: `apps/api/tests/integration/api/test_category_schema.py`
- Create: `apps/api/tests/integration/api/test_category_schema_auth.py`

**Interfaces:**

- `GET  /api/v1/categories/{id}/schema` → `CategorySchemaResponse` (schema + schema_version + updated_at)
- `PATCH /api/v1/categories/{id}/schema` → `CategorySchemaResponse` (with migration_warnings + requires_force on 422)
- `GET  /api/v1/categories/{id}/schema/template.csv` → `StreamingResponse` (text/csv)
- `POST /api/v1/categories/{id}/schema/clone-from/{source_id}` → `CategorySchemaResponse`
- `GET  /api/v1/categories/{id}/schema/history` → `list[SchemaChangeEntry]`

- [x] **Step 1: Write failing integration tests**

Create `apps/api/tests/integration/api/test_category_schema.py`:

```python
"""Integration tests for /api/v1/categories/{id}/schema endpoints."""

import pytest

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def vehicle_category(db_session, test_user):
    from prosell.domain.entities.category import Category
    from prosell.infrastructure.repositories.category_repository_impl import (
        SqlAlchemyCategoryRepository,
    )
    from uuid import uuid4

    repo = SqlAlchemyCategoryRepository(db_session)
    cat = Category.create(
        name="Schema Test Vehicles",
        slug=f"schema-test-{uuid4().hex[:6]}",
        tenant_id=test_user.tenant_id,
        attribute_schema={"vin": {"type": "string", "required": True}},
    )
    await repo.create(cat)
    await db_session.flush()
    return cat


async def test_get_schema_returns_schema_and_version(async_client, vehicle_category):
    response = await async_client.get(f"/api/v1/categories/{vehicle_category.id}/schema")
    assert response.status_code == 200
    data = response.json()
    assert "attributes" in data
    assert data["attributes"] == {"vin": {"type": "string", "required": True}}
    assert "schema_version" in data
    assert "updated_at" in data


async def test_patch_schema_additive_no_force_needed(async_client, vehicle_category):
    """Adding a new optional field needs no force."""
    new_schema = {
        "vin": {"type": "string", "required": True},
        "year": {"type": "number", "required": False},
    }
    response = await async_client.patch(
        f"/api/v1/categories/{vehicle_category.id}/schema",
        json={"attribute_schema": new_schema},
    )
    assert response.status_code == 200
    data = response.json()
    assert "year" in data["attributes"]


async def test_patch_schema_type_change_without_force_returns_422(
    async_client, vehicle_category
):
    """Type change on existing field → 422 with migration_warnings."""
    new_schema = {
        "vin": {"type": "number", "required": True},  # changed string → number
    }
    response = await async_client.patch(
        f"/api/v1/categories/{vehicle_category.id}/schema",
        json={"attribute_schema": new_schema},
    )
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert "migration_warnings" in detail
    assert any("vin" in w for w in detail["migration_warnings"])


async def test_patch_schema_type_change_with_force_succeeds(async_client, vehicle_category):
    """Type change + ?force=true → 200."""
    new_schema = {
        "vin": {"type": "number", "required": True},
    }
    response = await async_client.patch(
        f"/api/v1/categories/{vehicle_category.id}/schema?force=true",
        json={"attribute_schema": new_schema},
    )
    assert response.status_code == 200


async def test_get_schema_history_after_patch(async_client, vehicle_category):
    """PATCH writes an audit entry; GET /history returns it."""
    new_schema = {"vin": {"type": "string", "required": True}, "make": {"type": "string"}}
    await async_client.patch(
        f"/api/v1/categories/{vehicle_category.id}/schema",
        json={"attribute_schema": new_schema},
    )
    response = await async_client.get(
        f"/api/v1/categories/{vehicle_category.id}/schema/history"
    )
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) >= 1
    assert "changed_at" in entries[0]
    assert "change_summary" in entries[0]


async def test_get_template_csv_returns_headers(async_client, vehicle_category):
    response = await async_client.get(
        f"/api/v1/categories/{vehicle_category.id}/schema/template.csv"
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.text
    # Universal columns + schema attribute columns
    assert "title" in content
    assert "price" in content
    assert "category_id" in content
    assert "vin" in content


async def test_clone_schema_copies_source(async_client, db_session, test_user, vehicle_category):
    from prosell.domain.entities.category import Category
    from prosell.infrastructure.repositories.category_repository_impl import (
        SqlAlchemyCategoryRepository,
    )
    from uuid import uuid4

    repo = SqlAlchemyCategoryRepository(db_session)
    target = Category.create(
        name="Clone Target",
        slug=f"clone-target-{uuid4().hex[:6]}",
        tenant_id=test_user.tenant_id,
        attribute_schema={},
    )
    await repo.create(target)
    await db_session.flush()

    response = await async_client.post(
        f"/api/v1/categories/{target.id}/schema/clone-from/{vehicle_category.id}"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["attributes"] == vehicle_category.attribute_schema
```

Create `apps/api/tests/integration/api/test_category_schema_auth.py`:

```python
"""Auth tests for schema write endpoints — tenant admin must be rejected."""

from uuid import uuid4

import pytest

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def vehicle_category_for_auth(db_session, test_user):
    from prosell.domain.entities.category import Category
    from prosell.infrastructure.repositories.category_repository_impl import (
        SqlAlchemyCategoryRepository,
    )

    repo = SqlAlchemyCategoryRepository(db_session)
    cat = Category.create(
        name="Auth Test",
        slug=f"auth-test-{uuid4().hex[:6]}",
        tenant_id=test_user.tenant_id,
        attribute_schema={"make": {"type": "string"}},
    )
    await repo.create(cat)
    await db_session.flush()
    return cat


async def test_tenant_admin_cannot_patch_schema(
    db_session, test_user, vehicle_category_for_auth
):
    """A user with ADMIN (not SUPER_ADMIN) role → 403 on PATCH /schema."""
    import uuid
    from httpx import ASGITransport, AsyncClient
    from prosell.domain.entities.role import Role, RoleType
    from prosell.domain.entities.user import User, UserStatus
    from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
    from prosell.infrastructure.api.main import app
    from prosell.infrastructure.database.session import get_async_session
    from collections.abc import AsyncIterator
    from sqlalchemy.ext.asyncio import AsyncSession

    admin_role = Role(
        id=uuid.uuid4(),
        role_type=RoleType.ADMIN,
        name="Admin",
        is_system_role=True,
        tenant_id=None,
    )
    tenant_admin = User(
        id=test_user.id,
        email=test_user.email,
        full_name=test_user.full_name,
        tenant_id=test_user.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[admin_role],
    )
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: tenant_admin

    async def get_test_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_async_session] = get_test_db  # type: ignore[arg-type]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            f"/api/v1/categories/{vehicle_category_for_auth.id}/schema",
            json={"attribute_schema": {"make": {"type": "string"}}},
        )
    app.dependency_overrides.clear()

    assert response.status_code == 403


async def test_super_admin_can_patch_schema(async_client, vehicle_category_for_auth):
    """SUPER_ADMIN (async_client fixture) → 200 on PATCH /schema."""
    response = await async_client.patch(
        f"/api/v1/categories/{vehicle_category_for_auth.id}/schema",
        json={"attribute_schema": {"make": {"type": "string"}}},
    )
    assert response.status_code == 200
```

- [x] **Step 2: Run tests — they must FAIL**

```bash
cd apps/api && uv run pytest tests/integration/api/test_category_schema.py tests/integration/api/test_category_schema_auth.py -v
```

Expected: 404 (endpoints don't exist yet).

- [x] **Step 3: Add schema endpoints to category_router.py**

Add these Pydantic models near the top of the router file (after existing imports):

```python
from pydantic import BaseModel as _BaseModel

class _CategorySchemaResponse(_BaseModel):
    attributes: dict
    schema_version: str
    updated_at: str
    migration_warnings: list[str] = []
    requires_force: bool = False

class _SchemaChangeEntry(_BaseModel):
    id: str
    changed_at: str
    changed_by_user_id: str
    change_summary: str
    migration_applied: bool
    migration_warnings: list[str]

class _PatchSchemaRequest(_BaseModel):
    attribute_schema: dict
```

Add these endpoints to `category_router.py` (before the final route if any):

```python
@router.get("/{category_id}/schema", response_model=_CategorySchemaResponse)
async def get_category_schema(
    category_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> _CategorySchemaResponse:
    """Get category attribute_schema with version metadata."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    repo = SqlAlchemyCategoryRepository(db)
    category = await repo.get_by_id_or_global(category_id, current_user.tenant_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    return _CategorySchemaResponse(
        attributes=category.attribute_schema or {},
        schema_version=category.updated_at.isoformat(),
        updated_at=category.updated_at.isoformat(),
    )


@router.patch("/{category_id}/schema", response_model=_CategorySchemaResponse)
async def patch_category_schema(
    category_id: UUID,
    request: _PatchSchemaRequest,
    force: bool = False,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> _CategorySchemaResponse:
    """
    Replace category attribute_schema with migration warnings.

    Without ?force=true: returns 422 with migration_warnings if any type or
    required changes affect existing products.
    With ?force=true: applies schema and migrates compatible attribute values.
    Writes to audit log on every successful change.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    _require_platform_admin(current_user)

    from prosell.application.use_cases.category.patch_category_schema import (
        PatchCategorySchemaUseCase,
    )

    repo = SqlAlchemyCategoryRepository(db)
    use_case = PatchCategorySchemaUseCase(category_repository=repo, session=db)
    result = await use_case.execute(
        category_id=category_id,
        tenant_id=current_user.tenant_id,
        new_schema=request.attribute_schema,
        force=force,
        user_id=current_user.id,
    )
    return _CategorySchemaResponse(
        attributes=result.schema,
        schema_version=result.schema_version,
        updated_at=result.schema_version,
        migration_warnings=result.migration_warnings,
        requires_force=result.requires_force,
    )


@router.get("/{category_id}/schema/template.csv")
async def get_category_schema_template(
    category_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Download an empty CSV template with this category's attribute headers."""
    import csv as csv_module
    import io

    from fastapi.responses import StreamingResponse

    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    repo = SqlAlchemyCategoryRepository(db)
    category = await repo.get_by_id_or_global(category_id, current_user.tenant_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    from prosell.domain.services.csv_product_parser import (
        ALL_KNOWN_COLUMNS,
        UNIVERSAL_COLUMNS,
    )

    schema_keys = list((category.attribute_schema or {}).keys())
    headers = (
        list(UNIVERSAL_COLUMNS)
        + ["description", "condition", "currency", "location_city", "location_state", "location_zip"]
        + [k for k in schema_keys if k not in ALL_KNOWN_COLUMNS]
    )
    output = io.StringIO()
    writer = csv_module.writer(output)
    writer.writerow(headers)

    csv_bytes = output.getvalue().encode("utf-8")
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="template-{category_id}.csv"'
        },
    )


@router.post("/{category_id}/schema/clone-from/{source_category_id}", response_model=_CategorySchemaResponse)
async def clone_category_schema(
    category_id: UUID,
    source_category_id: UUID,
    force: bool = False,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> _CategorySchemaResponse:
    """Copy source category's attribute_schema to target category (full overwrite)."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    _require_platform_admin(current_user)

    repo = SqlAlchemyCategoryRepository(db)
    source = await repo.get_by_id_or_global(source_category_id, current_user.tenant_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source category not found")

    from prosell.application.use_cases.category.patch_category_schema import (
        PatchCategorySchemaUseCase,
    )

    use_case = PatchCategorySchemaUseCase(category_repository=repo, session=db)
    result = await use_case.execute(
        category_id=category_id,
        tenant_id=current_user.tenant_id,
        new_schema=source.attribute_schema or {},
        force=force,
        user_id=current_user.id,
    )
    return _CategorySchemaResponse(
        attributes=result.schema,
        schema_version=result.schema_version,
        updated_at=result.schema_version,
        migration_warnings=result.migration_warnings,
    )


@router.get("/{category_id}/schema/history", response_model=list[_SchemaChangeEntry])
async def get_category_schema_history(
    category_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> list[_SchemaChangeEntry]:
    """Return audit log for this category's schema changes, newest first."""
    from sqlalchemy import select

    from prosell.infrastructure.models.category_schema_change_model import (
        CategorySchemaChangeModel,
    )

    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    # Verify access
    repo = SqlAlchemyCategoryRepository(db)
    category = await repo.get_by_id_or_global(category_id, current_user.tenant_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    result = await db.execute(
        select(CategorySchemaChangeModel)
        .where(CategorySchemaChangeModel.category_id == category_id)
        .order_by(CategorySchemaChangeModel.changed_at.desc())
        .limit(100)
    )
    rows = result.scalars().all()
    return [
        _SchemaChangeEntry(
            id=str(row.id),
            changed_at=row.changed_at.isoformat(),
            changed_by_user_id=str(row.changed_by_user_id),
            change_summary=row.change_summary,
            migration_applied=row.migration_applied,
            migration_warnings=row.migration_warnings or [],
        )
        for row in rows
    ]
```

- [x] **Step 4: Run integration tests — they must PASS**

```bash
cd apps/api && uv run pytest tests/integration/api/test_category_schema.py tests/integration/api/test_category_schema_auth.py -v
```

Expected: all green.

- [x] **Step 5: Run full test suite**

```bash
cd apps/api && uv run pytest tests/ -v --tb=short -x
```

Expected: all green (new tables + endpoints working).

- [x] **Step 6: Lint**

```bash
cd apps/api && ruff check . && ruff format .
```

- [x] **Step 7: Commit**

```bash
git add apps/api/src/prosell/infrastructure/api/routers/category_router.py \
        apps/api/tests/integration/api/test_category_schema.py \
        apps/api/tests/integration/api/test_category_schema_auth.py
git commit -m "feat(router): add GET/PATCH /categories/{id}/schema + template + clone + history endpoints"
```

---

## Self-Review Checklist

Run after all tasks complete:

- [x] `cd apps/api && uv run pytest tests/ -v` — all green
- [x] `cd apps/api && ruff check . && ruff format . --check` — no errors
- [x] `cd apps/api && uv run pyright src/` — 0 errors
- [x] `POST /api/v1/products/bulk-upload` with a mixed-category CSV → 422
- [x] `POST /api/v1/products/bulk-upload` with missing required schema field → 201 with `failed_count > 0`, `errors[0].column` has `attributes.<field>`
- [x] `GET /api/v1/products/bulk-upload/errors.csv?upload_id=<valid>` → downloads CSV
- [x] `PATCH /api/v1/categories/{id}/schema` with type change → 422 with `migration_warnings`
- [x] `PATCH /api/v1/categories/{id}/schema?force=true` → 200, history endpoint shows entry
- [x] `GET /api/v1/categories/{id}/schema/template.csv` → CSV with schema attribute headers
- [x] Tenant admin (ADMIN role) `PATCH /schema` → 403
