# Handoff: Sprint 7 Phase 2 - Tech Debt Mitigation (2026-03-14)

## Estado al final de la sesión

**Branch**: `feature/sprint-7-phase2-facebook-oauth`

**Último commit**: `56d0527` — feat(sprint-7): implement Facebook Marketplace OAuth integration (Phase 2)

---

## Lo que se hizo en esta sesión

### 1. GGA Fixes (COMMITEADO ✅)
Todo el Sprint 7 Phase 2 Facebook OAuth fue commiteado exitosamente con 10 GGA fixes:
- Defer FacebookOAuthService validation a first use
- Fix set_default_facebook_page path
- TaskiqResult → dict[str, object]
- Dead code en TokenEncryptionService eliminado
- Return types en require_permission/require_role
- Type hints en integration tests
- test_client fixture con async with
- response_model=None en callback endpoint
- Generator/AsyncGenerator type params
- E501 line splits

### 2. Tech Debt — EN PROGRESO (SIN COMMITEAR) ⚠️

**Fix A - SQLAlchemy echo (APLICADO, no commiteado)**
- Archivo: `apps/api/src/prosell/infrastructure/database/session.py`
- Cambio: `echo=settings.debug` → `echo=settings.debug and settings.environment == "development"`
- Estado: APLCIADO en working tree, sin stagear

**Fix B - Split disconnect_account.py (APLICADO, parcial)**
- Creados 3 nuevos archivos:
  - `apps/api/src/prosell/application/use_cases/facebook/list_accounts.py` ✅
  - `apps/api/src/prosell/application/use_cases/facebook/fetch_pages.py` ✅
  - `apps/api/src/prosell/application/use_cases/facebook/set_default_page.py` ✅
- `disconnect_account.py` limpiado (solo queda DisconnectFacebookAccountUseCase) ✅
- Imports actualizados en:
  - `dependencies.py` (TYPE_CHECKING + runtime) ✅
  - `facebook_router.py` ✅
  - `tests/unit/application/facebook/test_facebook_use_cases.py` ✅

**Tests status: 20/21 PASSING — 1 FAILING** ❌
- Failing: `TestRefreshTokenUseCase::test_refresh_no_expiring_accounts`
- Causa: `SimpleRepo.get_accounts_expiring_before(self, threshold: object)` tiene param `threshold`
  pero el código usa `_threshold` (o viceversa - hay inconsistencia)
- Fix: En `test_facebook_use_cases.py`, la clase `SimpleRepo` tiene el método con `threshold`
  pero ruff lo cambió a `_threshold`. El use case llama con keyword arg `threshold=`.
  **FIX NEEDED**: cambiar `_threshold` → `threshold` Y agregar `# noqa: ARG002` en la línea

```python
# ANTES (falla):
async def get_accounts_expiring_before(
    self, _threshold: object  # <-- ruff lo renombró
) -> list[FacebookAccount]:

# DESPUÉS (correcto):
async def get_accounts_expiring_before(
    self, threshold: object  # noqa: ARG002
) -> list[FacebookAccount]:
```

**Fix C - Roadmap Sprint 9 (PENDIENTE) ❌**
- Agregar en `docs/ROADMAP-PROSELL-SAAS-V3-PIVOT.md` Sprint 9:
  ```
  | Asignar tenant_id en OAuth users | P1 | 1 día | Organizaciones implementadas |
  ```
- Contexto: `tenant_id=None` en usuarios creados via OAuth → se rompe multi-tenancy
- Por qué Sprint 9: requiere que Organizaciones estén implementadas primero

---

## Próximos pasos al iniciar la nueva sesión

1. **Arreglar el test failing** (5 min):
   ```
   archivo: apps/api/tests/unit/application/facebook/test_facebook_use_cases.py
   buscar: _threshold: object
   reemplazar: threshold: object  # noqa: ARG002
   ```

2. **Agregar al roadmap Sprint 9** la tarea de tenant_id (en ROADMAP-PROSELL-SAAS-V3-PIVOT.md)

3. **Commitear todo**:
   ```bash
   cd apps/api && uv run pytest -q  # verificar todo verde
   cd ../..
   git add -u
   git add apps/api/src/prosell/application/use_cases/facebook/list_accounts.py
   git add apps/api/src/prosell/application/use_cases/facebook/fetch_pages.py
   git add apps/api/src/prosell/application/use_cases/facebook/set_default_page.py
   git commit  # GGA va a correr
   ```

4. **Decidir siguiente tarea**:
   - E2E tests (Playwright) para Facebook OAuth
   - Facebook Developers spike (real credentials)

---

## Archivos modificados (unstaged)

```
M  apps/api/src/prosell/infrastructure/database/session.py
M  apps/api/src/prosell/infrastructure/api/dependencies.py
M  apps/api/src/prosell/infrastructure/api/routers/facebook_router.py
M  apps/api/src/prosell/application/use_cases/facebook/disconnect_account.py
M  apps/api/tests/unit/application/facebook/test_facebook_use_cases.py
A  apps/api/src/prosell/application/use_cases/facebook/list_accounts.py
A  apps/api/src/prosell/application/use_cases/facebook/fetch_pages.py
A  apps/api/src/prosell/application/use_cases/facebook/set_default_page.py
```
