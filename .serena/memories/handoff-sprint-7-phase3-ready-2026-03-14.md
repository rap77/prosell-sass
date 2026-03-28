# Handoff: Sprint 7 Phase 3 Ready (2026-03-14)

## Estado al final de la sesión

**Branch**: `main`
**Último merge commit**: `cd2d6ee` — feat(sprint-7): merge Phase 2 - Facebook Marketplace OAuth integration

---

## Lo que se hizo en esta sesión

### 1. Tech Debt Mitigations (COMMITEADO ✅)
- Split `disconnect_account.py` → 3 archivos separados:
  - `list_accounts.py` (ListFacebookAccountsUseCase)
  - `fetch_pages.py` (FetchPagesUseCase)
  - `set_default_page.py` (SetDefaultPageUseCase)
- SQLAlchemy echo: solo activo en `environment == "development"` (no testing/prod)
- Fix ruff ARG002: `_threshold` → `threshold  # noqa: ARG002`
- Imports actualizados en dependencies.py, facebook_router.py, tests

### 2. Roadmap (COMMITEADO ✅)
- Agregado Sprint 9: `Asignar tenant_id en OAuth users | P1 | 1 día`
- Nota de deuda técnica en `docs/ROADMAP-PROSELL-SAAS-V3-PIVOT.md`

### 3. E2E Tests Fix (COMMITEADO ✅)
- Corregido path incorrecto en 3 lugares:
  - `/facebook/pages/{page_id}/set-default` → `/facebook/accounts/{account_id}/pages/{page_id}/set-default`
- 21/21 E2E tests pasando

### 4. Documentación (COMMITEADO ✅)
- Creado `docs/facebook-oauth-setup.md`:
  - Setup en Facebook Developers Console
  - Variables de entorno con placeholders
  - Flujo OAuth completo
  - Tabla de endpoints
  - Cron para token refresh
  - Seguridad y troubleshooting

### 5. Code Review → Fixes de Seguridad (COMMITEADO ✅)
- **FetchPagesUseCase**: agregado ownership check (`seller_user_id` verification)
  - Antes: cualquier usuario autenticado podía ver páginas de cualquier cuenta
  - Ahora: verifica que `account.seller_user_id == seller_user_id`
  - DI actualizado: inyecta `account_repository` en `FetchPagesUseCase`
  - 2 nuevos tests: wrong owner raises, account not found raises
- **Docs**: reemplazado App ID real (926649056406716) con placeholder
- **Docs**: reemplazada URL ngrok personal con placeholder genérico
- **Docs**: corregido `FACEBOOK_APP_SECRET` → `FACEBOOK_OAUTH_APP_SECRET`

### 6. Merge a Main (COMPLETADO ✅)
- Merge `feature/sprint-7-phase2-facebook-oauth` → `main`
- Branch eliminado
- 446/446 tests passing en main

---

## Estado de Tests

```
446 passed, 1 skipped, 6 warnings
```

- Unit Tests Facebook: 16/16 (14 originales + 2 nuevos para ownership)
- Integration Tests Facebook: 7/7
- E2E Tests Facebook: 21/21
- Total backend: 446

---

## Sprint 7 Progress

| Phase | Estado |
|-------|--------|
| Phase 1: Task Queue + i18n | ✅ COMPLETADO (mergeado) |
| Phase 2: Facebook OAuth | ✅ COMPLETADO (mergeado hoy) |
| Phase 3: Graph API + Playwright | ⬜ SIGUIENTE |
| Phase 4: Scraping | ⬜ PENDIENTE |
| Phase 5: Dashboards | ⬜ PENDIENTE |
| Phase 6: AI Assistant | ⬜ PENDIENTE |
| Phase 7: Integration | ⬜ PENDIENTE |

---

## Próxima sesión: Sprint 7 Phase 3

**PRP disponible**: `PRPs/sprint-7-phase3-graphapi-playwright-prp.md`

### Qué implica Phase 3:
- **Facebook Graph API**: publicar vehículos en Marketplace usando las páginas conectadas en Phase 2
- **Playwright scraping**: scraper para Facebook Marketplace (obtener listings existentes)
- Usa las `FacebookPage` entities ya implementadas como punto de entrada

### Comandos para arrancar:
```bash
# Verificar estado
git status
git log --oneline -5

# Iniciar servicios
docker start prosell-db prosell-redis

# Correr tests (asegurarse que todo verde)
cd apps/api && uv run pytest tests/unit/ tests/integration/ -q

# Leer el PRP de Phase 3
cat PRPs/sprint-7-phase3-graphapi-playwright-prp.md
```

---

## Decisión Pendiente

El reviewer de código flaggeó el test de rate limiting como vacuously true:
```typescript
expect(uniqueCodes.length).toBeGreaterThan(0);  // Siempre pasa
```
- **Opciones**: (a) eliminar el test, (b) hacerlo real con assertion de consistencia
- **Recomendación**: reemplazar con `expect(statusCodes.every(c => c === statusCodes[0])).toBeTruthy()`
- **Prioridad**: low — no bloquea Phase 3

---

## Archivos Clave de Phase 2 (referencia)

```
apps/api/src/prosell/
├── domain/entities/facebook_account.py
├── domain/entities/facebook_page.py
├── domain/exceptions/facebook_exceptions.py
├── domain/repositories/facebook_account_repository.py
├── domain/repositories/facebook_page_repository.py
├── application/use_cases/facebook/
│   ├── authorize_account.py
│   ├── oauth_callback.py
│   ├── disconnect_account.py
│   ├── list_accounts.py
│   ├── fetch_pages.py        ← ahora con ownership check
│   ├── set_default_page.py
│   └── refresh_token.py
├── infrastructure/services/
│   ├── facebook_marketplace_oauth_service.py
│   ├── token_encryption_service.py
│   └── redis_service.py
└── infrastructure/api/routers/facebook_router.py
```
