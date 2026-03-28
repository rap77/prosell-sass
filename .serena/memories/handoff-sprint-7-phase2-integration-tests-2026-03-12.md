# Sprint 7 Phase 2 - Facebook OAuth Integration Tests (COMPLETE)

## Status: ✅ COMPLETE

**Date**: 2026-03-12
**Branch**: `feature/sprint-7-phase2-facebook-oauth`

## Integration Tests - ✅ COMPLETE

### File: `apps/api/tests/integration/test_facebook_oauth_integration.py`

**Status**: 7/7 PASSING ✅

#### Test Coverage
1. **TestAuthorizeEndpoint** (2 tests)
   - ✅ `test_authorize_success` - Generates URL and state token
   - ✅ `test_authorize_wrong_user_forbidden` - Returns 403 for wrong user

2. **TestCallbackEndpoint** (2 tests)
   - ✅ `test_callback_success` - Successful callback redirects
   - ✅ `test_callback_invalid_state` - Invalid state redirects to error

3. **TestAccountsEndpoint** (1 test)
   - ✅ `test_list_accounts` - Lists Facebook accounts for user

4. **TestRefreshTokensEndpoint** (2 tests)
   - ✅ `test_refresh_tokens` - Admin endpoint for token refresh
   - ✅ `test_refresh_tokens_invalid_hours` - Validates hours parameter

### Test Pattern

Following existing project patterns:

```python
# Fixtures create mocks
@pytest.fixture
def mock_facebook_service():
    service = MagicMock()
    service.get_authorization_url = AsyncMock(...)
    return service

# Override dependencies
@pytest.fixture
def test_client(auto_mock_auth):
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport)

# Tests use AsyncClient
async def test_authorize_success(test_client: AsyncClient):
    response = await test_client.post("/api/v1/facebook/authorize", json={...})
    assert response.status_code == 200
```

### Key Differences from Unit Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| Test | Individual use cases | API endpoints |
| DB | Mocked | Mocked (same pattern) |
| Dependencies | Direct injection | FastAPI dependency overrides |
| Client | N/A | httpx AsyncClient |
| Scope | Single function | Full request/response cycle |

## Test Results

```bash
$ uv run pytest tests/integration/test_facebook_oauth_integration.py -v
======================== 7 passed, 3 warnings in 1.59s =========================

$ uv run pytest tests/unit/ tests/integration/test_facebook_oauth_integration.py -v
================== 397 passed, 1 skipped, 3 warnings in 2.41s ==================
```

## Files Modified

1. `apps/api/tests/integration/test_facebook_oauth_integration.py` - Created

## Technical Notes

### Dependency Override Pattern

```python
# Override in fixture
app.dependency_overrides[get_facebook_oauth_service] = lambda: mock_service

# Auto cleanup in fixture
yield
app.dependency_overrides.clear()
```

### Mock Service Pattern

```python
# Use dataclasses for return values
@dataclass
class TokenResult:
    access_token: str
    expires_in: int

# Configure mock
service = MagicMock()
service.exchange_code_for_token = AsyncMock(
    return_value=TokenResult(access_token="test", expires_in=5184000)
)
```

### Entity vs DTO in Mocks

- Repository mocks should return **Entities** (not DTOs)
- Use case handles Entity → DTO conversion
- Example:
  ```python
  # Wrong
  mock_repo.get_by_seller_user_id = AsyncMock(
      return_value=[FacebookAccountDTO(...)]
  )

  # Correct
  mock_repo.get_by_seller_user_id = AsyncMock(
      return_value=[FacebookAccount(...)]  # Entity
  )
  ```

## Completion Criteria

- ✅ All endpoints tested at integration level
- ✅ Request/response validation
- ✅ Error cases covered
- ✅ 100% test pass rate
- ✅ Following existing project patterns

## Next Steps (E2E Tests)

1. Create `tests/e2e/specs/facebook-oauth.spec.ts`
2. Test full OAuth flow in Playwright
3. Test account listing UI
4. Test page management UI
5. Test disconnect flow UI
6. Test token refresh UI (admin)

## Next Steps (Spike)

1. Create Facebook Developers Console app
2. Configure OAuth redirect URIs
3. Get App ID and App Secret
4. Test against real Facebook Graph API
5. Document setup process
