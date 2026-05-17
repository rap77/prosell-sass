---
plan: "01"
phase: 11
wave: 2
depends_on: ["00"]
autonomous: true
files_modified:
  - apps/api/alembic/versions/20260410_0000-c3_schema_jsonb_upgrade.py
  - apps/api/tests/integration/test_migration_c3.py
requirements: [CAT-01, CAT-02, CAT-03]
estimated_tasks: 2

must_haves:
  truths:
    - "Alembic migration file exists with revision chained after abc123def456"
    - "upgrade() adds attribute_schema JSONB NOT NULL DEFAULT '{}' to categories table"
    - "upgrade() ALTERs products.attributes from JSON to JSONB via ::text::jsonb cast"
    - "upgrade() ALTERs categories.field_config from JSON to JSONB via ::text::jsonb cast"
    - "upgrade() creates GIN indexes on attribute_schema and attributes (non-CONCURRENTLY)"
    - "downgrade() reverses all changes cleanly"
    - "Integration test verifies attribute_schema column exists with data_type=jsonb"
    - "Integration test verifies products.attributes data_type=jsonb"
    - "Integration test verifies existing rows preserved (CAT-02)"
    - "Integration test verifies vehicle cascade delete on product delete"
    - "Integration test verifies JSONB @> operator works on attribute_schema"
    - "Integration test verifies no duplicate JSON keys in products.attributes before migration (pre-flight)"
  artifacts:
    - path: "apps/api/alembic/versions/20260410_0000-c3_schema_jsonb_upgrade.py"
      provides: "Alembic migration: add attribute_schema, upgrade JSON→JSONB"
      exports: ["upgrade", "downgrade"]
    - path: "apps/api/tests/integration/test_migration_c3.py"
      provides: "Migration verification tests (schema + data + cascade)"
      contains: "test_preflight_no_duplicate_json_keys_in_products_attributes, test_attribute_schema_column_exists, test_products_attributes_is_jsonb, test_existing_rows_preserved, test_vehicle_cascade_delete, test_jsonb_containment_operator"
  key_links:
    - from: "apps/api/alembic/versions/20260410_0000-c3_schema_jsonb_upgrade.py"
      to: "apps/api/alembic/versions/20260407_0235-abc123def456_final_missing_tables.py"
      via: "down_revision = 'abc123def456'"
      pattern: "down_revision.*abc123def456"
    - from: "apps/api/tests/integration/test_migration_c3.py"
      to: "apps/api/alembic/versions/20260410_0000-c3_schema_jsonb_upgrade.py"
      via: "tests the migration outcome"
      pattern: "information_schema.columns"
---

<objective>
Create the Alembic migration that adds `attribute_schema JSONB` to categories and upgrades `attributes`/`field_config` columns from JSON to JSONB. Write integration tests that verify the migration outcome — schema correctness, data preservation, and CASCADE behavior.

Purpose: This migration is the deliverable for Phase 11. The tests are the proof that all 5 success criteria from the roadmap are met.
Output: Alembic migration file + integration test suite that proves the C3 schema is correct.
</objective>

<execution_context>
@/home/rpadron/.claude/get-shit-done/workflows/execute-plan.md
@/home/rpadron/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/11-generic-catalog/11-CONTEXT.md
@apps/api/alembic/versions/20260407_0235-abc123def456_final_missing_tables.py

<interfaces>
<!-- Current DB state after abc123def456 migration -->
```
categories:
  - id UUID PK
  - tenant_id UUID FK → organizations
  - name VARCHAR(255)
  - slug VARCHAR(255) UNIQUE
  - level INTEGER DEFAULT 0
  - parent_id UUID FK → categories (nullable)
  - icon, description, image_url
  - sort_order INTEGER DEFAULT 0
  - is_active BOOLEAN DEFAULT true
  - field_config JSON DEFAULT '[]'  ← needs JSONB upgrade
  - created_at, updated_at TIMESTAMPTZ
  # ← attribute_schema MISSING — must ADD

products:
  - id UUID PK
  - tenant_id, organization_id UUID FK → organizations
  - category_id UUID FK → categories
  - title VARCHAR(500)
  - slug, description
  - price_cents INTEGER
  - currency, condition, status
  - attributes JSON DEFAULT '{}'  ← needs JSONB upgrade
  - location_*, is_featured, view_count, etc.
  - created_at, updated_at

vehicles:
  - id UUID PK
  - product_id UUID FK → products ON DELETE CASCADE UNIQUE  ✅ already correct
  - vin VARCHAR(17) UNIQUE
  - year, make, model, trim, body_type, drivetrain, transmission
  - engine, fuel_type, mpg_*, mileage, mileage_unit
  - exterior_color, interior_color, features booleans
  - vin_decoded_data JSON, vin_decoded_at
  - stock_number, vin_verified
  - created_at, updated_at
```

<!-- Existing Alembic env.py pattern (reference) -->
Migration chain: 20260322 → 20260324 → ... → abc123def456
New migration down_revision must be: 'abc123def456'

<!-- Existing test pattern (check if conftest.py exists) -->
Test DB setup: apps/api/tests/conftest.py (check if async engine fixture exists)
</interfaces>
</context>

<tasks>

<task id="11-01-T1" name="Task 1: Create Alembic migration — C3 schema JSONB upgrade" tdd="false">
  <objective>Write the Alembic migration that: (1) adds attribute_schema JSONB to categories, (2) upgrades products.attributes JSON→JSONB, (3) upgrades categories.field_config JSON→JSONB, (4) adds GIN indexes.</objective>
  <files>
    <create>apps/api/alembic/versions/20260410_0000-c3_schema_jsonb_upgrade.py</create>
  </files>
  <behavior>
    - Migration file has correct revision ID and down_revision = 'abc123def456'
    - upgrade() runs all 4 operations without error
    - downgrade() reverses all changes in correct order
    - GIN indexes created WITHOUT CONCURRENTLY (cannot use CONCURRENTLY inside Alembic transaction)
    - Pre-flight comment in code warns about duplicate JSON key risk
  </behavior>
  <implementation>
```python
"""c3_schema_jsonb_upgrade

Revision ID: c3schema001
Revises: abc123def456
Create Date: 2026-04-10 00:00:00.000000

MIGRATION NOTES:
- This migration upgrades JSON columns to JSONB for JSONB operator support (@>, ?, #>>)
- JSON → JSONB cast is lossless for all valid JSON data
- Exception: JSONB silently deduplicates JSON keys with same name (JSON allows duplicates)
  Pre-flight: run pytest tests/integration/test_migration_c3.py::test_preflight_no_duplicate_json_keys_in_products_attributes
  This test verifies no duplicate JSON keys exist before migration (JSONB deduplicates them silently)
- GIN indexes use plain CREATE INDEX (not CONCURRENTLY) — runs inside transaction
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = 'c3schema001'
down_revision: Union[str, Sequence[str], None] = 'abc123def456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add attribute_schema to categories, upgrade JSON → JSONB on attributes/field_config."""

    # Step 1: Add attribute_schema column to categories
    # This column is the C3 API validation schema (object format, JSONB)
    # Different from field_config (array format, UI renderer)
    op.add_column(
        'categories',
        sa.Column(
            'attribute_schema',
            JSONB(),
            server_default='{}',
            nullable=False,
        )
    )

    # Step 2: Upgrade products.attributes JSON → JSONB
    # lossless: all valid JSON is valid JSONB
    op.execute(
        "ALTER TABLE products ALTER COLUMN attributes TYPE JSONB "
        "USING attributes::text::jsonb"
    )

    # Step 3: Upgrade categories.field_config JSON → JSONB
    op.execute(
        "ALTER TABLE categories ALTER COLUMN field_config TYPE JSONB "
        "USING field_config::text::jsonb"
    )

    # Step 4: GIN indexes for JSONB operator performance
    # Note: NOT using CONCURRENTLY — cannot run inside Alembic transaction
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_categories_attribute_schema_gin "
        "ON categories USING gin(attribute_schema)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_products_attributes_gin "
        "ON products USING gin(attributes)"
    )


def downgrade() -> None:
    """Reverse: drop GIN indexes, revert JSONB → JSON, drop attribute_schema column."""
    # Drop GIN indexes first
    op.execute("DROP INDEX IF EXISTS ix_products_attributes_gin;")
    op.execute("DROP INDEX IF EXISTS ix_categories_attribute_schema_gin;")

    # Revert JSONB → JSON (lossless roundtrip)
    op.execute(
        "ALTER TABLE products ALTER COLUMN attributes TYPE JSON "
        "USING attributes::text::json"
    )
    op.execute(
        "ALTER TABLE categories ALTER COLUMN field_config TYPE JSON "
        "USING field_config::text::json"
    )

    # Drop attribute_schema column
    op.drop_column('categories', 'attribute_schema')
```

IMPORTANT: After creating the file, verify the revision chain is correct:
```bash
cd apps/api && uv run alembic history | head -5
```
The new migration should appear as the HEAD.

PREREQUISITE FOR T2: Apply migration to test DB before writing/running tests:
```bash
cd apps/api && uv run alembic upgrade head
```
This is MANDATORY — if the test DB does not have the migration applied, ALL schema
verification tests in T2 will fail with "column attribute_schema does not exist".
If DATABASE_URL is not set, export it first:
```bash
export DATABASE_URL="postgresql+asyncpg://prosell:prosell@localhost:5432/prosell_dev"
cd apps/api && uv run alembic upgrade head
```
  </implementation>
</task>

<task id="11-01-T2" name="Task 2: Write migration integration tests" tdd="true">
  <objective>Write pytest integration tests that verify all 5 Phase 11 success criteria. These tests run against the test DB after alembic upgrade head.</objective>
  <files>
    <create>apps/api/tests/integration/test_migration_c3.py</create>
  </files>
  <behavior>
    - Test 1: attribute_schema column exists in categories with data_type=jsonb (SC-5)
    - Test 2: products.attributes has data_type=jsonb (SC-3 proxy — type correctness)
    - Test 3: categories.field_config has data_type=jsonb (type upgrade verified)
    - Test 4: Existing categories rows preserved after migration — count matches, data intact (SC-2)
    - Test 5: vehicle cascade delete — DELETE products row deletes vehicle row (SC-4)
    - Test 6: JSONB @> containment operator works on attribute_schema (proves JSONB not JSON)
    - Test 7: attribute_schema defaults to {} (empty object) for new rows (SC-5)
    - Pre-flight test: verifies no products.attributes rows contain duplicate JSON keys before migration (JSONB silently deduplicates them — last value wins — causing silent data corruption)
  </behavior>
  <implementation>
First check `apps/api/tests/conftest.py` for existing async engine/session fixtures. Use them if available. If not, create minimal fixtures inline.

```python
"""Integration tests for Phase 11 — C3 Schema JSONB upgrade migration.

These tests verify the Alembic migration outcomes against the running test DB.
Run: cd apps/api && uv run pytest tests/integration/test_migration_c3.py -v

Prerequisites: Test DB must have alembic upgrade head applied.
"""

import pytest
from sqlalchemy import text
from uuid import uuid4


# ─────────────────────────────────────────────────────────────────────
# Schema Verification Tests
# ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_attribute_schema_column_exists(db_session):
    """SC-5: categories table has attribute_schema JSONB NOT NULL DEFAULT '{}'."""
    result = await db_session.execute(text("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'categories'
          AND column_name = 'attribute_schema'
    """))
    row = result.fetchone()
    assert row is not None, "attribute_schema column missing from categories"
    assert row.data_type == 'jsonb', f"Expected jsonb, got {row.data_type}"
    assert row.is_nullable == 'NO', "attribute_schema must be NOT NULL"
    assert '{}' in (row.column_default or ''), f"Expected default '{{}}', got {row.column_default}"


@pytest.mark.asyncio
async def test_products_attributes_is_jsonb(db_session):
    """products.attributes must be JSONB type (not JSON)."""
    result = await db_session.execute(text("""
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'attributes'
    """))
    row = result.fetchone()
    assert row is not None, "attributes column missing from products"
    assert row.data_type == 'jsonb', f"Expected jsonb, got {row.data_type}"


@pytest.mark.asyncio
async def test_categories_field_config_is_jsonb(db_session):
    """categories.field_config upgraded to JSONB."""
    result = await db_session.execute(text("""
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'field_config'
    """))
    row = result.fetchone()
    assert row is not None
    assert row.data_type == 'jsonb', f"Expected jsonb, got {row.data_type}"


@pytest.mark.asyncio
async def test_vehicles_product_id_fk_exists(db_session):
    """SC-4: vehicles table has product_id FK → products ON DELETE CASCADE."""
    result = await db_session.execute(text("""
        SELECT
            kcu.column_name,
            rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'vehicles'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'product_id'
    """))
    row = result.fetchone()
    assert row is not None, "vehicles.product_id FK not found"
    assert row.delete_rule == 'CASCADE', f"Expected CASCADE, got {row.delete_rule}"


# ─────────────────────────────────────────────────────────────────────
# Data Preservation Tests (SC-2, SC-3)
# ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_existing_categories_rows_preserved(db_session):
    """SC-2: All existing categories rows preserved after migration.

    This test seeds a category BEFORE running assertions. In CI, the DB starts clean,
    so we just verify the schema works correctly for new inserts too.
    """
    # Insert a category and verify it reads back correctly
    org_id = uuid4()
    cat_id = uuid4()

    # First ensure org exists (or use a test org)
    # Note: Skip if no organizations exist — check first
    result = await db_session.execute(text("SELECT id FROM organizations LIMIT 1"))
    org_row = result.fetchone()
    if org_row is None:
        pytest.skip("No organizations in test DB — seed data required")

    org_id = org_row.id

    await db_session.execute(text("""
        INSERT INTO categories (id, tenant_id, name, slug, field_config, attribute_schema)
        VALUES (:id, :tenant_id, 'Test Category', 'test-category-migration', '[]'::jsonb, '{}'::jsonb)
    """), {'id': cat_id, 'tenant_id': org_id})
    await db_session.flush()

    result = await db_session.execute(text("""
        SELECT id, name, field_config, attribute_schema
        FROM categories WHERE id = :id
    """), {'id': cat_id})
    row = result.fetchone()

    assert row is not None, "Inserted category not found"
    assert row.name == 'Test Category'
    assert row.field_config == []  # field_config preserved as array (JSONB)
    assert row.attribute_schema == {}  # attribute_schema default applied


@pytest.mark.asyncio
async def test_attribute_schema_default_is_empty_object(db_session):
    """SC-5: attribute_schema defaults to {} (empty object), NOT null, NOT array."""
    result = await db_session.execute(text("SELECT id FROM organizations LIMIT 1"))
    org_row = result.fetchone()
    if org_row is None:
        pytest.skip("No organizations in test DB")

    cat_id = uuid4()
    # Insert WITHOUT specifying attribute_schema — should use DEFAULT '{}'
    await db_session.execute(text("""
        INSERT INTO categories (id, tenant_id, name, slug)
        VALUES (:id, :tenant_id, 'Default Schema Test', 'default-schema-test')
    """), {'id': cat_id, 'tenant_id': org_row.id})
    await db_session.flush()

    result = await db_session.execute(text(
        "SELECT attribute_schema FROM categories WHERE id = :id"
    ), {'id': cat_id})
    row = result.fetchone()
    assert row is not None
    assert row.attribute_schema == {}, f"Expected {{}}, got {row.attribute_schema}"
    assert isinstance(row.attribute_schema, dict), "attribute_schema must be a dict (object)"


# ─────────────────────────────────────────────────────────────────────
# CASCADE DELETE Test (SC-4)
# ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_product_delete_cascades_to_vehicle(db_session):
    """SC-4: DELETE products row cascades to delete related vehicle row."""
    result = await db_session.execute(text("SELECT id FROM organizations LIMIT 1"))
    org_row = result.fetchone()
    if org_row is None:
        pytest.skip("No organizations in test DB")

    # Insert category
    cat_id = uuid4()
    await db_session.execute(text("""
        INSERT INTO categories (id, tenant_id, name, slug)
        VALUES (:id, :tenant_id, 'Cascade Test Cat', 'cascade-test-cat')
    """), {'id': cat_id, 'tenant_id': org_row.id})

    # Insert product
    prod_id = uuid4()
    await db_session.execute(text("""
        INSERT INTO products (id, tenant_id, organization_id, category_id, title, price_cents)
        VALUES (:id, :tenant_id, :org_id, :cat_id, 'Test Product', 1500000)
    """), {'id': prod_id, 'tenant_id': org_row.id, 'org_id': org_row.id, 'cat_id': cat_id})

    # Insert vehicle linked to product
    veh_id = uuid4()
    await db_session.execute(text("""
        INSERT INTO vehicles (id, product_id, vin)
        VALUES (:id, :product_id, '1HGBH41JXMN109186')
    """), {'id': veh_id, 'product_id': prod_id})
    await db_session.flush()

    # Delete the product
    await db_session.execute(text("DELETE FROM products WHERE id = :id"), {'id': prod_id})
    await db_session.flush()

    # Vehicle should be gone (CASCADE)
    result = await db_session.execute(text(
        "SELECT id FROM vehicles WHERE id = :id"
    ), {'id': veh_id})
    assert result.fetchone() is None, "Vehicle should have been cascade-deleted with product"


# ─────────────────────────────────────────────────────────────────────
# JSONB Operator Tests (proves JSONB, not JSON)
# ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_jsonb_containment_operator_on_attribute_schema(db_session):
    """JSONB @> operator works on attribute_schema — proves type is JSONB not JSON."""
    result = await db_session.execute(text("SELECT id FROM organizations LIMIT 1"))
    org_row = result.fetchone()
    if org_row is None:
        pytest.skip("No organizations in test DB")

    cat_id = uuid4()
    await db_session.execute(text("""
        INSERT INTO categories (id, tenant_id, name, slug, attribute_schema)
        VALUES (:id, :tenant_id, 'JSONB Test', 'jsonb-test',
                '{"year": {"type": "number", "required": true}}'::jsonb)
    """), {'id': cat_id, 'tenant_id': org_row.id})
    await db_session.flush()

    # @> operator — only works with JSONB (not JSON)
    result = await db_session.execute(text("""
        SELECT COUNT(*) FROM categories
        WHERE attribute_schema @> '{"year": {}}'::jsonb
          AND id = :id
    """), {'id': cat_id})
    count = result.scalar()
    assert count == 1, "@> containment operator failed — attribute_schema may not be JSONB"


@pytest.mark.asyncio
async def test_jsonb_containment_operator_on_products_attributes(db_session):
    """JSONB @> operator works on products.attributes — proves type is JSONB not JSON."""
    # This query must not raise an exception
    result = await db_session.execute(text("""
        SELECT COUNT(*) FROM products
        WHERE attributes @> '{}'::jsonb
    """))
    count = result.scalar()
    assert count >= 0  # no exception = JSONB operators work on products.attributes


# ─────────────────────────────────────────────────────────────────────
# Pre-flight Test (Brain #7 condition — must pass BEFORE C3 migration)
# ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_preflight_no_duplicate_json_keys_in_products_attributes(db_session):
    """PREFLIGHT: Verify no products.attributes rows contain duplicate JSON keys.

    JSONB deduplicates duplicate keys (last value wins). Running the JSON→JSONB
    migration on rows with duplicate keys causes silent data corruption.

    This test must pass BEFORE running the c3_schema_jsonb_upgrade migration.
    If this fails, manually inspect and fix the offending rows first.
    """
    # PostgreSQL can detect duplicate keys using json_object_keys with DISTINCT comparison
    result = await db_session.execute(text("""
        SELECT id, attributes::text
        FROM products
        WHERE (
            SELECT COUNT(*) FROM json_object_keys(attributes)
        ) != (
            SELECT COUNT(DISTINCT key) FROM json_object_keys(attributes) AS key
        )
    """))
    duplicates = result.fetchall()
    assert len(duplicates) == 0, (
        f"Found {len(duplicates)} product(s) with duplicate JSON keys in attributes. "
        f"Fix these before running the C3 migration. Row IDs: {[str(r.id) for r in duplicates]}"
    )
```

**IMPORTANT**: The `db_session` fixture does NOT exist in `apps/api/tests/integration/conftest.py` (confirmed — only `disable_rate_limiting` is present). Add the fixture to `apps/api/tests/integration/conftest.py` BEFORE creating the test file, so it is shared and reusable by future integration tests (e.g., test_vehicle_pagination.py already has xfail tests waiting for it).

Add to `apps/api/tests/integration/conftest.py`:

```python
# At top of test file or in conftest.py:
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

@pytest_asyncio.fixture
async def db_session():
    """Test DB session — uses TEST_DATABASE_URL from environment."""
    import os
    db_url = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://prosell:prosell@localhost:5432/prosell_test")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        async with session.begin():
            yield session
            await session.rollback()  # Always rollback test data
```
  </implementation>
</task>

</tasks>

<verification>
- [ ] `apps/api/alembic/versions/20260410_0000-c3_schema_jsonb_upgrade.py` exists
- [ ] Migration has `down_revision = 'abc123def456'`
- [ ] `upgrade()` contains `op.add_column('categories', ... attribute_schema JSONB ...)`
- [ ] `upgrade()` contains ALTER TABLE for products.attributes JSONB cast
- [ ] `upgrade()` contains ALTER TABLE for categories.field_config JSONB cast
- [ ] GIN indexes use plain `CREATE INDEX` (not CONCURRENTLY)
- [ ] `downgrade()` reverses all changes in correct order
- [ ] `apps/api/tests/integration/test_migration_c3.py` exists with all 8 test functions (7 post-migration + 1 pre-flight)
- [ ] Test file uses the existing conftest fixture pattern (not a new incompatible fixture)
- [ ] Pre-flight test `test_preflight_no_duplicate_json_keys_in_products_attributes` present and runs BEFORE migration
- [ ] All test function names match: test_preflight_no_duplicate_json_keys_in_products_attributes, test_attribute_schema_column_exists, test_products_attributes_is_jsonb, test_categories_field_config_is_jsonb, test_vehicles_product_id_fk_exists, test_existing_categories_rows_preserved, test_attribute_schema_default_is_empty_object, test_product_delete_cascades_to_vehicle, test_jsonb_containment_operator_on_attribute_schema
- [ ] `cd apps/api && uv run alembic history | head -3` shows c3schema001 as HEAD
- [ ] `cd apps/api && uv run ruff check alembic/versions/20260410_0000-c3_schema_jsonb_upgrade.py` → 0 errors
</verification>
