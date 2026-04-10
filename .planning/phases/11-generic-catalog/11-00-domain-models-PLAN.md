---
plan: "00"
phase: 11
wave: 1
depends_on: []
autonomous: true
files_modified:
  - apps/api/src/prosell/domain/entities/category.py
  - apps/api/src/prosell/infrastructure/models/category_model.py
  - apps/api/src/prosell/infrastructure/models/product_model.py
requirements: [CAT-01, CAT-02]
estimated_tasks: 2

must_haves:
  truths:
    - "Category domain entity has attribute_schema: dict[str, object] = Field(default_factory=dict)"
    - "Category.create() factory method accepts attribute_schema optional kwarg"
    - "CategoryModel uses JSONB type (from sqlalchemy.dialects.postgresql) for both field_config and attribute_schema"
    - "ProductModel uses JSONB type (from sqlalchemy.dialects.postgresql) for attributes"
    - "pyright and ruff pass with zero new errors on changed files"
  artifacts:
    - path: "apps/api/src/prosell/domain/entities/category.py"
      provides: "Category domain entity with attribute_schema field"
      exports: ["Category"]
    - path: "apps/api/src/prosell/infrastructure/models/category_model.py"
      provides: "CategoryModel with JSONB types for field_config and attribute_schema"
      exports: ["CategoryModel"]
    - path: "apps/api/src/prosell/infrastructure/models/product_model.py"
      provides: "ProductModel with JSONB type for attributes"
      exports: ["ProductModel"]
  key_links:
    - from: "apps/api/src/prosell/infrastructure/models/category_model.py"
      to: "apps/api/src/prosell/domain/entities/category.py"
      via: "mirrors domain entity fields"
      pattern: "attribute_schema"
    - from: "apps/api/src/prosell/infrastructure/models/product_model.py"
      to: "apps/api/src/prosell/infrastructure/database/base.py"
      via: "inherits Base"
      pattern: "class ProductModel\\(Base\\)"
---

<objective>
Update the domain entity and SQLAlchemy models to reflect the C3 schema — adding `attribute_schema` to Category and upgrading JSON → JSONB types on Category and Product models.

Purpose: The SQLAlchemy models must declare the correct PostgreSQL types BEFORE we create the Alembic migration (Plan 11-01). The domain entity must expose `attribute_schema` so the application layer can use it in Phase 12.
Output: Category domain entity + CategoryModel + ProductModel updated with correct JSONB types and new attribute_schema field.
</objective>

<execution_context>
@/home/rpadron/.claude/get-shit-done/workflows/execute-plan.md
@/home/rpadron/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/11-generic-catalog/11-CONTEXT.md

<interfaces>
<!-- Existing domain base -->
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

<!-- Existing Category entity (current state) -->
From apps/api/src/prosell/domain/entities/category.py:
```python
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
    # ↑ KEEP THIS. Different purpose from attribute_schema.
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(cls, name, slug, tenant_id, parent_id=None, level=0, **kwargs) -> "Category": ...
```

<!-- Existing CategoryModel (current state) -->
From apps/api/src/prosell/infrastructure/models/category_model.py:
```python
from sqlalchemy import JSON  # ← needs JSONB from sqlalchemy.dialects.postgresql
class CategoryModel(Base):
    __tablename__ = "categories"
    field_config: Mapped[dict[str, object]] = mapped_column(JSON, default=list, nullable=False)
    # ↑ Change JSON → JSONB. Add attribute_schema column.
```

<!-- Existing ProductModel (current state) -->
From apps/api/src/prosell/infrastructure/models/product_model.py:
```python
from sqlalchemy import JSON  # ← needs JSONB
class ProductModel(Base):
    attributes: Mapped[dict[str, object]] = mapped_column(JSON, default=dict, nullable=False)
    # ↑ Change JSON → JSONB only.
```
</interfaces>
</context>

<tasks>

<task id="11-00-T1" name="Task 1: Update Category domain entity — add attribute_schema field" tdd="false">
  <objective>Add attribute_schema field to the Category domain entity. Keep field_config unchanged.</objective>
  <files>
    <modify>apps/api/src/prosell/domain/entities/category.py</modify>
  </files>
  <behavior>
    - Category entity has attribute_schema: dict[str, object] = Field(default_factory=dict)
    - attribute_schema is placed after field_config (logical grouping)
    - Category.create() factory method passes **kwargs through — attribute_schema already accepted via **kwargs (no change needed to factory signature)
    - field_config: list[dict[str, object]] remains unchanged
    - All existing Category methods (add_field, remove_field, update_field, etc.) remain unchanged
  </behavior>
  <implementation>
In `apps/api/src/prosell/domain/entities/category.py`, add this field after the `field_config` field definition:

```python
# C3 schema: API validation schema for product attributes in this category
# Format: {"field_name": {"type": "string|number|boolean", "required": bool, "options": [...]}}
# Different from field_config (UI renderer) — this drives data validation
attribute_schema: dict[str, object] = Field(default_factory=dict)
```

No other changes. `create()` already accepts `**kwargs` so it will pass `attribute_schema` through automatically.

Run: `cd apps/api && uv run pyright src/prosell/domain/entities/category.py` — must pass.
  </implementation>
</task>

<task id="11-00-T2" name="Task 2: Update SQLAlchemy models — CategoryModel and ProductModel to JSONB" tdd="false">
  <objective>Upgrade JSON → JSONB type in CategoryModel (for field_config) and add attribute_schema column. Upgrade JSON → JSONB in ProductModel (for attributes). This aligns ORM models with the upcoming Alembic migration.</objective>
  <files>
    <modify>apps/api/src/prosell/infrastructure/models/category_model.py</modify>
    <modify>apps/api/src/prosell/infrastructure/models/product_model.py</modify>
  </files>
  <behavior>
    - CategoryModel.field_config uses JSONB (not JSON)
    - CategoryModel.attribute_schema column exists with JSONB type, server_default='{}', nullable=False
    - ProductModel.attributes uses JSONB (not JSON)
    - All existing relationships (parent, children, products) remain unchanged
    - pyright passes on both files
  </behavior>
  <implementation>
**category_model.py** changes:

```python
# Add to imports:
from sqlalchemy.dialects.postgresql import JSONB
# Remove JSON from sqlalchemy imports (or keep if used elsewhere)

# Change field_config:
field_config: Mapped[list[dict[str, object]]] = mapped_column(
    JSONB,          # was JSON
    default=list,
    nullable=False,
)

# Add after field_config:
attribute_schema: Mapped[dict[str, object]] = mapped_column(
    JSONB,
    server_default='{}',
    nullable=False,
)
```

**product_model.py** changes:

```python
# Add to imports:
from sqlalchemy.dialects.postgresql import JSONB
# Remove JSON from sqlalchemy imports (or keep if used elsewhere — check other columns)

# Change attributes:
attributes: Mapped[dict[str, object]] = mapped_column(
    JSONB,          # was JSON
    default=dict,
    nullable=False,
)
```

NOTE: In product_model.py, JSON import may still be needed for other columns. Check all `JSON` usages before removing the import — keep it if other columns use it.

After changes, run: `cd apps/api && uv run pyright src/prosell/infrastructure/models/category_model.py src/prosell/infrastructure/models/product_model.py`
  </implementation>
</task>

</tasks>

<verification>
- [ ] `apps/api/src/prosell/domain/entities/category.py` has `attribute_schema: dict[str, object] = Field(default_factory=dict)`
- [ ] `Category.create()` still works — accepts `attribute_schema` via **kwargs passthrough
- [ ] `apps/api/src/prosell/infrastructure/models/category_model.py` imports `JSONB` from `sqlalchemy.dialects.postgresql`
- [ ] `CategoryModel.field_config` uses `JSONB` type
- [ ] `CategoryModel.attribute_schema` column exists with `JSONB, server_default='{}', nullable=False`
- [ ] `ProductModel.attributes` uses `JSONB` type
- [ ] `cd apps/api && uv run pyright src/prosell/domain/entities/category.py` → 0 errors
- [ ] `cd apps/api && uv run pyright src/prosell/infrastructure/models/` → 0 errors
- [ ] `cd apps/api && uv run ruff check src/prosell/domain/entities/category.py src/prosell/infrastructure/models/` → 0 errors
</verification>
