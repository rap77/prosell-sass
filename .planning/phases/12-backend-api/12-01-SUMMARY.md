---
phase: 12-backend-api
plan: "12-01"
subsystem: api
tags: [category, attribute_schema, rbac, fastapi]

requires:
  - phase: "11-generic-catalog"
    provides: "attribute_schema field migrated to categories table and Category entity"

provides:
  - "Category API with full CRUD: POST, GET, PATCH, DELETE, PATCH/attribute-schema"
  - "Role-based active filtering via User.has_role() — non-admins never see is_active=False"
  - "attribute_schema in CreateCategoryRequest and CategoryResponse DTOs"
  - "UpdateCategoryUseCase, DeleteCategoryUseCase, UpdateCategoryAttributeSchemaUseCase"

affects: ["12-04", "12-05"]

tech-stack:
  added: []
  patterns:
    - "Role check via User.has_role(['super_admin', 'admin']) — NOT current_user.role (attr doesn't exist)"
    - "Tenant isolation via repo.get_by_id(id, tenant_id) — None return = not found OR wrong tenant"
    - "Soft delete via category.deactivate() + repo.update() — hard delete deferred to avoid FK violations"

key-files:
  created:
    - apps/api/src/prosell/application/dto/category/update.py
    - apps/api/src/prosell/application/use_cases/category/update_category.py
    - apps/api/src/prosell/application/use_cases/category/delete_category.py
    - apps/api/src/prosell/application/use_cases/category/update_attribute_schema.py
  modified:
    - apps/api/src/prosell/application/dto/category/create.py
    - apps/api/src/prosell/application/dto/category/response.py
    - apps/api/src/prosell/application/dto/category/__init__.py
    - apps/api/src/prosell/application/use_cases/category/list_categories.py
    - apps/api/src/prosell/application/use_cases/category/create_category.py
    - apps/api/src/prosell/infrastructure/api/routers/category_router.py

key-decisions:
  - "Brain #7 Condition A: User entity has NO .role attr — use User.has_role(['super_admin', 'admin']) instead"
  - "RoleType enum has SUPER_ADMIN (not MASTER) — plan corrected before execution"
  - "PATCH /attribute-schema uses REPLACE semantics — old schema fully discarded"
  - "DELETE soft-deletes via deactivate() — is_active=False persisted via repo.update()"

patterns-established:
  - "Role guard: is_admin = current_user.has_role(['super_admin', 'admin'])"
  - "UpdateCategoryAttributeSchemaUseCase logs warning when replacing non-empty schema"

requirements-completed: [CTGY-01, CTGY-02, CTGY-03, CTGY-04, API-01]

duration: 25min
completed: 2026-04-10
---

# Plan 12-01: Category API Completion Summary

**Category CRUD API complete — attribute_schema wired, role-based filtering enforced, 5 new endpoints added.**

## Performance

- **Duration:** 25 min
- **Completed:** 2026-04-10
- **Tasks:** 9/9
- **Files modified:** 10

## Accomplishments

- Added `attribute_schema` to `CreateCategoryRequest` and `CategoryResponse` DTOs
- Updated `CreateCategoryUseCase` to pass `attribute_schema` to entity factory
- Added `is_admin: bool` param to `ListCategoriesUseCase.execute()` — forces `is_active=True` for non-admins
- Created `UpdateCategoryUseCase`, `DeleteCategoryUseCase`, `UpdateCategoryAttributeSchemaUseCase`
- Added `UpdateCategoryRequest` and `UpdateAttributeSchemaRequest` DTOs
- Updated `category_router.py` with PATCH /{id}, DELETE /{id}, PATCH /{id}/attribute-schema endpoints
- Role check uses `User.has_role()` — NOT `current_user.role` (Brain #7 Condition A corrected)

## Self-Check: PASSED

- `attribute_schema` in both CreateCategoryRequest and CategoryResponse ✓
- `ListCategoriesUseCase` has `is_admin` param that forces `is_active=True` for non-admins ✓
- `UpdateCategoryAttributeSchemaUseCase` verifies tenant_id via `repo.get_by_id(id, tenant_id)` ✓
- Warning logged when replacing non-empty schema ✓
- All 3 new use cases import without errors ✓
