# Session: OAuth Callback Fix & Migration Bug — 2026-03-04

## Problema Investigado
OAuth callback redirect loop: después de autenticar con Google, usuario terminaba en `/auth/login` en vez de `/dashboard`.

## Root Cause (confirmado via /tmp/api.log)

```
ConnectionRefusedError: [Errno 111] Connection refused
  File "...auth_router.py", line 402, in oauth_callback
    login_result = await oauth_use_case.execute(oauth_uc_request)
  File "...oauth_login.py", line 34, in execute
    existing_user = await self.user_repository.get_by_oauth(...)
```

**Causa**: PostgreSQL no estaba corriendo → `get_by_oauth()` falla → generic exception handler → redirect a `auth/login?error=internal_error`.

## Migration Bug Encontrado y Corregido

### Archivo corregido
`apps/api/alembic/versions/20260222_0000-2a3b4c5d6e7f_organizations_teams_wallet_schema.py`

### Bug
- Creaba `organizations`, `wallets`, `teams`, `team_members` con `sa.String()` (VARCHAR)
- Columnas que referencian `users.id` (que es UUID desde la migración inicial) tenían tipo VARCHAR
- PostgreSQL rechazaba las FK constraints por type mismatch: `character varying` ≠ `uuid`
- También tenía `index=True` duplicado en `wallet_transactions.created_at` + `op.create_index` explícito

### Fix Aplicado
- Todos los UUIDs cambiados de `sa.String()` → `sa.Uuid()`:
  - Columnas PK: `id` en organizations, wallets, wallet_transactions, teams, team_members
  - `tenant_id` en organizations, wallets, wallet_transactions, teams, team_members
  - FKs a users.id: `organizations.verified_by`, `team_members.user_id`
  - FKs entre tablas: `wallets.org_id`, `wallet_transactions.wallet_id`, `teams.org_id`, `teams.parent_team_id`, `team_members.team_id`
  - `organizations.wallet_id`
- Removido `index=True` de `wallet_transactions.created_at` (duplicaba el `op.create_index`)

## Migraciones Aplicadas
Las 3 migraciones pendientes ahora corren exitosamente:
1. `d1823b89fecb → 2a3b4c5d6e7f` (Organizations, Teams, Wallet schema) ✅
2. `2a3b4c5d6e7f → a1b2c3d4e5f6` (Convert String IDs to UUID) ✅
3. `a1b2c3d4e5f6 → 57b3e7cdea3c` (Convert oauth_accounts, sessions, user_tokens to UUID) ✅

DB ahora en HEAD. 12 tablas presentes.

## Estado de Servicios al Cierre

| Servicio | Estado | Puerto |
|----------|--------|--------|
| prosell-db (Docker) | Running healthy | 5432 |
| prosell-redis (Docker) | Running healthy | 6379 |
| FastAPI backend | Running | 8000 |
| Next.js frontend | Running | 3000 |

### Comandos para reiniciar
```bash
# Docker (si no están corriendo)
docker start prosell-db prosell-redis

# Backend (desde apps/api)
source .venv/bin/activate
fastapi dev src/prosell/infrastructure/api/main.py --reload --port 8000 > /tmp/api.log 2>&1 &

# Frontend (desde apps/web)
pnpm dev > /tmp/web.log 2>&1 &
```

## Verificación OAuth Authorize
`GET http://localhost:8000/api/auth/oauth/google/authorize` → 302 a Google ✅

## Próximo Paso Pendiente
Probar el OAuth flow completo en navegador:
1. `http://localhost:3000/auth/login`
2. Click "Continue with Google"
3. Autenticarse con Google
4. Verificar redirect a `/dashboard` (ya debería funcionar con DB corriendo)

## Pattern Learned
- Alembic migrations con `index=True` en columna + `op.create_index()` explícito → DuplicateTableError
- FK constraints entre VARCHAR y UUID fallan en PostgreSQL aunque el ORM las acepte
- Siempre verificar logs de backend (`/tmp/api.log`) antes de asumir bugs de cookies/middleware
