# Phase 12 — Plan Review Context
> Generated: 2026-04-10T00:00:00Z
> Iteration: 1
> Purpose: Full context for Brain #7 plan validation

---

## [IMPLEMENTED REALITY]

### Category entity — `/apps/api/src/prosell/domain/entities/category.py`
- `attribute_schema: dict[str, Any] = Field(default_factory=dict)` — EXISTS (line 46)
- `validate_attributes()` method — DOES NOT EXIST (gap — Plan 12-02 must add it)
- `update_basic_info(name, slug, description, icon, image_url)` — EXISTS
- `activate()`, `deactivate()`, `set_sort_order()` — ALL EXIST
- `Category.create()` accepts `**kwargs` — passes through to `cls(...)` — confirmed safe for attribute_schema

### Category DTOs — `/apps/api/src/prosell/application/dto/category/`
- `CreateCategoryRequest`: has `name, slug, tenant_id, parent_id, description, icon, image_url, sort_order, is_active, field_config` — NO `attribute_schema` (CONFIRMED GAP)
- `CategoryResponse.from_entity()`: maps `field_config` but NOT `attribute_schema` (CONFIRMED GAP)
- `__init__.py` exports: `CreateCategoryRequest, CategoryResponse, CategoryListResponse`

### Category use cases — confirmed state
- `CreateCategoryUseCase.execute()`: calls `Category.create(...)` — currently does NOT pass `attribute_schema`
- `ListCategoriesUseCase.execute()`: takes `tenant_id, parent_id, is_active, skip, limit` — NO `is_admin` param (CONFIRMED GAP)
- `UpdateCategoryUseCase` — DOES NOT EXIST (new file needed)
- `DeleteCategoryUseCase` — DOES NOT EXIST (new file needed)
- `UpdateCategoryAttributeSchemaUseCase` — DOES NOT EXIST (new file needed)

### Category router — `/apps/api/src/prosell/infrastructure/api/routers/category_router.py`
- Has: `GET /` (list), `POST /` (create), `GET /{id}`, `GET /{id}/fields`
- MISSING: `PATCH /{id}`, `DELETE /{id}`, `PATCH /{id}/attribute-schema`
- `list_categories` passes `is_active` from query param with zero role check (CONFIRMED GAP)

### Product use cases — confirmed state
- `ListProductsUseCase.execute()`: already has `organization_id: UUID | None = None` (ALREADY EXISTS — Plan 12-02 task 12-02-03 is a NO-OP)
- `AbstractProductRepository.get_all()` already has `organization_id` param (ALREADY EXISTS)
- `CreateProductUseCase.__init__` takes only `product_repository` — NO `category_repository` (CONFIRMED GAP)
- `AbstractProductRepository.delete(product_id, tenant_id) -> bool` — EXISTS in interface AND implementation (returns bool, not None)

### Product router — confirmed state
- `list_products` has NO `organization_id` query param (CONFIRMED GAP — but use case already supports it)
- NO `DELETE /{product_id}` endpoint (CONFIRMED GAP)

### Vehicle router — confirmed state
- `create_vehicle` returns raw `dict` with 6 fields (CONFIRMED GAP — missing ~20 fields + typed DTO)
- `get_vehicle_by_vin` returns raw `dict` with 8 fields (CONFIRMED GAP)
- `get_vehicle_by_product` returns raw `dict` with 9 fields (CONFIRMED GAP)
- NO `GET /{vehicle_id}` by UUID endpoint (CONFIRMED GAP)
- `AbstractVehicleRepository.get_by_id(vehicle_id: UUID) -> Vehicle | None` — EXISTS in interface AND implementation

### Integration test infrastructure
- `apps/api/tests/integration/conftest.py` — has `db_session` and `disable_rate_limiting` fixtures
- NO `async_client`, NO `admin_user`, NO `seller_user` fixtures in integration conftest
- `apps/api/tests/integration/api/` directory — check if exists (plans assume it does)

---

## [PLAN SUMMARIES]

### Plan 12-01 — Category API Completion (Wave 1)
**Goal**: Wire `attribute_schema` into DTOs and router. Add PATCH, DELETE, PATCH/attribute-schema endpoints. Role-based list filtering.

**Tasks**:
1. Add `attribute_schema` to `CreateCategoryRequest` DTO
2. Add `attribute_schema` to `CategoryResponse.from_entity()`
3. Update `CreateCategoryUseCase` to pass `attribute_schema` to `Category.create()`
4. Add `is_admin: bool` param to `ListCategoriesUseCase`
5. Create `UpdateCategoryUseCase` + `UpdateCategoryRequest` DTO
6. Create `DeleteCategoryUseCase` (soft delete via `category.deactivate()`)
7. Create `UpdateCategoryAttributeSchemaUseCase` with tenant_id check + warning log
8. Update `category_router.py` — add 3 new endpoints + role-based filter in list
9. Update `dto/category/__init__.py` exports

**Key invariant (Brain #7 Condition 1)**: tenant_id verification INSIDE the use case via `repo.get_by_id(id, tenant_id)` returning None if wrong tenant.

### Plan 12-02 — Product API (Wave 1, depends on 12-01)
**Goal**: Add `Category.validate_attributes()` pure domain method. Wire it into `CreateProductUseCase`. Add `organization_id` filter to list endpoint.

**Tasks**:
1. Add `validate_attributes()` to `Category` entity (pure, no I/O)
2. Update `CreateProductUseCase` to inject `category_repository` + call `category.validate_attributes()`
3. Add `organization_id` to `ListProductsUseCase.execute()` — **ALREADY EXISTS** (no-op)
4. Add `organization_id` query param to `product_router` list endpoint + update `CreateProductUseCase` DI

**Key design**: `ValueError` from `validate_attributes()` → caught in use case → `HTTPException(422)`. Empty schema skips validation (backward compat).

### Plan 12-03 — Vehicle API + Product Hard Delete (Wave 2, depends on 12-01 + 12-02)
**Goal**: Create `VehicleResponse` DTO. Replace raw dicts. Add `GET /{vehicle_id}`. Add `DELETE /products/{id}` with CASCADE.

**Tasks**:
1. Create `VehicleResponse` DTO with 27 fields + `from_entity()` classmethod
2. Update vehicle router — typed responses on create, get_by_vin, get_by_product + new `GET /{vehicle_id}`
3. Create `DeleteProductUseCase` with tenant_id enforcement
4. Add `DELETE /products/{id}` to product router → 204
5. Verify `AbstractProductRepository.delete()` method — **ALREADY EXISTS** (interface + impl, returns `bool`)

**Critical**: `ON DELETE CASCADE` on `vehicles.product_id` — confirmed in migration abc123def456. No DB changes needed.

**NOTE**: Plan 12-03 says `delete()` returns `None` but the actual interface returns `bool`. `DeleteProductUseCase` must accommodate `bool` return.

### Plan 12-04 — Integration Tests: Categories + Products (Wave 2, depends on 12-01 + 12-02)
**Goal**: Write integration tests with real DB. `test_category_api.py` (SC-1, SC-2) + `test_product_c3.py` (SC-3, SC-4).

**Key gap in plan**: Integration conftest has NO `async_client`, `admin_user`, `seller_user` fixtures. Plan 12-04 task 12-04-01 must create them. The existing conftest in `apps/api/tests/integration/conftest.py` only has `db_session` and `disable_rate_limiting`.

**Structural issue**: Tests authenticate with `admin_user` but the `async_client` needs to be pre-authenticated. The plan does not specify how auth cookies are injected into `AsyncClient`. This is the biggest execution risk in the entire phase.

### Plan 12-05 — Integration Tests: Vehicles + Coverage Audit (Wave 3, depends on 12-03 + 12-04)
**Goal**: `test_vehicle_api.py` (SC-5, SC-6 cascade) + unit tests for `Category.validate_attributes()`. Coverage ≥80% on new code.

**Tests are well-specified** — the cascade test is explicit and verifiable.

---

## [CODE SNIPPETS]

### Current `CreateCategoryUseCase` — missing `attribute_schema` (line 70-80)
```python
category = Category.create(
    name=request.name,
    slug=request.slug,
    tenant_id=request.tenant_id,
    parent_id=request.parent_id,
    level=level,
    description=request.description,
    icon=request.icon,
    image_url=request.image_url,
    sort_order=request.sort_order,
    is_active=request.is_active,
    # MISSING: attribute_schema=request.attribute_schema
)
```

### Current `ListProductsUseCase.execute()` — organization_id ALREADY EXISTS
```python
async def execute(
    self,
    tenant_id: UUID,
    organization_id: UUID | None = None,  # ALREADY HERE
    category_id: UUID | None = None,
    ...
```
Plan 12-02 task 12-02-03 is a NO-OP.

### `AbstractProductRepository.delete()` — returns `bool`, not `None`
```python
@abstractmethod
async def delete(self, product_id: UUID, tenant_id: UUID) -> bool:
    """Delete a product (soft delete via archive)."""
```
Plan 12-03 tasks 12-03-03 and 12-03-05 assume `None` return — they are WRONG. The interface already exists and returns `bool`. The use case must call `await self.product_repository.delete(product_id, tenant_id)` and ignore the return value or check it for 404.

### `AbstractVehicleRepository.get_by_id()` — EXISTS with correct signature
```python
async def get_by_id(self, vehicle_id: UUID) -> Vehicle | None:
```
Plan 12-03 task 12-03-02 can use `vehicle_repo.get_by_id(vehicle_id)` directly — no workaround needed.

---

## [CORRECTED ASSUMPTIONS]

Brain #7 might incorrectly assume:

1. **`ListProductsUseCase` lacks `organization_id`** — FALSE. It already has it. Plan 12-02 task 12-02-03 should be reduced to a verification step, not implementation. Only the ROUTER needs updating (task 12-02-04).

2. **`AbstractProductRepository.delete()` needs to be created** — FALSE. It exists in both interface (returns `bool`) and implementation. Plan 12-03 task 12-03-05 is about verifying it's there, but the plan incorrectly describes it as needing creation.

3. **`AbstractVehicleRepository.get_by_id()` may not exist** — FALSE. Both the abstract interface and `SqlAlchemyVehicleRepository` implement `get_by_id(vehicle_id: UUID)`.

4. **Integration tests have auth infrastructure** — FALSE. The integration conftest has NO `async_client`, NO `admin_user`, NO `seller_user`. This is the #1 execution risk. The plans require these fixtures but don't specify HOW to authenticate (cookie injection pattern). Look at existing integration tests for the auth pattern.

5. **`Category.create()` doesn't support `attribute_schema`** — FALSE. It uses `**kwargs` which are passed directly to `cls(...)`. Adding `attribute_schema=request.attribute_schema` to the call site works without any entity changes.

6. **`DeleteProductUseCase` calls a `None`-returning delete** — FALSE. The `delete()` method returns `bool`. The use case should handle this: if `False` is returned and the product was fetched first, it's an internal inconsistency (safe to ignore the `bool`).

7. **`test_product_c3.py` uses `admin_user.organization_id`** — RISKY. The plan assumes `admin_user` has an `organization_id` field. This depends on what the fixture creates. The User entity likely has this field but verify in the conftest before writing tests.

---

## [WHAT I NEED]

**Evaluate Phase 12 as a Systems Thinker. Use your sharpest lenses.**

1. **Planning Fallacy check** — Qué estamos subestimando en tiempo o complejidad? Qué parece "fácil" pero tiene dependencias ocultas?

2. **Omission Bias** — Qué falta en los planes que va a bloquear la ejecución? El punto crítico: la infraestructura de autenticación en los tests de integración. ¿Es ejecutable sin resolver esto explícitamente?

3. **Systems Thinking** — Feedback loops entre los planes. Si 12-02 task 12-02-03 es un NO-OP real, ¿qué impacto tiene en los tests del Plan 12-04 que asumen organización_id está "nuevo"? Si `delete()` ya retorna `bool` en vez de `None`, ¿se rompe `DeleteProductUseCase` como está especificado?

4. **Over-engineering risk** — ¿Hay algo en los planes que no se va a usar? ¿El `dry_run=true` mencionado para `UpdateAttributeSchemaUseCase` debería descartarse explícitamente?

5. **Acceptance criteria quality** — ¿Son los criterios verificables automáticamente? ¿Los tests del Plan 12-04 cubren el SC-2 (role-based filtering) o tienen un TODO que los deja incompletos?

Sé específico sobre CUÁL plan y CUÁL tarea.

**Verdict: APPROVED | APPROVED_WITH_CONDITIONS | REJECTED_REVISE**
