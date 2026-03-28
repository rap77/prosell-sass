---
name: fastapi-dependency-chain-auth
description: FastAPI executes ALL dependencies in chain - endpoint and use case dependencies both run
type: feedback
---

# FastAPI Dependency Chain Execution Pattern

**Rule**: When an endpoint uses dependency injection AND passes that dependency to a use case, FastAPI executes BOTH dependencies.

**Why**:
- Endpoint dependency: `_current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)]`
- Use case dependency: `current_user: Annotated[User, Depends(get_current_auth_user)]`
- FastAPI executes BOTH — cookie auth succeeds, then Bearer token check fails with 401

**How to apply**:
Always check the ENTIRE dependency chain, not just the endpoint. If a use case injects a user/tenant parameter, verify which dependency it uses:

```python
# WRONG - mismatched auth
@router.post("/publish")
async def publish(
    _user: Annotated[User, Depends(get_current_auth_user_from_cookie)],  # ✓ Cookies
    use_case: Annotated[PublishUseCase, Depends(get_publish_vehicle_use_case)],  # ✗ Bearer inside
)

# RIGHT - consistent auth
async def get_publish_vehicle_use_case(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],  # ✓ Cookies
)
```

**Session context**: Found during publisher endpoint 401 debugging 2026-03-24. Endpoint used cookie auth but use case required Bearer token, causing 401 despite valid cookies.
