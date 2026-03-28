---
name: session-2026-03-21-oauth-tenant-id-fix
description: OAuth tenant_id NULL fix — root cause 401 Unauthorized + router prefix fix
type: project
---

# Session 2026-03-21: OAuth tenant_id Fix + Router Prefix

## Root Cause: 401 Unauthorized

**Problem**: POST /api/v1/publisher/{id}/publish devolvía 401 aunque el usuario estuviera logueado.

**Investigation**:
1. Verificado DB: usuario `mworkpadron@gmail.com` tenía `tenant_id = NULL`
2. Verificado DTO `PublishVehicleRequest`: requiere `tenant_id: UUID` obligatorio
3. Verificado frontend mock: enviaba `tenant_id: "tenant-001"` (string, no UUID)
4. Verificado `User.create_oauth()`: línea 148 → `tenant_id = None`

**Fix Applied**:

### 1. Domain Entity — `apps/api/src/prosell/domain/entities/user.py`
```python
@classmethod
def create_oauth(cls, email: str, full_name: str, avatar_url: str | None = None) -> "User":
    """OAuth users get their own tenant_id (equal to their user.id)."""
    user_id = uuid4()
    return cls(
        id=user_id,
        # ... otros campos ...
        tenant_id=user_id,  # ← FIX: OAuth users are their own tenant
    )
```

### 2. Database Migration — 10 users updated
```sql
UPDATE users SET tenant_id = id WHERE tenant_id IS NULL;
-- Result: UPDATE 10
```

### 3. Alembic Migration — `20260317_2323-bf038603639b_backfill_tenant_id_for_oauth_users.py`
- Upgrade: backfill `tenant_id` para usuarios existentes
- Downgrade: revertir `tenant_id = NULL`

### 4. Frontend Mock — `apps/web/src/app/dashboard/catalog/page.tsx`
- `tenant_id` actualizado de `"tenant-001"` → `"e1871fb7-cf0e-4374-a4ff-89809adffc4e"`

## Secondary Issue: OAuth Login {"detail":"Not Found"}

**Problem**: Al intentar loguearse con Google, frontend obtenía `{"detail":"Not Found"}`.

**Root Cause**: `auth_router` montado en `/api/auth` pero frontend esperaba `/api/v1/auth`.

**Fix Applied** — `apps/api/src/prosell/infrastructure/api/main.py`:
```python
app.include_router(
    auth_router,
    prefix="/api/v1/auth",  # ← FIX: changed from "/api/auth"
    tags=["Authentication"],
)
```

## Files Modified (uncommitted)
- `apps/api/src/prosell/domain/entities/user.py` — OAuth tenant_id fix
- `apps/api/src/prosell/infrastructure/api/main.py` — Router prefix fix
- `apps/api/alembic/versions/20260317_2323-bf038603639b_backfill_tenant_id_for_oauth_users.py` — Migration
- `apps/web/src/app/dashboard/catalog/page.tsx` — Mock tenant_id fix

## Previous Fixes (from earlier sessions)
- `PublishModal.tsx` — Modal scroll + border-radius
- `auth_router.py` — OAuth cookie environment-based (`secure=settings.environment != "development"`)
- `dependencies.py` — Pydantic /docs fix

## Next Steps
1. Restart API cleanly (port 8000 was blocked)
2. Test OAuth Google login flow end-to-end
3. Complete UAT Round 2 (Tests 3-10)
4. Commit all accumulated changes

## Resume Command
```bash
/gsd:resume-work
```

## Technical Debt
- OAuth fix only tested in development — needs production validation with HTTPS
- 01-00 wave0-infra: 6 test stubs missing (low priority vs functional UAT)
