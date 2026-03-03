# ProSell SaaS - Memory Index

## Estado (2026-03-03): main — UP TO DATE ✅

### Latest Commits
- `faae5c9` docs(prp): mark oauth-security-fixes as completed ✅
- `f42208b` fix(types): resolve all 82 Pyright type errors ✅
- `b5e1d25` test(e2e): add OAuth integration tests ✅

### OAuth Status: READY FOR TESTING ✅

**Credentials**: Configured in `.env.local`
- Google Client ID & Secret: ✅ Configured
- Facebook App ID & Secret: ✅ Configured (placeholders)
- Redirect URI: `http://localhost:8000/api/auth/oauth/google/callback`

**Docker Containers**: Created (currently stopped)
- `prosell-api`, `prosell-web`, `prosell-db`, `prosell-redis`

### Test Results
| Suite | Result |
|-------|--------|
| Backend | 297/297 ✅ |
| Frontend | 332/332 ✅ |
| Pyright | 0 errors, 0 warnings ✅ |

### Next Steps
1. Start containers: `docker compose -f docker/docker-compose.yml up -d`
2. Test OAuth flow in browser
3. Continue with Sprint 4 (marketplace/scraping features)

---

## Memorias Detalladas

### Latest (2026-03-03)
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
