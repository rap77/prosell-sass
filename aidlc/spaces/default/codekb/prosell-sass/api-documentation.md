# API Documentation — ProSell SaaS

## Superficie de API — resumen

| Capa                         | Ubicación                                             | Cantidad                                                                            | Protocolo             |
| ---------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------- |
| FastAPI REST (backend real)  | `apps/api/src/prosell/infrastructure/api/routers/`    | **30 módulos de router**, los 30 wireados en `main.py` (1 env-gated: `test_router`) | HTTP/JSON             |
| Middleware FastAPI           | `apps/api/src/prosell/infrastructure/api/middleware/` | 4 archivos                                                                          | request pipeline      |
| Next.js BFF proxy (frontend) | `apps/web/src/app/api/{auth,v1}/**/route.ts`          | **31 archivos de ruta**                                                             | HTTP/JSON (proxy)     |
| Middleware Next.js           | `apps/web/src/proxy.ts`                               | 1 archivo                                                                           | routing/auth-redirect |

Conteos verificados por listado directo de archivos y por conteo de `app.include_router(...)` en `main.py` este pase (corrige un conteo previo de "31 módulos / 30 wireados" — el número real de módulos de router es 30, y los 30 están wireados, uno de ellos condicionado por entorno).

## FastAPI REST — backend (`apps/api`)

**30 módulos de router** bajo `infrastructure/api/routers/`:

| Router                              | Dominio                                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `admin_organizations_router.py`     | Administración de organizaciones (plataforma)                                                                                                                                                                      |
| `admin_router.py`                   | Operaciones de administración general                                                                                                                                                                              |
| `appointment_router.py`             | Citas comprador↔vendedor                                                                                                                                                                                           |
| `auth_router.py`                    | Login/registro/OAuth/2FA/tokens                                                                                                                                                                                    |
| `branch_router.py`                  | Sucursales de organización                                                                                                                                                                                         |
| `category_inference_router.py`      | Inferencia de categoría/atributos                                                                                                                                                                                  |
| `category_router.py`                | Taxonomía de categorías + `attribute_schema`                                                                                                                                                                       |
| `facebook_router.py`                | Integración Facebook (general)                                                                                                                                                                                     |
| `fb_account_router.py`              | Cuentas Facebook conectadas                                                                                                                                                                                        |
| `fb_credential_migration_router.py` | Migración de credenciales Facebook                                                                                                                                                                                 |
| `fb_sync_router.py`                 | Sincronización de estado con Facebook — `unpublish_callback` valida `_get_active_fb_account` y hace `db.commit()` explícito dentro del handler (comportamiento válido en producción, ver nota de test infra abajo) |
| `health_router.py`                  | Health check (wireado, aunque `/health` y `/` también se definen directo en `main.py`)                                                                                                                             |
| `image_router.py`                   | Gestión de imágenes de producto                                                                                                                                                                                    |
| `lead_router.py`                    | Leads (incluye los sincronizados desde Facebook)                                                                                                                                                                   |
| `marketplace_access_router.py`      | Control de acceso a publicación en marketplace                                                                                                                                                                     |
| `notification_router.py`            | Notificaciones                                                                                                                                                                                                     |
| `org_router.py`                     | Organización (CRUD, perfil)                                                                                                                                                                                        |
| `org_verticals_router.py`           | Verticales de categoría por organización                                                                                                                                                                           |
| `product_router.py`                 | Producto (inventario, ciclo de vida de estado, cola de revisión)                                                                                                                                                   |
| `public_product_router.py`          | Catálogo público (marketplace)                                                                                                                                                                                     |
| `publisher_router.py`               | Publicación a Facebook Marketplace (Graph API / Playwright)                                                                                                                                                        |
| `team_router.py`                    | Equipos/miembros de organización                                                                                                                                                                                   |
| `test_cleanup_router.py`            | **No wireado en ningún punto del código** — ver nota de seguridad abajo                                                                                                                                            |
| `test_router.py`                    | Utilidades de testing — wireado SOLO si `settings.environment in ["development", "testing"]`                                                                                                                       |
| `user_branch_router.py`             | Asignación usuario↔sucursal                                                                                                                                                                                        |
| `user_router.py`                    | Usuarios                                                                                                                                                                                                           |
| `vehicle_router.py`                 | Vertical vehículos (VIN decode, atributos específicos)                                                                                                                                                             |
| `vendedor_router.py`                | Vendedor/dealer                                                                                                                                                                                                    |
| `wallet_router.py`                  | Wallet / saldo por organización                                                                                                                                                                                    |
| `webhook_router.py`                 | Webhooks entrantes                                                                                                                                                                                                 |

### Nota de seguridad — endpoints de testing (resuelto este pase, corrige el open question planteado)

El scan del developer marcó como pendiente de verificar el gating de entorno de `test_router.py` y `test_cleanup_router.py`. Este pase lo verificó directamente sobre `main.py`:

- **`test_router.py`**: SÍ está wireado, y SÍ está gateado por entorno — `if settings.environment in ["development", "testing"]: app.include_router(test_router, prefix="/api/v1", tags=["Test Utilities"])`. En producción (`environment` distinto de esos dos valores) sus endpoints no se registran.
- **`test_cleanup_router.py`** (480 líneas): **no aparece referenciado en ningún lugar del código** — ni en `main.py`, ni en ningún otro módulo bajo `apps/`, `tests/` o `docker/` (verificado por búsqueda exhaustiva de texto sobre esos árboles). Es un archivo huérfano / dead code: define un router de FastAPI que nunca se monta en la aplicación, por lo que sus endpoints no son alcanzables en ningún entorno, incluida producción. No es un riesgo de exposición activo, pero sí deuda de código muerto — candidato a eliminar o a wirear intencionalmente si el propósito (limpieza de datos de test) sigue siendo necesario.

### Endpoints inventariados a nivel de contrato — scan enfocado `260830-ci-fixes-round2`

Este pase profundizó (más allá del registro/nombre) sobre los endpoints de cinco áreas puntuales, sin re-escanear el resto de los 30 routers a este nivel de detalle:

| Endpoint                                                                                                                                                                                      | Método    | Permiso/auth                   | Notas                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/products/batch/approve`                                                                                                                                                              | POST      | requiere `MARKETPLACE_PUBLISH` | Batch review — aprobación masiva                                                                                                                                                                                                                                                                                                                                                                    |
| `/api/v1/products/batch/reject`                                                                                                                                                               | POST      | requiere `MARKETPLACE_PUBLISH` | Batch review — rechazo masivo                                                                                                                                                                                                                                                                                                                                                                       |
| `/api/v1/products/bulk-upload/preview`                                                                                                                                                        | POST      | auth de sesión                 | Dry-run: `form-data(organization_id?, category_id, csv_file)`, no escribe DB, reporta `summary.missing_org_codes`; **no** envuelve `execute()` en `try/except ValueError`                                                                                                                                                                                                                           |
| `/api/v1/products/bulk-upload/with-images`                                                                                                                                                    | POST      | auth de sesión                 | `form-data(organization_id?, category_id, csv_file, images_zip?)`, upsert por VIN; **no** envuelve `execute()` en `try/except ValueError` (asimetría frente a `/brokers`/`/ownership`)                                                                                                                                                                                                              |
| `/api/v1/appointments`                                                                                                                                                                        | POST, GET | auth de sesión                 | Crear / listar citas                                                                                                                                                                                                                                                                                                                                                                                |
| `/api/v1/appointments/{id}`                                                                                                                                                                   | GET, PUT  | auth de sesión                 | Detalle / edición                                                                                                                                                                                                                                                                                                                                                                                   |
| `/api/v1/appointments/{id}/status`                                                                                                                                                            | PUT       | auth de sesión                 | Cambio de estado                                                                                                                                                                                                                                                                                                                                                                                    |
| `/api/v1/fb-sync/unpublish-callback`                                                                                                                                                          | POST      | `X-Bot-Token`                  | Bot→backend; rama `"failed"` cappea `attempt_count` a `MAX_UNPUBLISH_ATTEMPTS=3` sin asignar `status` explícito (depende de `server_default="queued"`)                                                                                                                                                                                                                                              |
| `/api/v1/fb-sync/pending`                                                                                                                                                                     | GET       | `X-Bot-Token`                  | Bot→backend, lista requests pendientes                                                                                                                                                                                                                                                                                                                                                              |
| `create_migration_authorization` / `approve_migration_authorization` / `poll_migration_authorization` / `create_migration_token` / `import_credentials` (`fb_credential_migration_router.py`) | —         | —                              | **Estructura solamente — contenido no accesible por política de permisos local** (`.claude/settings.local.json` deniega Read/Bash sobre rutas con "credential"). Solo se conocen nombres de endpoint y modelos asociados (`FBCredentialMigrationAuthorizationModel`/`FBCredentialMigrationTokenModel`, `TokenEncryptionService` Fernet) vía graphify — no verificados contra el código fuente real. |

### Convenciones confirmadas

- Los updates de estado **siempre** van en el body JSON, nunca en query params.
- El `tenant_id` se resuelve **siempre** del JWT, nunca del body — mitigación explícita de IDOR.
- Auth: JWT + OAuth2 + TOTP (2FA), cookies httpOnly (`access_token`, `refresh_token`), reforzado por middleware en capas: `auth_middleware.py` (autenticación), `rbac_middleware.py` (autorización por rol), `rate_limit_middleware.py` (throttling), `exception_handlers.py` (manejo centralizado de errores por dominio).
- No se leyó en este pase el contenido interno de cada router endpoint por endpoint (skimmed a nivel de nombre/registro salvo `main.py` para conteo/wiring) — un futuro pase de `functional-design`/`contract-design` que necesite el catálogo endpoint-por-endpoint debe re-escanear `infrastructure/api/routers/` a profundidad.

## Next.js BFF Proxy — frontend (`apps/web`)

**31 archivos de ruta** bajo `app/api/{auth,v1}/**/route.ts`, divididos en dos grupos:

**`api/auth/*`** (9 endpoints) — route handlers nativos de Next.js con lógica propia de cookies, no proxies puros: `forgot-password`, `login`, `logout`, `me`, `refresh`, `register`, `reset-password`, `state`, `verify-email`.

**`api/v1/*`** (22 archivos) — proxies pass-through hacia el backend FastAPI:

```
api/v1/auth/2fa/disable/route.ts
api/v1/auth/change-password/route.ts
api/v1/categories/route.ts
api/v1/categories/[...path]/route.ts
api/v1/org/route.ts
api/v1/org/[id]/route.ts
api/v1/org/me/route.ts
api/v1/organizations/[...path]/route.ts
api/v1/products/route.ts
api/v1/products/[...path]/route.ts
api/v1/products/bulk-upload/preview/route.ts
api/v1/products/bulk-upload/with-images/route.ts
api/v1/teams/route.ts
api/v1/teams/[id]/route.ts
api/v1/teams/org/[orgId]/route.ts
api/v1/users/me/route.ts
api/v1/vehicles/route.ts
api/v1/vehicles/[...path]/route.ts
api/v1/wallet/route.ts
api/v1/wallet/[id]/route.ts
api/v1/wallet/org/[orgId]/route.ts
api/v1/wallet/org/[orgId]/transactions/route.ts
```

Los segmentos catch-all (`[...path]/route.ts` en `categories`, `organizations`, `products`, `vehicles`) reenvían sub-rutas arbitrarias hacia el router FastAPI equivalente.

Además, un middleware propio `apps/web/src/proxy.ts` resuelve el matching de rutas y las redirecciones de auth antes de llegar a cualquier route handler, con tablas `PROTECTED_ROUTES`/`PUBLIC_ROUTES`/`AUTH_REDIRECT_ROUTES`. Delega la derivación de rol a `apps/web/src/lib/auth/deriveRole.ts`, compartida con `authStore.ts` — ver `architecture.md` § Interaction Diagrams.

### OAuth externo — redirect directo del navegador (NO es endpoint interno Next.js)

El login/registro con OAuth (Google, Microsoft) **no** pasa por una ruta BFF de Next.js para el paso de autorización: `LoginPageContent.tsx`/`RegisterPageContent.tsx` disparan `window.location.href` directo hacia el backend FastAPI:

```
${NEXT_PUBLIC_API_URL}/api/auth/oauth/{google,microsoft}/authorize
```

Es una navegación de navegador completa, no un fetch/XHR. El callback OAuth y el seteo de cookies httpOnly ocurren enteramente en el backend; el frontend solo retoma control cuando el navegador vuelve a una ruta protegida y `proxy.ts` evalúa la sesión. Ver `architecture.md` § Interaction Diagrams para el flujo completo — los 5 supresores de ESLint que originalmente rodeaban este patrón fueron eliminados en el intent `260829-auth-navigation-refactor` extrayendo la construcción de URL a una función nombrada.

### ⚠️ Defecto conocido — `response.json()` sin verificación de `content-type`

Los proxies **catch-all** dinámicos de `categories`, `organizations`, `products` y `vehicles` fuerzan `response.json()` sobre **toda** respuesta del backend, sin comprobar el header `content-type` primero.

**Impacto**: cualquier endpoint del backend que devuelva un content-type distinto de JSON (CSV de export, descarga de archivo, etc.) rompe al pasar por estos proxies.

**Historial del mismo patrón de bug**: memoria del proyecto documenta un caso hermano ya arreglado — el header `If-Match` era descartado silenciosamente por estos mismos proxies, rompiendo los 4 endpoints de "deshacer" (`reverse`/`resubmit`/`restore`/`revert-sale`) cuando se usaban desde navegador real (fix verificado en vivo con chrome-devtools MCP). El defecto de `content-type` es el mismo patrón de raíz (proxy que asume una forma fija de respuesta) sin arreglar aún.

**Regla operativa activa** (`project.md`): antes de agregar un endpoint que devuelva un content-type distinto de JSON, auditar el proxy correspondiente.

## Cliente API frontend (`apps/web/src/lib/api/`)

- Cada módulo consume el proxy BFF correspondiente, nunca llama directo a `apps/api`.
- Esquemas Zod-mirror (`apps/web/src/lib/api/schemas/`) espejan 1:1 los DTOs Pydantic del backend (regla zero-tolerance "cero `as X` sin validar sobre respuestas de backend"). Puntos de fricción documentados:
  - Campos `Optional[X]` de Pydantic serializan a `null` en JSON — el mirror debe usar `.nullable().optional()`, nunca solo `.optional()` (bug histórico: `decode-vin` schema mismatch).
  - Estado de migración Zod 3→4: el paquete instala `zod: ^4.4.0` pero el código sigue en estilo Zod 3 (`.passthrough()` confirmado en 11 archivos de `lib/api/schemas/` este pase; aprendizaje previo cita 41+ ocurrencias en todo el repo). Migración completa trackeada aparte en el intent `260828-zod-3-to-4-migration`, **fuera de alcance de este documento**.

## Externas consumidas

- **Facebook Graph API** — OAuth + publicación/sincronización oficial (`facebook_graph_api_client.py`, `facebook_marketplace_oauth_service.py`).
- **Facebook Marketplace vía Playwright** — automatización de navegador como estrategia de publicación alternativa (`playwright_publisher.py`), no scraping de terceros.
- **NHTSA VIN decoder** — decodificación de VIN para la vertical vehículos (`nhtsa_vin_service.py`, `nhtsa_normalizer.py`).
- **fueleconomy.gov** — datos de eficiencia de combustible (`fueleconomy_service.py`).
- **DigitalOcean Spaces (boto3)** — almacenamiento de imágenes (`do_spaces_service.py`).
- **Resend** — envío de email transaccional (`services/email/`).
- **Stripe** y **Anthropic SDK** — declarados como dependencias backend (`stripe>=11.0.0`, `anthropic>=0.40.0`) pero **sin ningún import en el código fuente** verificado este pase — no hay integración activa confirmada, ver `dependencies.md`.

### Nota de test infra — `unpublish_callback` (`fb_sync_router.py`) y el fixture `shared_session` (scan enfocado `260830-ci-seed-data`)

No es un defecto del endpoint ni de su contrato — el handler `unpublish_callback` llama `db.commit()` explícitamente, patrón válido en producción porque `get_async_session` crea una sesión nueva por request. El problema es un patrón de fixture de test (`shared_session` en `test_fb_sync_router.py`, replicado en `apps/api/tests/integration/bulk_upload/conftest.py`) que mapea una única sesión compartida como override de `get_async_session` — ese `commit()` cierra la transacción externa del fixture y rompe cualquier segunda llamada al endpoint en el mismo test. Ver `architecture.md` § Interaction Diagrams para el detalle completo.

## Contratos internos no cubiertos en profundidad este pase

- Contenido detallado de los 30 módulos de router (endpoint por endpoint, request/response shape) — solo registro/nombre/wiring, no catálogo exhaustivo.
- Cuerpos de los use cases de `application/` — no leídos a nivel de firma en este pase.
- Cuerpos individuales de las 31 rutas BFF más allá del patrón `[...path]/route.ts` ya conocido y del bug de `content-type` ya documentado.

Un futuro pase de `functional-design` o `contract-design` que necesite especificar contratos exactos endpoint-por-endpoint debe re-escanear `apps/api/src/prosell/infrastructure/api/routers/` y `apps/web/src/app/api/` a profundidad completa.

**Gap de permisos confirmado (`260830-ci-fixes-round2`)**: `fb_credential_migration_router.py` y su test (`test_fb_credential_migration_router.py`) no pudieron leerse en este pase — `.claude/settings.local.json` tiene `"deny": ["Read(**/*credential*)"]`, que bloquea tanto `Read` como `Bash` (cat/bat/rg) sobre cualquier ruta que contenga "credential". Es un límite de permisos real del entorno local, no un bug de la herramienta. Un futuro scan que necesite cubrir este router a profundidad requiere ajustar esa regla de `deny` o ejecutarse desde un entorno sin esa restricción.
