# Phase 11 — Domain Brain Outputs
> Generated: 2026-04-10T00:00:00.000Z
> Status: complete

## Brain #5 — Backend Expert

### Critical Upfront Discovery

The C3 schema is **already 90% implemented**. Migration `abc123def456` (2026-04-07) already created:
- `vehicles(product_id FK → products ON DELETE CASCADE UNIQUE)` ✅
- `products(attributes JSON DEFAULT '{}')` ✅ (needs JSONB upgrade)
- `categories(field_config JSON DEFAULT '[]')` ✅ (needs attribute_schema JSONB added)

**Real migration work is minimal and surgical — not a from-scratch schema migration.**

---

### Q1: ADD attribute_schema vs RENAME field_config?

**Decision: ADD a new `attribute_schema` JSONB column. Keep `field_config`.**

Reasoning:
- `field_config` is a `JSON ARRAY` (format: `[{field_name, field_label, field_type, is_required}]`) — it drives dynamic UI field rendering
- `attribute_schema` is a `JSONB OBJECT` (format: `{field_name: {type, required, options}}`) — it's the C3 schema descriptor for validation and API

They are semantically different. Renaming `field_config` to `attribute_schema` would break the UI field rendering logic. Keep both. Add `attribute_schema` as new column.

---

### Q2: ALTER JSON → JSONB (products.attributes)

In PostgreSQL 17, the correct pattern is:

```sql
ALTER TABLE products ALTER COLUMN attributes TYPE JSONB USING attributes::text::jsonb;
```

This is safe because:
- All valid JSON is valid JSONB (binary-equivalent subset)
- The `::text::jsonb` cast handles any internal representation differences
- Data is fully preserved — no truncation, no transformation

Also upgrade `field_config` type to JSONB for operator support:
```sql
ALTER TABLE categories ALTER COLUMN field_config TYPE JSONB USING field_config::text::jsonb;
```

---

### Q3: Alembic ops (exact code)

```python
from sqlalchemy.dialects.postgresql import JSONB
import sqlalchemy as sa
from alembic import op

def upgrade() -> None:
    # 1. Add attribute_schema to categories
    op.add_column(
        'categories',
        sa.Column(
            'attribute_schema',
            JSONB(),
            server_default='{}',
            nullable=False,
        )
    )
    
    # 2. Upgrade products.attributes from JSON → JSONB (data preserved)
    op.execute(
        "ALTER TABLE products ALTER COLUMN attributes TYPE JSONB "
        "USING attributes::text::jsonb"
    )
    
    # 3. Upgrade categories.field_config from JSON → JSONB (data preserved)
    op.execute(
        "ALTER TABLE categories ALTER COLUMN field_config TYPE JSONB "
        "USING field_config::text::jsonb"
    )
    
    # 4. Optional GIN index on attribute_schema for JSONB operators
    op.execute(
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_categories_attribute_schema "
        "ON categories USING gin(attribute_schema)"
    )
    op.execute(
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_products_attributes "
        "ON products USING gin(attributes)"
    )

def downgrade() -> None:
    # Drop GIN indexes
    op.execute("DROP INDEX IF EXISTS ix_categories_attribute_schema;")
    op.execute("DROP INDEX IF EXISTS ix_products_attributes;")
    
    # Revert JSONB → JSON
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

> **Note**: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. Alembic wraps migrations in transactions by default. Set `transaction_per_migration = False` in `env.py` OR use `op.execute` outside transaction with `conn.execute(text(...).execution_options(autocommit=True))`. Alternative: create non-CONCURRENTLY (brief lock, acceptable for Phase 11 scope).

---

### Q4: SQLAlchemy 2.0 Model Changes

**CategoryModel** (`apps/api/src/prosell/infrastructure/models/category_model.py`):
```python
from sqlalchemy.dialects.postgresql import JSONB

# Change field_config type:
field_config: Mapped[list[dict[str, object]]] = mapped_column(
    JSONB,          # was JSON
    default=list,
    nullable=False,
)

# Add attribute_schema:
attribute_schema: Mapped[dict[str, object]] = mapped_column(
    JSONB,
    server_default='{}',
    nullable=False,
)
```

**ProductModel** (`apps/api/src/prosell/infrastructure/models/product_model.py`):
```python
from sqlalchemy.dialects.postgresql import JSONB

# Change attributes type:
attributes: Mapped[dict[str, object]] = mapped_column(
    JSONB,          # was JSON
    default=dict,
    nullable=False,
)
```

---

### Q5: Domain Entity Changes

**Category** (`apps/api/src/prosell/domain/entities/category.py`):
```python
# Add attribute_schema field (alongside existing field_config)
attribute_schema: dict[str, object] = Field(default_factory=dict)
```

Keep `field_config` intact — it drives dynamic UI rendering. Update `create()` factory to accept `attribute_schema` kwarg.

**Product**: No domain entity changes needed — `attributes: dict[str, object]` already exists correctly. Only infrastructure-level type upgrade (JSON→JSONB).

**Vehicle**: No changes — `product_id` FK already exists correctly.

---

### Q6: Risk with field_config column

**Keep it. Do not drop.** Reasons:
1. Existing domain/UI logic depends on `field_config` being an array of field descriptors
2. Dropping it would break CategoryModel, domain entity, and any UI that renders dynamic fields
3. The type upgrade (JSON → JSONB) is safe and additive

**Only change**: Upgrade its type from `JSON` to `JSONB`. No data loss, no behavioral change.

---

### Q7: Rollback Story

Alembic `downgrade()` handles full rollback:
1. Drop `attribute_schema` column from categories
2. Revert `products.attributes` from JSONB → JSON
3. Revert `categories.field_config` from JSONB → JSON

JSON → JSONB → JSON roundtrip is lossless (JSONB is a strict superset of JSON).

**Mid-migration failure**: PostgreSQL wraps DDL in transactions. If Alembic migration fails mid-way, the entire transaction is rolled back automatically. The DB is left in its pre-migration state. No partial state possible for `op.add_column` + `op.execute` ALTER TABLE within the same transaction.

**Exception**: `CREATE INDEX CONCURRENTLY` cannot be in a transaction — handle by making it non-CONCURRENTLY or running it as a separate post-migration step.

---

## Brain #6 — QA/DevOps Expert

### Q1: Testing Existing Data Preservation

Use **pytest-alembic** with a `alembic_runner` fixture pattern:

```python
# apps/api/tests/integration/test_migration_c3.py
import pytest
from sqlalchemy import text, inspect

@pytest.mark.asyncio
async def test_categories_attribute_schema_exists(test_db):
    """Verify attribute_schema column added to categories."""
    async with test_db.connect() as conn:
        result = await conn.execute(text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'categories'
              AND column_name = 'attribute_schema'
        """))
        row = result.fetchone()
        assert row is not None
        assert row.data_type == 'jsonb'
        assert '{}' in row.column_default

@pytest.mark.asyncio
async def test_products_attributes_is_jsonb(test_db):
    """Verify products.attributes upgraded to JSONB."""
    async with test_db.connect() as conn:
        result = await conn.execute(text("""
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'products' AND column_name = 'attributes'
        """))
        row = result.fetchone()
        assert row.data_type == 'jsonb'

@pytest.mark.asyncio
async def test_existing_rows_preserved(test_db, seed_category):
    """Existing categories rows still intact after migration."""
    async with test_db.connect() as conn:
        result = await conn.execute(text(
            "SELECT id, name, field_config, attribute_schema FROM categories WHERE id = :id"
        ), {'id': seed_category.id})
        row = result.fetchone()
        assert row.name == seed_category.name
        assert row.field_config == seed_category.field_config  # preserved
        assert row.attribute_schema == {}  # default applied

@pytest.mark.asyncio
async def test_vehicle_product_cascade_delete(test_db, seed_product_vehicle):
    """DELETE product cascades to vehicle (ON DELETE CASCADE)."""
    product_id = seed_product_vehicle['product_id']
    vehicle_id = seed_product_vehicle['vehicle_id']
    async with test_db.begin() as conn:
        await conn.execute(text("DELETE FROM products WHERE id = :id"), {'id': product_id})
        result = await conn.execute(
            text("SELECT id FROM vehicles WHERE id = :id"), {'id': vehicle_id}
        )
        assert result.fetchone() is None  # cascade worked
```

---

### Q2: CI/CD Risk of ALTER COLUMN JSON→JSONB

**Risk level: LOW for Phase 11 scope.**

Technical facts:
- `ALTER TABLE ... ALTER COLUMN ... TYPE JSONB` in PostgreSQL 17 does require an `AccessExclusiveLock`
- With empty/few-row tables (dev/staging), this is milliseconds
- For production with thousands of rows: consider `pg_repack` or maintenance window
- **For our 5 active dealers scenario**: acceptable risk — tables are small

Recommended safe order of Alembic ops within transaction:
1. `ALTER TABLE products ALTER COLUMN attributes TYPE JSONB` (brief lock)
2. `ALTER TABLE categories ALTER COLUMN field_config TYPE JSONB` (brief lock)  
3. `ALTER TABLE categories ADD COLUMN attribute_schema JSONB DEFAULT '{}'` (instant)
4. GIN indexes as separate non-transactional step (or skip CONCURRENTLY)

---

### Q3: Migration Test Approach

**Recommendation: Plain pytest + asyncio + direct DB inspection (no pytest-alembic needed)**

Reasoning:
- Our test DB is reset per test suite via Docker Compose
- We run `alembic upgrade head` in test setup — the migration IS the test
- Then verify schema via `information_schema.columns` queries
- pytest-alembic adds complexity without benefit at this scale

Pattern:
```python
# conftest.py (apps/api/tests/)
@pytest.fixture(scope="session")
async def migrated_db():
    """DB with all migrations applied."""
    # Runs alembic upgrade head before tests
    # Returns async engine
    ...
```

---

### Q4: E2E Tests at Risk

Tests that directly touch categories/products schema fields:
- Any test that reads `field_config` from category API response (needs `attribute_schema` check too)
- Product creation tests that assert on `attributes` field type
- Vehicle cascade delete tests (already implicitly covered by existing E2E)

**Safe assumption**: The 207 passing E2E tests don't assert on internal DB column types — they test HTTP responses. Adding `attribute_schema` column with default `{}` and upgrading JSON→JSONB are **non-breaking changes** to the API surface.

**Risk**: Zero for E2E tests. The migration adds columns and upgrades types — no column removals, no NOT NULL without defaults.

---

### Q5: "Migration Verified" Success Criteria

Concrete verification checklist for Phase 11 DONE:

1. `alembic upgrade head` exits with code 0 (no Python exceptions)
2. `SELECT data_type FROM information_schema.columns WHERE table_name='categories' AND column_name='attribute_schema'` returns `jsonb`
3. `SELECT data_type FROM information_schema.columns WHERE table_name='products' AND column_name='attributes'` returns `jsonb`
4. `SELECT data_type FROM information_schema.columns WHERE table_name='categories' AND column_name='field_config'` returns `jsonb`
5. All existing categories rows have `attribute_schema = '{}'::jsonb` (default applied)
6. JSONB operator test: `SELECT * FROM categories WHERE attribute_schema @> '{}'::jsonb` returns all rows
7. `DELETE FROM products WHERE id = X` cascades deletion of related vehicle row
8. pytest migration tests: all PASS
9. pyright/ruff: no new type errors in updated models

---

### Q6: JSONB-Specific Tests

```python
@pytest.mark.asyncio
async def test_jsonb_containment_operator(test_db):
    """@> operator works — proves JSONB not JSON semantics."""
    async with test_db.begin() as conn:
        # Insert category with attribute_schema
        await conn.execute(text("""
            INSERT INTO categories (id, tenant_id, name, slug, attribute_schema)
            VALUES (gen_random_uuid(), :org_id, 'Vehicles', 'vehicles', 
                    '{"year": {"type": "number", "required": true}}'::jsonb)
        """), {'org_id': ...})
        
        # Test @> containment
        result = await conn.execute(text("""
            SELECT COUNT(*) FROM categories 
            WHERE attribute_schema @> '{"year": {}}'::jsonb
        """))
        count = result.scalar()
        assert count == 1  # @> operator worked

@pytest.mark.asyncio  
async def test_attribute_schema_default_empty_object(test_db):
    """attribute_schema defaults to {} not null."""
    async with test_db.begin() as conn:
        await conn.execute(text("""
            INSERT INTO categories (id, tenant_id, name, slug)
            VALUES (gen_random_uuid(), :org_id, 'Test', 'test')
        """), {'org_id': ...})
        
        result = await conn.execute(text(
            "SELECT attribute_schema FROM categories WHERE slug = 'test'"
        ))
        value = result.scalar()
        assert value == {}  # not null, not array, empty object
```

---

## Dispatch Meta

| Property | Value |
|----------|-------|
| Total brains dispatched | 2 |
| Brains | #5 Backend Expert, #6 QA/DevOps Expert |
| All returned successfully | yes |
| Key finding | C3 schema is already 90% implemented — migration is surgical (add 1 column, upgrade 2 types) |
| Critical decision | Keep field_config, add attribute_schema as separate column |
| Main risk | ALTER COLUMN with AccessExclusiveLock — acceptable given small table sizes |
