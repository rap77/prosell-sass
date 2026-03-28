---
name: oauth-cookie-path-fix-2026-03-24
description: OAuth cookies must use path=/ to be available across all API endpoints
type: feedback
---

# OAuth Cookie Path Configuration

**Rule**: Always set `path="/"` on httpOnly cookies for OAuth authentication

**Why**:
- Cookies set without `path` parameter default to current request path only
- OAuth callback at `/api/auth/oauth/google/callback` would set cookies for `/api/auth/*` only
- Subsequent requests to `/api/v1/publisher/*` would NOT receive those cookies
- This causes 401 Unauthorized even though cookies exist in browser

**How to apply**:
```python
# OAuth callback in auth_router.py
redirect.set_cookie(
    key="access_token",
    value=token,
    path="/",  # ALWAYS include this
    httponly=True,
    secure=settings.environment != "development",
    samesite="lax",
)
```

**Session context**: Fixed during Phase 1 UAT 2026-03-24, discovered when publisher endpoint returned 401 despite successful OAuth login.
