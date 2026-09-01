# Code Structure — ProSell SaaS

## Layout del monorepo

```
prosell-sass/
├── apps/
│   ├── api/                    # Backend FastAPI (Python 3.13, uv/hatchling)
│   │   ├── src/prosell/
│   │   │   ├── domain/         # entities, value_objects, repositories (interfaces),
│   │   │   │                   # ports, services, exceptions, events — zero deps externas
│   │   │   ├── application/    # use_cases/ (18 subdominios, 88 archivos .py excl. __init__)
│   │   │   └── infrastructure/ # api (routers, middleware, DI), models (SQLAlchemy),
│   │   │                       # repositories (impl), services, tasks (Taskiq)
│   │   ├── alembic/versions/   # 71 migraciones
│   │   ├── scripts/             # 22 scripts (deploy, sync-test-db, secret scan, etc.)
│   │   └── tests/{unit,integration,contract,stubs,utils}/  # 243 archivos
│   │
│   └── web/                    # Frontend Next.js 16 + React 19
│       ├── src/
│       │   ├── app/            # App Router — páginas + 31 route.ts BFF (auth/, v1/)
│       │   ├── components/     # 22 subcarpetas (ver component-inventory.md)
│       │   ├── lib/             # api/ (clientes + schemas Zod-mirror), auth/ (deriveRole)
│       │   ├── stores/          # Zustand (authStore, etc.)
│       │   ├── hooks/           # useAuth, useOAuthPreload, useInferCategory, ...
│       │   └── proxy.ts         # middleware Next.js (auth-redirect, renombrado desde middleware.ts)
│       └── tests/{unit,components,app,e2e,__mocks__,utils}/  # 161 archivos
│
├── packages/                   # Declarado en pnpm-workspace.yaml (glob packages/*),
│                                # NO existe físicamente en disco — glob muerto
│
├── tests/e2e/                  # Workspace independiente @prosell/e2e (Playwright)
│   └── specs/                  # 34 specs
│
├── docker/                     # Dockerfiles + compose (dev, staging, prod)
│
└── .github/workflows/          # ci.yml, deploy.yml, promote-prod.yml, recover-prod.yml,
                                 # react-doctor.yml (advisory), e2e.yml, graphify.yml
```

## Backend — `apps/api/src/prosell/`

### Domain layer (zero deps)

- `entities/` — 22 entidades (excl. `__init__.py`): `appointment`, `branch`, `category`, `facebook_account`, `facebook_page`, `lead`, `lead_audit_log`, `marketplace_access`, `notification`, `organization`, `organization_invitation`, `organization_vertical`, `product`, `product_audit_log`, `product_image`, `publication`, `role`, `session`, `team`, `team_invitation`, `user`, `user_branch`, `wallet`.
- `value_objects/`, `repositories/` (interfaces/puertos), `ports/`, `services/` (lógica de dominio pura), `exceptions/` (jerarquía `<Dominio>DomainException` por dominio — `AuthDomainException`, `OrgDomainException`, etc.), `events/`.

### Application layer

- `use_cases/` — 18 subdominios, 88 archivos `.py` (excl. `__init__.py`): `appointment/`, `auth/`, `branch/`, `category/`, `dealer/` (**vacío, 0 archivos**), `facebook/`, `i18n/`, `lead/`, `org/`, `organization/`, `product/`, `publisher/`, `team/`, `user/`, `user_branch/`, `user_dealer/` (**vacío, 0 archivos**), `vehicle/` (**vacío, 0 archivos**), `vendedor/`, `wallet/`.
- Tres subcarpetas (`dealer/`, `user_dealer/`, `vehicle/`) son scaffolding sin contenido — confirmado por listado directo, cero archivos en cada una. Ver `code-quality-assessment.md`.

### Infrastructure layer

- `api/routers/` — 30 módulos de router (ver `api-documentation.md` para el listado completo).
- `api/middleware/` — `auth_middleware.py`, `rbac_middleware.py`, `rate_limit_middleware.py`, `exception_handlers.py`.
- `api/dependencies.py`, `api/di.py`, `api/main.py` — wiring de FastAPI, inyección de dependencias, registro de routers.
- `models/` — 28 modelos SQLAlchemy 2.0 async (`Mapped`/`mapped_column`), solo relevados a nivel directorio este pase.
- `repositories/` — implementaciones concretas de los puertos de dominio (p. ej. `SqlAlchemyProductRepository`, `SqlAlchemyCategoryRepository`).
- `services/` — 15 servicios: `do_spaces_service.py`, `email/` (subpaquete: `message`, `renderer`, `retry`, `sender`, `service`), `facebook_graph_api_client.py`, `facebook_marketplace_oauth_service.py`, `fb_encryption_service.py`, `fueleconomy_service.py`, `graph_api_publisher.py`, `image_pipeline.py`, `jwt_service.py`, `nhtsa_normalizer.py`, `nhtsa_vin_service.py`, `null_graph_api_publisher.py`, `oauth_service_impl.py`, `password_service.py`, `playwright_publisher.py`, `publisher_strategy.py`, `redis_service.py`, `token_encryption_service.py`, `totp_service.py`.
- `tasks/` — orquestación Taskiq/Redis: `broker.py`, `circuit_breaker.py`, `health.py`, `taskiq_task_dispatcher.py`, `worker.py`, `use_cases/` (`auto_republish_task`, `delete_listing_task`, `poll_facebook_leads_task`, `prune_sold_galleries_task`, `publish_product_task`, `refresh_facebook_tokens`, `update_listing_task`).
- `infrastructure/database/` — `base.py` (declarative `Base`, `MANUAL_ENUMS` registry para enums con `create_type=False`, p. ej. `fb_group_category` en `fb_account_model.py`), `session.py` (`get_async_session` — crea una sesión nueva por request en producción), `seed_categories.py` (seed de la taxonomía de categorías; ver nota de aplanamiento de vehículos en `business-overview.md`).

### `apps/api/scripts/` (22 scripts, foco this pase: bootstrap de test schema)

- **`create_test_schema.py`** — bootstrapea el schema de la base de datos de test vía `Base.metadata.create_all()` en vez de correr la cadena real de migraciones Alembic (decisión deliberada, documentada in-line — ver `architecture.md` § Interaction Diagrams). Usa `MANUAL_ENUMS` de `infrastructure/database/base.py` para registrar enums `create_type=False`.
- **`init_data.py`** — inicialización de data (leído este pase como parte del contexto de seed, sin cambios de arquitectura frente al pase anterior).
- Otros 20 scripts (deploy, `sync-test-db.sh`, secret scan, `seed_dev.py`, `seed_marketplace_inventory.py`, `seed_dealers.py`, `seed_test_vehicles.py`, `audit_schema_drift.py`, `test_data_cleanup.py`) — solo relevados a nivel de imports/estructura este pase (no están en el critical path de CI según `ci.yml`), sin lectura profunda.

### `apps/api/tests/` — jerarquía de fixtures relevante al bootstrap de CI (foco this pase)

- **`tests/conftest.py`** (raíz de tests) — fixtures compartidas a nivel de sesión de pytest para toda la suite backend.
- **`tests/integration/conftest.py`** — fixtures de nivel integración (engine/session), consumidas por los tests bajo `tests/integration/**`.
- **`tests/integration/database/`** — tests que validan directamente la data de seed (`test_seed_categories.py`, `test_seed_car_attributes.py`) contra el schema bootstrapeado por `create_test_schema.py`.
- **`tests/integration/api/routers/test_fb_sync_router.py`** — define localmente el fixture `shared_session`/`_setup_override` (patrón de dependency-override de sesión compartida — ver `architecture.md` para el problema de incompatibilidad con `db.commit()` explícito).
- **`tests/integration/bulk_upload/conftest.py`** — replica el mismo patrón `shared_session` para el fixture `async_client`.
- **`tests/integration/use_cases/test_batch_approve_products.py`** — construye filas `Product` con `category_id=uuid4()` sin insertar la `Category` real correspondiente (hallazgo menor, no confirmado como regresión reciente — ver `code-quality-assessment.md`).

## Frontend — `apps/web/src/`

- `app/` — App Router: páginas de negocio (auth, catálogo, review-queue, admin, onboarding, publisher, etc.) + `app/api/{auth,v1}/**/route.ts` (31 archivos BFF).
- `components/` — 22 subcarpetas: `admin/`, `appointments/`, `auth/`, `branches/`, `catalog/`, `datagrid/`, `filters/`, `forms/`, `i18n/`, `icons/`, `images/`, `landing/`, `layout/`, `leads/`, `onboarding/`, `pipeline/`, `providers/`, `public/`, `publisher/`, `review/`, `teams/`, `ui/`, `upload/`.
- `lib/api/` — clientes API por dominio + `lib/api/schemas/` (Zod-mirror de los DTOs backend).
- `lib/auth/deriveRole.ts` — single source of truth de derivación de rol, compartida entre `proxy.ts` (server) y `authStore.ts` (client).
- `stores/` — Zustand (p. ej. `authStore.ts` con `persist`).
- `hooks/` — `useAuth.ts`, `useOAuthPreload.ts` (código muerto, ver `code-quality-assessment.md`), `useInferCategory.ts`, etc.
- `proxy.ts` — middleware Next.js (auth-redirect), renombrado desde `middleware.ts` (JSDoc de cabecera aún desactualizado).

### Módulos nuevos inventariados — scan enfocado `260830-ci-fixes-round2` (batch review / bulk upload / appointments / fb-sync)

- **`domain/services/csv_field_mapper.py`** — mapeo de fila CSV cliente (23 columnas, `;`-delimited) a `MappedCSVRow` (incl. `map_row()`); fallback silencioso de `cod_organization` a `title` cuando no hay código explícito.
- **`application/use_cases/product/bulk_upload_vehicles.py`** — use case de bulk upload con imágenes: upsert por VIN, resolución de organización por código. Bug de diseño confirmado (ver `code-quality-assessment.md`): el chequeo de códigos de organización desconocidos corre antes del loop por fila, ignorando el fallback `organization_id` del caller.
- **`application/use_cases/product/bulk_upload_preview.py`** — use case de dry-run de CSV: no escribe DB, reporta `summary.missing_org_codes` en vez de lanzar excepción por código desconocido (contraste deliberado con `bulk_upload_vehicles.py`).
- **`infrastructure/models/organization_model.py`** — modelo SQLAlchemy de organización; su campo `code` no es seteado por la fixture `test_organization` (ver hallazgo de test infra en `code-quality-assessment.md`).
- **`infrastructure/api/routers/appointment_router.py`** — router FastAPI CRUD de citas (5 endpoints), registrado en `main.py:389-393` — confirmado activo pese a docstring de test desactualizada.
- **`infrastructure/api/routers/fb_sync_router.py`** — ya inventariado en el scan `260830-ci-seed-data` por `unpublish_callback`; este pase agrega el detalle de la rama `"failed"` (`attempt_count` cappeado, sin asignación explícita de `status`) — ver `architecture.md` § Interaction Diagrams.
- **`infrastructure/models/fb_unpublish_request_model.py`** — modelo SQLAlchemy del request de "unpublish"; columna `status` con `server_default="queued"`, de la que depende implícitamente la rama `"failed"` de `fb_sync_router.py`.
- **`infrastructure/api/routers/fb_credential_migration_router.py`** — **BLOQUEADO por permisos locales este pase** (`.claude/settings.local.json` deniega Read/Bash sobre rutas con "credential"). Solo se conoce su estructura vía graphify: endpoints `create_migration_authorization`, `approve_migration_authorization`, `poll_migration_authorization`, `create_migration_token`, `import_credentials`; modelos `FBCredentialMigrationAuthorizationModel`/`FBCredentialMigrationTokenModel`; `TokenEncryptionService` (Fernet). Ver `code-quality-assessment.md` para el gap documentado.
- **`tests/integration/api/test_batch_review_api.py`** — 4 usos de `category_id=uuid4()` (L110, 151, 201, 213) sin fixture `test_category`, violando `products_category_id_fkey`. Fix ya probado en el repo (`test_batch_approve_products.py`, comparado línea a línea): agregar `test_category` como parámetro y usar `category_id=test_category.id`.

### Módulos nuevos inventariados — scan enfocado `260828-useeffect-to-react-query` (onboarding / invite / migración a React Query)

- **`app/onboarding/page.tsx`** — wizard multi-paso de alta de organización. `useEffect` de mount (`checkSetup()`) llama `orgApi.getMyOrganization()` — la violación literal de `AGENTS.md:333` en este archivo. `handleStep1`/`completeSetup` son llamadas imperativas disparadas por click (no por efecto), candidatas separadas a `useMutation`. JSDoc de cabecera describe bien el flujo/estados — necesitará actualización post-migración. Cero tests hoy.
- **`app/invite/[token]/page.tsx`** — página de aceptación de invitación de equipo. `useEffect` de mount dispara la MUTACIÓN `teamApi.acceptInvitation({token})` (no solo una query), con 5 estados de UI. Branching de error por `error.message.toLowerCase().includes(...)` (`"expired"`, `"already"`/`"member"`) y `error.status === 401` — una migración a `useMutation` debe preservar `ApiError` para no romper este branching. Tiene un supresor `react-hooks/set-state-in-effect` en L57 (comentario: "guard pattern, not a cascade") que una reescritura a `useMutation` probablemente permita eliminar. Cero tests hoy.
- **`app/invite/org/[token]/page.tsx`** — flujo hermano de invitación (a nivel de organización, no de equipo); revisado solo como contraste, no forma parte del área de refactor de este intent.
- **`lib/api/orgApi.ts`** — 9 métodos (`create`, `list`, `getMyOrganization`, `getById`, `update`, `verify`, `reject`, `completeSetup`, `suspend`). Raw `fetch()` + `credentials: "include"`, clase `ApiError` y `handleResponse<T>()` propios, duplicados verbatim respecto a `teamApi.ts`. NO usa `fetchWithAuth` — sin auto-refresh de sesión en 401.
- **`lib/api/teamApi.ts`** — 6 métodos; el flujo de invitación usa solo `acceptInvitation({token})`. Mismo patrón raw-fetch + `ApiError`/`handleResponse<T>` duplicado que `orgApi.ts`. También sin `fetchWithAuth`.
- **`lib/api/notificationsApi.ts`** — único precedente confirmado en el repo de hooks `useQuery`/`useMutation` colocados directamente en un módulo de API (no en un archivo de hooks separado): `useNotifications()`, `useMarkNotificationRead()`, `useMarkAllNotificationsRead()`. SÍ usa `fetchWithAuth`, pero lanza `new Error(...)` genérico — no preserva el detalle de error del backend. Ver `architecture.md` § Interaction Diagrams.
- **`lib/api/fetchWithAuth.ts`** — wrapper de fetch con dedupe de refresh concurrente en 401 + retry único + redirect a `/auth/login` si falla. Es la pieza que `orgApi.ts`/`teamApi.ts` saltean hoy.
- **`lib/api/extractErrorMessage.ts`** — tercer patrón de manejo de error en esta misma área (zod-matcher sobre el body de respuesta), distinto de `ApiError` y del `Error` genérico de `notificationsApi.ts` — ver triangulación completa en `code-quality-assessment.md`.
- **`components/providers/ReactQueryProvider.tsx`** — provider raíz de TanStack Query ya wireado en el árbol de la app; no requiere cambios para que `onboarding`/`invite` empiecen a usar `useQuery`/`useMutation`.

## Patrones de código confirmados

- **Clean Architecture backend estricta**: dependencia unidireccional `Infrastructure → Application → Domain`.
- **Repository pattern**: interfaces en `domain/repositories/`, implementación concreta en `infrastructure/repositories/`.
- **Strategy pattern**: `PublisherStrategy` con dos implementaciones intercambiables (`GraphApiPublisher`, `PlaywrightPublisher`) + un `NullGraphApiPublisher` (null object pattern) para el caso sin configuración.
- **Excepciones de dominio tipadas por subdominio**: `<Dominio>DomainException` con subclases específicas + exception handler centralizado (`exception_handlers.py`) — patrón que el equipo afirmó adoptar también en frontend hacia adelante (ver `team.md` Q6, aún no implementado sistemáticamente en `apps/web`).
- **BFF proxy pattern**: rutas `route.ts` en Next.js que reenvían al backend, con variantes catch-all (`[...path]/route.ts`) para pasar sub-rutas completas.
- **Zod-mirror**: cada esquema de respuesta backend tiene un espejo Zod en frontend, parseado antes de usar (`safeParse`/`parse`), regla zero-tolerance del proyecto contra `as X` sin validar.
