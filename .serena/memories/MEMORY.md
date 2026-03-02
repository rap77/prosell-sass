# ProSell SaaS - Project Memory (Index)

> Este archivo es el índice. Leer los handoffs específicos para detalles de cada sesión.

## Estado Actual del Proyecto (2026-03-02)

### Branch Activa: `feature/oauth-backend-callbacks`
- ✅ PRP Sprint 1-2: 10/10 fixes implementados, 331/331 tests ✅
- ✅ Bugs extra corregidos: `handleResponse` array detail + `authApi.register()` body format
- ⚠️ NO commiteado aún (cambios de esta sesión sin commit)
- ⚠️ CORS preflight 405 en `/api/auth/register` — investigar ordering de middleware en main.py
- ⚠️ `user_tokens` UUID bug pre-existente bloquea el registro completo

### Próximos Pasos
1. ~~PRP fixes~~ ✅
2. Investigar CORS 405 en register (`auth_middleware.py` ordering en `main.py`)
3. Fix pre-existente `user_tokens` UUID type mismatch
4. Commit + merge `feature/oauth-backend-callbacks` → `main`
5. Sprint siguiente (marketplace/SaaS features)

---

## Sesiones Recientes

### 2026-03-02 — OAuth Complete + Code Review + PRP
Ver: `HANDOFF` (memory) para detalles completos

**Logros**:
- OAuth flow confirmado funcional
- Fixes commiteados (fff0c24): UUID type, cookie encoding, Pydantic models, TypedDict
- Bug descubierto: `.gga` y `AGENTS.md` faltaban en feature branch
- Code review Sprint 1-2: 5 críticos + 5 importantes identificados
- PRP generado: `PRPs/code-review-fixes-sprint1-2.md`

**Fix crítico más urgente**: `auth_middleware.py` lee JWT del `Authorization` header
en vez del cookie `access_token` → todos los endpoints protegidos están rotos

### 2026-03-01 — SameSite Fix + Unit Tests
- SameSite=Strict → Lax (commit f726795)
- Tests OAuth: 23/23 unit ✅, 11/11 integration ✅

### 2026-02-26 — Sprint 3-4 E2E Tests 100%
- 67/67 E2E tests passing
- Organizations, Teams, Wallet completos

---

## Convenciones Establecidas

### Cookie Pattern (Backend → Frontend)
- Backend: `quote(model_dump_json())` — URL-encode el JSON
- Frontend middleware: strip outer `"` + `decodeURIComponent()` antes de `JSON.parse()`
- Razón: Python SimpleCookie wrappea URLs en comillas dobles RFC 6265

### GGA en Feature Branches
Si GGA falla con "No provider configured":
```bash
git show main:.gga > .gga && git show main:AGENTS.md > AGENTS.md
```
Estos archivos NO se commitean (son config local).

### ESLint en pre-commit
Comentado en `.pre-commit-config.yaml`. Errores pre-existentes en Sprint 3-4
(teams/page.tsx, org/page.tsx, MemberForm.tsx). Fix pendiente.

---

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `apps/api/src/prosell/infrastructure/api/middleware/auth_middleware.py` | JWT verify — **ROTO: lee header no cookie** |
| `apps/api/src/prosell/infrastructure/api/routers/auth_router.py` | Auth endpoints completos |
| `apps/web/src/middleware.ts` | Route protection Edge Runtime |
| `apps/web/src/stores/authStore.ts` | Zustand auth state |
| `apps/web/src/lib/api/authApi.ts` | API client |
| `PRPs/code-review-fixes-sprint1-2.md` | PRP con 10 fixes pendientes |

---

## Test Status General

| Suite | Estado |
|-------|--------|
| Backend total | 309/315 (6 org failures pre-existentes) |
| OAuth unit | 23/23 ✅ |
| OAuth integration | 11/11 ✅ |
| E2E (Sprint 3-4) | 67/67 ✅ |
