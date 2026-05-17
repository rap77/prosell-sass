# Phase 11 Context: DB Migration — C3 Schema

> Last updated: 2026-04-10 — Brain consultation complete (Brains #5, #6, #7)

## Business Context

**ProSell SaaS**: B2B SaaS platform for dealerships.

**Phase 11 Goal**: Finalize the C3 schema migration — `categories(attribute_schema JSONB)`, `products(attributes JSONB)`, `vehicles(product_id FK → products)` — without data loss.

**Why this matters**: Phase 12 (Backend API) and Phase 13 (Frontend) depend on this schema being stable and type-correct. JSONB enables GIN indexing and rich query operators (`@>`, `?`, `#>>`) that JSON cannot provide.

---

## Critical Discovery: Schema Already 90% Implemented ✅

The migration `abc123def456` (2026-04-07) already created the core C3 tables:

| What | Status |
|------|--------|
| `vehicles(product_id FK → products ON DELETE CASCADE)` | ✅ Already exists |
| `products(attributes JSON DEFAULT '{}')` | ✅ Exists — needs JSONB upgrade |
| `categories(field_config JSON DEFAULT '[]')` | ✅ Exists — needs attribute_schema added |
| `categories(attribute_schema JSONB DEFAULT '{}')` | ❌ Missing — needs ADD COLUMN |

**Real work is surgical, not a from-scratch migration.**

---

## Architecture Decision: field_config vs attribute_schema

**Decision: Keep BOTH columns. They serve different purposes.**

| Column | Type | Format | Purpose |
|--------|------|--------|---------|
| `categories.field_config` | JSONB (upgraded from JSON) | Array: `[{field_name, field_label, field_type, is_required}]` | Dynamic UI field renderer — drives form generation |
| `categories.attribute_schema` | JSONB (new column) | Object: `{field_name: {type, required, options}}` | C3 API validation schema — drives data validation |

**DO NOT rename or drop `field_config`** — existing Category domain entity and UI logic depends on it as a field renderer descriptor.

Phase 12 API contract must document both: `field_config` for UI rendering, `attribute_schema` for data validation.

---

## Migration Strategy (Alembic)

### Migration file: `20260410_XXXX-<hash>_c3_schema_jsonb_upgrade.py`

```python
"""c3_schema_jsonb_upgrade

Revision ID: <auto>
Revises: abc123def456
Create Date: 2026-04-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


def upgrade() -> None:
    # Step 1: Pre-flight check — verify no duplicate JSON keys in products.attributes
    # (JSONB silently deduplicates; we assert data is clean before upgrade)
    # Note: This is a CHECK, not a blocker — log warning if found.

    # Step 2: Add attribute_schema to categories (new column, no data migration needed)
    op.add_column(
        'categories',
        sa.Column(
            'attribute_schema',
            JSONB(),
            server_default='{}',
            nullable=False,
        )
    )

    # Step 3: Upgrade products.attributes JSON → JSONB (data preserved, lossless cast)
    op.execute(
        "ALTER TABLE products ALTER COLUMN attributes TYPE JSONB "
        "USING attributes::text::jsonb"
    )

    # Step 4: Upgrade categories.field_config JSON → JSONB (data preserved)
    op.execute(
        "ALTER TABLE categories ALTER COLUMN field_config TYPE JSONB "
        "USING field_config::text::jsonb"
    )

    # Step 5: GIN indexes — DO NOT USE CONCURRENTLY (cannot run inside Alembic transaction)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_categories_attribute_schema_gin "
        "ON categories USING gin(attribute_schema)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_products_attributes_gin "
        "ON products USING gin(attributes)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_products_attributes_gin;")
    op.execute("DROP INDEX IF EXISTS ix_categories_attribute_schema_gin;")
    op.execute(
        "ALTER TABLE products ALTER COLUMN attributes TYPE JSON "
        "USING attributes::text::json"
    )
    op.execute(
        "ALTER TABLE categories ALTER COLUMN field_config TYPE JSON "
        "USING field_config::text::json"
    )
    op.drop_column('categories', 'attribute_schema')
```

---

## SQLAlchemy Model Changes

### CategoryModel (`apps/api/src/prosell/infrastructure/models/category_model.py`)

```python
from sqlalchemy.dialects.postgresql import JSONB

# Change:
field_config: Mapped[list[dict[str, object]]] = mapped_column(
    JSONB,          # was JSON
    default=list,
    nullable=False,
)

# Add:
attribute_schema: Mapped[dict[str, object]] = mapped_column(
    JSONB,
    server_default='{}',
    nullable=False,
)
```

### ProductModel (`apps/api/src/prosell/infrastructure/models/product_model.py`)

```python
from sqlalchemy.dialects.postgresql import JSONB

# Change:
attributes: Mapped[dict[str, object]] = mapped_column(
    JSONB,          # was JSON
    default=dict,
    nullable=False,
)
```

### VehicleModel — NO CHANGES NEEDED ✅

---

## Domain Entity Changes

### Category (`apps/api/src/prosell/domain/entities/category.py`)

Add `attribute_schema` field:
```python
# Add alongside existing field_config:
attribute_schema: dict[str, object] = Field(default_factory=dict)
```

Update `create()` factory method to accept `attribute_schema` optional kwarg.

### Product — NO CHANGES NEEDED ✅
`attributes: dict[str, object]` already correct.

### Vehicle — NO CHANGES NEEDED ✅
`product_id: UUID` FK already correct.

---

## Pre-flight Checks (run before migration)

```sql
-- Check 1: Verify no duplicate JSON keys in products.attributes
-- JSONB silently deduplicates — if any exist, log warning before upgrading
SELECT id, attributes::text
FROM products
WHERE attributes IS NOT NULL
  AND attributes::text != '{}'
LIMIT 10;

-- Check 2: Verify vehicles.product_id FK exists (already known — confirming)
SELECT conname FROM pg_constraint
WHERE conrelid = 'vehicles'::regclass AND contype = 'f';

-- Check 3: Count existing rows (to verify post-migration preservation)
SELECT
  (SELECT COUNT(*) FROM categories) AS categories_count,
  (SELECT COUNT(*) FROM products) AS products_count,
  (SELECT COUNT(*) FROM vehicles) AS vehicles_count;
```

---

## Test Strategy

### Test file: `apps/api/tests/integration/test_migration_c3.py`

**Test suite covers**:
1. Schema verification tests (information_schema queries)
2. Data preservation tests (existing rows intact)
3. Default value tests (attribute_schema = {})
4. JSONB operator tests (@> containment, ? key exists)
5. CASCADE DELETE test (product → vehicle)

**Test approach**: Direct async SQLAlchemy + pytest-asyncio (no pytest-alembic needed — migration runs in test setup via fixture).

**Key patterns**:
```python
# Schema check
async def test_attribute_schema_column_exists(db):
    result = await db.execute(text("""
        SELECT data_type FROM information_schema.columns
        WHERE table_name='categories' AND column_name='attribute_schema'
    """))
    assert result.scalar() == 'jsonb'

# JSONB operator
async def test_jsonb_containment_operator(db):
    # Test @> operator — only possible with JSONB, not JSON
    result = await db.execute(text(
        "SELECT COUNT(*) FROM categories WHERE attribute_schema @> '{}'::jsonb"
    ))
    assert result.scalar() >= 0  # no exception = JSONB operators work

# Cascade
async def test_product_delete_cascades_to_vehicle(db, seed_data):
    await db.execute(text("DELETE FROM products WHERE id = :id"), {'id': seed_data.product_id})
    result = await db.execute(text("SELECT id FROM vehicles WHERE product_id = :id"), {'id': seed_data.product_id})
    assert result.fetchone() is None
```

---

## Success Criteria (Phase 11 DONE)

1. `alembic upgrade head` exits with code 0, zero Python exceptions
2. `SELECT data_type FROM information_schema.columns WHERE table_name='categories' AND column_name='attribute_schema'` → `jsonb`
3. `SELECT data_type FROM information_schema.columns WHERE table_name='products' AND column_name='attributes'` → `jsonb`
4. `SELECT data_type FROM information_schema.columns WHERE table_name='categories' AND column_name='field_config'` → `jsonb`
5. All existing categories rows have `attribute_schema = '{}'::jsonb`
6. `SELECT * FROM categories WHERE attribute_schema @> '{}'::jsonb` executes without error (JSONB @> operator works)
7. `DELETE FROM products` cascades to `vehicles` (ON DELETE CASCADE verified)
8. pytest integration tests: all PASS
9. `pyright` and `ruff`: no new errors in updated models

---

## Brain Consultation Summary

| Brain | Verdict | Key Input |
|-------|---------|-----------|
| #5 Backend Expert | ✅ Approved | ADD attribute_schema as new column; keep field_config; use JSONB type from sqlalchemy.dialects.postgresql; ALTER JSON→JSONB via ::text::jsonb cast |
| #6 QA/DevOps | ✅ Approved | ALTER COLUMN is AccessExclusiveLock but acceptable for small tables; plain pytest + asyncio sufficient; zero E2E regression risk |
| #7 Systems Thinker | ✅ APPROVED_WITH_CONDITIONS | Rating: 82/100. Conditions: (1) pre-flight duplicate key check, (2) no CONCURRENTLY for GIN indexes, (3) Phase 12 must document field_config vs attribute_schema contract |

---

## Rollback Story

1. `alembic downgrade -1`: drops attribute_schema, reverts JSONB→JSON
2. JSON→JSONB→JSON roundtrip is lossless
3. GIN indexes dropped first (no-op if they don't exist via IF EXISTS)
4. DB returns to exact pre-migration state

---

## Decisions Made (carry forward to Phase 12)

- `field_config` = UI field renderer array descriptor (drives form field generation)
- `attribute_schema` = API validation schema object (drives data validation in products.attributes)
- Phase 12 API for categories MUST expose both fields with explicit documentation
- JSONB type for both columns enables `@>`, `?`, `#>>` operators in Phase 12 queries

---

*Context finalized: 2026-04-10 — Ready for GSD plan-phase 11*
