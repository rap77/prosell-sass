# Pyright Error Analysis - ProSell SaaS

**Date**: 2026-05-12
**Total Errors**: 2,635 (after 13 files already excluded in `pyproject.toml`)
**Estimated errors including excluded files**: ~4,400+
**Already Fixed**: ~142 errors in prior sessions (production code)

---

## Executive Summary

The ProSell SaaS API has **2,635 pyright errors** in strict mode. The overwhelming majority (93.6%) are in **test code**, not production code. Only **168 errors (6.4%)** exist in production source code across 33 files.

The root cause is **systemic**: pytest fixtures lack type annotations, and this propagates `Unknown` types throughout every test function that receives them. This is a well-known pyright + pytest-asyncio interaction issue, not a code quality problem.

**Key Insight**: The `pyproject.toml` already excludes the 13 worst test files (~1,800 additional errors). The remaining 2,635 errors are the "second wave" that was not yet excluded.

### TL;DR - Priority Matrix

| Priority | Category | Errors | Impact | Effort | Recommendation |
| -------- | -------------------------------------------------- | -------------------------------- | ------ | ------- | ----------------------------------------------- | ------------------------- |
| P0 | Production: Missing type args on `dict`/`list` | 16 | HIGH | LOW | Annotate `dict[str, Any]` and `list[...]` |
| P0 | Production: `UUID                                  | None`passed where`UUID` expected | 12 | HIGH | LOW | Add None-guard assertions |
| P0 | Production: Task imports (`async_session_factory`) | 8 | HIGH | LOW | Fix import paths |
| P1 | Production: Unused imports in `domain/base.py` | 3 | LOW | TRIVIAL | Remove unused imports |
| P1 | Production: SQLAlchemy `select()` with UUID | 4 | MEDIUM | LOW | Use `column == value` instead of `select(UUID)` |
| P1 | Production: Library stub issues (Pillow LANCZOS) | 4 | LOW | TRIVIAL | Use `Image.Resampling.LANCZOS` |
| P2 | Tests: Fixture parameter annotations | 521 | LOW | MEDIUM | Add type hints to all fixtures |
| P2 | Tests: Propagated unknown types | 1,058+ | LOW | HIGH | Fix fixtures, propagation auto-resolves |
| P3 | Tests: Files with 80+ errors | ~900 | LOW | TRIVIAL | Add to pyright exclude list |
| P3 | Config: pythonVersion mismatch | 0 | MEDIUM | TRIVIAL | Align pyrightconfig to 3.12 |

---

## 1. Error Type Breakdown

### Top Error Types (all 2,635 errors)

| #   | Error Type                    | Count | %     | Production | Tests |
| --- | ----------------------------- | ----- | ----- | ---------- | ----- |
| 1   | `reportUnknownMemberType`     | 613   | 23.3% | 16         | 597   |
| 2   | `reportUnknownParameterType`  | 532   | 20.2% | 4          | 528   |
| 3   | `reportMissingParameterType`  | 521   | 19.8% | 0          | 521   |
| 4   | `reportUnknownVariableType`   | 197   | 7.5%  | 27         | 170   |
| 5   | `reportUnknownLambdaType`     | 38    | 1.4%  | 2          | 36    |
| 6   | `reportMissingTypeArgument`   | 31    | 1.2%  | 9          | 22    |
| 7   | `reportCallIssue`             | 29    | 1.1%  | 4          | 25    |
| 8   | `reportUnusedVariable`        | 9     | 0.3%  | 0          | 9     |
| 9   | `reportPrivateUsage`          | 9     | 0.3%  | 0          | 9     |
| 10  | `reportUnusedImport`          | 7     | 0.3%  | 7          | 0     |
| 11  | `reportUnusedFunction`        | 3     | 0.1%  | 0          | 3     |
| 12  | `reportAttributeAccessIssue`  | 3     | 0.1%  | 3          | 0     |
| 13  | `reportUnnecessaryIsInstance` | 2     | 0.1%  | 2          | 0     |
| 14  | `reportUnnecessaryComparison` | 1     | <0.1% | 1          | 0     |
| 15  | `reportOptionalOperand`       | 1     | <0.1% | 0          | 1     |
| 16  | `reportOptionalMemberAccess`  | 1     | <0.1% | 1          | 0     |
| 17  | `reportUnusedClass`           | 1     | <0.1% | 0          | 1     |

### What Each Error Type Means

**`reportUnknownMemberType` (613)**: Pyright cannot determine the type of an attribute access like `obj.tenant_id`. This cascades: once one value is `Unknown`, everything derived from it is also `Unknown`.

**`reportUnknownParameterType` (532)**: A function/method parameter has an unknown type. Almost entirely from pytest fixtures that inject untyped dependencies (`db_session`, `test_user`, `mock_lead_repository`, etc.).

**`reportMissingParameterType` (521)**: A function parameter lacks any type annotation. Every pytest fixture parameter without a type hint triggers this. These 521 errors are the ROOT CAUSE of ~1,000+ propagated errors.

**`reportUnknownVariableType` (197)**: A local variable has an unknown type, usually because it was assigned from an unknown source (fixture parameter, untyped dict access, etc.).

**`reportMissingTypeArgument` (31)**: A generic type like `dict` or `list` is used without type parameters. Should be `dict[str, Any]` not just `dict`.

**`reportUnknownLambdaType` (38)**: Lambda parameters or return types are unknown because the lambda operates on data from untyped sources.

---

## 2. Distribution by Code Section

### Production Code (168 errors, 6.4%)

| Layer             | Errors | Files | Key Issues                                     |
| ----------------- | ------ | ----- | ---------------------------------------------- |
| `infrastructure/` | 103    | 22    | Task imports, SQLAlchemy, Pillow stubs         |
| `application/`    | 61     | 5     | Dict typing, optional UUID, repository returns |
| `domain/`         | 4      | 2     | Unused imports, type narrowing                 |

### Test Code (2,467 errors, 93.6%)

| Section              | Errors | Files | Key Issues                           |
| -------------------- | ------ | ----- | ------------------------------------ |
| `tests/integration/` | 1,849  | 26    | Fixture types, propagated unknowns   |
| `tests/unit/`        | 532    | 24    | Fixture types, mock attribute access |
| `tests/contract/`    | 86     | 3     | Schema matching kwargs               |

### Already Excluded (in pyproject.toml, ~1,800 errors)

13 test files were previously excluded from pyright checking because their error counts were too high to address individually.

---

## 3. Root Cause Analysis

### Root Cause 1: Untyped Pytest Fixtures (PRIMARY - ~1,600 errors)

**The Problem**: pytest-asyncio fixtures defined in `conftest.py` files do not have parameter type annotations. When pyright runs in strict mode, every fixture parameter without a type annotation becomes `Unknown`.

**Example from `tests/integration/api/conftest.py`**:

```python
# PROBLEM - no type annotations
@pytest_asyncio.fixture
async def admin_user(test_user):  # test_user: Unknown
    ...
    user = User(
        id=test_user.id,      # id: Unknown -> reportUnknownMemberType
        email=test_user.email, # email: Unknown -> reportUnknownMemberType
    )
    return user
```

**Fix**:

```python
# FIXED - explicit type annotations
from prosell.infrastructure.models.user_model import UserModel

@pytest_asyncio.fixture
async def admin_user(test_user: UserModel) -> User:
    ...
```

**Why it cascades**: A single untyped fixture like `db_session: Unknown` propagates to every test that uses it, generating 5-15 errors per test function for every attribute access, method call, or variable assignment.

### Root Cause 2: Untyped `dict` and `list` (47 errors production)

**The Problem**: Return types and parameters using bare `dict` or `list` without type parameters.

```python
# PROBLEM
async def process_task(context: dict) -> dict:  # dict[Unknown, Unknown]
    result = context.get("key")  # result: Unknown
```

```python
# FIXED
async def process_task(context: dict[str, Any]) -> dict[str, Any]:
    result = context.get("key")  # result: str | None (known)
```

Affected files: All `infrastructure/tasks/use_cases/*.py`, `admin_router.py`, `facebook_webhook_use_case.py`.

### Root Cause 3: `UUID | None` Passed Where `UUID` Expected (12 errors)

**The Problem**: Domain entities define `tenant_id: UUID | None` but use cases and repositories expect `tenant_id: UUID`.

```python
# PROBLEM - entity has Optional UUID
class Product:
    tenant_id: UUID | None

# But repository expects non-optional
class ProductRepository:
    async def get_by_id(self, tenant_id: UUID) -> ...  # Not UUID | None

# Use case passes potentially-None value
product = await repo.get_by_id(product.tenant_id)  # Error!
```

**Fix**: Add guard assertions in use cases:

```python
assert product.tenant_id is not None, "Product must have tenant_id"
result = await repo.get_by_id(product.tenant_id)  # Now UUID
```

Affected files: `create_product.py`, `user_branch_router.py`, `publish_product_task.py`.

### Root Cause 4: Library Stub Issues (8 errors)

**Pillow `LANCZOS`**: `PIL.Image.LANCZOS` was deprecated in Pillow 10+ in favor of `PIL.Image.Resampling.LANCZOS`. Pyright flags the old attribute.

**SQLAlchemy `select()`**: Using `select(UUID_value)` instead of `Model.column == UUID_value` for WHERE clauses.

**Taskiq `Receiver.start`**: Missing type stubs for taskiq's async worker.

**SendGrid**: No type stubs available for the `sendgrid` package.

### Root Cause 5: Pyright Configuration Mismatch

There are TWO conflicting pyright configurations:

1. **Root** `/pyrightconfig.json`: `pythonVersion: "3.12"`, `typeCheckingMode: "strict"`, includes `apps/api/src/**/*.py` and `apps/api/tests/**/*.py`
2. **API** `apps/api/pyproject.toml`: `pythonVersion: "3.13"`, `typeCheckingMode: "strict"`, includes `src` and `tests`

The runtime is Python 3.12.3, but `pyproject.toml` specifies 3.13. The root config says 3.12. This mismatch could cause false positives for newer Python features.

---

## 4. Production Code Errors - Detailed File Analysis

### Critical (P0) - 52 errors

#### Task Module: `infrastructure/tasks/` (58 errors across 6 files)

The task worker modules have the highest density of errors in production code. Root causes:

1. **Missing type args on task handler return types** (14 errors):

   ```python
   # Current
   async def publish_product(context: dict) -> dict:
   # Should be
   async def publish_product(context: dict[str, Any]) -> dict[str, Any]:
   ```

2. **Broken import**: `async_session_factory` is imported from `prosell.infrastructure.database.session` but does not exist at that path (8 errors):

   ```python
   # Current (broken)
   from prosell.infrastructure.database.session import async_session_factory
   # Need to verify correct import path
   ```

3. **Missing `encryption_key` parameter** (6 errors): `TokenEncryptionService` constructor now requires `encryption_key` but callers do not pass it.

4. **`UUID | None` passed to functions expecting `UUID`** (3 errors).

#### Application Use Cases (61 errors across 5 files)

- `get_lead_details.py` (25 errors): Repository returns untyped results, cascading to all attribute accesses
- `facebook_webhook_use_case.py` (17 errors): `payload: dict` should be `payload: dict[str, Any]`
- `get_team_metrics.py` (7 errors): Lambda sorting on unknown types
- `update_lead_status.py` (7 errors): Lead attribute access with unknown types
- `create_product.py` (5 errors): `UUID | None` argument issues

#### Routers (23 errors across 6 files)

- `user_branch_router.py` (8 errors): `UUID | None` tenant_id guards
- `admin_router.py` (6 errors): SQLAlchemy select() with raw UUID
- `product_router.py` (4 errors): `status.HTTP_403_FORBIDDEN` unknown import
- `appointment_router.py` (2 errors): Email service type mismatch
- `webhook_router.py` (1 error), `health_router.py` (1 error)

### Low Priority (P1-P3) - 116 errors

- Unused imports in `domain/base.py` (3 errors)
- `reportUnnecessaryIsInstance` in `token_encryption_service.py` (2 errors)
- `reportUnnecessaryComparison` in `category_repository_impl.py` (1 error)
- Repository `set_primary_image` override incompatibility (1 error)

---

## 5. Test Error Patterns

### Pattern 1: Fixture Parameter Cascade (1,058 errors)

**Root fixtures without type annotations** (from `tests/integration/conftest.py`):

| Fixture            | Parameter           | Missing Annotation  |
| ------------------ | ------------------- | ------------------- |
| `test_user`        | `db_session`        | `AsyncSession`      |
| `test_user`        | `test_organization` | `OrganizationModel` |
| `test_user`        | `test_role`         | `RoleModel`         |
| `test_seller_user` | `db_session`        | `AsyncSession`      |
| `test_seller_user` | `test_organization` | `OrganizationModel` |
| `test_seller_user` | `test_seller_role`  | `RoleModel`         |
| `test_category`    | `db_session`        | `AsyncSession`      |
| `test_category`    | `test_organization` | `OrganizationModel` |

**Child fixtures in `tests/integration/api/conftest.py`**:

| Fixture                  | Parameter          | Missing Annotation |
| ------------------------ | ------------------ | ------------------ |
| `admin_user`             | `test_user`        | `UserModel`        |
| `seller_user`            | `test_seller_user` | `UserModel`        |
| `async_client_as_admin`  | `admin_user`       | `User`             |
| `async_client_as_admin`  | `db_session`       | `AsyncSession`     |
| `async_client_as_seller` | `seller_user`      | `User`             |
| `async_client_as_seller` | `db_session`       | `AsyncSession`     |

**Impact**: Each untyped fixture generates 3-15 downstream errors in every test function that receives it.

### Pattern 2: Mock Attribute Access (200+ errors)

When fixtures create `MagicMock` or `AsyncMock` objects, pyright cannot determine mock attributes:

```python
mock_lead_repository.get_by_id.return_value = lead
#                      ^^^^^^^ Unknown member
```

### Pattern 3: Protected Member Access (9 errors)

Tests access private methods like `_normalize_phone` and `_cache` directly, which pyright flags in strict mode.

### Pattern 4: Lambda Sorting (38 errors)

Sorting with untyped lambda parameters:

```python
metrics.sort(key=lambda x: x.total_leads, reverse=True)
#                   ^ Unknown, ^ Unknown member
```

---

## 6. Configuration Issues

### Dual Pyright Config Conflict

```
Root pyrightconfig.json:
  pythonVersion: "3.12"
  include: apps/api/src/**/*.py, apps/api/tests/**/*.py
  exclude: .venv, __pycache__, node_modules, migrations

API pyproject.toml:
  pythonVersion: "3.13"
  include: src, tests
  exclude: .venv, __pycache__, 13 specific test files
```

The API-level config is more correct (excludes problematic test files), but the root config may override in IDE contexts. Both configs have `typeCheckingMode: "strict"`.

### pythonVersion Mismatch

- Runtime: **Python 3.12.3**
- Root config: `3.12` (correct)
- API config: `3.13` (wrong - causes false positives for features that exist in 3.13 but not 3.12)

### Missing Type Stubs

| Library        | Has Stubs         | Impact                         |
| -------------- | ----------------- | ------------------------------ |
| SQLAlchemy 2.0 | Yes (bundled)     | Good                           |
| FastAPI        | Yes (bundled)     | Good                           |
| Pydantic 2     | Yes (bundled)     | Good                           |
| Pillow         | Partial           | `LANCZOS` deprecated attribute |
| pytest-asyncio | `py.typed` only   | No `.pyi` stubs for fixtures   |
| taskiq         | No                | Worker/broker types unknown    |
| sendgrid       | No                | All types unknown              |
| facebook-sdk   | No                | All types unknown              |
| httpx          | Yes (bundled)     | Good                           |
| boto3          | Via `types-boto3` | Installed                      |

---

## 7. Action Plan

### Phase 1: Quick Wins (1-2 hours, eliminates ~50 production errors)

1. **Fix `dict`/`list` type args** in production code (16 errors)
   - `infrastructure/tasks/use_cases/*.py` - add `dict[str, Any]`
   - `facebook_webhook_use_case.py` - add `dict[str, Any]`
   - `admin_router.py` - add `dict[str, Any]`

2. **Fix `UUID | None` guards** (12 errors)
   - `create_product.py` - assert `tenant_id is not None`
   - `user_branch_router.py` - assert or guard `tenant_id`
   - `publish_product_task.py` - guard `page_id`

3. **Fix broken imports** (8 errors)
   - `delete_listing_task.py` - fix `async_session_factory` import
   - `update_listing_task.py` - fix `async_session_factory` import

4. **Remove unused imports** (10 errors)
   - `domain/base.py` - remove `EmailStr`, `ValidationInfo`, `field_validator`
   - `infrastructure/tasks/worker.py` - remove unused task imports

5. **Fix Pillow deprecation** (4 errors)
   - `image_pipeline.py` - use `Image.Resampling.LANCZOS`

### Phase 2: Medium Effort (2-4 hours, eliminates ~70 more production errors)

1. **Type repository returns** in use cases
   - `get_lead_details.py` - annotate repository method return types
   - `get_team_metrics.py` - type the metrics list

2. **Fix SQLAlchemy query patterns** (4 errors)
   - `admin_router.py` - use `Model.column == value` pattern

3. **Fix `encryption_key` parameter** (6 errors)
   - Task use cases need to provide `encryption_key` to `TokenEncryptionService`

### Phase 3: Test Fixture Typing (4-8 hours, eliminates ~1,500+ test errors)

1. **Type all fixtures in `tests/integration/conftest.py`** (~30 annotations)
2. **Type all fixtures in `tests/integration/api/conftest.py`** (~10 annotations)
3. **This cascades**: typing fixtures eliminates `reportUnknownParameterType` and most `reportUnknownMemberType` in tests automatically

### Phase 4: Exclusion Strategy (30 minutes, reduces visible errors by ~900)

Add high-error test files to `pyproject.toml` pyright exclude list:

```toml
[tool.pyright]
exclude = [
    # ... existing excludes ...
    "tests/unit/services/test_appointment_status_email.py",    # 77 errors
    "tests/integration/use_cases/test_assign_lead_use_case.py", # 64 errors
    "tests/integration/repositories/test_publication_repository.py", # 61 errors
    "tests/unit/services/test_email_service.py",               # 56 errors
    "tests/unit/infrastructure/images/test_image_optimizer.py", # 55 errors
    "tests/unit/infrastructure/services/test_facebook_graph_api_client.py", # 52 errors
    "tests/contract/schema_matching/test_vehicle_dto_matching.py", # 49 errors
    "tests/integration/api/test_category_api.py",              # 39 errors
    "tests/unit/infrastructure/middleware/test_auth_middleware.py", # 38 errors
    "tests/unit/application/publisher/test_publish_use_cases.py", # 34 errors
    "tests/integration/api/conftest.py",                       # 34 errors
]
```

### Phase 5: Configuration Cleanup (15 minutes)

1. **Unify pythonVersion to `"3.12"`** in `pyproject.toml` (matches runtime)
2. **Remove root `pyrightconfig.json`** or sync it with `pyproject.toml`
3. **Consider `typeCheckingMode: "basic"`** for tests while keeping `"strict"` for `src/`

---

## 8. Recommended Strategy

### Immediate (This Session)

- Fix Phase 1 quick wins (50 production errors)
- Align config: `pythonVersion: "3.12"` in pyproject.toml
- Result: Production code drops from 168 to ~120 errors

### Short Term (Next 1-2 Sessions)

- Fix Phase 2 medium-effort production errors
- Add Phase 4 exclusions for test files
- Result: Production code at ~50 errors, visible test errors at ~1,500

### Medium Term (Dedicated Session)

- Execute Phase 3: Type all test fixtures
- Result: Test errors drop from 2,467 to ~200 (protected access, library stubs)

### Long Term

- Separate pyright configs for `src/` (strict) and `tests/` (basic)
- Add custom type stubs for `taskiq`, `sendgrid`, `facebook-sdk`
- Target: 0 production errors, <50 test warnings

---

## Appendix: Error Count by File (Full List)

### Production Code (168 errors)

| Errors | File                                                                          |
| ------ | ----------------------------------------------------------------------------- |
| 25     | `src/prosell/application/use_cases/lead/get_lead_details.py`                  |
| 17     | `src/prosell/application/use_cases/facebook_webhook_use_case.py`              |
| 16     | `src/prosell/infrastructure/tasks/use_cases/update_listing_task.py`           |
| 13     | `src/prosell/infrastructure/tasks/use_cases/delete_listing_task.py`           |
| 11     | `src/prosell/infrastructure/tasks/use_cases/publish_product_task.py`          |
| 8      | `src/prosell/infrastructure/api/routers/user_branch_router.py`                |
| 8      | `src/prosell/infrastructure/tasks/worker.py`                                  |
| 7      | `src/prosell/application/use_cases/lead/get_team_metrics.py`                  |
| 7      | `src/prosell/application/use_cases/lead/update_lead_status.py`                |
| 7      | `src/prosell/infrastructure/api/routers/admin_router.py`                      |
| 6      | `src/prosell/infrastructure/tasks/use_cases/poll_facebook_leads_task.py`      |
| 5      | `src/prosell/application/use_cases/product/create_product.py`                 |
| 4      | `src/prosell/infrastructure/services/image_pipeline.py`                       |
| 4      | `src/prosell/infrastructure/api/routers/product_router.py`                    |
| 3      | `src/prosell/domain/base.py`                                                  |
| 3      | `src/prosell/infrastructure/webhook/facebook_webhook_processor.py`            |
| 3      | `src/prosell/infrastructure/tasks/taskiq_task_dispatcher.py`                  |
| 3      | `src/prosell/infrastructure/services/facebook_marketplace_oauth_service.py`   |
| 2      | `src/prosell/infrastructure/services/token_encryption_service.py`             |
| 2      | `src/prosell/infrastructure/repositories/publication_repository_impl.py`      |
| 2      | `src/prosell/infrastructure/repositories/facebook_account_repository_impl.py` |
| 2      | `src/prosell/infrastructure/tasks/use_cases/auto_republish_task.py`           |
| 2      | `src/prosell/infrastructure/api/routers/appointment_router.py`                |
| 1      | `src/prosell/infrastructure/repositories/product_repository_impl.py`          |
| 1      | `src/prosell/infrastructure/repositories/category_repository_impl.py`         |
| 1      | `src/prosell/infrastructure/repositories/branch_repository_impl.py`           |
| 1      | `src/prosell/infrastructure/models/publication_model.py`                      |
| 1      | `src/prosell/infrastructure/images/image_optimizer.py`                        |
| 1      | `src/prosell/infrastructure/i18n/translator.py`                               |
| 1      | `src/prosell/infrastructure/api/routers/webhook_router.py`                    |
| 1      | `src/prosell/infrastructure/api/routers/health_router.py`                     |
| 1      | `src/prosell/infrastructure/api/middleware/exception_handlers.py`             |
| 1      | `src/prosell/domain/exceptions/facebook_exceptions.py`                        |

### Test Code (2,467 errors) - Top 20 Files

| Errors | File                                                                   |
| ------ | ---------------------------------------------------------------------- |
| 213    | `tests/integration/api/test_lead_api.py`                               |
| 192    | `tests/integration/repositories/test_lead_repository.py`               |
| 168    | `tests/integration/test_organization_api.py`                           |
| 139    | `tests/integration/use_cases/test_create_appointment_use_case.py`      |
| 116    | `tests/integration/use_cases/test_confirm_appointment_use_case.py`     |
| 116    | `tests/integration/use_cases/test_cancel_appointment_use_case.py`      |
| 102    | `tests/integration/api/test_user_branch_api.py`                        |
| 101    | `tests/integration/use_cases/test_facebook_webhook_use_case.py`        |
| 98     | `tests/integration/use_cases/test_lead_use_cases.py`                   |
| 96     | `tests/integration/api/test_appointment_api.py`                        |
| 87     | `tests/unit/services/test_lead_duplicate_detector.py`                  |
| 85     | `tests/integration/api/test_product_c3.py`                             |
| 85     | `tests/integration/api/test_branch_endpoints.py`                       |
| 77     | `tests/unit/services/test_appointment_status_email.py`                 |
| 64     | `tests/integration/use_cases/test_assign_lead_use_case.py`             |
| 61     | `tests/integration/repositories/test_publication_repository.py`        |
| 56     | `tests/unit/services/test_email_service.py`                            |
| 55     | `tests/unit/infrastructure/images/test_image_optimizer.py`             |
| 52     | `tests/unit/infrastructure/services/test_facebook_graph_api_client.py` |
| 49     | `tests/contract/schema_matching/test_vehicle_dto_matching.py`          |

_(33 more test files with fewer errors)_
