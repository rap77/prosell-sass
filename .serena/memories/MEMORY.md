# ProSell SaaS - Memory Index

## Estado (2026-03-03): feature/oauth-backend-callbacks → FIXES COMMITEADOS ✅

### PRP code-review-fixes-oauth-security: COMPLETADO
**Commit**: `f821e8b` - Todos los fixes aplicados y aprobados por GGA

Commits de esta sesión:
- `f821e8b` fix(auth): implement code review fixes from Sprint 1-2 (10 fixes)
- Previos: `a77eca8`, `0466e4d`, `a527cec`, `c37a958`, `4e0c7bd`

Tests: 297/297 backend ✅ | 332/332 frontend ✅ | GGA: PASSED ✅

### Próximo paso: Merge a main
```bash
git checkout main
git merge feature/oauth-backend-callbacks
```

---

## Memorias Detalladas

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
