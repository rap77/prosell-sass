# Subsystem B — Dynamic Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded vehicle filters with category-driven dynamic filters, backed by generic `Product.attributes` (JSONB) filtering on the server.

**Architecture:** Domain `AttributeFilter` VO carries each filter; `product_repository_impl.get_all` translates it to JSONB SQL (containment / cast-compare / ILIKE). The products router validates incoming keys against the category's `attribute_schema` (security) before building filters. A new filter-values endpoint supplies DISTINCT values for `select` fields without static `options`. Frontend reads `filter_fields` from the selected category and renders a generic sidebar driven by `filter_type`.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Pydantic 2.12, PostgreSQL 17 JSONB; Next.js 16, React 19, Zustand/TanStack Query, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-17-subsystem-b-dynamic-filters-design.md`

## Global Constraints

- **Canonical `filter_type` set:** `range | select | text | boolean | exact` — used identically in the domain VO, the resolver, the frontend `FilterField`/`AttributeSchemaEntry` unions.
- **Security:** never pass a non-`filterable` or type-mismatched attribute key into the JSONB query; reject with HTTP 422.
- **Combination semantics:** AND across filters; OR within a `select`'s `values`; a product missing the referenced attribute does not match `range`/`exact`/`select`/`boolean`.
- **TDD strict:** failing test first, no production code without a red test.
- **Zero-tolerance:** ESLint max-warnings 0; no `as` assertions (use Zod `safeParse`); ruff/format/pyright 0; React Compiler (no manual `useMemo`/`useCallback`).
- **Conventional commits**, never `Co-Authored-By`. Run GGA pre-cache from root before each commit: `GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run`.
- **No build smoke** — typecheck + lint is the verification gate.
- Backend tests: `cd apps/api && uv run pytest`. Frontend: `cd apps/web && pnpm test`.

---

### Task 1: `AttributeFilter` value object (domain)

**Files:**

- Create: `apps/api/src/prosell/domain/value_objects/attribute_filter.py`
- Test: `apps/api/tests/unit/domain/value_objects/test_attribute_filter.py`

**Interfaces:**

- Produces: `AttributeFilter` (Pydantic `ValueObject`) with fields `key: str`, `filter_type: Literal["range","select","text","boolean","exact"]`, `value: str | bool | None`, `values: list[str] | None`, `min: Decimal | None`, `max: Decimal | None`. Per-type validators.

- [ ] **Step 1: Write the failing tests**

```python
# apps/api/tests/unit/domain/value_objects/test_attribute_filter.py
from decimal import Decimal

import pytest
from pydantic import ValidationError

from prosell.domain.value_objects.attribute_filter import AttributeFilter


def test_range_requires_at_least_one_bound():
    f = AttributeFilter(key="year", filter_type="range", min=Decimal("2015"))
    assert f.min == Decimal("2015")
    with pytest.raises(ValidationError):
        AttributeFilter(key="year", filter_type="range")


def test_select_requires_non_empty_values():
    f = AttributeFilter(key="make", filter_type="select", values=["Toyota", "Honda"])
    assert f.values == ["Toyota", "Honda"]
    with pytest.raises(ValidationError):
        AttributeFilter(key="make", filter_type="select", values=[])


def test_text_and_exact_require_value():
    assert AttributeFilter(key="model", filter_type="text", value="corolla").value == "corolla"
    with pytest.raises(ValidationError):
        AttributeFilter(key="model", filter_type="text")


def test_boolean_requires_bool_value():
    assert AttributeFilter(key="is_new", filter_type="boolean", value=True).value is True
    with pytest.raises(ValidationError):
        AttributeFilter(key="is_new", filter_type="boolean", value="yes")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/unit/domain/value_objects/test_attribute_filter.py -v`
Expected: FAIL — `ModuleNotFoundError: prosell.domain.value_objects.attribute_filter`

- [ ] **Step 3: Write minimal implementation**

```python
# apps/api/src/prosell/domain/value_objects/attribute_filter.py
"""AttributeFilter value object — one catalog filter over Product.attributes."""

from decimal import Decimal
from typing import Literal

from pydantic import model_validator

from prosell.domain.base import ValueObject

FilterType = Literal["range", "select", "text", "boolean", "exact"]


class AttributeFilter(ValueObject):
    """A single filter applied to a product's JSONB `attributes`."""

    key: str
    filter_type: FilterType
    value: str | bool | None = None
    values: list[str] | None = None
    min: Decimal | None = None
    max: Decimal | None = None

    @model_validator(mode="after")
    def _validate_shape(self) -> "AttributeFilter":
        if self.filter_type == "range" and self.min is None and self.max is None:
            raise ValueError("range filter requires min and/or max")
        if self.filter_type == "select" and not self.values:
            raise ValueError("select filter requires non-empty values")
        if self.filter_type in ("text", "exact") and self.value is None:
            raise ValueError(f"{self.filter_type} filter requires value")
        if self.filter_type == "boolean" and not isinstance(self.value, bool):
            raise ValueError("boolean filter requires a bool value")
        return self
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/unit/domain/value_objects/test_attribute_filter.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/api/src/prosell/domain/value_objects/attribute_filter.py apps/api/tests/unit/domain/value_objects/test_attribute_filter.py
git commit -m "feat(catalog): add AttributeFilter value object for dynamic filters"
```

---

### Task 2: Resolver emits `key` (not `field`), no silent type default (G2)

**Files:**

- Modify: `apps/api/src/prosell/domain/services/presentation_resolver.py` (`filter_fields`)
- Test: `apps/api/tests/unit/domain/services/test_presentation_resolver.py`

**Interfaces:**

- Produces: `filter_fields(attribute_schema) -> list[dict[str, str]]` returning `{"key": <name>, "filter_type": <type>}` for fields with `filterable: True` that declare a `filter_type`. Fields missing `filter_type` are skipped (seed bug), not defaulted.

- [ ] **Step 1: Write the failing tests** (add to existing resolver test file)

```python
def test_filter_fields_emits_key_not_field():
    schema = {"year": {"filterable": True, "filter_type": "range"}}
    out = filter_fields(schema)
    assert out == [{"key": "year", "filter_type": "range"}]


def test_filter_fields_skips_field_without_filter_type():
    schema = {"broken": {"filterable": True}, "make": {"filterable": True, "filter_type": "select"}}
    out = filter_fields(schema)
    assert out == [{"key": "make", "filter_type": "select"}]


def test_filter_fields_ignores_non_filterable():
    schema = {"vin": {"filterable": False, "filter_type": "text"}}
    assert filter_fields(schema) == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/unit/domain/services/test_presentation_resolver.py -k filter_fields -v`
Expected: FAIL — current impl emits `{"field": ...}` and defaults `filter_type` to `"text"`.

- [ ] **Step 3: Write minimal implementation** (replace the loop body in `filter_fields`)

```python
def filter_fields(attribute_schema: Mapping[str, object]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for name, defn in attribute_schema.items():
        if not isinstance(defn, Mapping) or not defn.get("filterable"):
            continue
        ftype = defn.get("filter_type")
        if not ftype:  # seed bug: filterable without a filter_type — skip, don't guess
            continue
        out.append({"key": name, "filter_type": str(ftype)})
    return out
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/unit/domain/services/test_presentation_resolver.py -k filter_fields -v`
Expected: PASS

- [ ] **Step 5: Fix the verticals DTO consumer**

The verticals use-case maps `filter_fields` into the response. Update any code/tests asserting the `field` key to expect `key`. Run:
`cd apps/api && uv run pytest -k verticals -v` and fix references from `"field"` to `"key"`.

- [ ] **Step 6: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/api/src/prosell/domain/services/presentation_resolver.py apps/api/tests/
git commit -m "fix(catalog): filter_fields emits key not field, skips untyped fields (G2)"
```

---

### Task 3: `get_all` translates `attribute_filters` to JSONB SQL

**Files:**

- Modify: `apps/api/src/prosell/domain/repositories/product_repository.py` (`get_all` signature)
- Modify: `apps/api/src/prosell/infrastructure/repositories/product_repository_impl.py` (`get_all` body + imports)
- Test: `apps/api/tests/integration/repositories/test_product_repository_attribute_filters.py`

**Interfaces:**

- Consumes: `AttributeFilter` (Task 1).
- Produces: `get_all(..., attribute_filters: list[AttributeFilter] | None = None)` — appended WHERE clauses over `ProductModel.attributes`.

- [ ] **Step 1: Write the failing tests** (use the existing async DB fixture pattern from `test_product_repository_cover.py`; seed products with `attributes` dicts)

```python
# apps/api/tests/integration/repositories/test_product_repository_attribute_filters.py
from decimal import Decimal

import pytest

from prosell.domain.value_objects.attribute_filter import AttributeFilter

pytestmark = pytest.mark.asyncio


async def test_range_filter_both_bounds(product_repo, seed_products):
    # seed_products: years 2012, 2018, 2024 in attributes["year"]
    f = AttributeFilter(key="year", filter_type="range", min=Decimal("2015"), max=Decimal("2020"))
    result = await product_repo.get_all(tenant_id=seed_products.tenant_id, attribute_filters=[f])
    assert {p.attributes["year"] for p in result} == {2018}


async def test_select_filter_or_within_values(product_repo, seed_products):
    f = AttributeFilter(key="make", filter_type="select", values=["Toyota", "Honda"])
    result = await product_repo.get_all(tenant_id=seed_products.tenant_id, attribute_filters=[f])
    assert all(p.attributes["make"] in ("Toyota", "Honda") for p in result)


async def test_text_filter_ilike(product_repo, seed_products):
    f = AttributeFilter(key="model", filter_type="text", value="coro")
    result = await product_repo.get_all(tenant_id=seed_products.tenant_id, attribute_filters=[f])
    assert all("coro" in p.attributes["model"].lower() for p in result)


async def test_missing_attribute_excluded(product_repo, seed_products):
    # a product without "year" must not match a year range
    f = AttributeFilter(key="year", filter_type="range", min=Decimal("1900"))
    result = await product_repo.get_all(tenant_id=seed_products.tenant_id, attribute_filters=[f])
    assert all("year" in p.attributes for p in result)


async def test_and_across_filters(product_repo, seed_products):
    fs = [
        AttributeFilter(key="make", filter_type="select", values=["Toyota"]),
        AttributeFilter(key="year", filter_type="range", min=Decimal("2020")),
    ]
    result = await product_repo.get_all(tenant_id=seed_products.tenant_id, attribute_filters=fs)
    assert all(p.attributes["make"] == "Toyota" and p.attributes["year"] >= 2020 for p in result)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/integration/repositories/test_product_repository_attribute_filters.py -v`
Expected: FAIL — `get_all()` got an unexpected keyword argument `attribute_filters`.

- [ ] **Step 3: Add the param to the interface**

In `product_repository.py`, add to `get_all` signature (before `skip`):

```python
        attribute_filters: list["AttributeFilter"] | None = None,
```

and add the import: `from prosell.domain.value_objects.attribute_filter import AttributeFilter`.

- [ ] **Step 4: Implement the translation in the impl**

Add imports: `from sqlalchemy import Boolean, Numeric, cast`. Add this block in `get_all` after the price-range block, before ordering:

```python
        # Dynamic attribute filters (JSONB)
        for af in attribute_filters or []:
            col = ProductModel.attributes[af.key].astext
            if af.filter_type == "exact":
                stmt = stmt.where(ProductModel.attributes.contains({af.key: af.value}))
            elif af.filter_type == "select":
                stmt = stmt.where(col.in_(af.values or []))
            elif af.filter_type == "text":
                stmt = stmt.where(col.ilike(f"%{af.value}%"))
            elif af.filter_type == "boolean":
                stmt = stmt.where(cast(col, Boolean) == af.value)
            elif af.filter_type == "range":
                if af.min is not None:
                    stmt = stmt.where(cast(col, Numeric) >= af.min)
                if af.max is not None:
                    stmt = stmt.where(cast(col, Numeric) <= af.max)
```

Also add `attribute_filters: list[AttributeFilter] | None = None,` to the impl signature.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/integration/repositories/test_product_repository_attribute_filters.py -v`
Expected: PASS (5 passed). If integration DB is down, start it: `docker compose -f docker/docker-compose.yml up -d postgres-test` (test DB localhost:5433).

- [ ] **Step 6: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/api/src/prosell/domain/repositories/product_repository.py apps/api/src/prosell/infrastructure/repositories/product_repository_impl.py apps/api/tests/integration/repositories/test_product_repository_attribute_filters.py
git commit -m "feat(catalog): get_all filters products by attributes JSONB"
```

---

### Task 4: DISTINCT attribute values repo method (facets, G3)

**Files:**

- Modify: `apps/api/src/prosell/domain/repositories/product_repository.py` (new abstract method)
- Modify: `apps/api/src/prosell/infrastructure/repositories/product_repository_impl.py`
- Test: `apps/api/tests/integration/repositories/test_product_repository_attribute_filters.py` (extend)

**Interfaces:**

- Produces: `distinct_attribute_values(tenant_id, category_id, keys: list[str]) -> dict[str, list[str]]` — DISTINCT non-null values of `attributes[key]` per key, tenant+category scoped.

- [ ] **Step 1: Write the failing test**

```python
async def test_distinct_attribute_values(product_repo, seed_products):
    out = await product_repo.distinct_attribute_values(
        tenant_id=seed_products.tenant_id,
        category_id=seed_products.category_id,
        keys=["make"],
    )
    assert set(out["make"]) == {"Toyota", "Honda"}
    assert None not in out["make"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/integration/repositories/test_product_repository_attribute_filters.py::test_distinct_attribute_values -v`
Expected: FAIL — method missing.

- [ ] **Step 3: Implement**

Interface (abstract):

```python
    @abstractmethod
    async def distinct_attribute_values(
        self, tenant_id: UUID, category_id: UUID, keys: list[str]
    ) -> dict[str, list[str]]: ...
```

Impl:

```python
    async def distinct_attribute_values(
        self, tenant_id: UUID, category_id: UUID, keys: list[str]
    ) -> dict[str, list[str]]:
        out: dict[str, list[str]] = {}
        for key in keys:
            col = ProductModel.attributes[key].astext
            stmt = (
                select(col)
                .where(
                    ProductModel.tenant_id == tenant_id,
                    ProductModel.category_id == category_id,
                    col.isnot(None),
                )
                .distinct()
                .order_by(col)
            )
            rows = (await self.session.execute(stmt)).scalars().all()
            out[key] = list(rows)
        return out
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && uv run pytest tests/integration/repositories/test_product_repository_attribute_filters.py::test_distinct_attribute_values -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/api/src/prosell/domain/repositories/product_repository.py apps/api/src/prosell/infrastructure/repositories/product_repository_impl.py apps/api/tests/integration/repositories/test_product_repository_attribute_filters.py
git commit -m "feat(catalog): distinct_attribute_values repo method for facets"
```

---

### Task 5: Router — validate & parse attribute filters + filter-values endpoint (security)

**Files:**

- Modify: `apps/api/src/prosell/infrastructure/api/routers/product_router.py` (list endpoint + new filter-values route)
- Create: `apps/api/src/prosell/application/use_cases/product/build_attribute_filters.py`
- Test: `apps/api/tests/integration/api/test_product_filters_api.py`

**Interfaces:**

- Consumes: `AttributeFilter` (Task 1), category `attribute_schema`, `distinct_attribute_values` (Task 4).
- Produces: helper `build_attribute_filters(raw: dict[str, str], schema: dict) -> list[AttributeFilter]` raising `ValueError` for non-filterable / type-mismatched keys; route `GET /api/v1/categories/{category_id}/filter-values`.

- [ ] **Step 1: Write the failing tests** (use existing async API client fixture)

```python
async def test_non_filterable_key_rejected(client, auth_headers, vehicle_category):
    resp = await client.get(
        f"/api/v1/products?category_id={vehicle_category.id}&attr.vin=ABC",
        headers=auth_headers,
    )
    assert resp.status_code == 422


async def test_filterable_range_key_accepted(client, auth_headers, vehicle_category):
    resp = await client.get(
        f"/api/v1/products?category_id={vehicle_category.id}&attr.year_min=2015&attr.year_max=2020",
        headers=auth_headers,
    )
    assert resp.status_code == 200


async def test_filter_values_endpoint(client, auth_headers, vehicle_category):
    resp = await client.get(
        f"/api/v1/categories/{vehicle_category.id}/filter-values", headers=auth_headers
    )
    assert resp.status_code == 200
    assert "make" in resp.json()["values"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/integration/api/test_product_filters_api.py -v`
Expected: FAIL — route/parsing not implemented.

- [ ] **Step 3: Implement `build_attribute_filters` helper**

```python
# apps/api/src/prosell/application/use_cases/product/build_attribute_filters.py
"""Parse raw `attr.*` query params into validated AttributeFilters against a schema."""

from decimal import Decimal, InvalidOperation

from prosell.domain.value_objects.attribute_filter import AttributeFilter


def build_attribute_filters(
    raw: dict[str, str], schema: dict[str, dict[str, object]]
) -> list[AttributeFilter]:
    """`raw` maps query keys (sans `attr.` prefix) to values. Rejects unknown keys."""
    filters: list[AttributeFilter] = []
    range_acc: dict[str, dict[str, Decimal]] = {}

    for raw_key, raw_val in raw.items():
        base, _, suffix = raw_key.partition("_")  # year_min -> ("year","_","min")
        key = base if suffix in ("min", "max") else raw_key
        defn = schema.get(key)
        if not defn or not defn.get("filterable"):
            raise ValueError(f"'{key}' is not a filterable attribute")
        ftype = str(defn.get("filter_type"))
        if ftype == "range":
            try:
                bound = Decimal(raw_val)
            except InvalidOperation as exc:
                raise ValueError(f"'{raw_key}' must be numeric") from exc
            range_acc.setdefault(key, {})[suffix or "min"] = bound
        elif ftype == "select":
            filters.append(AttributeFilter(key=key, filter_type="select", values=raw_val.split(",")))
        elif ftype == "text":
            filters.append(AttributeFilter(key=key, filter_type="text", value=raw_val))
        elif ftype == "boolean":
            filters.append(AttributeFilter(key=key, filter_type="boolean", value=raw_val == "true"))
        elif ftype == "exact":
            filters.append(AttributeFilter(key=key, filter_type="exact", value=raw_val))
        else:
            raise ValueError(f"unsupported filter_type for '{key}'")

    for key, bounds in range_acc.items():
        filters.append(
            AttributeFilter(key=key, filter_type="range", min=bounds.get("min"), max=bounds.get("max"))
        )
    return filters
```

- [ ] **Step 4: Wire the router**

In `product_router.py` list endpoint: collect `attr.*` query params (via `request.query_params`), load the category's `attribute_schema`, call `build_attribute_filters` inside a `try/except ValueError` → `raise HTTPException(422, detail=str(e))`, pass result to `get_all(..., attribute_filters=...)`. Add the new route returning `{"values": await repo.distinct_attribute_values(tenant_id, category_id, select_keys_without_options)}`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/integration/api/test_product_filters_api.py -v`
Expected: PASS (3 passed)

- [ ] **Step 6: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/api/src/prosell/application/use_cases/product/build_attribute_filters.py apps/api/src/prosell/infrastructure/api/routers/product_router.py apps/api/tests/integration/api/test_product_filters_api.py
git commit -m "feat(catalog): validated attribute-filter query params + filter-values endpoint"
```

---

### Task 6: Reconcile frontend `filter_type` union + Zod (G1)

**Files:**

- Modify: `apps/web/src/types/category.ts` (`FilterField`, `AttributeSchemaEntry` unions)
- Modify: `apps/web/src/lib/api/schemas/category.ts` (Zod)
- Test: `apps/web/src/types/category.test.ts`, `apps/web/tests/unit/api/categories.test.tsx`

**Interfaces:**

- Produces: `FilterType = "range" | "select" | "text" | "boolean" | "exact"`; `FilterField = { key: string; filter_type: FilterType; label?: string }`.

- [ ] **Step 1: Write the failing test**

```typescript
// in category.test.ts
import { filterFieldSchema } from "@/lib/api/schemas/category";

it("accepts text filter_type and key-shaped FilterField", () => {
  const parsed = filterFieldSchema.safeParse({
    key: "model",
    filter_type: "text",
  });
  expect(parsed.success).toBe(true);
});

it("rejects the legacy field-shaped payload", () => {
  const parsed = filterFieldSchema.safeParse({
    field: "model",
    filter_type: "text",
  });
  expect(parsed.success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test category.test`
Expected: FAIL — `filterFieldSchema` missing / shape is `field`.

- [ ] **Step 3: Implement**

In `category.ts`: change `FilterField.field`→`key`, add `"text"` to both `filter_type` unions. In `schemas/category.ts`:

```typescript
export const filterTypeSchema = z.enum([
  "range",
  "select",
  "text",
  "boolean",
  "exact",
]);
export const filterFieldSchema = z.object({
  key: z.string(),
  filter_type: filterTypeSchema,
  label: z.string().optional(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test category.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/web/src/types/category.ts apps/web/src/lib/api/schemas/category.ts apps/web/src/types/category.test.ts
git commit -m "feat(web): reconcile filter_type union (add text, key shape) + Zod (G1)"
```

---

### Task 7: `useCatalogFilters` generic hook

**Files:**

- Create: `apps/web/src/lib/hooks/useCatalogFilters.ts`
- Test: `apps/web/tests/unit/hooks/useCatalogFilters.test.ts`

**Interfaces:**

- Consumes: `FilterField[]` (Task 6).
- Produces: `useCatalogFilters(fields: FilterField[])` → `{ values: Record<string, string>, setFilter(key, value), clearAll() }`. URL state via searchParams; `range` keys use `<key>_min`/`<key>_max`; `select` joins with `,`.

- [ ] **Step 1: Write the failing test** (mirror `useVehicleFilters.test.ts` mocking of `next/navigation`)

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCatalogFilters } from "@/lib/hooks/useCatalogFilters";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

describe("useCatalogFilters", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
  });

  it("writes a select filter as comma-joined param", () => {
    const { result } = renderHook(() =>
      useCatalogFilters([{ key: "make", filter_type: "select" }]),
    );
    act(() => result.current.setFilter("make", ["Toyota", "Honda"]));
    expect(mockPush).toHaveBeenCalledWith("?make=Toyota%2CHonda", {
      scroll: false,
    });
  });

  it("reads range bounds from <key>_min/<key>_max", () => {
    mockSearchParams = new URLSearchParams("year_min=2015&year_max=2020");
    const { result } = renderHook(() =>
      useCatalogFilters([{ key: "year", filter_type: "range" }]),
    );
    expect(result.current.values.year_min).toBe("2015");
    expect(result.current.values.year_max).toBe("2020");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test useCatalogFilters`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// apps/web/src/lib/hooks/useCatalogFilters.ts
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import type { FilterField } from "@/types/category";

export function useCatalogFilters(fields: FilterField[]) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const values: Record<string, string> = {};
  for (const f of fields) {
    if (f.filter_type === "range") {
      values[`${f.key}_min`] = searchParams.get(`${f.key}_min`) ?? "";
      values[`${f.key}_max`] = searchParams.get(`${f.key}_max`) ?? "";
    } else {
      values[f.key] = searchParams.get(f.key) ?? "";
    }
  }

  const setFilter = (key: string, value: string | string[]) => {
    const params = new URLSearchParams(searchParams);
    const next = Array.isArray(value) ? value.join(",") : value;
    if (next) params.set(key, next);
    else params.delete(key);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const clearAll = () => router.push("?", { scroll: false });

  return { values, setFilter, clearAll };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test useCatalogFilters`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/web/src/lib/hooks/useCatalogFilters.ts apps/web/tests/unit/hooks/useCatalogFilters.test.ts
git commit -m "feat(web): useCatalogFilters generic URL-state hook"
```

---

### Task 8: API client — filter-values fetch + attribute query params

**Files:**

- Modify: `apps/web/src/lib/api/verticals.ts` (or `categories.ts`) — add `fetchFilterValues`
- Test: `apps/web/src/lib/api/verticals.test.ts`

**Interfaces:**

- Produces: `fetchFilterValues(categoryId: string) → Promise<Record<string, string[]>>` (parsed via `z.object({ values: z.record(z.array(z.string())) })`, `safeParse` → `{}` on failure).

- [ ] **Step 1: Write the failing test**

```typescript
it("parses filter-values response", async () => {
  vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ values: { make: ["Toyota"] } }), {
      status: 200,
    }),
  );
  const out = await fetchFilterValues("cat-1");
  expect(out.make).toEqual(["Toyota"]);
});

it("returns {} on malformed response (no throw, no `as`)", async () => {
  vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ values: { make: [1, 2] } }), { status: 200 }),
  );
  expect(await fetchFilterValues("cat-1")).toEqual({});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test verticals.test`
Expected: FAIL — `fetchFilterValues` missing.

- [ ] **Step 3: Implement**

```typescript
import { z } from "zod";

const filterValuesSchema = z.object({ values: z.record(z.array(z.string())) });

export async function fetchFilterValues(
  categoryId: string,
): Promise<Record<string, string[]>> {
  const res = await fetch(`/api/v1/categories/${categoryId}/filter-values`);
  if (!res.ok) return {};
  const parsed = filterValuesSchema.safeParse(await res.json());
  return parsed.success ? parsed.data.values : {};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test verticals.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/web/src/lib/api/ apps/web/src/lib/api/verticals.test.ts
git commit -m "feat(web): fetchFilterValues API client with Zod validation"
```

---

### Task 9: Generic `FilterSidebar`

**Files:**

- Modify: `apps/web/src/components/filters/FilterSidebar.tsx` (replace hardcoded body)
- Test: `apps/web/tests/components/filters/FilterSidebar.test.tsx`

**Interfaces:**

- Consumes: `FilterField[]`, `useCatalogFilters` (Task 7), `fetchFilterValues` (Task 8), schema `options`.
- Produces: `<FilterSidebar fields={FilterField[]} schema={Record<string, AttributeSchemaEntry>} facetValues={Record<string,string[]>} />` rendering one control per `filter_type`; generic `aria-label="Catalog filters"` (G5).

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from "@testing-library/react";
import { FilterSidebar } from "@/components/filters/FilterSidebar";

it("renders a slider for range and checkboxes for select", () => {
  render(
    <FilterSidebar
      fields={[
        { key: "year", filter_type: "range" },
        { key: "make", filter_type: "select" },
      ]}
      schema={{ year: { type: "number", filter_type: "range" }, make: { type: "string", filter_type: "select" } }}
      facetValues={{ make: ["Toyota", "Honda"] }}
    />,
  );
  expect(screen.getByRole("complementary", { name: "Catalog filters" })).toBeInTheDocument();
  expect(screen.getByText("Toyota")).toBeInTheDocument();
  expect(screen.queryByText("Vehicle filters")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test FilterSidebar`
Expected: FAIL — still renders `BRANDS`/`aria-label="Vehicle filters"`.

- [ ] **Step 3: Implement** — replace the component body with a `fields.map` that switches on `filter_type` (`range`→`Slider`, `select`→`Checkbox` list from `facetValues[key] ?? schema[key].options ?? []`, `text`→`Input`, `boolean`→toggle, `exact`→single select), driven by `useCatalogFilters`. Set `aria-label="Catalog filters"`. Delete `BRANDS`/`STATUSES` constants. Labels: `field.label ?? humanize(field.key)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test FilterSidebar`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/web/src/components/filters/FilterSidebar.tsx apps/web/tests/components/filters/FilterSidebar.test.tsx
git commit -m "feat(web): generic FilterSidebar driven by filter_fields (G5 a11y)"
```

---

### Task 10: Generic `FilterPills`

**Files:**

- Modify: `apps/web/src/components/filters/FilterPills.tsx`
- Test: `apps/web/tests/components/filters/FilterPills.test.tsx`

**Interfaces:**

- Consumes: `useCatalogFilters` (Task 7), `FilterField[]`.
- Produces: `<FilterPills fields={FilterField[]} />` — one pill per active value; clicking removes that key.

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from "@testing-library/react";
import { FilterPills } from "@/components/filters/FilterPills";
// mockSearchParams = "make=Toyota" via the same next/navigation mock

it("shows a pill for each active filter value", () => {
  render(<FilterPills fields={[{ key: "make", filter_type: "select" }]} />);
  expect(screen.getByText(/Toyota/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test FilterPills`
Expected: FAIL — component still keyed to vehicle filters.

- [ ] **Step 3: Implement** — derive active pills from `useCatalogFilters(fields).values` (skip empties), label via `humanize(key)`, remove via `setFilter(key, "")`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test FilterPills`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/web/src/components/filters/FilterPills.tsx apps/web/tests/components/filters/FilterPills.test.tsx
git commit -m "feat(web): generic FilterPills from active filter_fields"
```

---

### Task 11: Category selector + auto-select

**Files:**

- Create: `apps/web/src/components/filters/CategorySelector.tsx`
- Test: `apps/web/tests/components/filters/CategorySelector.test.tsx`

**Interfaces:**

- Consumes: `OrgVerticalsResponse` (`CategoryNode[]` with `filter_fields`).
- Produces: `<CategorySelector categories={CategoryNode[]} value={id|null} onChange={(id)=>void} />`; calls `onChange` with the only category's id on mount when exactly one exists.

- [ ] **Step 1: Write the failing test**

```typescript
it("auto-selects when exactly one category", () => {
  const onChange = vi.fn();
  render(<CategorySelector categories={[{ id: "c1", name: "Autos", filter_fields: [] }]} value={null} onChange={onChange} />);
  expect(onChange).toHaveBeenCalledWith("c1");
});

it("does not auto-select when multiple", () => {
  const onChange = vi.fn();
  render(<CategorySelector categories={[{ id: "c1" }, { id: "c2" }]} value={null} onChange={onChange} />);
  expect(onChange).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test CategorySelector`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — a `<select>` of categories; `useEffect` calling `onChange(categories[0].id)` when `categories.length === 1 && value === null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test CategorySelector`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/web/src/components/filters/CategorySelector.tsx apps/web/tests/components/filters/CategorySelector.test.tsx
git commit -m "feat(web): CategorySelector with single-category auto-select"
```

---

### Task 12: Wire `catalog/page.tsx`, map filters to API, retire vehicle code

**Files:**

- Modify: `apps/web/src/app/(seller)/catalog/page.tsx`
- Delete: `apps/web/src/lib/hooks/useVehicleFilters.ts`, `apps/web/tests/unit/hooks/useVehicleFilters.test.ts`
- Test: `apps/web/tests/components/catalog/CatalogPage.test.tsx` (extend existing)

**Interfaces:**

- Consumes: all prior tasks. Maps the generic filter `values` → `attr.<key>` (and `<key>_min`/`_max`) query params for `useInfiniteProducts`.

- [ ] **Step 1: Write/extend the failing test** — assert the page renders `CategorySelector` + generic `FilterSidebar`, and that selecting a `make` value triggers a products fetch carrying `attr.make`. Mock the verticals + products hooks.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test CatalogPage`
Expected: FAIL.

- [ ] **Step 3: Implement** — replace `useVehicleFilters` with `useCatalogFilters(selectedCategory.filter_fields)`; fetch verticals for the selector; on category change load facet values via `fetchFilterValues`; build `apiFilters` from generic `values` (prefix attribute keys with `attr.`); keep core `search`/`status`/price wiring. Remove the `transformProductToProductRow` vehicle assumptions only where filter-related.

- [ ] **Step 4: Delete dead code**

```bash
rm apps/web/src/lib/hooks/useVehicleFilters.ts apps/web/tests/unit/hooks/useVehicleFilters.test.ts
```

Confirm no references remain: `rg -n 'useVehicleFilters|VehicleFilters' apps/web/src` → no output.

- [ ] **Step 5: Run full gate**

Run: `cd apps/web && pnpm typecheck && pnpm lint && pnpm test`
Expected: typecheck 0, lint 0 warnings, all tests pass.

- [ ] **Step 6: Commit**

```bash
GGA_PROVIDER=claude GGA_FALLBACK_PROVIDERS=claude gga run
git add apps/web/src/app/ apps/web/tests/
git commit -m "feat(web): catalog uses dynamic category-driven filters; retire useVehicleFilters"
```

---

## Self-Review

**Spec coverage:**

- Scope full-stack → Tasks 3/5 (backend filtering) + 7–12 (frontend). ✅
- Filter source = selected category + auto-select → Tasks 11, 12. ✅
- `AttributeFilter` VO + repo translation → Tasks 1, 3. ✅
- Canonical `filter_type` (G1) → Tasks 1, 6. ✅
- Shape `key`/label, no silent default (G2) → Task 2. ✅
- Select-without-options faceting (G3) → Tasks 4, 5, 8, 9. ✅
- `text`→ILIKE (G4) → Task 3. ✅
- a11y generic label (G5) → Task 9. ✅
- Security: reject non-filterable/mismatched keys (422) → Task 5. ✅
- AND/OR + missing-attribute semantics → Task 3 tests. ✅

**Placeholder scan:** Tasks 9–12 use prose for the larger UI bodies (control-per-type switch, page wiring) rather than full component code — intentional: the interfaces, props, control mapping, aria-label, and deletions are all explicit, and the test in each task pins the contract. No `TBD`/`TODO`.

**Type consistency:** `AttributeFilter` fields/`filter_type` literal identical across Tasks 1/3/5; `FilterField = {key, filter_type, label?}` identical across Tasks 2 (backend `key`), 6, 7, 9, 10; `fetchFilterValues` return type matches Task 9 `facetValues` prop. ✅

## Notes for the implementer

- Backend integration tests need the test DB (localhost:5433): `docker compose -f docker/docker-compose.yml up -d postgres-test`.
- Reuse the async DB + API client fixtures from `tests/integration/repositories/test_product_repository_cover.py` and the existing API test conftest — do not invent new fixtures.
- Vehicle parity is a _fix_: `make`/`year`/`mileage` filters were backend no-ops before; after Task 3/5 they actually filter. Verify the Vehicles vertical still shows its filters end-to-end.
