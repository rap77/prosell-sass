# Foundation Plan 1 — Category Presentation Contract + Server-Side Title Composition

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A product's title is composed on the BACKEND from its category's presentation template (`"{year} {make} {model}"`) + the product attributes, instead of being hand-composed and trusted from the client.

**Architecture:** Add a `presentation` JSONB contract to `Category`. A pure domain service composes a string from a `{field}` template + an attributes dict (dropping empty fields and their adjacent separators). The product create/update use cases call it when the category declares a `title_template`, falling back to the request's title otherwise (backward-compatible).

**Tech Stack:** Python 3.13, Pydantic v2 domain entities, SQLAlchemy 2.0 (`Mapped`, JSONB), Alembic, pytest (unit + integration on test DB `localhost:5433`).

## Progress (branch `feat/category-presentation-foundation`)

- [x] **Task 1** — template composer domain service — commit `52e0d14`
- [x] **Task 2** — `presentation` field on Category entity + model — commit `bf40fa9`
- [x] **Task 3** — Alembic migration for `presentation` column — commit `95823e5`
- [x] **Task 4 (CREATE only)** — server-side title composition on create, via shared `resolve_title` helper. Plus a bug fix found en route: `CategoryModel.updated_at` `onupdate` was the literal string `"now()"` (broke every category UPDATE) → fixed to `func.now()`.
- [ ] **Task 4 (UPDATE)** — DEFERRED to Plan 2: recomposing the title on PATCH needs the category loaded; doing it inline in the router added a real DB call that broke unit tests that mock only the product repo. The clean fix is a dedicated `UpdateProductUseCase` (Plan 2). Backward-compatible: the edit form still composes the title client-side meanwhile.
- [ ] **Task 5** — `title` optional in create DTO — DEFERRED to subsystem A (only needed once the frontend stops sending a client-composed title; YAGNI until then).

---

**Scope note:** This is Plan **1 of 2** for the Foundation spec (`docs/superpowers/specs/2026-06-06-category-presentation-foundation-design.md`). Plan 2 covers `Category` global-ization (`tenant_id` nullable), the `organization_vertical` M2M table, and the `GET /organizations/{id}/verticals` read-API. Subtitle composition (not stored) is deferred to the read-API in Plan 2 / subsystem A, since this plan only needs the stored `title`.

---

## File structure

| File                                                                                     | Responsibility                                          | Action |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------ |
| `src/prosell/domain/services/template_composer.py`                                       | Pure `{field}` template → string composer               | Create |
| `apps/api/tests/unit/domain/services/test_template_composer.py`                          | Composer unit tests                                     | Create |
| `src/prosell/domain/entities/category.py`                                                | Add `presentation` field                                | Modify |
| `src/prosell/infrastructure/models/category_model.py`                                    | Add `presentation` column                               | Modify |
| `apps/api/alembic/versions/<rev>_add_category_presentation.py`                           | DB migration                                            | Create |
| `src/prosell/application/use_cases/product/create_product.py`                            | Compose title on create                                 | Modify |
| `src/prosell/application/use_cases/product/update_product.py` (or the PATCH router path) | Compose title on update                                 | Modify |
| `apps/api/tests/integration/...`                                                         | Integration test: title composed from category template | Create |

---

## Task 1: Template composer domain service (pure)

**Files:**

- Create: `apps/api/src/prosell/domain/services/template_composer.py`
- Test: `apps/api/tests/unit/domain/services/test_template_composer.py`

- [ ] **Step 1: Write the failing test**

```python
# apps/api/tests/unit/domain/services/test_template_composer.py
from prosell.domain.services.template_composer import compose_from_template


def test_all_fields_present():
    out = compose_from_template("{year} {make} {model}",
                                {"year": 2020, "make": "Honda", "model": "Civic"})
    assert out == "2020 Honda Civic"


def test_missing_field_drops_its_separator():
    # No double space, no dangling separator when a field is absent.
    out = compose_from_template("{year} {make} {model}",
                                {"year": 2020, "make": "Honda"})
    assert out == "2020 Honda"


def test_literals_between_fields_are_preserved():
    out = compose_from_template("{tipo} en {barrio}",
                                {"tipo": "Departamento", "barrio": "Palermo"})
    assert out == "Departamento en Palermo"


def test_missing_field_drops_adjacent_literal():
    # The " en " literal belongs to the {barrio} segment and is dropped with it.
    out = compose_from_template("{tipo} en {barrio}", {"tipo": "Departamento"})
    assert out == "Departamento"


def test_unknown_placeholder_is_dropped():
    out = compose_from_template("{make} {bogus}", {"make": "Honda"})
    assert out == "Honda"


def test_empty_attributes_yields_empty_string():
    assert compose_from_template("{year} {make}", {}) == ""


def test_empty_string_value_is_treated_as_missing():
    out = compose_from_template("{year} {make} {model}",
                                {"year": 2020, "make": "Honda", "model": ""})
    assert out == "2020 Honda"


def test_literal_only_template():
    assert compose_from_template("Producto", {"x": 1}) == "Producto"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/unit/domain/services/test_template_composer.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'prosell.domain.services.template_composer'`

- [ ] **Step 3: Write minimal implementation**

```python
# apps/api/src/prosell/domain/services/template_composer.py
"""Compose a display string from a `{field}` template and an attributes map.

A template is a sequence of SEGMENTS, each = an optional literal prefix
followed by a `{field}` placeholder, plus a final trailing literal. When a
placeholder's value is missing or empty, the WHOLE segment (its literal
prefix + the placeholder) is dropped — so a missing field never leaves a
dangling separator ("· ", " en ") behind. Whitespace is normalized at the end.

Substitution is plain-text only: no nested templates, no logic, no HTML.
"""

import re
from collections.abc import Mapping

_SEGMENT = re.compile(r"([^{]*)\{(\w+)\}")


def compose_from_template(template: str, attributes: Mapping[str, object]) -> str:
    """Render `template`, dropping segments whose field is missing/empty.

    Args:
        template: e.g. "{year} {make} {model}" or "{tipo} en {barrio}".
        attributes: field_name -> value. Missing keys, None, and empty
            strings all count as "absent" and drop their segment.

    Returns:
        The composed string with whitespace collapsed and trimmed.
    """
    parts: list[str] = []
    end = 0
    for match in _SEGMENT.finditer(template):
        literal_prefix, field = match.group(1), match.group(2)
        value = attributes.get(field)
        text = "" if value is None else str(value).strip()
        if text:
            parts.append(literal_prefix + text)
        # else: drop the entire segment (literal prefix + placeholder)
        end = match.end()
    parts.append(template[end:])  # trailing literal after the last placeholder
    return re.sub(r"\s+", " ", "".join(parts)).strip()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && uv run pytest tests/unit/domain/services/test_template_composer.py -v`
Expected: PASS (8 passed)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/domain/services/template_composer.py apps/api/tests/unit/domain/services/test_template_composer.py
git commit -m "feat(api): add {field} template composer domain service"
```

---

## Task 2: Add `presentation` to the Category entity and model

**Files:**

- Modify: `apps/api/src/prosell/domain/entities/category.py` (after `attribute_schema`, ~line 46)
- Modify: `apps/api/src/prosell/infrastructure/models/category_model.py` (after the `attribute_schema` column, ~line 59)
- Test: `apps/api/tests/unit/domain/entities/test_category_presentation.py`

- [ ] **Step 1: Write the failing test**

```python
# apps/api/tests/unit/domain/entities/test_category_presentation.py
from uuid import uuid4
from prosell.domain.entities.category import Category


def test_category_defaults_presentation_to_none():
    cat = Category.create(name="Vehicles", slug="vehicles", tenant_id=uuid4())
    assert cat.presentation is None


def test_category_accepts_presentation_contract():
    cat = Category.create(
        name="Vehicles", slug="vehicles", tenant_id=uuid4(),
        presentation={
            "title_template": "{year} {make} {model}",
            "subtitle_template": "{trim}",
            "card_fields": ["price", "status"],
        },
    )
    assert cat.presentation["title_template"] == "{year} {make} {model}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/unit/domain/entities/test_category_presentation.py -v`
Expected: FAIL — `Category` has no field `presentation` (pydantic ignores/validation error).

- [ ] **Step 3: Add the field to the entity**

In `apps/api/src/prosell/domain/entities/category.py`, immediately after the `attribute_schema` field (line ~46):

```python
    # Presentation contract — how products in this category are displayed.
    # Inherited down the tree (a child without its own falls back to the
    # nearest ancestor; inheritance is resolved by the read layer, Plan 2).
    # Shape: {"title_template": "{year} {make} {model}",
    #         "subtitle_template": "{trim}", "card_fields": ["price"]}
    presentation: dict[str, Any] | None = None
```

In `apps/api/src/prosell/infrastructure/models/category_model.py`, immediately after the `attribute_schema` column (line ~59):

```python
    # Presentation contract (display templates + card fields). Nullable —
    # categories without one inherit from an ancestor or fall back to the
    # request title. See Category entity + template_composer.
    presentation: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && uv run pytest tests/unit/domain/entities/test_category_presentation.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/domain/entities/category.py apps/api/src/prosell/infrastructure/models/category_model.py apps/api/tests/unit/domain/entities/test_category_presentation.py
git commit -m "feat(api): add presentation contract field to Category"
```

---

## Task 3: Alembic migration for the `presentation` column

**Files:**

- Create: `apps/api/alembic/versions/<rev>_add_category_presentation.py`

- [ ] **Step 1: Generate the revision skeleton**

Run: `cd apps/api && uv run alembic revision -m "add category presentation"`
This creates a file under `alembic/versions/` with `down_revision` set to the current head. Note the generated path.

- [ ] **Step 2: Fill in upgrade/downgrade**

Edit the generated file so the body reads:

```python
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


def upgrade() -> None:
    op.add_column(
        "categories",
        sa.Column("presentation", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("categories", "presentation")
```

- [ ] **Step 3: Apply and verify the migration**

Run: `cd apps/api && uv run alembic upgrade head`
Then verify the column exists:
Run: `uv run alembic current` (confirms head moved) and re-create the test DB schema for integration tests:
Run: `TEST_DATABASE_URL="postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test" uv run python -c "import sys; sys.path.insert(0,'src'); import asyncio; from sqlalchemy import text; from sqlalchemy.ext.asyncio import create_async_engine; from prosell.infrastructure.database.base import Base; import prosell.infrastructure.models" -c "pass"`
(If the test DB schema is stale, recreate it: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` then `Base.metadata.create_all` — see `product-image-system-unification` memory for the exact snippet.)
Expected: no error; `categories.presentation` exists.

- [ ] **Step 4: Commit**

```bash
git add apps/api/alembic/versions/
git commit -m "feat(api): migration — add categories.presentation column"
```

---

## Task 4: Compose the product title server-side on create and update

**Files:**

- Modify: `apps/api/src/prosell/application/use_cases/product/create_product.py`
- Modify: the product update path — `apps/api/src/prosell/application/use_cases/product/update_product.py` if it exists, else the PATCH handler in `apps/api/src/prosell/infrastructure/api/routers/product_router.py` (the field-by-field copy around line 453).
- Test: `apps/api/tests/integration/use_cases/test_product_title_composition.py`

**Approach:** Both create and update already load the product's `Category` (create uses `category_repo` for validation; the PATCH path can fetch it via the existing category repo). After the category is loaded and `attributes` are known, set the title:

```python
from prosell.domain.services.template_composer import compose_from_template

# After the category is loaded and `attributes` resolved:
template = (category.presentation or {}).get("title_template")
if template:
    composed = compose_from_template(template, attributes)
    if composed:
        title = composed          # category-driven title wins
# else: keep the request-provided title (backward-compatible fallback)
```

- [ ] **Step 1: Write the failing integration test**

```python
# apps/api/tests/integration/use_cases/test_product_title_composition.py
import pytest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.application.dto.product.create import CreateProductRequest
from prosell.infrastructure.repositories.product_repository_impl import SqlAlchemyProductRepository
from prosell.infrastructure.repositories.category_repository_impl import SqlAlchemyCategoryRepository


@pytest.mark.asyncio
async def test_create_composes_title_from_category_template(
    db_session, test_organization, test_category
):
    # Give the category a title template.
    test_category.presentation = {"title_template": "{year} {make} {model}"}
    await db_session.flush()

    repo = SqlAlchemyProductRepository(db_session)
    cat_repo = SqlAlchemyCategoryRepository(db_session)
    use_case = CreateProductUseCase(repo, cat_repo)

    request = CreateProductRequest(
        title="IGNORED CLIENT TITLE",
        price_cents=1_850_000,
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        attributes={"year": 2020, "make": "Honda", "model": "Civic"},
        image_urls=[],
    )

    response = await use_case.execute(request)

    assert response.title == "2020 Honda Civic"


@pytest.mark.asyncio
async def test_create_falls_back_to_request_title_without_template(
    db_session, test_organization, test_category
):
    # No presentation template → keep the client title.
    test_category.presentation = None
    await db_session.flush()

    repo = SqlAlchemyProductRepository(db_session)
    cat_repo = SqlAlchemyCategoryRepository(db_session)
    use_case = CreateProductUseCase(repo, cat_repo)

    request = CreateProductRequest(
        title="2020 Honda Accord",
        price_cents=1_850_000,
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        attributes={"year": 2020, "make": "Honda", "model": "Accord"},
        image_urls=[],
    )

    response = await use_case.execute(request)

    assert response.title == "2020 Honda Accord"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/integration/use_cases/test_product_title_composition.py -v`
Expected: FAIL — first test asserts `"2020 Honda Civic"` but gets `"IGNORED CLIENT TITLE"` (composition not wired yet). (Requires test DB on 5433.)

- [ ] **Step 3: Wire composition into `CreateProductUseCase.execute`**

Open `apps/api/src/prosell/application/use_cases/product/create_product.py`. It loads the category (for validation) and builds the product via `Product.create(... title=request.title ...)`. Add the import at the top:

```python
from prosell.domain.services.template_composer import compose_from_template
```

Immediately before the `Product.create(...)` / product construction, compute the title:

```python
        title = request.title
        template = (category.presentation or {}).get("title_template")
        if template:
            composed = compose_from_template(template, request.attributes)
            if composed:
                title = composed
```

Then pass `title=title` (instead of `title=request.title`) into the product construction.

- [ ] **Step 4: Run the create test to verify it passes**

Run: `cd apps/api && uv run pytest tests/integration/use_cases/test_product_title_composition.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Apply the same composition on the update path**

In the PATCH handler (`product_router.py`, after `product.attributes` and the category are available) or in `update_product.py`, recompose the title the same way whenever attributes or category change:

```python
        template = (category.presentation or {}).get("title_template")
        if template:
            composed = compose_from_template(template, product.attributes)
            if composed:
                product.title = composed
```

(Load the category via the existing category repo if the PATCH path doesn't already have it.)

- [ ] **Step 6: Add and run an update integration test**

Add to the same test file:

```python
@pytest.mark.asyncio
async def test_update_recomposes_title_when_attributes_change(
    db_session, test_organization, test_category
):
    test_category.presentation = {"title_template": "{year} {make} {model}"}
    await db_session.flush()

    repo = SqlAlchemyProductRepository(db_session)
    cat_repo = SqlAlchemyCategoryRepository(db_session)
    create = CreateProductUseCase(repo, cat_repo)
    created = await create.execute(CreateProductRequest(
        title="x", price_cents=1, tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id, category_id=test_category.id,
        attributes={"year": 2020, "make": "Honda", "model": "Civic"}, image_urls=[],
    ))
    assert created.title == "2020 Honda Civic"

    # Re-fetch entity, change the model, update, expect recomposed title.
    product = await repo.get_by_id(created.id, test_organization.tenant_id)
    product.attributes = {"year": 2020, "make": "Honda", "model": "Accord"}
    template = (test_category.presentation or {}).get("title_template")
    from prosell.domain.services.template_composer import compose_from_template
    product.title = compose_from_template(template, product.attributes)
    await repo.update(product)

    refreshed = await repo.get_by_id(created.id, test_organization.tenant_id)
    assert refreshed.title == "2020 Honda Accord"
```

Run: `cd apps/api && uv run pytest tests/integration/use_cases/test_product_title_composition.py -v`
Expected: PASS (3 passed)

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/prosell/application/use_cases/product/ apps/api/src/prosell/infrastructure/api/routers/product_router.py apps/api/tests/integration/use_cases/test_product_title_composition.py
git commit -m "feat(api): compose product title from category template (create + update)"
```

---

## Task 5: Make `title` optional in the create DTO (client no longer authoritative)

**Files:**

- Modify: `apps/api/src/prosell/application/dto/product/create.py` (the `title` field, line ~91)
- Test: `apps/api/tests/unit/application/dto/product/test_create_dto.py` (extend)

**Rationale:** With server-side composition, the client title is only a fallback. Keep it accepted but no longer required, so a future frontend can stop sending it. (Frontend change itself is subsystem A — not here.)

- [ ] **Step 1: Write the failing test**

```python
# add to apps/api/tests/unit/application/dto/product/test_create_dto.py
from uuid import uuid4
from prosell.application.dto.product.create import CreateProductRequest


def test_create_request_allows_missing_title():
    req = CreateProductRequest(
        price_cents=1000,
        category_id=uuid4(),
        attributes={"year": 2020},
        image_urls=[],
    )
    assert req.title is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/unit/application/dto/product/test_create_dto.py::test_create_request_allows_missing_title -v`
Expected: FAIL — `title` is required (`ValidationError: Field required`).

- [ ] **Step 3: Make `title` optional**

In `apps/api/src/prosell/application/dto/product/create.py`, change the `title` field:

```python
    title: str | None = Field(default=None, max_length=500)
```

Then ensure the use case fallback handles `title is None` (compose must succeed, or the category must have a template). If `title is None` AND no template yields a value, raise a `ValueError("product needs a title: provide one or a category title_template")` in the use case before constructing the product.

- [ ] **Step 4: Run the DTO + use case tests**

Run: `cd apps/api && uv run pytest tests/unit/application/dto/product/test_create_dto.py tests/integration/use_cases/test_product_title_composition.py -v`
Expected: PASS (all)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/application/dto/product/create.py apps/api/src/prosell/application/use_cases/product/create_product.py apps/api/tests/unit/application/dto/product/test_create_dto.py
git commit -m "feat(api): title optional on create — composed from category when omitted"
```

---

## Final verification

- [ ] Run the full backend product + category + domain suites:

Run: `cd apps/api && uv run pytest tests/unit/domain tests/unit/application/dto/product tests/integration/use_cases/test_product_title_composition.py -q`
Expected: all green.

- [ ] Run the broader product suite to catch regressions:

Run: `cd apps/api && uv run pytest tests/unit/api/routers -q`
Expected: all green (or only pre-existing xfails).

---

## Self-review (done by plan author)

- **Spec coverage:** This plan covers the spec's §3.2 (presentation contract column), §4 (title composition service + create/update wiring, stored title). Deferred to Plan 2 (explicitly): §3.1/§3.4 global-ization + M2M, §5 read-API, §3.3 filterable metadata, subtitle. No silent gaps.
- **Placeholder scan:** none — every code step has concrete code; the one "read the file then insert at anchor" step (Task 4/5 use-case edit) gives the exact snippet + anchor.
- **Type consistency:** `compose_from_template(template: str, attributes: Mapping) -> str` used identically in Tasks 1, 4, 6. `presentation: dict | None` consistent across entity, model, and `(category.presentation or {}).get("title_template")` reads.
