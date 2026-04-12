# Phase 11 — Plan Review Context
> Generated: 2026-04-10T00:00:00Z
> Iteration: 1
> Purpose: Full context for Brain #7 plan validation

---

## [IMPLEMENTED REALITY]

### Current Category entity fields (exact)
```python
# apps/api/src/prosell/domain/entities/category.py
class Category(DomainModel):
    id: UUID
    tenant_id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    parent_id: UUID | None = None
    level: int = Field(default=0, ge=0)
    icon: str | None = None
    description: str | None = None
    image_url: str | None = None
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True
    field_config: list[dict[str, object]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    # attribute_schema: MISSING — must be added
```

`create()` factory accepts `**kwargs` — attribute_schema will flow through automatically.

### Current CategoryModel columns (exact)
```python
# apps/api/src/prosell/infrastructure/models/category_model.py
from sqlalchemy import JSON  # ← needs JSONB from sqlalchemy.dialects.postgresql
field_config: Mapped[dict[str, object]] = mapped_column(JSON, default=list, nullable=False)
# ↑ WRONG TYPE: dict[str, object] but default=list — should be list[dict[str, object]]
# ↑ Also: JSON needs JSONB upgrade
# attribute_schema: MISSING — must be added
```

IMPORTANT DISCREPANCY FOUND: `field_config` in CategoryModel uses `Mapped[dict[str, object]]` but `default=list` — the ORM type annotation and the Python default are inconsistent. The domain entity uses `list[dict[str, object]]`. Plan 11-00 T2 corrects the `Mapped[]` type to `list[dict[str, object]]` for field_config.

### Current ProductModel columns (exact)
```python
# apps/api/src/prosell/infrastructure/models/product_model.py
from sqlalchemy import JSON  # ← needs JSONB
attributes: Mapped[dict[str, object]] = mapped_column(JSON, default=dict, nullable=False)
# Only JSON is used for this import — safe to remove JSON after upgrading
```

### Current Alembic migration chain (exact revision IDs)
```
20260322_1720_initial_uuid_schema.py
20260324_0828-20f24e79033e_recreate_users_table_complete.py
20260324_2057-83586f56fb82_remove_facebook_page_fk.py
20260324_2102-17d9ed732cf9_complete_publications_table.py
20260329_0825-a546709840eb_add_dealers_table.py
20260329_1500-add_user_dealers_table.py
20260404_1429-094a57cf7b48_add_missing_tables_vehicles_products_.py
20260404_1810-504440751584_merge_vehicle_products_with_user_dealers.py
20260407_0234-1e5447840509_add_vehicles_categories_product_images_.py
20260407_0235-abc123def456_final_missing_tables.py  ← CURRENT HEAD
```

Most recent migration `abc123def456`:
- `down_revision = 'b1c2d3e4f5a6'`
- Creates categories (with `field_config JSON DEFAULT '[]'`), product_images, vehicles tables
- `vehicles.product_id` FK → products ON DELETE CASCADE ✅ already exists

New migration must have: `down_revision = 'abc123def456'`

### Test fixture pattern from conftest.py (exact fixture names)
```python
# apps/api/tests/integration/conftest.py
# ONLY fixture: disable_rate_limiting (autouse=True) — NOT a db_session
# NO async db fixture exists at integration level
```

CRITICAL: There is NO `db_session` fixture in integration conftest.py. The plan assumes one exists. Must add inline fixture or to conftest.py.

### Existing integration test pattern
```
apps/api/tests/integration/
  conftest.py           ← only has disable_rate_limiting
  test_facebook_oauth_integration.py
  test_oauth_callback.py
  test_org_upload_url.py
  test_organization_api.py
```

All existing integration tests use HTTP (FastAPI TestClient / httpx) pattern, NOT direct db_session. No async db fixture pattern found.

---

## [PLAN SUMMARIES]

### Plan 11-00 (Wave 1)
**Objective**: Update domain entity and SQLAlchemy models for C3 schema — adding `attribute_schema` to Category entity and upgrading JSON → JSONB types on Category and Product models.

**Tasks**:
1. **T1**: Add `attribute_schema: dict[str, object] = Field(default_factory=dict)` to Category entity after `field_config`. No changes to `create()` — kwargs handles it.
2. **T2**: Update CategoryModel imports (JSON → JSONB), update `field_config` type annotation to `list[dict[str, object]]` + JSONB, add `attribute_schema` column with JSONB. Update ProductModel to JSONB. Keep JSON import if needed elsewhere.

**Acceptance criteria**:
- attribute_schema field in domain entity
- JSONB type on field_config and attribute_schema in CategoryModel
- JSONB type on attributes in ProductModel
- pyright + ruff: 0 errors

### Plan 11-01 (Wave 2)
**Objective**: Create Alembic migration that adds attribute_schema JSONB to categories + upgrades attributes/field_config to JSONB. Write integration tests verifying migration outcomes.

**Tasks**:
1. **T1**: Create `apps/api/alembic/versions/20260410_0000-c3_schema_jsonb_upgrade.py` with revision `c3schema001`, down_revision `abc123def456`. ops: add_column attribute_schema, ALTER COLUMN products.attributes JSONB, ALTER COLUMN categories.field_config JSONB, GIN indexes (no CONCURRENTLY).
2. **T2**: Create `apps/api/tests/integration/test_migration_c3.py` with 8 test functions using `db_session` fixture. Check conftest.py first.

**Acceptance criteria**:
- Migration file exists with correct revision chain
- 8 test functions present (pre-flight + 7 post-migration)
- All verification checks pass

---

## [CODE SNIPPETS]

### CategoryModel actual field_config (BUG found):
```python
# CURRENT — WRONG TYPE ANNOTATION:
field_config: Mapped[dict[str, object]] = mapped_column(JSON, default=list, nullable=False)
# Should be:
field_config: Mapped[list[dict[str, object]]] = mapped_column(JSONB, default=list, nullable=False)
```

### abc123def456 creates categories with JSON (not JSONB):
```sql
field_config JSON DEFAULT '[]' NOT NULL,
-- attribute_schema is MISSING
```

### Integration conftest.py — no db fixture:
```python
@pytest.fixture(autouse=True)
def disable_rate_limiting(monkeypatch):
    # ... only fixture — no db_session
```

### vehicles table already has CASCADE:
```sql
product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
```

---

## [CORRECTED ASSUMPTIONS]

1. **Brain #7 might assume `db_session` exists in conftest.py** — it does NOT. The integration test file must either define its own async db fixture inline or add one to conftest.py. Failing to account for this = all tests error with `fixture 'db_session' not found`.

2. **Brain #7 might assume CategoryModel field_config is `Mapped[list[dict]]`** — it is actually `Mapped[dict[str, object]]` (wrong annotation). Plan 11-00 T2 must also fix the type annotation from `dict` to `list[dict]` for field_config.

3. **Brain #7 might assume JSON import in category_model.py has no other uses** — JSON is ONLY used for `field_config` in category_model.py, so it must be removed after JSONB upgrade. In product_model.py, JSON is ONLY used for `attributes`, so same pattern.

4. **Brain #7 might assume vehicles.product_id needs migration** — the FK with CASCADE already exists in `abc123def456`. The cascade test in 11-01-T2 validates existing schema behavior, not a new migration.

5. **Brain #7 might assume pre-flight duplicate key check should be IN the migration** — the CONTEXT doc says "log warning if found", but the plan says "pre-flight test runs BEFORE migration". These are separate: test is a pre-migration validator, not embedded in the migration itself. This is correct.

6. **Brain #7 might assume `uv run alembic history` works without a running DB** — it does NOT necessarily. The verify step `cd apps/api && uv run alembic history | head -3` requires DATABASE_URL to be set and DB to be accessible. This verification step may not be runnable in GSD executor context.

7. **Brain #7 might assume slug uniqueness constraint is only per-tenant** — the current CategoryModel has `slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)`. This is GLOBAL unique (across all tenants), which may cause issues with test data insertion in multiple test runs.

---

## [WHAT I NEED]

1. **Planning Fallacy check** — What are we underestimating in scope/complexity?
   - Specifically: is the missing `db_session` fixture in conftest.py a 30-minute problem or a 2-hour problem given the existing HTTP-based integration test pattern?
   - Is the CategoryModel type annotation bug (`Mapped[dict]` vs `Mapped[list[dict]]`) in scope for Plan 11-00 T2 or does it need a separate task?

2. **Omission Bias** — What critical step is missing that will block execution?
   - The `db_session` fixture is missing. Where should it go — inline in test file or in conftest.py? What are the tradeoffs?
   - The `slug` global uniqueness constraint in categories — test isolation will fail if tests INSERT with hardcoded slugs and run multiple times without rollback.
   - Plan 11-01 T2 relies on `db_session` with `session.begin()` + `session.rollback()` — but no cleanup strategy is specified for categories inserted with unique slugs like 'jsonb-test', 'cascade-test-cat' etc.

3. **Systems Thinking** — What feedback loops exist between the 2 plans?
   - Plan 11-00 changes ORM model types. Plan 11-01 creates migration that matches those types. If 11-00 changes `field_config` to `Mapped[list[dict]]` with `JSONB`, the migration must also ALTER the column type — which it does. The ORM and migration are in sync.
   - But: if pyright finds the `Mapped[dict]` → `Mapped[list[dict]]` correction in 11-00 and raises errors, it could cascade to other files that use `CategoryModel.field_config`. Need to check if any repository code accesses `field_config` directly.

4. **Over-engineering risk** — What won't actually be needed?
   - GIN indexes: Plan says to create them. For Phase 11 (migration correctness), these are premature optimization. They're valid for Phase 12 queries but not needed to prove Phase 11 success criteria. However, since the migration is a one-shot operation and GIN indexes are cheap on empty/small tables, this is acceptable.
   - Pre-flight duplicate key test: Valid safety check but may be over-cautious given we know the DB has clean seed data. Still worth including.

5. **Acceptance criteria quality** — Are the verification checklists actually verifiable?
   - Plan 11-00: All checklist items are syntactically verifiable (grep, pyright). ✅
   - Plan 11-01: `cd apps/api && uv run alembic history | head -3` requires running DB. If GSD executor runs without DB, this check FAILS. Should be marked as "optional if DB available".
   - Plan 11-01: Test file verification (`test_preflight_no_duplicate_json_keys_in_products_attributes` present) is syntactically verifiable. ✅
   - Plan 11-01: The test for `test_existing_categories_rows_preserved` skips if no organizations exist — this is correct behavior for CI, but the skip might be confusing. The test doesn't actually prove data preservation if it always skips.

Verdict: APPROVED_WITH_CONDITIONS

---

## [ITERATION 2 DELTA]
> Brain #7 ran. Verdict: APPROVED_WITH_CONDITIONS (78/100). 3 conditions identified.

### Conditions and resolutions:

| # | Condition | Status | Fix applied |
|---|-----------|--------|-------------|
| 1 | Ruff check path bug in Plan 11-01 verification | ✅ FIXED | Changed `apps/api/alembic/...` to `alembic/...` in 11-01 verification checklist |
| 2 | Missing `alembic upgrade head` step between T1 and T2 in Plan 11-01 | ✅ FIXED | Added explicit prerequisite block after T1 implementation section |
| 3 | `db_session` fixture missing from integration conftest.py | ✅ FIXED | Plan 11-01 T2 updated to add fixture to conftest.py (not inline) for reuse |

**All 3 conditions fixed. Plans approved. Ready for GSD execution.**
