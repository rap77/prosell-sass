"""Integration tests for Phase 11 — C3 Schema JSONB upgrade migration.

These tests verify the Alembic migration outcomes against the running test DB.
Run: cd apps/api && uv run pytest tests/integration/test_migration_c3.py -v

Prerequisites: Test DB must have alembic upgrade c3schema001 applied.
  cd apps/api && DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/prosell_dev \\
    uv run alembic upgrade c3schema001
"""

from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# ─────────────────────────────────────────────────────────────────────────────
# Pre-flight Test (must pass BEFORE C3 migration)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_preflight_no_duplicate_json_keys_in_products_attributes(
    db_session: AsyncSession,
) -> None:
    """PREFLIGHT: Verify no products.attributes rows contain duplicate JSON keys.

    JSONB deduplicates duplicate keys (last value wins). Running the JSON->JSONB
    migration on rows with duplicate keys causes silent data corruption.

    This test must pass BEFORE running the c3_schema_jsonb_upgrade migration.
    If this fails, manually inspect and fix the offending rows first.
    """
    result = await db_session.execute(
        text("""
            SELECT id, attributes::text
            FROM products
            WHERE (
                SELECT COUNT(*) FROM json_object_keys(attributes::json)
            ) != (
                SELECT COUNT(DISTINCT key)
                FROM json_object_keys(attributes::json) AS key
            )
        """)
    )
    duplicates = result.fetchall()
    assert len(duplicates) == 0, (
        f"Found {len(duplicates)} product(s) with duplicate JSON keys in attributes. "
        f"Fix these before running the C3 migration. "
        f"Row IDs: {[str(r.id) for r in duplicates]}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Schema Verification Tests
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_attribute_schema_column_exists(db_session: AsyncSession) -> None:
    """SC-5: categories table has attribute_schema JSONB NOT NULL DEFAULT '{}'."""
    result = await db_session.execute(
        text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'categories'
              AND column_name = 'attribute_schema'
        """)
    )
    row = result.fetchone()
    assert row is not None, "attribute_schema column missing from categories"
    assert row.data_type == "jsonb", f"Expected jsonb, got {row.data_type}"
    assert row.is_nullable == "NO", "attribute_schema must be NOT NULL"
    assert "{}" in (row.column_default or ""), (
        f"Expected default '{{}}', got {row.column_default}"
    )


@pytest.mark.asyncio
async def test_products_attributes_is_jsonb(db_session: AsyncSession) -> None:
    """products.attributes must be JSONB type (not JSON)."""
    result = await db_session.execute(
        text("""
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'products' AND column_name = 'attributes'
        """)
    )
    row = result.fetchone()
    assert row is not None, "attributes column missing from products"
    assert row.data_type == "jsonb", f"Expected jsonb, got {row.data_type}"


@pytest.mark.asyncio
async def test_categories_field_config_is_jsonb(db_session: AsyncSession) -> None:
    """categories.field_config upgraded to JSONB."""
    result = await db_session.execute(
        text("""
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'categories' AND column_name = 'field_config'
        """)
    )
    row = result.fetchone()
    assert row is not None
    assert row.data_type == "jsonb", f"Expected jsonb, got {row.data_type}"


@pytest.mark.xfail(reason="vehicles table was dropped in c3schema_cleanup migration — FK no longer exists")
@pytest.mark.asyncio
async def test_vehicles_product_id_fk_exists(db_session: AsyncSession) -> None:
    """SC-4: vehicles table had product_id FK -> products ON DELETE CASCADE (table now dropped)."""
    result = await db_session.execute(
        text("""
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
        """)
    )
    row = result.fetchone()
    assert row is not None, "vehicles.product_id FK not found"
    assert row.delete_rule == "CASCADE", f"Expected CASCADE, got {row.delete_rule}"


# ─────────────────────────────────────────────────────────────────────────────
# Data Preservation Tests (SC-2, SC-3)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_existing_categories_rows_preserved(db_session: AsyncSession) -> None:
    """SC-2: Existing categories schema supports insert/read after migration.

    Inserts a category and verifies it reads back with correct JSONB values.
    Skips if no organizations exist (requires seeded data).
    """
    result = await db_session.execute(text("SELECT id FROM organizations LIMIT 1"))
    org_row = result.fetchone()
    if org_row is None:
        pytest.skip("No organizations in test DB — seed data required")

    org_id = org_row.id
    cat_id = uuid4()

    await db_session.execute(
        text("""
            INSERT INTO categories (id, tenant_id, name, slug, level, sort_order, is_active, field_config, attribute_schema)
            VALUES (
                :id, :tenant_id, 'Test Category Migration', 'test-category-migration', 0, 0, true,
                '[]'::jsonb, '{}'::jsonb
            )
        """),
        {"id": cat_id, "tenant_id": org_id},
    )
    await db_session.flush()

    result = await db_session.execute(
        text("""
            SELECT id, name, field_config, attribute_schema
            FROM categories WHERE id = :id
        """),
        {"id": cat_id},
    )
    row = result.fetchone()

    assert row is not None, "Inserted category not found"
    assert row.name == "Test Category Migration"
    assert row.field_config == [], "field_config should be empty array (JSONB)"
    assert row.attribute_schema == {}, "attribute_schema should be empty object (JSONB)"


@pytest.mark.asyncio
async def test_attribute_schema_default_is_empty_object(
    db_session: AsyncSession,
) -> None:
    """SC-5: attribute_schema defaults to {} (empty object), NOT null, NOT array."""
    result = await db_session.execute(text("SELECT id FROM organizations LIMIT 1"))
    org_row = result.fetchone()
    if org_row is None:
        pytest.skip("No organizations in test DB")

    cat_id = uuid4()
    # Insert WITHOUT specifying attribute_schema — should use DEFAULT '{}'
    await db_session.execute(
        text("""
            INSERT INTO categories (id, tenant_id, name, slug, level, sort_order, is_active, field_config)
            VALUES (:id, :tenant_id, 'Default Schema Test', 'default-schema-test-c3', 0, 0, true, '[]'::jsonb)
        """),
        {"id": cat_id, "tenant_id": org_row.id},
    )
    await db_session.flush()

    result = await db_session.execute(
        text("SELECT attribute_schema FROM categories WHERE id = :id"),
        {"id": cat_id},
    )
    row = result.fetchone()
    assert row is not None
    assert row.attribute_schema == {}, f"Expected {{}}, got {row.attribute_schema}"
    assert isinstance(
        row.attribute_schema, dict
    ), "attribute_schema must be a dict (object)"


# ─────────────────────────────────────────────────────────────────────────────
# CASCADE DELETE Test (SC-4)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_product_delete_cascades_to_vehicle(db_session: AsyncSession) -> None:
    """SC-4: DELETE products row cascades to delete related vehicle row."""
    result = await db_session.execute(text("SELECT id FROM organizations LIMIT 1"))
    org_row = result.fetchone()
    if org_row is None:
        pytest.skip("No organizations in test DB")

    # Insert category
    cat_id = uuid4()
    await db_session.execute(
        text("""
            INSERT INTO categories (id, tenant_id, name, slug, level, sort_order, is_active, field_config)
            VALUES (:id, :tenant_id, 'Cascade Test Cat', 'cascade-test-cat-c3', 0, 0, true, '[]'::jsonb)
        """),
        {"id": cat_id, "tenant_id": org_row.id},
    )

    # Insert product
    prod_id = uuid4()
    await db_session.execute(
        text("""
            INSERT INTO products (id, tenant_id, organization_id, category_id, title, price_cents, currency, condition, status, attributes, is_featured, view_count, favorite_count)
            VALUES (:id, :tenant_id, :org_id, :cat_id, 'Test Product Cascade', 1500000, 'USD', 'used', 'draft', '{}'::jsonb, false, 0, 0)
        """),
        {
            "id": prod_id,
            "tenant_id": org_row.id,
            "org_id": org_row.id,
            "cat_id": cat_id,
        },
    )

    # Insert vehicle linked to product (with all NOT NULL fields)
    veh_id = uuid4()
    await db_session.execute(
        text("""
            INSERT INTO vehicles (
                id, product_id, vin,
                mileage_unit,
                has_sunroof, has_navigation, has_leather, has_backup_camera,
                has_bluetooth, has_remote_start,
                vin_decoded_data, vin_verified
            )
            VALUES (
                :id, :product_id, '1HGBH41JXMN109187',
                'mi',
                false, false, false, false,
                false, false,
                '{}'::jsonb, false
            )
        """),
        {"id": veh_id, "product_id": prod_id},
    )
    await db_session.flush()

    # Delete the product — vehicle should cascade
    await db_session.execute(
        text("DELETE FROM products WHERE id = :id"), {"id": prod_id}
    )
    await db_session.flush()

    # Vehicle should be gone (CASCADE)
    result = await db_session.execute(
        text("SELECT id FROM vehicles WHERE id = :id"), {"id": veh_id}
    )
    assert result.fetchone() is None, (
        "Vehicle should have been cascade-deleted with product"
    )

# ─────────────────────────────────────────────────────────────────────────────
# JSONB Operator Tests (proves JSONB, not JSON)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_jsonb_containment_operator_on_attribute_schema(
    db_session: AsyncSession,
) -> None:
    """JSONB @> operator works on attribute_schema — proves type is JSONB not JSON."""
    result = await db_session.execute(text("SELECT id FROM organizations LIMIT 1"))
    org_row = result.fetchone()
    if org_row is None:
        pytest.skip("No organizations in test DB")

    cat_id = uuid4()
    await db_session.execute(
        text("""
            INSERT INTO categories (id, tenant_id, name, slug, level, sort_order, is_active, field_config, attribute_schema)
            VALUES (
                :id, :tenant_id, 'JSONB Test', 'jsonb-operator-test-c3', 0, 0, true, '[]'::jsonb,
                '{"year": {"type": "number", "required": true}}'::jsonb
            )
        """),
        {"id": cat_id, "tenant_id": org_row.id},
    )
    await db_session.flush()

    # @> operator — only works with JSONB (not JSON)
    result = await db_session.execute(
        text("""
            SELECT COUNT(*) FROM categories
            WHERE attribute_schema @> '{"year": {}}'::jsonb
              AND id = :id
        """),
        {"id": cat_id},
    )
    count = result.scalar()
    assert count == 1, (
        "@> containment operator failed — attribute_schema may not be JSONB"
    )


@pytest.mark.asyncio
async def test_jsonb_containment_operator_on_products_attributes(
    db_session: AsyncSession,
) -> None:
    """JSONB @> operator works on products.attributes — proves type is JSONB not JSON."""
    # This query must not raise an exception — no exception = JSONB operators work
    result = await db_session.execute(
        text("SELECT COUNT(*) FROM products WHERE attributes @> '{}'::jsonb")
    )
    count = result.scalar()
    assert count >= 0  # no exception = JSONB operators work on products.attributes
