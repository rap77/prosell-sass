# Component Inventory — ProSell SaaS

Los nombres de componente en este documento son los que `reverse-engineering-timestamp.md` § Scope of Analysis referencia literalmente.

## prosell-api (FastAPI backend)

- **Responsabilidad**: lógica de negocio (catálogo, review queue, leads/citas, wallet), publicación automatizada a Facebook Marketplace, persistencia, auth.
- **Dependencias**: PostgreSQL 17, Redis 7.4+, Playwright (publicación, no scraping genérico), boto3 (storage), facebook-sdk. `stripe` y `anthropic` están declaradas pero sin uso detectado en código fuente (ver `dependencies.md`).
- **Subcomponentes** (Clean Architecture):
  - `domain/` — 22 entidades, value objects, eventos, puertos, servicios; zero deps externas.
  - `application/` — `use_cases/` en 18 subdominios (88 archivos .py), 3 de ellos vacíos (`dealer/`, `user_dealer/`, `vehicle/` — 0 archivos cada uno).
  - `infrastructure/` — 30 módulos de router (los 30 wireados en `main.py`, 1 env-gated), 4 archivos de middleware, 28 modelos SQLAlchemy 2.0 async, repositorios, 15 servicios (email, Facebook, publishers, VIN/fuel economy, JWT/TOTP/password/token encryption), tareas Taskiq+Redis.
- **Tests**: `apps/api/tests/{unit,integration,contract,stubs,utils}/` (243 archivos), con subdivisión por dominio (ver `code-structure.md`).

## prosell-web (Next.js frontend)

- **Responsabilidad**: UI admin/vendedor SaaS + frontend de marketplace público + navegación de autenticación.
- **Dependencias**: `prosell-api` (vía BFF proxy), ninguna dependencia de build-time de `packages/*` (no existe físicamente).
- **Subcomponentes**:
  - `app/` — App Router, incluyendo las 31 rutas BFF bajo `app/api/`.
  - `proxy.ts` — middleware de routing/auth-redirect (renombrado desde `middleware.ts`, JSDoc de cabecera aún desactualizado).
  - `components/` — 22 subcarpetas: `admin/`, `appointments/`, `auth/`, `branches/`, `catalog/`, `datagrid/`, `filters/`, `forms/`, `i18n/`, `icons/`, `images/`, `landing/`, `layout/`, `leads/`, `onboarding/`, `pipeline/`, `providers/`, `public/`, `publisher/`, `review/`, `teams/`, `ui/`, `upload/`.
  - `lib/` (clientes API + `lib/api/schemas/` Zod-mirror + `lib/auth/deriveRole.ts`), `stores/` (Zustand), `hooks/`.
- **Tests**: `apps/web/tests/{unit,components,app,e2e,__mocks__,utils}/` (161 archivos), con subdivisión por dominio de feature.

## BFF proxy routes

- **Responsabilidad**: intermediar entre navegador y `prosell-api`, centralizando cookies httpOnly y auth.
- **Ubicación**: `apps/web/src/app/api/{auth,v1}/**/route.ts`, **31 archivos** (9 en `auth/*` con lógica propia de cookies, 22 en `v1/*` como proxy pass-through).
- **Dependencias**: `prosell-api` (destino de reenvío).
- **Defecto activo**: `response.json()` sin chequeo de `content-type` en los proxies catch-all (`categories`, `organizations`, `products`, `vehicles`) — ver `api-documentation.md`.

## Navegación Auth (frontend)

- **`fetchWithAuth.ts`** (`apps/web/src/lib/api/`) — **Responsabilidad**: wrapper de fetch autenticado, redirige el navegador ante sesión expirada. **Dependencias**: consumido por `leads.ts`, `notificationsApi.ts`, `useInferCategory.ts`.
- **`LoginPageContent.tsx`** / **`RegisterPageContent.tsx`** (`apps/web/src/app/auth/{login,register}/`) — **Responsabilidad**: UI de login/registro incluyendo botones OAuth (Google/Microsoft). El patrón `window.location.href` duplicado entre ambas páginas fue consolidado en el intent `260829-auth-navigation-refactor` (extracción a función nombrada, 5 supresores de ESLint eliminados, cero warnings resultantes).
- **`proxy.ts`** (`apps/web/src/`) — **Responsabilidad**: middleware Next.js de routing/auth-redirect (`PROTECTED_ROUTES`/`PUBLIC_ROUTES`/`AUTH_REDIRECT_ROUTES`), delega derivación de rol a `deriveRole.ts`.
- **`useAuth.ts`** (`apps/web/src/hooks/`) — **Responsabilidad**: hook de acceso a sesión/rol para componentes cliente.
- **`authStore.ts`** (`apps/web/src/stores/`) — **Responsabilidad**: estado global de sesión (Zustand + `persist`). Secciones clave: `login`, `isNavigating`/`setNavigating`, `mapApiUserToStoreUser`. **Dependencias**: `deriveRole.ts`.
- **`deriveRole.ts`** (`apps/web/src/lib/auth/`) — **Responsabilidad**: single source of truth de derivación de rol, compartida (documentado inline) entre `proxy.ts` y `authStore.ts`.
- **`NavigationCleanup.tsx`** (`apps/web/src/components/layout/`) — **Responsabilidad**: limpieza de estado de navegación relacionado a `isNavigating`.

## Publicación a Facebook Marketplace (backend)

- **`publisher_router.py`** + **`PublishProductUseCase`** — **Responsabilidad**: orquestar la publicación del inventario propio hacia Facebook.
- **`publisher_strategy.py`** — **Responsabilidad**: puerto Strategy con dos implementaciones intercambiables: **`graph_api_publisher.py`** (Facebook Graph API oficial) y **`playwright_publisher.py`** (automatización de navegador, estrategia alternativa/fallback). **`null_graph_api_publisher.py`** implementa el null object para el caso sin credenciales configuradas.
- **`tasks/use_cases/`** — `publish_product_task.py`, `auto_republish_task.py`, `delete_listing_task.py`, `update_listing_task.py`, `poll_facebook_leads_task.py`, `refresh_facebook_tokens.py` — orquestación asíncrona vía Taskiq/Redis.

## apps/app (orphan micro-app)

- **Responsabilidad**: desconocida/no wireada — contiene únicamente `privacy/page.tsx`, sin `package.json` propio (confirmado por listado directo este pase, sin cambios respecto al pase previo).
- **Dependencias**: ninguna confirmada al grafo de build activo del workspace pnpm. Shadowed por la ruta real `apps/web/src/app/privacy/page.tsx`.
- **Estado**: candidato a deuda técnica — investigar propósito o eliminar (ver `code-quality-assessment.md`).

## test_cleanup_router.py (dead router, backend)

- **Responsabilidad declarada**: utilidades de limpieza de datos de test (480 líneas).
- **Estado real**: **no wireado en ningún punto del código** — sin import en `main.py` ni en ningún otro módulo bajo `apps/`, `tests/` o `docker/`. Endpoints inalcanzables en cualquier entorno. Ver `api-documentation.md` § Nota de seguridad.

## CI test-schema bootstrap (seed/test infra)

Nuevo componente inventariado en el scan enfocado del intent `260830-ci-seed-data`.

- **`create_test_schema.py`** (`apps/api/scripts/`) — **Responsabilidad**: bootstrapear el schema de la DB de test para el job `test-python` de CI, vía `Base.metadata.create_all()` en vez de la cadena real de Alembic (decisión deliberada y documentada in-line — ver `architecture.md`). **Dependencias**: `infrastructure/database/base.py` (`Base`, `MANUAL_ENUMS`), todos los modelos SQLAlchemy registrados en el metadata.
- **`seed_categories.py`** (`apps/api/src/prosell/infrastructure/database/`) — **Responsabilidad**: seedear la taxonomía de categorías (incluida la vertical vehículos) en la DB de test/dev. **Estado actual**: `carros-y-camionetas` es la hoja de nivel 2 desde el commit `2166f142` (6-ago) — los 5 nodos-hoja de nivel 3 que existían antes (`sedan`, `hatchback`, `suvs`, `pick-ups`, `coupe`) fueron eliminados; body type pasó a ser un atributo, no una subcategoría. Ver `business-overview.md`.
- **`conftest.py` (jerarquía)** — `apps/api/tests/conftest.py` (raíz, fixtures de sesión de pytest) → `apps/api/tests/integration/conftest.py` (fixtures de engine/session de integración) → conftests locales de subcarpeta (p. ej. `tests/integration/bulk_upload/conftest.py`). **Responsabilidad**: proveer engine/session/cliente HTTP a los tests de integración contra el schema bootstrapeado por `create_test_schema.py`.
- **Fixture `shared_session`** (definida localmente en `test_fb_sync_router.py`, patrón replicado en `bulk_upload/conftest.py`) — **Responsabilidad declarada**: compartir una única sesión de DB entre el test y la app bajo test vía `app.dependency_overrides`. **Defecto conocido**: incompatible con handlers que hacen `db.commit()` explícito (patrón válido en producción) cuando el test necesita más de una llamada al endpoint sobre la misma sesión — ver `architecture.md` § Interaction Diagrams.

## Batch Review (backend, scan enfocado `260830-ci-fixes-round2`)

- **Responsabilidad**: aprobación/rechazo masivo de productos desde la cola de revisión (`/products/batch/approve`, `/products/batch/reject`).
- **Ubicación**: `product_router.py` (endpoints) + use cases correspondientes.
- **Dependencias**: `SqlAlchemyProductRepository`, fixture `test_category` (tests).
- **Defecto de test confirmado**: `tests/integration/api/test_batch_review_api.py` usa `category_id=uuid4()` en 4 lugares (L110, 151, 201, 213) sin la fixture `test_category`, violando `products_category_id_fkey` — fix ya probado línea a línea en `test_batch_approve_products.py` del mismo repo.

## Bulk Upload CSV (backend, scan enfocado `260830-ci-fixes-round2`)

- **Responsabilidad**: importación masiva de vehículos vía CSV cliente, en dos modos: preview (dry-run) y ejecución con imágenes.
- **Ubicación**: `application/use_cases/product/bulk_upload_vehicles.py`, `application/use_cases/product/bulk_upload_preview.py`, `domain/services/csv_field_mapper.py`, endpoints en `product_router.py` (`/bulk-upload/preview`, `/bulk-upload/with-images`).
- **Dependencias**: `OrganizationRepository` (resolución de organización por código), `csv_image_mapper.py`.
- **Defecto de diseño confirmado**: `bulk_upload_vehicles.py:124-127` levanta `ValueError` para CUALQUIER código de organización no resuelto, incluso cuando el caller ya proveyó un `organization_id` de fallback válido — el chequeo de "unknown codes" corre antes del loop por fila que sí respeta ese fallback. Además, ni `bulk_upload_with_images` ni `bulk_upload_preview` envuelven `execute()` en `try/except ValueError` en `product_router.py`, a diferencia de `/brokers` y `/ownership` en el mismo archivo. Ver `architecture.md` § Interaction Diagrams.
- **Discrepancia a verificar**: `bulk_upload_preview.py` no lanza `ValueError` por códigos desconocidos (solo reporta `summary.missing_org_codes`) — sugiere que `test_bulk_upload_preview.py` no comparte el mismo root cause de falla que `test_bulk_upload_with_images.py`.

## Appointments (backend, scan enfocado `260830-ci-fixes-round2`)

- **Responsabilidad**: CRUD de citas comprador↔vendedor + cambio de estado.
- **Ubicación**: `appointment_router.py` (5 endpoints), registrado en `main.py:389-393`.
- **Dependencias**: `appointment_repository_impl.py` (skimmed only este pase), DTOs `application/dto/appointment/{request,response}.py` (skimmed only, solo existencia confirmada).
- **Estado**: endpoints SÍ registrados y activos. `test_appointment_api.py` tiene una docstring desactualizada que sugiere lo contrario (404 por "router no registrado todavía") — deuda de documentación de test, no bug funcional. Causa raíz real de las fallas del test NO identificada por lectura estática (asserts laxos `in [200, 401, 403, 404]`); requiere ejecución real de pytest.

## FB Sync — unpublish-callback (backend, profundizado en scan `260830-ci-fixes-round2`)

- **Responsabilidad**: recibir callbacks del bot de Facebook sobre el estado de una solicitud de "unpublish" (`/fb-sync/unpublish-callback`, auth `X-Bot-Token`).
- **Ubicación**: `fb_sync_router.py::unpublish_callback` (L324-415), modelo `fb_unpublish_request_model.py`.
- **Defecto frágil (no confirmado con corrida real)**: la rama `callback.status == "failed"` (L356-366) incrementa y cappea `attempt_count` contra `MAX_UNPUBLISH_ATTEMPTS=3`, pero nunca asigna explícitamente `unpublish_request.status` — si persiste como `"queued"` es por el `server_default` de la columna, no por lógica explícita del handler. Ver `architecture.md` § Interaction Diagrams.

## FB Credential Migration (backend, estructura solamente — BLOQUEADO por permisos locales)

- **Responsabilidad declarada** (vía graphify, sin lectura de contenido): migración de credenciales de bot a tenant-admin — endpoints `create_migration_authorization`, `approve_migration_authorization`, `poll_migration_authorization`, `create_migration_token`, `import_credentials`.
- **Ubicación**: `fb_credential_migration_router.py`, modelos `FBCredentialMigrationAuthorizationModel`/`FBCredentialMigrationTokenModel`, `TokenEncryptionService` (Fernet).
- **Estado de cobertura**: **BLOQUEADO** — `.claude/settings.local.json` tiene `"deny": ["Read(**/*credential*)"]`, que impide tanto `Read` como `Bash` sobre cualquier ruta con "credential". Límite de permisos real del entorno local, no un bug. Requiere ajustar esa regla o escanear desde otro entorno para cubrir este componente a profundidad.

## tests/e2e (Playwright suite / @prosell/e2e workspace member)

- **Responsabilidad**: pruebas end-to-end del flujo completo (navegador real contra stack levantado).
- **Ubicación**: `tests/e2e/`, paquete pnpm independiente con `package.json` propio (`@prosell/e2e`), 34 specs bajo `specs/`.

## Onboarding / Invite — migración pendiente a React Query (frontend, scan enfocado `260828-useeffect-to-react-query`)

- **`OnboardingPage()`** (`apps/web/src/app/onboarding/page.tsx`) — **Responsabilidad**: wizard multi-paso de alta de organización nueva. **Dependencias**: `orgApi.ts` (`getMyOrganization` en `useEffect` de mount, `update`/`completeSetup` imperativos por click), `sonner` (toasts), 4 componentes de paso (`OnboardingStep*`). **Estado**: violación literal de `AGENTS.md:333` (useEffect para data-fetching); cero tests.
- **`InvitePage()`** (`apps/web/src/app/invite/[token]/page.tsx`) — **Responsabilidad**: aceptación de invitación de equipo vía token. **Dependencias**: `teamApi.ts` (`acceptInvitation` disparado como mutación en `useEffect` de mount, no solo query). **Estado**: mismo tipo de violación pero con mutación, no solo lectura; branching de error por string-match + `status === 401`; 1 supresor `react-hooks/set-state-in-effect` (L57, "guard pattern, not a cascade"); cero tests.
- **`orgApi`** (`apps/web/src/lib/api/orgApi.ts`) — 9 métodos, ver `api-documentation.md` para la superficie completa. Duplica `ApiError`/`handleResponse<T>` con `teamApi.ts`; sin `fetchWithAuth`.
- **`teamApi`** (`apps/web/src/lib/api/teamApi.ts`) — 6 métodos, ver `api-documentation.md`. Mismo defecto de duplicación y ausencia de `fetchWithAuth`.
- **`notificationsApi`** (`apps/web/src/lib/api/notificationsApi.ts`) — **Responsabilidad**: único precedente en el repo de hooks React Query colocados en el módulo de API — patrón de referencia para la migración pendiente (con la salvedad del manejo de error genérico, ver `code-quality-assessment.md`).

## Producto — cliente API y hooks de transición de estado (frontend, scan enfocado `260901-frontend-test-debt`)

- **`productSchema` / `parseProductResponse()`** (`apps/web/src/lib/api/products.ts`) — **Responsabilidad**: Zod-mirror completo del `Product` del backend + punto único de validación runtime. **Dependencias**: consumido por `createProductWithVehicle`, `useCreateProduct`, y todos los hooks de transición de estado. **Estado**: contrato vigente y correcto (espeja `nullable=False, default=False` de `ProductModel`); sin drift.
- **`useReverseProduct` / `useResubmitProduct` / `useRestoreProduct` / `useRevertSaleProduct`** (`apps/web/src/lib/api/products.ts`) — **Responsabilidad**: las 4 transiciones de "deshacer" del ciclo de vida de producto (ya documentadas en memoria del proyecto). **Dependencias**: `postReverseTransition`, `parseProductResponse`. **Estado**: código de producción sin cambios — el defecto está exclusivamente en los mocks de test que los ejercitan.
- **`products.test.tsx`** (`apps/web/tests/unit/api/`, 574 líneas) — 12 tests, **7 fallando** (7 mocks de `Product` sin `published_to_marketplace`, líneas ~54, 115, 174, 298, 357, 408, ~512-533). 5 tests de camino de error pasan.
- **`reverseTransitions.test.tsx`** (`apps/web/tests/unit/lib/api/`, 234 líneas) — 9 tests, **4 fallando** (helper compartido `mockProductResponse()`, líneas 38-58, sin el campo — un fix resuelve las 4). 5 tests pasan (esquemas no relacionados o camino de error).
- **`setProductCover.test.ts`** (`apps/web/tests/unit/components/upload/`) — confirmada su existencia, no abierto este pase; candidato al mismo síntoma, fuera de alcance explícito del intent.

## `teamApi` — creación de equipo, mismatch de contrato (frontend/backend, scan enfocado `260902-teamapi-create-param`)

- **Responsabilidad**: crear un equipo dentro de una organización (dealer) y gestionar sus miembros/invitaciones.
- **Ubicación (frontend)**: `apps/web/src/lib/api/teamApi.ts` (6 métodos), `apps/web/src/lib/api/schemas/teamApi.ts` (Zod), consumido por `apps/web/src/stores/teamStore.ts` y `apps/web/src/components/forms/TeamForm.tsx`.
- **Ubicación (backend)**: `apps/api/src/prosell/infrastructure/api/routers/team_router.py` (6 endpoints), `apps/api/src/prosell/application/dto/team/{create,response}.py`.
- **Ubicación (BFF)**: `apps/web/src/app/api/v1/teams/{route.ts,[id]/route.ts,org/[orgId]/route.ts}` — los 3 son "Mock API Routes" in-memory declaradas explícitamente, no proxies reales; `next.config.ts` (rewrite `fallback`) explica por qué el mock siempre gana.
- **Defecto confirmado — mismatch de nombre de parámetro, doble cara**:
  - Request: `teamApi.create()` envía `organization_id`; `CreateTeamRequest` (backend) espera `org_id` → `422` si llegara al backend real.
  - Response: `TeamResponse.org_id` (backend) vs. `TeamSchema.organization_id` (frontend, requerido) → `ZodError` si el backend real respondiera.
  - Nunca se manifestó porque el mock BFF de `POST /api/v1/teams` nunca reenvía al backend — ver `architecture.md` § Interaction Diagrams (diagrama 11).
- **Defecto relacionado, no nombrado en el intent**: `teamApi.update()` probablemente 405 contra el mock (`[id]/route.ts` solo exporta `GET`).
- **Gap estructural**: `apps/api/tests/contract/schema_matching/test_team_dto_schemas.py` no puede detectar este bug por diseño (nunca lee TypeScript); `.skills/contract-testing/SKILL.md` ya describe el patrón ("Layer 3") que lo resolvería, sin instancia para `team`.

---

## Inventario de bug — clases Tailwind inválidas

### Familia `.5` (`h-9.5`, `px-4.5`, `h-8.5`) — corregida por el commit `624819e3`

`apps/web/tailwind.config.ts` extiende `theme.extend.spacing` con `"4.5"`, `"8.5"`, `"9.5"`, confirmado por `apps/web/tests/unit/config/tailwind.config.test.ts`. El commit `624819e3` ("fix(web): extend Tailwind spacing scale for invalid h-9.5/px-4.5/h-8.5 classes"), ya mergeado a `main` antes del intent `260831-invalid-tailwind-classes`, es el que introdujo esta extensión. Instancias remanentes de esas clases son válidas.

**Verificado línea por línea en el scan enfocado del intent `260831-invalid-tailwind-classes`**: `apps/web/src/app/privacy/page.tsx`, `apps/web/src/app/terms/page.tsx`, `apps/web/src/components/onboarding/OnboardingStep3.tsx` y `apps/web/src/components/appointments/AppointmentForm.tsx` (los 4 archivos originalmente catalogados con `h-9.5`/`px-4.5` sin arreglar) usan exclusivamente clases de la familia `.5` ya cubiertas por la escala extendida — **ya NO son deuda**, compilan correctamente hoy.

### `PublishForm.tsx` con clases `.5` fuera del set extendido — confirmado válido

`apps/web/src/components/publisher/PublishForm.tsx` usa `h-9.5` (líneas ~573 y ~583, en dos botones) — esta clase específica SÍ está en el set extendido de `tailwind.config.ts` (`"9.5"`), por lo que **compila correctamente** y no es deuda de spacing inválido. No requiere acción.

### Residuo NO cubierto — familia `.25`/`.75`

Ni la escala default de Tailwind 3 (half-steps `0.5, 1.5, 2.5, 3.5` solamente) ni la extensión en `tailwind.config.ts` (que solo cubre `4.5`/`8.5`/`9.5`) cubren pasos de `.25`/`.75` — compilan a CSS vacío.

**Verificado línea por línea en el scan enfocado del intent `260831-invalid-tailwind-classes`** — `apps/web/src/app/(seller)/publications/page.tsx` es hoy el único archivo con clases genuinamente inválidas de esta familia:

| Clase      | Líneas   |
| ---------- | -------- |
| `gap-1.25` | 208, 488 |
| `p-0.75`   | 479      |
| `mt-0.25`  | 524      |
| `mb-0.75`  | 594      |

Si estos valores fraccionarios son intencionales (design tokens) o typos de los enteros vecinos (`gap-1`, `p-1`, `mt-1`/`mb-1`) queda como pregunta abierta para Requirements Analysis — no se resuelve en reverse engineering.

Los siguientes 3 archivos catalogados en un pase anterior con el mismo patrón (`py-0.75`/`p-0.75`/`mb-0.75`) **NO fueron re-verificados en este pase** (fuera del alcance del scan enfocado de `260831-invalid-tailwind-classes`, que cubrió solo las 5 rutas listadas en `reverse-engineering-timestamp.md` § Scope of Analysis) — se preservan tal cual, heredados, sin re-confirmación de número de línea:

| Archivo                                                   | Clases inválidas encontradas (heredado, no re-verificado) |
| --------------------------------------------------------- | --------------------------------------------------------- |
| `apps/web/src/components/publisher/PublicationStatus.tsx` | `py-0.75`/`p-0.75`/`mb-0.75`                              |
| `apps/web/src/components/leads/LeadStatusBadge.tsx`       | `py-0.75`/`p-0.75`/`mb-0.75`                              |
| `apps/web/src/components/catalog/ProductImageGallery.tsx` | `py-0.75`/`p-0.75`/`mb-0.75`                              |

### Fix ya aplicado como precedente (referencia)

`BulkUploadCSV.tsx` tenía el mismo patrón (`h-9.5`/`px-4.5`) y ya fue arreglado convirtiendo a valores arbitrarios explícitos: `h-[38px]`, `px-[18px]`.
