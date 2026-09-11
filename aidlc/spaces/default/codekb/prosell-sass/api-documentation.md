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
  - Estado de migración Zod 3→4 (recuento exacto confirmado por el scan enfocado del intent `260828-zod-3-to-4-migration`, corrige la estimación previa de "~41 call sites / 11 archivos"): el paquete instala `zod: ^4.4.0` desde 2026-07-20, pero el código sigue en estilo Zod 3 — **36 call sites de `.passthrough()` en 14 archivos** y **4 de `z.nativeEnum()` en 2 archivos** (`leads.ts`, `appointments.ts`). El issue GitHub #74 que `AGENTS.md` cita como bloqueante está **cerrado desde 2026-07-20** y su alcance nunca cubrió estos dos patrones (solo el idioma de mensaje de error `.min(n, "msg")`, ya migrado al 100%) — esta limpieza es alcance nuevo, no la continuación de #74. Sin cambio de superficie de API/contrato de wire — es sintaxis de validación interna, no toca este documento más allá de esta nota. Ver `dependencies.md` y `code-quality-assessment.md` para el detalle completo (fuera de alcance del resto de este documento).

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

## `orgApi` / `teamApi` — superficie completa (scan enfocado `260828-useeffect-to-react-query`)

Documentado a profundidad porque es la superficie que una futura capa de hooks (`useQuery`/`useMutation`) tendrá que envolver íntegra, no solo los métodos que hoy consumen `onboarding/page.tsx` e `invite/[token]/page.tsx`.

### `orgApi` (`apps/web/src/lib/api/orgApi.ts`) — 9 métodos

| Método              | Consumido hoy por                                                       | Notas                          |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| `create`            | (otro flujo, fuera de alcance)                                          | —                              |
| `list`              | (otro flujo, fuera de alcance)                                          | —                              |
| `getMyOrganization` | `onboarding/page.tsx` (dentro del `useEffect` de mount, `checkSetup()`) | Candidato directo a `useQuery` |
| `getById`           | (otro flujo, fuera de alcance)                                          | —                              |
| `update`            | `onboarding/page.tsx` (`handleStep1`, llamada imperativa por click)     | Candidato a `useMutation`      |
| `verify`            | (otro flujo, fuera de alcance)                                          | —                              |
| `reject`            | (otro flujo, fuera de alcance)                                          | —                              |
| `completeSetup`     | `onboarding/page.tsx` (llamada imperativa final, por click)             | Candidato a `useMutation`      |
| `suspend`           | (otro flujo, fuera de alcance)                                          | —                              |

Implementación: raw `fetch()` + `credentials: "include"`, clase `ApiError` propia y `handleResponse<T>()` propios (duplicados verbatim respecto a `teamApi.ts` — ver `code-quality-assessment.md`). **NO usa `fetchWithAuth`** — ninguna llamada de este módulo se beneficia del auto-refresh de sesión en 401 que sí tiene, por ejemplo, `notificationsApi.ts`.

### `teamApi` (`apps/web/src/lib/api/teamApi.ts`) — 6 métodos

| Método                  | Consumido hoy por                                                                                | Notas                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `acceptInvitation`      | `invite/[token]/page.tsx` (dentro del `useEffect` de mount — dispara una MUTACIÓN, no una query) | Candidato a `useMutation`; el branching de error de la página (string-match sobre `error.message` + `error.status === 401`) depende de que se preserve `ApiError` o un shape tipado equivalente |
| (5 métodos adicionales) | (otros flujos, fuera de alcance)                                                                 | Mismo patrón raw-fetch + `ApiError`/`handleResponse<T>` que `orgApi.ts`                                                                                                                         |

Misma implementación que `orgApi.ts`: raw `fetch()`, `ApiError`/`handleResponse<T>()` propios (duplicados), sin `fetchWithAuth`.

### Precedente de patrón — `notificationsApi.ts` (único caso de hooks React Query colocados en el módulo de API)

`useNotifications()` (query, `staleTime` 20s, `refetchInterval` 30s), `useMarkNotificationRead()`, `useMarkAllNotificationsRead()` (mutaciones, invalidan `NOTIFICATIONS_QUERY_KEY` en `onSuccess`). SÍ usa `fetchWithAuth`, pero lanza `new Error(...)` genérico en `!response.ok` — **descarta el detalle de error del backend**, un patrón que NO se puede copiar tal cual para envolver `teamApi.acceptInvitation` sin romper el branching de error de `invite/[token]/page.tsx`. `leads.ts` confirma la misma convención de hooks colocados en el módulo de API a mayor escala (`useLeads`, `useLead`, `useUpdateLeadStatus`, `useReassignLead`, `useLeadDuplicates`, `useLeadAuditTrail`, `useTeamMetrics`).

## `productSchema` — confirmación de contrato vigente (scan enfocado `260901-frontend-test-debt`)

`apps/web/src/lib/api/products.ts` mantiene el Zod-mirror del `Product` del backend. Este pase confirma, vía diff de commit + ejecución real de test, que `published_to_marketplace: z.boolean()` (requerido, sin `.optional()`) refleja correctamente `ProductModel.published_to_marketplace` (`nullable=False, default=False`) — **no hay drift de contrato**, el backend siempre envía el campo. El único problema es que dos suites de test (`products.test.tsx`, `reverseTransitions.test.tsx`) construyen mocks de `Product` que datan de antes de que el commit `7315fdf2` (2026-08-22) volviera requerido este campo — ver `code-quality-assessment.md` y `code-structure.md` para el detalle línea por línea. Las 4 transiciones de "deshacer" documentadas en memoria del proyecto (`reverse`/`resubmit`/`restore`/`revert-sale`, expuestas como `useReverseProduct`/`useResubmitProduct`/`useRestoreProduct`/`useRevertSaleProduct` + `postReverseTransition`) son exactamente lo que `reverseTransitions.test.tsx` ejercita.

### Triangulación de manejo de errores en esta área — tres formas incompatibles

1. **`ApiError`** (clase, `orgApi.ts`/`teamApi.ts`) — preserva `status` + `message` del backend; es lo que `invite/[token]/page.tsx` necesita para su branching.
2. **`Error` genérico** (`notificationsApi.ts`) — descarta el detalle del backend.
3. **`extractErrorMessage.ts`** (zod-matcher sobre el body de respuesta) — tercer enfoque, usado en otra parte del cliente API.

Esta triangulación es evidencia directa a favor de la convención de equipo ya afirmada (`team.md` Q6: adoptar en frontend un patrón de manejo de errores equivalente al del backend — excepciones tipadas por dominio + manejo centralizado). Ver `code-quality-assessment.md` para el detalle completo del hallazgo.

## Export de catálogo — genérico existente vs. formato cliente pedido (scan enfocado `260903-catalog-client-export`)

| Endpoint                                                                 | Método | Formato                                                                                   | Notas                                                                                                                                                                                               |
| ------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/products/export.csv?category_id=` (`product_router.py:635`) | GET    | CSV **genérico**: `UNIVERSAL_COLUMNS_ORDERED` + `attribute_schema` dinámico por categoría | Existente (FEAT-1, intent `260826-prod-bugfixes-batch`). SIN ZIP de imágenes. No es el formato de 24 columnas del cliente.                                                                          |
| Import cliente (`BulkUploadVehiclesUseCase`)                             | POST   | CSV cliente (24 columnas, `;`) + ZIP opcional de imágenes (`CSVImageMapper`)              | Router GET/POST exacto no confirmado a nivel de línea en este pase — pendiente para Requirements Analysis/Functional Design. Es el "espejo" de import cuyo formato el export nuevo debe reproducir. |

**Consecuencia de diseño**: el endpoint de export existente y el formato que el intent pide (mismo CSV que el cliente usa para importar, más ZIP de imágenes por vehículo) **no son el mismo contrato de columnas** — se necesita decidir explícitamente si se extiende `export.csv` con un parámetro de formato, o si se crea un endpoint nuevo dedicado. Ninguna de las dos opciones requiere dependencias nuevas: `csv`/`zipfile` (stdlib) ya están en uso en el backend.

**Proxy BFF de `products` — confirmado SIN el defecto de `response.json()` ciego**: a diferencia de `categories`/`organizations`/`vehicles`, `apps/web/src/app/api/v1/products/[...path]/route.ts` ya soporta pass-through binario/no-JSON (`response.blob()` + `Content-Disposition` preservado) — confirmado por lectura directa este pase. Corrige la nota general de `project.md` (learned 2026-08-26) para este archivo específico: el defecto de `content-type` ciego sigue vigente en los otros 3 proxies, pero no en `products`.

**Gap de puerto de storage**: `IDOSpacesService` (`application/ports/ido_spaces.py`) no declara ningún método de lectura/descarga de bytes ya almacenados (solo `upload`/`presign`/`delete`/`exists`) — armar el ZIP de imágenes requiere agregar un método al puerto (equivalente a S3 `get_object`) o consumir las `image_urls` públicas ya guardadas en `Product` vía `httpx` (ya es dependencia del proyecto, sin agregar nada nuevo).

**Gap de permiso cross-org — RESUELTO en el backend (intent `260910-export-cross-org`), gap de UI vigente (intent `260911-export-org-selector`)**: el endpoint `export-client-format.zip` ya acepta `organization_id`+`ORG_ADMIN_VIEW_ALL`/`super_admin` (ver § "Export de catálogo — endpoint en su forma final" arriba), pero la UI de `/catalog` no tiene todavía ningún mecanismo para que el actor elija esa organización — `exportCatalogClientFormat()` sigue sin mandar el parámetro. Ver § "Modelo de permisos cross-org de `product_router.py`" más abajo para el detalle histórico del gap de backend ya cerrado.

## Modelo de permisos cross-org de `product_router.py` — gap confirmado en el endpoint de export (scan enfocado `260910-export-cross-org`)

`product_router.py` implementa acceso cross-org (un `super_admin`/`ORG_ADMIN_VIEW_ALL` operando sobre una organización distinta a la propia) con **tres patrones no unificados**:

| Patrón                     | Mecanismo                                                                                                                                                                                            | Endpoints                                                                           | Valida existencia del `organization_id` provisto               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1 — list-style             | `_check_org_scope_permission(current_user, organization_id)` → `(owner_tenant_id, can_view_all_orgs)`; `tenant_id = organization_id if (organization_id and can_view_all_orgs) else owner_tenant_id` | `list_products`, `get_category_filter_values`, `get_featured_products`              | NO                                                             |
| 2 — single-resource inline | `is_org_admin = current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)`; `repo.get_by_id(id, None if is_org_admin else current_user.tenant_id)`                                                  | `get_product`, `get_product_image_urls`; `create_product` (variante con validación) | SÍ, solo en `create_product` vía `org_repo.get_by_tenant_id()` |
| 3 — role literal           | `tenant_id = None if current_user.has_role("super_admin") else current_user.tenant_id` — bypassea `ORG_ADMIN_VIEW_ALL` por completo                                                                  | acciones batch (`/batch/approve`, `/batch/reject`)                                  | N/A                                                            |
| — export-client-format.zip | `tenant_id = current_user.tenant_id` SIEMPRE, sin excepción, sin parámetro `organization_id`                                                                                                         | `GET /api/v1/products/export-client-format.zip`                                     | N/A — no hay camino cross-org                                  |

**`GET /api/v1/products/export-client-format.zip`** (`product_router.py:735-779`, agregado por el intent `260903-catalog-client-export`) es el único endpoint del router que no implementa NINGUNO de los tres patrones — resuelve `tenant_id` exclusivamente de `current_user.tenant_id` (L752-764). Su docstring (L747-750) afirma esta restricción como diseño intencional citando `BR1.2`/`NFR1` del intent `260903-catalog-client-export`; `personas.md` de ese mismo intent confirma que la exclusión de `super_admin` fue alcance de diseño explícito, no una omisión — reencuadra la premisa del intent `260910-export-cross-org`: es una decisión de scope a ampliar, no una regresión de código a "corregir" en sentido estricto.

**Test que codifica el gap como comportamiento esperado**: `TestExportClientFormatTenantIsolation::test_other_organizations_products_never_appear` (`test_product_router_export_client_format.py`) autentica con `RoleType.SUPER_ADMIN` y asertaa explícitamente que el producto de otra organización es invisible — un fix de scope necesita revisar este test, no solo el código del endpoint. `_check_org_scope_permission()` no tiene test unitario/directo propio — su rama `403` solo se ejercita implícitamente vía los endpoints que la usan.

**Sin cambio de firma en el use case**: `ExportCatalogClientFormatUseCase.execute()` recibe un único `tenant_id: UUID` — la lógica de resolución de qué `tenant_id` pasar (incluyendo el chequeo de permiso cross-org) pertenece al router, siguiendo la convención ya vigente en `list_products`/`create_product`, no al use case.

Ver `architecture.md` § Interaction Diagrams (diagrama 13), `code-structure.md` y `code-quality-assessment.md` para el detalle completo.

## Export de catálogo — endpoint en su forma final, gap de wiring de UI (scan enfocado `260911-export-org-selector`)

### `GET /api/v1/products/export-client-format.zip` — forma final confirmada post-merge `264d99f1`

```python
async def export_catalog_client_format(
    current_user: CurrentUser, db: DbSession, spaces: SpacesService,
    organization_id: UUID | None = None,
) -> StreamingResponse:
```

(`product_router.py:735-798`). `owner_tenant_id, can_view_all_orgs = _check_org_scope_permission(current_user, organization_id)` — mismo gate que `GET /products`. Sin `organization_id`: exporta la organización propia del caller. Con `organization_id` + `ORG_ADMIN_VIEW_ALL`: exporta la organización indicada. Sin el permiso: `403`. Cada export cross-org queda logueado. **El backend está completo desde el intent `260910-export-cross-org`** — el gap que queda es exclusivamente de UI (ver abajo).

### `GET /api/v1/admin/organizations` — endpoint ya usado por el selector cross-org existente

Hook `useOrganizations()` (`apps/web/src/lib/api/organizations.ts:75`), gateado server-side por `ORG_ADMIN_VIEW_ALL`, devuelve `Organization[]` con shape `{id, name, code, ...}` (`OrganizationSchema`, `apps/web/src/lib/api/schemas/organizations.ts:45`). Es el endpoint que ya consume `OrganizationPicker.tsx` (ver `component-inventory.md`) y el candidato natural a reutilizar para cualquier selector nuevo del flujo de export — sin necesidad de un endpoint adicional. Distinto del `Organization`/`orgApi.list()` de `@/lib/api/orgApi.ts` (segunda representación paralela del mismo concepto, usada para CRUD de organización, no para "ver como" — ver `dependencies.md`).

### Gap de wiring confirmado — el cliente nunca manda `organization_id`

`exportCatalogClientFormat()` (`apps/web/src/lib/api/products.ts:1541`) llama `fetch("/api/v1/products/export-client-format.zip", {credentials:"include"})` sin ningún parámetro — el backend ya acepta `organization_id`, pero ningún caller de la UI lo provee hoy. `catalog/page.tsx` no importa `useAuth` ni `organizationStore`: cero lógica de selección de organización en el flujo de export. Ver `architecture.md` § Interaction Diagrams (diagrama 14) para la bifurcación de diseño pendiente (cablear al `OrganizationPicker`/`viewingOrgId` global existente vs. un selector local acotado al export).

## `teamApi` — contrato de creación de equipo, mismatch confirmado (scan enfocado `260902-teamapi-create-param`)

### Request — `POST /api/v1/teams`

| Lado                       | Campo                                        | Notas                                                              |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Frontend (`teamApi.ts:40`) | `{ name: string, organization_id: string }`  | Serializado vía `JSON.stringify(data)` en `teamApi.ts:139`         |
| Backend (`create.py:12`)   | `CreateTeamRequest.org_id: UUID` (requerido) | Sin alias/`Field(alias=...)` — nombre esperado es literal `org_id` |

Si esta petición llegara al backend real, `Pydantic` respondería `422 Unprocessable Entity` (`org_id` faltante, `organization_id` como campo extra ignorado).

### Response — `TeamResponse` (simétrico, no nombrado en el texto original del intent)

| Lado                               | Campo                                    | Notas                                                                                                                   |
| ---------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Backend (`response.py:44`)         | `TeamResponse.org_id: UUID`              | —                                                                                                                       |
| Frontend (`schemas/teamApi.ts:31`) | `TeamSchema.organization_id: z.string()` | Requerido, sin `.optional()`/`.nullable()`; `.passthrough()` solo tolera campos EXTRA, no suple uno requerido que falta |

Si una respuesta real del backend llegara a `handleResponse()`, `TeamSchema.parse()` lanzaría `ZodError` (campo `organization_id` ausente).

### Por qué nunca se manifestó — shadowing por mock BFF

`apps/web/next.config.ts:82-102` declara el rewrite `/api/:path*` → backend como tipo `fallback`: solo se aplica cuando ningún archivo de ruta propio de Next.js coincide. `apps/web/src/app/api/v1/teams/route.ts` es un archivo de ruta real — una "Mock API Route" (comentario en línea 2) — que implementa `POST`/`GET` enteramente en memoria (`global.__mockTeams`), usando `organization_id` de forma auto-consistente al leer y escribir. Como resultado, `POST /api/v1/teams` NUNCA sale del proceso Next.js hoy — ni el `422` del lado request ni el `ZodError` del lado response llegan a ocurrir. Mismo mecanismo para `GET /api/v1/teams/org/{orgId}` y `GET /api/v1/teams/{id}` (mock, `GET` únicamente — sin `PATCH`, por lo que `teamApi.update()` probablemente devuelve 405 si algún día se ejercitara contra este mock, defecto relacionado no nombrado en el intent). `teamApi.addMember` y `teamApi.acceptInvitation` NO tienen archivo mock y SÍ llegan al `team_router.py` real.

### Endpoints reales de `team_router.py` (6, confirmados este pase)

| Endpoint                    | Método | Alcanzado hoy desde `teamApi.ts`                                                                                                                       |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST ""`                   | POST   | NO (shadow por mock)                                                                                                                                   |
| `GET "/org/{org_id}"`       | GET    | NO (shadow por mock)                                                                                                                                   |
| `GET "/{team_id}"`          | GET    | NO (shadow por mock)                                                                                                                                   |
| `PATCH "/{team_id}"`        | PATCH  | NO (sin ruta mock, pero `teamApi.update()` tampoco tiene rewrite real cubierto por un mock — 405 probable contra el mock existente de `[id]/route.ts`) |
| `POST "/{team_id}/members"` | POST   | SÍ — `teamApi.addMember`, sin mock                                                                                                                     |
| `POST "/{team_id}/invite"`  | POST   | (fuera de la superficie de `teamApi.ts` documentada este pase)                                                                                         |
| `POST "/accept-invitation"` | POST   | SÍ — `teamApi.acceptInvitation`, sin mock (ver `architecture.md` diagrama 9)                                                                           |

### Por qué el "contract test" existente no detecta esto

`apps/api/tests/contract/schema_matching/test_team_dto_schemas.py` instancia `CreateTeamRequest`/`TeamResponse` de Pydantic en aislamiento — nunca lee `teamApi.ts` ni ningún archivo TypeScript, por lo que estructuralmente no puede atrapar un drift de nombre de campo entre ambos lados. `.skills/contract-testing/SKILL.md` del proyecto ya describe el patrón que resolvería esta clase de bug ("Layer 3: Schema Matching — DTO ↔ TypeScript Drift Detection"), pero no existe una instancia de ese test para el dominio `team`. Ver `code-quality-assessment.md` para el detalle completo del hallazgo.
