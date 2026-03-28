---
name: session-2026-03-16-phase1-uat-oauth-fix-pending
description: Phase 1 UAT Round 1 complete, 3 fixes applied, OAuth cookie issue identified
type: project
---

# Session 2026-03-16: Phase 1 UAT + OAuth Fix Discovery

## Status
Phase 1 (Hybrid Publisher): 8/8 planes COMPLETE, UAT Round 1: 7/10 pass, 3 issues fixed, UAT Round 2 paused (OAuth fix pending)

## Fixes Applied (Round 1)

### 1. Modal Close Button Sticky [MAJOR → FIXED]
**File:** `apps/web/src/components/publisher/PublishModal.tsx`
- Header ahora `sticky top-0 bg-white` con fondo blanco
- Content scrollable en div separado con `overflow-y-auto`
- Botón X siempre accesible sin importar scroll

### 2. Model Field Pre-fill [MAJOR → FIXED]
**File:** `apps/web/src/app/dashboard/catalog/page.tsx`
- Catalog mock ahora pasa `year`, `make`, `model` (no solo title derivado)
- PublishForm recibe todos los campos de vehículo

### 3. /docs Pydantic Error [CRITICAL → FIXED]
**File:** `apps/api/src/prosell/infrastructure/api/dependencies.py`
- Import agregado: `from prosell.domain.repositories.publication_repository import IPublicationRepository`
- Tipos de retorno cambiados de `SqlAlchemyPublicationRepository` a `IPublicationRepository`
- Fix evita ForwardRef error en OpenAPI schema generation

## OAuth Issue Discovery [BLOCKER]

**Root Cause:** Cookies OAuth se setean con `secure=True` en línea 427+ de `auth_router.py`, pero en development (localhost HTTP), las cookies `secure=True` **NO se guardan**.

**Impact:** Usuario se loguea con Google OAuth pero al redirigir a /dashboard, el middleware no detecta cookies y lo manda a /auth/login → 404 al intentar navegar.

**Fix Pendiente:**
```python
# En apps/api/src/prosell/infrastructure/api/routers/auth_router.py
# Líneas 422-447 (callback OAuth)
# Cambiar:
secure=True
# A:
secure=settings.environment != "development"
```

## Key Technical Decisions

1. **OAuth fix sobre bypass** — Usuario eligió arreglar correctamente en lugar de workaround
2. **SameSite=Lax necesario** — OAuth callbacks requieren Lax (no Strict) para cross-site redirects
3. **Interfaces sobre clases concretas** — Dependencias deben usar tipos de dominio (`IPublicationRepository`) para evitar Pydantic ForwardRef

## Next Session

1. Aplicar OAuth fix en `auth_router.py` (3 lugares: access_token, refresh_token, user_data)
2. Reiniciar API: `docker compose restart api`
3. Probar OAuth flow y validar /dashboard/catalog accesible
4. Continuar UAT Round 2 desde Test 1

## Files Modified This Session
- `apps/web/src/components/publisher/PublishModal.tsx` (sticky header)
- `apps/web/src/app/dashboard/catalog/page.tsx` (vehicle fields pass)
- `apps/api/src/prosell/infrastructure/api/dependencies.py` (Pydantic fix)
- `.planning/phases/01-hybrid-publisher/01-UAT.md` (UAT tracking)
