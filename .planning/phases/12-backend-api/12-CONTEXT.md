# Phase 12 — Backend API: Context & Implementation Decisions

## Phase Goal

Complete the Category/Product/Vehicle API layer for ProSell SaaS. The phase wires the C3 attribute schema
(already migrated to DB) into the API surface, adds role-based category filtering, typed vehicle
responses, organization-scoped product listing, and hard DELETE with CASCADE for products.

---

## Brain Consultation Summary

- **Brain #5 (Backend)**: Identified 6 precise gaps (SC-1 through SC-6). Key decisions: attribute validation
  lives on `Category.validate_attributes()` (pure domain method), role-based filtering via `is_admin: bool`
  param in `ListCategoriesUseCase`, PATCH /categories/{id}/attribute-schema with REPLACE semantics,
  separate `UpdateCategoryAttributeSchemaUseCase` (SRP).

- **Brain #6 (QA)**: 70% integration (real DB) / 20% unit / 10% contract. Do NOT mock repos.
  4 new test files. Cascade test validates DB constraint before testing behavior.

- **Brain #7 verdict**: **APPROVED_WITH_CONDITIONS** — Rating: **74/100**
  - Condition 1: Add tenant_id verification in `DeleteProductUseCase` and
    `UpdateCategoryAttributeSchemaUseCase` — use cases must own the invariant, not the router.
  - Condition 2: Document REPLACE semantics risk. Add warning log when attribute_schema is replaced.
    Consider `dry_run=true` param for future (not blocking for Phase 12).
  - Top systemic concern: REPLACE semantics silently invalidates existing product attributes.
    Mitigation: only validate if attribute_schema is non-empty + logger.warning on validation failures.

---

## Implemented Reality (lo que ya existe)

### Category Entity (`apps/api/src/prosell/domain/entities/category.py`)
- `attribute_schema: dict[str, Any]` field already exists (line 46) — added by Phase 11 C3 migration
- `validate_attributes()` method does NOT exist yet — needs to be added
- `update_basic_info()`, `activate()`, `deactivate()`, `add_field()` etc. already exist

### Category DTO (`apps/api/src/prosell/application/dto/category/`)
- `CreateCategoryRequest` — does NOT have `attribute_schema` field (confirmed gap)
- `CategoryResponse` — does NOT serialize `attribute_schema` (confirmed gap)
- `from_entity()` maps `field_config` but NOT `attribute_schema`

### Category Router (`apps/api/src/prosell/infrastructure/api/routers/category_router.py`)
- Has: GET (list), POST (create), GET /{id}, GET /{id}/fields
- Missing: PATCH /{id}, DELETE /{id}, PATCH /{id}/attribute-schema
- `list_categories` passes `is_active` from query param — NO role-based enforcement

### Product Router (`apps/api/src/prosell/infrastructure/api/routers/product_router.py`)
- Has: POST, GET (list), GET /{id}, PATCH /{id}, POST /{id}/submit, approve, reject,
  publish, pause, resume, mark-sold, archive
- Missing: `organization_id` filter in list endpoint
- Missing: `DELETE /{id}` (only soft-delete via `/archive`)
- `CreateProductUseCase` does NOT fetch category for attribute validation

### Vehicle Router (`apps/api/src/prosell/infrastructure/api/routers/vehicle_router.py`)
- `create_vehicle` returns `dict` (not typed DTO) — confirmed gap
- `get_vehicle_by_vin` and `get_vehicle_by_product` also return raw `dict`
- Missing: `GET /vehicles/{vehicle_id}` by UUID endpoint

### Database (Alembic migrations)
- `vehicles.product_id` has `ON DELETE CASCADE` — confirmed in migration `abc123def456` (line 79)
- `attribute_schema JSONB` column added to categories in `c3schema001` migration
- GIN indexes on `attribute_schema` and `attributes` exist

---

## Architecture Decisions

### SC-1: POST /categories → 201 with attribute_schema
- Add `attribute_schema: dict[str, Any] = Field(default_factory=dict)` to `CreateCategoryRequest`
- Add `attribute_schema` to `CategoryResponse` and `from_entity()` — use `category.attribute_schema or {}`

### SC-2: GET /categories — role-based active filtering
- `list_categories` router checks `current_user.role` (or uses a `is_master` flag)
- Non-admin → force `is_active=True` regardless of query param
- `ListCategoriesUseCase.execute()` receives `is_admin: bool` param
- IMPORTANT: tenant_id already scopes the query — "org-scoped" means is_active=True for non-admins

### SC-3: POST /products → attribute validation
- `CreateProductUseCase` fetches category via repo before persisting
- Calls `category.validate_attributes(request.attributes)` — raises `ValueError` → caught → 422
- Only validates if `category.attribute_schema` is non-empty (backward compatible)
- CategoryRepo must be injected into CreateProductUseCase (second dependency)

### SC-4: GET /products?organization_id=Z
- Add `organization_id: UUID | None = None` to list endpoint and `ListProductsUseCase`
- Tenant isolation already enforced via `tenant_id` from auth cookie

### SC-5: POST /vehicles → typed response
- Create `VehicleResponse` DTO with all fields currently returned as dict
- Use `response_model=VehicleResponse` on create endpoint
- Apply same DTO to `get_vehicle_by_vin` and `get_vehicle_by_product`

### SC-6: DELETE /products/{id} → CASCADE to vehicle
- Add `DELETE /products/{id}` route → 204 No Content
- Use case: `DeleteProductUseCase` (new) — enforces tenant_id check (Brain #7 Condition 1)
- ON DELETE CASCADE already in DB — vehicles auto-deleted when product deleted

### New: PATCH /categories/{id}/attribute-schema
- `UpdateCategoryAttributeSchemaUseCase` (separate class, SRP)
- REPLACE semantics: full schema replaced, not merged
- tenant_id check inside use case (Brain #7 Condition 1)
- Add `logger.warning` when schema replaced and products exist with attributes (Brain #7 Condition 2)

### New: PATCH /categories/{id} (update basic info)
- Uses existing `category.update_basic_info()` method
- New `UpdateCategoryRequest` DTO (all fields optional)

### New: DELETE /categories/{id}
- Soft delete via `category.deactivate()` (safe — does not cascade to products)
- Hard delete only if no products linked (business rule to enforce)

---

## Attribute Validation Design

`Category.validate_attributes(attributes: dict[str, Any]) -> None` — pure method on domain entity.

```python
def validate_attributes(self, attributes: dict[str, Any]) -> None:
    """Validate product attributes against this category's attribute_schema."""
    if not self.attribute_schema:
        return  # Empty schema = no constraints (backward compatible)
    for field_name, field_def in self.attribute_schema.items():
        required = field_def.get("required", False)
        field_type = field_def.get("type", "string")
        value = attributes.get(field_name)
        if required and value is None:
            raise ValueError(f"Required attribute '{field_name}' is missing")
        if value is not None:
            type_map = {"string": str, "number": (int, float), "boolean": bool}
            expected = type_map.get(field_type)
            if expected and not isinstance(value, expected):
                raise ValueError(f"Attribute '{field_name}' must be {field_type}")
            options = field_def.get("options")
            if options and value not in options:
                raise ValueError(f"Attribute '{field_name}' must be one of {options}")
    self.updated_at = datetime.now(UTC)  # NOT needed here — validation only
```

**Key design rules:**
- Empty `attribute_schema` → skip validation (backward compat for existing products)
- `ValueError` from this method → caught by use case → translated to HTTP 422
- Method is pure — no I/O, no external deps, testable in isolation

---

## Plan Breakdown

| Plan | What | Delivers |
|------|------|----------|
| 12-01 | Category API: PATCH /{id}, DELETE /{id}, PATCH /{id}/attribute-schema. attribute_schema in DTOs. Role-based list filter. | SC-1, SC-2 |
| 12-02 | Product API: organization_id filter in list. attribute validation in CreateProductUseCase. Category.validate_attributes() method. CategoryRepo injected into product use case. | SC-3, SC-4 |
| 12-03 | Vehicle API: VehicleResponse DTO, typed responses on all vehicle endpoints. DELETE /products/{id} with tenant_id check in use case. | SC-5, SC-6 |
| 12-04 | Integration tests: test_category_api.py, test_product_c3.py. Covers SC-1 through SC-4. | Tests SC-1..SC-4 |
| 12-05 | Integration tests: test_vehicle_api.py. Unit tests: test_category_validation.py. Coverage audit ≥80%. | Tests SC-5, SC-6 |

---

## Test Strategy

### Philosophy (Brain #6)
- 70% Integration (real DB with rollback, AsyncClient)
- 20% Unit (Category.validate_attributes() pure function)
- 10% Contract (attribute_schema format consistency)
- Do NOT mock repositories in integration tests

### Test files
```
apps/api/tests/integration/api/test_category_api.py   ← Plan 12-04
apps/api/tests/integration/api/test_product_c3.py     ← Plan 12-04
apps/api/tests/integration/api/test_vehicle_api.py    ← Plan 12-05
apps/api/tests/unit/test_category_validation.py       ← Plan 12-05
```

### Key test patterns
- Cascade: create product → create vehicle → DELETE product → GET vehicle → 404
- Role-based: admin sees is_active=False categories, seller does not
- Validation: missing required attr → 422, empty schema → always passes
- tenant_id isolation: user from tenant A cannot delete product from tenant B

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking CategoryResponse with attribute_schema | Use `category.attribute_schema or {}` in from_entity() |
| REPLACE semantics silently invalidating existing products | Log warning when schema replaced; document in endpoint docstring |
| validate_attributes() breaking existing product creates | Guard: only validate if attribute_schema is non-empty |
| tenant_id not enforced in new use cases | DeleteProductUseCase and UpdateCategoryAttributeSchemaUseCase MUST check tenant_id — invariant in use case, not router |
| ON DELETE CASCADE assumed but not verified at test time | Add schema verification test before cascade behavior test |
| CategoryRepo injection into CreateProductUseCase | Requires updating DI wiring in product_router.py — two repos now |
