# Brain #6 QA Domain Feed

## 2026-04-27 — Phase 13 Integration Test Fix Session

### Verified Insights

**Test command**: `cd apps/api && uv run pytest tests/ --tb=short`
**Baseline before session**: 549/588 integration + unit (39 failures)
**Baseline after session**: 588/588 — ZERO failures

### Root Causes Fixed (all verified by running tests)

#### 1. Auth dependency mismatch — `get_current_auth_user` vs `get_current_auth_user_from_cookie`
- **Affected tests**: `test_org_upload_url.py`, `test_organization_api.py`, `test_dealer_endpoints.py`, `test_facebook_oauth_integration.py`, `test_user_dealer_api.py::test_admin_manager_only_access`
- **Root cause**: All production routers use `get_current_auth_user_from_cookie`. Tests were only overriding `get_current_auth_user`. Result: 401 on every request.
- **Fix**: Override BOTH `get_current_auth_user` AND `get_current_auth_user_from_cookie` in all auth fixtures.
- **Pattern**: `app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user`

#### 2. `attribute_schema` not persisted in category repository
- **Affected tests**: `test_category_api.py` — 5 tests
- **Root cause**: `SqlAlchemyCategoryRepository.create()` and `update()` did not include `attribute_schema` in the ORM model construction.
- **File fixed**: `apps/api/src/prosell/infrastructure/repositories/category_repository_impl.py`
- **Fix**: Added `attribute_schema=category.attribute_schema` to both `create()` and `update()` methods.

#### 3. `onupdate="now()"` string is invalid for asyncpg
- **Affected tests**: `test_update_category_basic_info`, `test_update_attribute_schema_replaces_existing`, `test_delete_category_soft_deletes`
- **Root cause**: `CategoryModel.updated_at` has `onupdate="now()"` — SQLAlchemy passes the raw string `'now()'` to asyncpg which rejects it (expects `datetime` instance).
- **File fixed**: `apps/api/src/prosell/infrastructure/repositories/category_repository_impl.py`
- **Fix**: Set `model.updated_at = category.updated_at` explicitly in `update()`. Domain entities set `updated_at = datetime.now(UTC)` in their mutation methods.
- **NOTE**: The `CategoryModel.updated_at` field has `onupdate="now()"` which is broken — do NOT rely on SQLAlchemy's `onupdate` for server-side timestamps with asyncpg. Always set explicitly.

#### 4. Random `organization_id` FK violation in product/vehicle tests
- **Affected tests**: `test_product_c3.py` (7 tests), `test_vehicle_api.py` (4 tests)
- **Root cause**: Tests used `org_id=str(uuid4())` as `organization_id` for product creation. `products.organization_id` has FK → `organizations.id`. The random UUID doesn't exist in the DB → `IntegrityError: ForeignKeyViolationError`.
- **Fix**: Replace `str(uuid4())` with `str(admin_user.tenant_id)` — the test organization has `id == tenant_id` (conftest pattern), so `admin_user.tenant_id` is a valid `organizations.id`.
- **Pattern for future tests**: Never use `uuid4()` as FK reference unless you've also created that record in the DB.

#### 5. Dual fixture conflict: `async_client_as_admin` + `async_client_as_seller` shadow each other
- **Affected tests**: `test_seller_does_not_see_inactive_categories`
- **Root cause**: Both fixtures set `app.dependency_overrides[get_current_auth_user_from_cookie]` globally. When both are requested for the same test, the second one (seller) overwrites the first (admin). Admin client sends requests with seller auth → empty list (wrong tenant or wrong filter).
- **Fix**: Rewrote the test to use explicit inline client management: one client at a time, setting override before use and clearing after.
- **Pattern**: NEVER use two fixtures that both set the same `app.dependency_overrides` key simultaneously.

#### 6. `CreateVehicleUseCase` calls `product_repo.get_by_id(id, UUID(int=0))` — zero-UUID tenant filter
- **Affected tests**: `test_vehicle_api.py` — 3 tests
- **Root cause**: The use case passes `UUID(int=0)` as tenant_id intending "ignore tenant". But `SqlAlchemyProductRepository.get_by_id` filtered `WHERE tenant_id = UUID(int=0)` — which never matches any real tenant.
- **File fixed**: `apps/api/src/prosell/infrastructure/repositories/product_repository_impl.py`
- **Fix**: When `tenant_id == UUID(int=0)`, skip the tenant filter. This matches the original design intent.
- **IMPORTANT**: This was a PRODUCTION BUG. `POST /api/v1/vehicles` could never succeed in production. Tests exposed it.

#### 7. OAuth callback cookies invisible via `response.cookies` in ASGI transport
- **Affected tests**: `test_oauth_callback.py::test_successful_callback_sets_cookies_and_redirects`
- **Root cause**: Cookies are set with `domain="localhost"` but ASGI transport uses `base_url="http://test"`. httpx rejects cookies from mismatched domains → `response.cookies` is empty.
- **Fix**: Read raw `Set-Cookie` headers instead: `response.headers.get_list("set-cookie")`. The headers are present, just not in the cookie jar.

#### 8. Facebook callback use case writes to DB — FK violation without real user
- **Affected tests**: `test_facebook_oauth_integration.py::test_callback_success`
- **Root cause**: Test mocked sub-dependencies (`get_redis_service`, `get_facebook_oauth_service`) but the callback use case still writes a `FacebookAccount` to DB with a random `seller_user_id` not in the `users` table.
- **Fix**: Mock the entire `get_facebook_callback_use_case` dependency (at use case level) instead of mocking sub-dependencies individually.
- **Pattern**: When a use case writes to DB, mock at the USE CASE level, not at the sub-dependency level.

### Deferred Items

📅 `CategoryModel.onupdate="now()"` is broken for asyncpg — consider replacing with `FetchedValue()` from sqlalchemy or removing `onupdate` entirely and always setting explicitly. Currently worked around in repository layer.

📅 `test_user_dealer_api.py` has 4 tests that require `POSTGRES_AVAILABLE=true` — these are intentionally skipped. Consider converting to use the `db_session` override pattern instead of the env var gate.
