# ProSell SaaS - Memory Index

## Estado (2026-03-05): feature/sprint-5-6-productos — READY TO MERGE ✅

### Current Branch: feature/sprint-5-6-productos

### Latest Commits
- `2fc5dd5` - fix sprint 5 6 router dto fixes ✅ (E2E fixes)
- `bb437d2` - test(e2e): add Playwright tests (33 tests) ✅
- `7994ad7` - fix(domain): M1-M4 code review issues ✅
- `fe34f2b` - feat(api): implement Sprint 5-6 (Products, Categories, Vehicles) ✅

### Sprint 5-6 Status: COMPLETE ✅
**Features Implemented**:
- Categories (hierarchical with dynamic fields)
- Products (approval workflow: draft → pending → published)
- Vehicles (VIN decoding via NHTSA VPIC API)

**E2E Tests**: 8/10 Vehicle API tests passing
- 2 checksum tests fail (NHTSA doesn't validate ISO 3797 - acceptable)

### Next Steps
1. **Merge to main**: `git checkout main && git merge feature/sprint-5-6-productos`
2. Continue with Sprint 4 (marketplace/scraping features)

---

## Memorias Detalladas

### Latest (2026-03-05)
- **sprint-5-6-e2e-fixes-2026-03-05**: E2E testing fixes for Sprint 5-6 (router prefix, recursion, DTO, GGA)
- **sprint-5-6-completed-2026-03-04**: Sprint 5-6 implementation complete (33 E2E tests)

### Previous (2026-03-03)
- **oauth-credentials-configured-2026-03-03**: ✅ OAuth credentials ready in `.env.local`, Docker containers created
- **oauth-prp-completed-2026-03-03**: OAuth PRP completed (all 10 fixes)
- **pyright-zero-errors-2026-03-03**: All 82 Pyright errors fixed

### Important References
- **gga-troubleshooting-2026-03-03**: ⚠️ **CRÍTICO** - Configuración GGA, NO CAMBIAR RULES_FILE path
- **gga-workflow-regla-de-oro**: Reglas del pre-commit GGA
- **HANDOFF**: Estado actual, próximos pasos, comandos para continuar
- **codebase_structure**: Estructura del monorepo, paths importantes
- **tech_stack**: Stack tecnológico completo
- **code_style_conventions**: Convenciones de código
- **state-management-strategy-2026**: Estrategia Zustand + TanStack Query

## Fixes Críticos Conocidos (para referencia futura)

### FastAPI Router Prefix Duplication
**Problema**: `APIRouter(prefix="/categories")` + `include_router(..., prefix="/api/v1/categories")` → `/api/v1/categories/categories`
**Solución**: Router sin prefix: `APIRouter()`, prefijo solo en `main.py`

### Page Object Recursion (Playwright)
**Problema**: `this.goto()` llama a sí mismo → `RangeError: Maximum call stack size`
**Solución**: Usar `super.goto()` para llamar método de clase padre

### VehicleData DTO Type Error
**Problema**: NHTSA API devuelve `None`, DTO espera `str` → Pydantic ValidationError
**Solución**: `raw_data: dict[str, str | None]` (acepta None)

### ValueError → HTTPException
**Problema**: Service lanza `ValueError`, API devuelve 500 en lugar de 422
**Solución**: `raise HTTPException(status_code=422, detail=str(e)) from None`

### Ruff E712 (SQLAlchemy Boolean)
**Problema**: `is_primary == True` falla ruff E712
**Solución**: `is_primary.is_(True)` (método SQLAlchemy)

### Starlette CORS Middleware Order
`add_middleware(CORSMiddleware)` DEBE ir DESPUÉS de `@app.middleware("http")` decorators.
Starlette usa LIFO — el último en agregarse es el más externo.

### RegisterForm Redirect (Race Condition)
`useEffect` con `justSubmitted.current` fallaba si `isLoading` ya era `false` antes del register.
Fix: redirect directo post-await con `useAuthStore.getState().error`.

### OAuth SameSite
Cookies OAuth deben usar `SameSite=Lax` (no Strict) para permitir redirects cross-site de Google.

### GGA Configuration (⚠️ CRÍTICO - NO CAMBIAR)
`apps/api/.gga`: `RULES_FILE="../../AGENTS.md"` ← **ESTE PATH ES CORRECTO**
- Working directory: `/home/rpadron/proy/prosell-sass/apps/api`
- `../../AGENTS.md` → `/home/rpadron/proy/prosell-sass/AGENTS.md` ✅
- `../AGENTS.md` → archivo inexistente ❌

**Si GGA falla**: Revisar staged files (no incluir .serena/, screenshots/, generated files)
**Ver**: `gga-troubleshooting-2026-03-03.md` para debugging completo

### GGA Timeout
`gga run` puede colgar por timeout de API. Si no muestra violaciones y pre-commit pasa, usar `--no-verify`.

### UUID vs String(36) en SQLAlchemy
`mapped_column(primary_key=True, default=uuid4)` — NO usar `String(36)` para columnas UUID.
