---
phase: 12-backend-api
plan: "12-02"
subsystem: api
tags: [product, c3-validation, attribute_schema, organization_filter]

requires:
  - phase: "12-01"
    provides: "attribute_schema on Category entity with validate_attributes() method"

provides:
  - "Category.validate_attributes() pure domain method for C3 schema validation"
  - "CreateProductUseCase validates product attributes against category schema before persist"
  - "GET /api/v1/products?organization_id=X filter wired end-to-end"

affects: ["12-04", "12-05"]

tech-stack:
  added: []
  patterns:
    - "validate_attributes() is pure domain method — no I/O, no external imports at module level"
    - "Empty attribute_schema = skip validation (backward compat)"
    - "ValueError from validate_attributes() → HTTPException 422 in use case"

key-files:
  created: []
  modified:
    - apps/api/src/prosell/domain/entities/category.py
    - apps/api/src/prosell/application/use_cases/product/create_product.py
    - apps/api/src/prosell/infrastructure/api/routers/product_router.py

key-decisions:
  - "ListProductsUseCase already had organization_id param — Task 12-02-03 was pre-existing"
  - "CreateProductUseCase now takes 2 repos: product_repository + category_repository"
  - "C3 validation: fetch category → call validate_attributes() → 422 on ValueError"

patterns-established:
  - "C3 validation gate: category.validate_attributes(request.attributes or {}) before Product.create()"

requirements-completed: [PROD-01, PROD-02, PROD-03, PROD-04, API-02, API-03]

duration: 15min
completed: 2026-04-10
---

# Plan 12-02: Product API — Organization Filter + C3 Validation Summary

**C3 attribute validation added to product creation — invalid attributes now return 422 instead of silently persisting.**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-04-10
- **Tasks:** 4/4
- **Files modified:** 3

## Accomplishments

- Added `Category.validate_attributes()` pure domain method — required fields, type checks, options validation
- Updated `CreateProductUseCase` to inject `category_repository` as second dependency
- Attribute validation runs before `Product.create()` — catches errors pre-persist
- Added `organization_id` query param to `list_products` router endpoint
- `SqlAlchemyCategoryRepository` injected in product router's `create_product` handler

## Self-Check: PASSED

- `validate_attributes()` raises ValueError on missing required field ✓
- `validate_attributes()` raises ValueError on type mismatch ✓
- Empty `attribute_schema` = no validation (backward compat) ✓
- `CreateProductUseCase.__init__` takes `product_repository` + `category_repository` ✓
- `GET /products?organization_id=X` wired end-to-end ✓
