---
name: oauth-architecture-decision-2026-03-22
description: OAuth callbacks sin versionar vs Auth API con versión
type: project
---

# OAuth Architecture Decision - Callbacks vs API Endpoints

## Decision Made

**OAuth callbacks (infrastructure)** → `/api/auth/` (SIN versión)
**Auth API endpoints (contracts)** → `/api/v1/auth/` (CON versión)

## Why

### OAuth Callbacks are Infrastructure
- Google Cloud Console solo se configura una vez
- No son endpoints que los clientes llaman directamente
- Son redirecciones internas del OAuth provider
- Cambiarlos requeriría actualizar Google Cloud cada vez

### Auth API Endpoints are Contracts
- Clientes consumen estos endpoints directamente
- Versionado permite evolución backward-compatible
- `/api/v1/auth/login` → `/api/v2/auth/login` sin romper clientes

## Architecture

```
Frontend                          Backend
─────────────────────────────────────────────────────────────
OAuthButtons.tsx          →      /api/auth/oauth/google/authorize (no v1)
authApi.login()           →      /api/v1/auth/login (v1)
authApi.getCurrentUser()  →      /api/v1/auth/me (v1)
```

## Implementation

### main.py - Two routers, different prefixes
```python
# OAuth Infrastructure (sin versionar)
app.include_router(
    oauth_router,
    prefix="/api/auth",
    tags=["OAuth Infrastructure"],
)

# Auth API (versionada)
app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication"],
)
```

### authApi.ts - Auth endpoints with v1
```typescript
async login(email, password) {
  return fetch(`${API_BASE_URL}/api/v1/auth/login`, ...);
}
```

### OAuthButtons.tsx - OAuth callbacks without v1
```typescript
window.location.href = `${apiUrl}/api/auth/oauth/${variant}/authorize`;
```

## Google Cloud Console Configuration

**Authorized Redirect URI**:
```
http://localhost:8000/api/auth/oauth/google/callback
```

## Future Considerations

**When moving to v2**:
- OAuth callbacks → `/api/auth/` (NO CAMBIA)
- Auth endpoints → `/api/v2/auth/` (nueva versión)
- Google Cloud Console → NO SE TOCA

## Files Modified

- `apps/web/src/lib/api/authApi.ts` - All endpoints use `/api/v1/auth/`
- `apps/web/src/components/auth/OAuthButtons.tsx` - OAuth uses `/api/auth/`
- `apps/api/src/prosell/infrastructure/api/main.py` - Both prefixes mounted

## Session Context

Session: 2026-03-22
Decision made during: OAuth architecture fix for Phase 1 UAT
Reason: User pointed out Google Cloud Console would need update on every version
