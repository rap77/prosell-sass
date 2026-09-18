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

### Módulos nuevos inventariados — scan enfocado `260901-frontend-test-debt` (deuda de tests unitarios `products.ts`)

- **`apps/web/src/lib/api/products.ts`** (1945 líneas) — cliente API + Zod-mirror del dominio de producto. Contiene `productSchema` (contrato completo del `Product`), `parseProductResponse()` (punto único de validación runtime), `createProductWithVehicle`, `useCreateProduct`, `useReverseProduct`/`useResubmitProduct`/`useRestoreProduct`/`useRevertSaleProduct` (las 4 transiciones de "deshacer" ya documentadas en memoria del proyecto), `postReverseTransition`, `useAvailableTransitions`, `useProductAuditLogs`. `published_to_marketplace: z.boolean()` (sin `.optional()`) es el campo relevante a este pase — espeja `nullable=False, default=False` de `ProductModel` (backend).
- **`apps/web/tests/unit/api/products.test.tsx`** (574 líneas) — suite de test de `productSchema`/`parseProductResponse` y hooks relacionados. **12 tests, 7 fallando** en vivo por mocks sin `published_to_marketplace` (líneas ~54, 115, 174, 298, 357, 408, y uno inline ~512-533) — todos en el camino feliz que llega a `parseProductResponse`. 5 tests de camino de error pasan (nunca llegan al parse).
- **`apps/web/tests/unit/lib/api/reverseTransitions.test.tsx`** (234 líneas) — suite de test de las 4 transiciones de "deshacer" (`useReverseProduct`/`useResubmitProduct`/`useRestoreProduct`/`useRevertSaleProduct`) y `postReverseTransition`. **9 tests, 4 fallando** en vivo — un único helper compartido `mockProductResponse()` (líneas 38-58) sin el campo, un solo punto de fix resuelve las 4 fallas. 5 tests pasan (esquemas no relacionados `availableTransitionSchema`/`productAuditLogSchema`, o camino de error).
- **`apps/web/tests/unit/lib/api/products.test.ts`** (nota: `.ts`, no `.tsx`) — archivo hermano ya arreglado por el commit `7315fdf2` (2026-08-22), que endureció `published_to_marketplace` de opcional a requerido en el mismo commit que rompió los dos archivos de arriba — precedente exacto del fix mecánico a aplicar.
- **`apps/api/src/prosell/domain/entities/product.py`** / **`apps/api/src/prosell/infrastructure/models/product_model.py`** — fuente de verdad del contrato backend (`nullable=False, default=False` en el modelo SQLAlchemy). Solo se leyó el diff del commit que introdujo el campo, no el archivo completo — el contrato ya está documentado en `api-documentation.md`/`business-overview.md` de pases previos.
- **`apps/web/tests/unit/components/upload/setProductCover.test.ts`** — confirmada su existencia (no abierto), candidato al mismo síntoma; fuera de alcance de este scan, ver `reverse-engineering-timestamp.md`.

### Módulos nuevos inventariados — scan enfocado `260902-teamapi-create-param` (mismatch de parámetro `teamApi.create`)

- **`apps/web/src/lib/api/teamApi.ts`** (archivo completo) — 6 métodos: `create` (línea 40, body con `organization_id`; serialización L139), `listByOrg`, `getById`, `update`, `addMember`, `acceptInvitation`.
- **`apps/web/src/lib/api/schemas/teamApi.ts`** (archivo completo) — `TeamSchema.organization_id: z.string()` (línea 31, requerido, sin `.optional()`/`.nullable()`).
- **`apps/web/src/stores/teamStore.ts`** — acciones `createTeam`/`fetchTeamsByOrg`/`updateTeam` (L158-162 pasa el payload de `TeamForm.tsx` sin transformación al cliente API).
- **`apps/web/src/components/forms/TeamForm.tsx`** — `onSubmit` (L139-170) construye `{ name: data.name, organization_id: organizationId }`.
- **`apps/web/src/app/api/v1/teams/route.ts`** — "Mock API Route" declarada (comentario L2), `POST`/`GET` in-memory contra `global.__mockTeams`, usa `organization_id` consistentemente al leer y escribir.
- **`apps/web/src/app/api/v1/teams/[id]/route.ts`** — mock, solo exporta `GET` (sin `PATCH` — `teamApi.update()` probable 405 contra este mock, defecto relacionado no nombrado en el intent).
- **`apps/web/src/app/api/v1/teams/org/[orgId]/route.ts`** — mock, `GET` únicamente.
- **`apps/web/next.config.ts`** (líneas 82-102) — rewrite `/api/:path*` → backend tipo `fallback`; explica por qué los archivos de ruta mock de Next.js siempre ganan sobre el proxy real mientras existan.
- **`apps/api/src/prosell/infrastructure/api/routers/team_router.py`** (archivo completo) — 6 endpoints reales: `POST ""`, `GET "/org/{org_id}"`, `GET "/{team_id}"`, `PATCH "/{team_id}"`, `POST "/{team_id}/members"`, `POST "/{team_id}/invite"`, `POST "/accept-invitation"`.
- **`apps/api/src/prosell/application/dto/team/create.py`** (archivo completo) — `CreateTeamRequest.org_id: UUID` (línea 12, requerido, sin alias), `AddTeamMemberRequest`.
- **`apps/api/src/prosell/application/dto/team/response.py`** (archivo completo) — `TeamResponse.org_id: UUID` (línea 44), `TeamMemberResponse`, `TeamListResponse`.
- **`apps/api/tests/contract/schema_matching/test_team_dto_schemas.py`** (archivo completo) — instancia `CreateTeamRequest`/`TeamResponse` en aislamiento; no lee `teamApi.ts` — no puede detectar drift TS↔Pydantic por diseño.
- **`.skills/contract-testing/SKILL.md`** — describe "Layer 3: Schema Matching (DTO ↔ TypeScript Drift Detection)", el patrón que resolvería esta clase de bug; no hay instancia de ese test para `team`.
- **`apps/web/src/hooks/useTeams.test.ts`** (líneas 111-124, skimmed a nivel de esta sección) — test existente de `createTeam` mockea la acción del store directamente, sin asertar nombres de campo del payload de wire.

### Módulos nuevos inventariados — scan enfocado `260828-zod-3-to-4-migration` (organización de esquemas Zod)

- **`apps/web/src/lib/api/schemas/`** (17 archivos) — ubicación mayoritaria de los esquemas Zod-mirror: `orgApi.ts`, `category.ts`, `vendedores.ts`, `organizations.ts`, `productImageUrls.ts`, `leads.ts`, `walletApi.ts`, `authRoutes.ts`, `appointments.ts`, `authApi.ts`, `teamApi.ts`, y otros. Cada archivo abre con un comentario de cabecera justificando `.passthrough()` ("tolera campos del backend que la UI todavía no renderiza").
- **`apps/web/src/lib/api/verticals.ts`**, **`apps/web/src/lib/api/products.ts`**, **`apps/web/src/lib/api/extractErrorMessage.ts`** — 3 outliers de ubicación: definen esquemas Zod directamente en `lib/api/` en vez de en `lib/api/schemas/`. Inconsistencia de organización, no de contrato — ver `architecture.md` para el detalle.
- **`apps/web/src/lib/zod-resolver.ts`** — shim custom de `zodResolver` creado en el commit `d1af1858` (2026-07-20, la migración de #74), **nunca importado en ningún punto del código**. Los 15 call sites reales importan `zodResolver` directo de `@hookform/resolvers/zod`. Código muerto, residuo de un paso intermedio de esa migración — no pedido por este intent, señalado como aside.
- **`apps/web/src/components/forms/UnifiedProductForm.tsx`** (línea 99: `FIXED_FIELDS_SCHEMA`, línea 290: `.merge(attrSchema)`, línea 483: `.passthrough().parse(data)`) — outlier estructural: `.passthrough()` se invoca en el USE SITE, no en la definición del esquema, y ese mismo esquema se reutiliza en modo estricto en otro punto del archivo. Ver `architecture.md` para el análisis de por qué requiere una decisión explícita en Code Generation.
- **`apps/web/src/app/(seller)/settings/profile/page.tsx:28`** — un residuo de la migración #74 (ya cerrada): `.string().email({ message: "Correo inválido" })` con la forma encadenada + clave `message`, en vez de `z.email({ error: ... })`. Fuera del alcance declarado de este intent (`.passthrough()`/`z.nativeEnum()`), misma familia de drift de sintaxis — señalado como aside.

### Módulos nuevos inventariados — scan enfocado `260903-catalog-client-export` (export de catálogo formato cliente + ZIP de imágenes)

- **`domain/services/csv_export.py`** — genera las filas del export genérico actual (`UNIVERSAL_COLUMNS_ORDERED` + `attribute_schema` dinámico) y `build_image_folder_name()` (patrón `{AÑO}-{MARCA}-{MODELO}-{MILLAS}K-{COLOR}-{CÓDIGO_ORG}`, casi listo para el requerimiento del intent). **Bug confirmado**: lee `attrs.get("color")` en vez de `attributes["exterior_color"]` (donde el color real del vehículo se guarda) — el segmento COLOR se pierde silenciosamente.
- **`domain/services/csv_product_parser.py`** — parseo/mapeo inverso (import) de la fila CSV cliente a estructura de producto; referencia de simetría útil para diseñar el export en el mismo formato.
- **`domain/entities/organization.py`** — confirma `Organization.code: str | None`, máximo 5 caracteres (NO fijo en 2 — "MF"/"US" del ejemplo de `docs/data39.csv` es dato real, no una regla de schema).
- **`application/ports/ido_spaces.py`** — puerto de storage; hoy solo declara `upload`/`presign`/`delete`/`exists`. **No existe** un método para leer/descargar bytes ya almacenados — necesario para ensamblar el ZIP de imágenes, salvo que se resuelva vía `httpx` contra las `image_urls` públicas ya guardadas en `Product` (sin dependencia nueva).
- **`infrastructure/services/do_spaces_service.py`** (parcial — constructor/config leído este pase) — implementación concreta de `IDOSpacesService` contra DigitalOcean Spaces (boto3, compatible S3).
- **`infrastructure/api/routers/product_router.py`** (líneas 620-750: `export.csv` + `list_products`) — endpoint de export genérico existente, formato distinto al de 24 columnas del cliente.
- **`apps/web/src/lib/api/products.ts`** (líneas 1480-1560: `downloadSchemaTemplate`, `exportCatalogCsv`) — cliente API del export existente.
- **`apps/web/src/app/(seller)/catalog/page.tsx`** (líneas 360-400: `handleExportCsv`) — UI que dispara el export.
- **`docs/canonical/F01-bulk-upload-csv-import.md`** — spec de referencia del formato cliente; confirmado desactualizado respecto al código real en varios puntos (ver `code-quality-assessment.md`).
- **`docs/data39.csv`** — muestra real del formato cliente: **24 columnas** (`id;cod_dealer;price;category;type;location;year;make;model;mileage;body_style;exterior_color;interior_color;clean_title;state;fuel_type;transmission;option;description;path;groups;label;publicado;VIN`), no 23 como asume la descripción verbatim del intent — el "23" probablemente excluye `id`, a confirmar en Requirements Analysis.

### Módulos nuevos inventariados — scan enfocado `260910-export-cross-org` (modelo de permisos cross-org, endpoint de export)

- **`domain/entities/role.py`** — `RoleType` (enum de roles, incluye `SUPER_ADMIN`), `Permission` (enum, incluye `ORG_ADMIN_VIEW_ALL`/`MARKETPLACE_PUBLISH`), `ROLE_PERMISSIONS` (mapping rol→permisos).
- **`domain/entities/user.py`** — `User.has_role()`/`User.has_permission()` (L247-274), los dos métodos que todo el router usa para chequear acceso, con dos convenciones NO unificadas: por rol literal (`has_role("super_admin")`) o por permiso (`has_permission(Permission.ORG_ADMIN_VIEW_ALL)`).
- **`infrastructure/api/routers/product_router.py`** — `_check_org_scope_permission()` (L255-330, patrón 1: list-style, usado por `list_products`/`get_category_filter_values`/`get_featured_products`), `_require_marketplace_publish`/`_require_super_admin` (helpers de guard, mismo bloque), `create_product` (L426-485, patrón de org-override CON validación de existencia vía `org_repo.get_by_tenant_id()` — el único de los tres patrones cross-org que valida que el `organization_id` provisto exista), `get_product`/`get_product_image_urls` (L1036-1120, patrón 2: `is_org_admin` inline standalone), **`export-client-format.zip`** (L735-779, **sin ningún patrón cross-org** — resuelve `tenant_id` solo de `current_user.tenant_id`, L752-764, docstring L747-750 afirma la restricción como diseño intencional).
- **`application/use_cases/product/export_catalog_client_format.py`** — `ExportCatalogClientFormatUseCase.__init__`/`execute` (L67-107); firma recibe un único `tenant_id: UUID` — no requiere cambio de firma para soportar cross-org, la resolución de qué `tenant_id` pasar pertenece al router.
- **`domain/repositories/organization_repository.py`** — `get_by_tenant_id()` (L40-48), el método que `create_product` usa para validar existencia de un `organization_id` caller-supplied; `_check_org_scope_permission()` NO lo usa hoy.
- **`apps/api/tests/integration/api/routers/test_product_router_export_client_format.py`** — 3 clases de test completas. `TestExportClientFormatTenantIsolation::test_other_organizations_products_never_appear` autentica con `RoleType.SUPER_ADMIN` y asertaa que el producto de otra organización es invisible — codifica el gap reportado como comportamiento correcto, requiere revisión explícita en el fix.
- **`aidlc/spaces/default/intents/260903-catalog-client-export/inception/user-stories/personas.md`** — confirma textualmente que la exclusión de `super_admin` del flujo de export fue alcance de diseño explícito del intent `260903-catalog-client-export`, no una omisión de implementación.

### Módulos nuevos inventariados — scan enfocado `260911-export-org-selector` (selector de organización para export de catálogo)

- **`apps/web/src/components/admin/OrganizationPicker.tsx`** (completo) — componente reusable, único selector cross-org de UI en toda la app. Guard doble: `!isAdmin` (`useAuth().isAdmin`) → `null` a nivel de render; `organizationStore.setViewingOrgId()` es no-op si el rol no tiene `Permission.ORG_ADMIN_VIEW_ALL` (defensa en profundidad, no solo ocultamiento de UI). Dependencias: `useAuth()`, `useOrganizations()` (`apps/web/src/lib/api/organizations.ts:75`), `useOrganizationStore` (`viewingOrgId`/`setViewingOrgId`). Test precedente reusable: `OrganizationPicker.test.tsx` (mockea los tres hooks).
- **`apps/web/src/stores/organizationStore.ts`** (completo) — Zustand store con `viewingOrgId: string | null` + `setViewingOrgId()` (línea 361-367: no-op si `!userHasPermission(role, Permission.ORG_ADMIN_VIEW_ALL)`). Censo completo de `viewingOrgId` en `apps/web/src`: **ningún** hook de datos de la app (catálogo, review-queue, ni ningún otro) lo lee para filtrar — solo el propio `OrganizationPicker` lo lee/escribe. Renderizado en `Header.tsx`, global a toda la app.
- **`apps/web/src/hooks/useAuth.ts`** (completo) — `isAdmin` (línea 148) = `isSuperAdmin || userRole === "admin"`, más amplio conceptualmente que el permiso puntual `ORG_ADMIN_VIEW_ALL`, aunque hoy ambos roles con `isAdmin=true` también tienen ese permiso en `ROLE_PERMISSIONS`.
- **`apps/web/src/lib/auth/permissions.ts`** (completo) — `Permission.ORG_ADMIN_VIEW_ALL = "org:admin_view_all"` (línea 31), otorgado a `admin` y `super_admin` (líneas 46-61).
- **`apps/web/src/lib/api/organizations.ts`** (completo) — `useOrganizations()` (línea 75), consume `GET /api/v1/admin/organizations`, gateado server-side por `ORG_ADMIN_VIEW_ALL`, devuelve `Organization[]` (`OrganizationSchema`, `schemas/organizations.ts:45`). Es el endpoint que ya usa `OrganizationPicker` y el candidato natural a reutilizar para cualquier selector nuevo del flujo de export.
- **`apps/web/src/lib/api/schemas/organizations.ts`** (líneas 1-100) — `OrganizationSchema` (`{id, name, code, ...}`), distinto del `Organization` de `@/lib/api/orgApi.ts` (segunda representación paralela, usada para CRUD, no para "ver como" — ver `dependencies.md`).
- **`apps/web/src/app/(seller)/catalog/page.tsx`** (líneas 1-70, 420-720) — flujo de export sin wiring de organización: DropdownMenu "Exportar" (línea ~598) → "Exportar catálogo (formato cliente)" (líneas 618-624) → `handleOpenExportSummary` → `ExportSummaryBanner` inline (no modal, línea 664-670) → `onContinue` → `handleConfirmExportSummary` (línea 496) → `window.prompt` de nombre → `handleExportClientFormat(fileName)` (línea 459) → `exportCatalogClientFormat()`. El archivo no importa `useAuth` ni `organizationStore` — cero lógica de permisos/selección de organización hoy.
- **`apps/web/src/lib/api/products.ts`** (líneas 1500-1600) — `exportCatalogClientFormat()` (línea 1541): CERO parámetros, `fetch("/api/v1/products/export-client-format.zip", {credentials:"include"})` — nunca manda `organization_id`, aunque el backend ya lo acepta desde `260910-export-cross-org`.
- **`apps/api/src/prosell/infrastructure/api/routers/product_router.py`** (líneas 700-799) — forma final confirmada del endpoint post-merge `264d99f1`: `organization_id: UUID | None = None` como query param opcional, gateado por `_check_org_scope_permission(current_user, organization_id)` (mismo helper que `GET /products`, definido en línea 265). Backend listo; nada pendiente de este lado.
- **`apps/web/src/app/(admin)/admin/review-queue/page.tsx`** + **`apps/web/src/components/review/ReviewQueueTable.tsx`** — confirmado por grep dirigido: **sin selector de organización propio**. Corrige la premisa de que "el resto de la app ya permite elegir otra organización" a nivel de UI — el único selector cross-org real hoy es `OrganizationPicker`.
- **`docs/superpowers/changes/subsystem-d-dealer-ownership/design.md`** (líneas 27-42) — diseño original de Subsystem D que preveía conectar `viewingOrgId` a queries admin; nunca se completó más allá del propio picker.

### Módulos nuevos inventariados — scan enfocado `260911-cross-org-export-ux` (export "todas las organizaciones", filtrado real del catálogo, mapeo de columnas CSV cliente)

- **`apps/web/src/components/admin/OrganizationPicker.tsx`** (revisitado) — 2 ocurrencias literales del label a renombrar: línea 35 (`displayName` fallback del trigger) y línea 58 (ítem "limpiar selección"). Sin sentinel "todas" hoy más allá de `viewingOrgId === null` (que significa "mi propia organización").
- **`apps/web/src/stores/organizationStore.ts`** (revisitado) — `viewingOrgId: string | null` (línea 58, doc comment confirma `null` = "mi propia organización", NO "todas"). Introducir un modo "todas" requiere overload de este campo (ej. sentinel `"__all__"`) o un enum paralelo — decisión de diseño para Functional Design, no resoluble por lectura de código.
- **`apps/web/src/lib/api/organizations.ts`** (revisitado) — `useOrganizations()` (línea 75) sin parámetros de filtro hoy; la respuesta YA trae `product_count` por organización.
- **`apps/web/src/lib/api/schemas/organizations.ts`** (revisitado) — `OrganizationSchema` ya tipa `product_count: number` (líneas 42, 79) — confirma que filtrar por productos no requiere ningún cambio de contrato.
- **`apps/web/src/app/(seller)/catalog/page.tsx`** (revisitado, líneas 1-70, 312-394, 499-583) — `organizationId` (línea 312, org propia del viewer) solo alimenta `useOrgVerticals()`; `apiFilters` (líneas 379-384) pasado a `useInfiniteProducts(apiFilters, 50)` (línea 394) no tiene `organization_id`; `viewingOrgId` (línea 320) solo se usa para `exportOrganization`/`resolveExportOrganization` (líneas 95-121, 313-327) y `emptyCatalogExportMessage()` (líneas 113-121) — nunca para filtrar productos. Dos sitios de `window.prompt` confirmados como el único patrón de este tipo en `apps/web/src`: `handleExportCsv` (499-517, sin default) y `handleConfirmExportSummary` (572-583, CON default + `null`=cancelar).
- **`apps/web/src/lib/api/products.ts`** (revisitado, líneas 1170-1185) — `ProductFilters` (tipo usado por `useInfiniteProducts()`) no declara `organization_id` — el campo que falta agregar para que el filtrado real de la grilla sea posible. `handleExportClientFormat` (catalog/page.tsx líneas 531-570) solo pasa un `organizationId` singular opcional — sin señal para "exportar todas".
- **`apps/api/src/prosell/domain/services/csv_export.py`** (revisitado) — `CLIENT_FORMAT_COLUMNS` (94-119) / `_CLIENT_FORMAT_ATTRIBUTE_COLUMNS` (127-148) / `build_client_format_row()` (161-193): confirma que `body_style`/`clean_title`/`state`/`groups`/`VIN`/`category`/`type`/`location` se leen todos vía `attributes.get(<mismo nombre que la columna>)` — la causa raíz de por qué salen vacíos/incorrectos. `build_organization_code_segment()` (151-158) y `build_vehicle_zip_folder_name()` (196-221) son sanitizers reusables ya existentes, sin equivalente para combinar una carpeta base con el nombre de producto (necesario para el popup de `path`, ítem 6).
- **`apps/api/src/prosell/application/use_cases/product/export_catalog_client_format.py`** (revisitado) — `execute(self, *, tenant_id: UUID)` (línea 86) no-opcional; organización resuelta UNA VEZ (línea 111), `org_code` reusado para todo el loop (127-147) — blocker estructural para "todas las organizaciones" (ver `dependencies.md`).
- **`apps/api/src/prosell/infrastructure/api/routers/product_router.py`** (revisitado, `_check_org_scope_permission()` línea 265-293, endpoint de export 735-798) — docstring línea 763 documenta explícitamente que omitir `organization_id` en el export significa "propia organización", asimétrico respecto a `list_products` (~línea 837), donde significa "todas".
- **`apps/api/src/prosell/infrastructure/repositories/product_repository_impl.py`** (revisitado) — `get_all()` (línea 185) y `count()` (línea 400) YA aceptan `tenant_id: UUID | None`; docstring de `count()` confirma "tenant_id=None lifts tenant isolation" — capacidad cross-tenant ya presente en la capa de repositorio, sin cambios requeridos.
- **`apps/api/src/prosell/infrastructure/repositories/category_repository_impl.py`** (nuevo, este pase) — `get_by_id_cross_tenant()` (líneas 120-129) ya existe y resuelve `category_id` → entidad de categoría sin query nueva; usable para derivar `category`/`type` en el export.
- **`apps/api/src/prosell/domain/services/csv_field_mapper.py`** (revisitado, foco en el mapeo INVERSO del que necesita el export) — `title_status` convertido de `"0"`/`"1"` (CSV) a `"clean"`/`"rebuilt"` (dominio) en el import (líneas 194-212, la función inversa que el export necesita implementar); `facebook_groups` separado de string a `list[str]` en el import (líneas 214-231); `parse_location()` (líneas 171-192) parsea `"Orlando florida"` → ciudad + código de estado — inverso exacto de lo que el export necesitaría, pero `location_state` se persiste como código, no nombre completo (pérdida de fidelidad).
- **`apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py`** (revisitado, líneas 430-469) — confirma las claves reales de `attributes` (`body_type`, `vin`, `title_status`, `facebook_groups`, `title_state`) contra las que `csv_export.py` debería leer — la fuente de verdad del mismatch de nombres.
- **`apps/api/src/prosell/infrastructure/database/seed_categories.py`** (revisitado, líneas 699-738) — confirma el árbol real de categorías con 3-4 niveles (ej. `"Vehículos y Transporte" > "Vehículos Terrestres" > "Carros y Camionetas"`), que no mapea limpio a las 2 columnas planas `category`/`type` del CSV cliente — pregunta de diseño abierta para Requirements Analysis.
- **`docs/data39.csv`** (revisitado, líneas 1-40) — confirma valores reales de ejemplo: `state` = descriptor de condición (`"Muy bueno"`, no un estado de EE.UU.), `clean_title` = `"0"`/`"1"`, `path` con forma `{make}/{org-code}/{descriptive-folder}` (ej. `Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/MF/2020-EXPLORER-XLT-70K-GRIS-MF`, distinto de lo que produce hoy `build_vehicle_zip_folder_name()`), `groups` = `"1,2,3"`.
- **`apps/api/src/prosell/domain/entities/product.py`** (revisitado) — `attributes: dict[str, object]` (línea 45, sin schema de enforcement a nivel de entidad); `location_city`/`location_state`/`location_zip` (65-67) son campos separados (también en `product_model.py:74-76`); `category_id: UUID` (línea 28) sin nombre de categoría denormalizado.

### Módulos nuevos inventariados — scan enfocado `260915-vehicle-catalog` (catálogo editorial de valores Facebook vs. normalización de VIN decode)

- **`apps/api/src/prosell/infrastructure/services/nhtsa_normalizer.py`** (revisitado) — `NHTSA_TO_FACEBOOK`: tabla de traducción de valores decodificados del VIN a tokens en **inglés/minúscula** (`"suv"`, `"gasoline"`, `"FWD"`), consumida por `vehicle_router.py` (`POST /vehicles/decode-vin`). 17 tests dedicados (`test_nhtsa_normalizer.py`).
- **`apps/web/src/components/forms/schema/VinDecodeField.tsx`** (nuevo, este pase) — `mapDecodedToForm()` (líneas 141-148): para campos "select-backed", asume por comentario explícito en el código que el valor decodificado YA calza exactamente con alguna `option` del `attribute_schema` — sin validación runtime que confirme el supuesto. 3 tests (`VinDecodeField.test.tsx`), ninguno ejercita el caso de desalineación.
- **`apps/web/src/components/admin/category-schema-editor.tsx`** (nuevo, este pase) — botón "Load from Facebook catalog" puebla `options` de un campo `select` con los valores del catálogo NUEVO (`facebook-values/index.ts`, español). `FACEBOOK_FIELD_KEY_MAP`: mapeo manual estático de claves de `attribute_schema` → `FacebookFieldKey`, sin validación cruzada contra campos nuevos. 2 `describe` de test (`category-schema-editor.test.tsx`).
- **`apps/web/src/lib/i18n/facebook-values/index.ts`** (skimmed only, primeras 120 de 1563 líneas — catálogo agregado esta semana, commits `b0015223`/`c1c86138`) — strings oficiales de Facebook Marketplace en **español** (`"SUV"`, `"Gasolina"`). 3643 líneas de test de regresión (`facebook-values/index.test.ts`) que fijan el contenido exacto del catálogo, sin ejercitar su interacción con `nhtsa_normalizer.py`/`VinDecodeField.tsx`.
- **`apps/api/src/prosell/domain/services/category_translation.py`** (nuevo, este pase) — `CATEGORY_TRANSLATION_TABLE`: una sola entrada hardcodeada (`"vehiculos-y-transporte"` → `("Vehiculos", "Auto/camioneta")`), sin test unitario dedicado — solo se ejercita indirectamente vía `test_export_catalog_client_format.py`.
- **`apps/api/src/prosell/domain/entities/category.py`** (revisitado) — `Category.validate_attributes()` valida `options` del `attribute_schema` solo en el backend, al guardar — no hay ningún chequeo equivalente en el momento del autocompletado por VIN decode del lado frontend.
- **`apps/api/src/prosell/domain/ports/i_publisher_service.py`** / **`apps/api/src/prosell/infrastructure/services/publisher_strategy.py`** (revisitados) — el puerto/adapter de publicación a Facebook (`IPublisherService`/`PublisherStrategySelector`, implementaciones `playwright_publisher.py`/`graph_api_publisher.py`/`null_graph_api_publisher.py`, seleccionadas por `settings.publisher_engine`) ya existe y está en producción — confirma que el contrato de adapter que este intent podría necesitar no se diseña de cero.
- **`apps/api/src/prosell/infrastructure/repositories/category_repository_impl.py`** / **`apps/api/src/prosell/infrastructure/database/seed_categories.py`** (revisitados, sin hallazgo nuevo respecto al pase `260911-cross-org-export-ux`) — confirman el árbol de categorías real de 3-4 niveles, sin relación directa con la desalineación de catálogos de valores de este pase.
- **`apps/api/scripts/MIGRATE_VEHICLES_README.md`** (skimmed, head/tail) — referencia un `vehicle_model.py` que correspondería a una tabla `vehicles` ya eliminada (migración de 2026-05) — potencialmente obsoleta, no verificado con certeza.
- **`apps/web/src/app/(admin)/admin/import-client-csv/page.tsx`** (grep puntual, sin lectura profunda) — consumidor del flujo de import client CSV, fuera del foco central de este pase pero relacionado al mismo dominio de mapeo de valores de vehículos.

## Patrones de código confirmados

- **Clean Architecture backend estricta**: dependencia unidireccional `Infrastructure → Application → Domain`.
- **Repository pattern**: interfaces en `domain/repositories/`, implementación concreta en `infrastructure/repositories/`.
- **Strategy pattern**: `PublisherStrategy` con dos implementaciones intercambiables (`GraphApiPublisher`, `PlaywrightPublisher`) + un `NullGraphApiPublisher` (null object pattern) para el caso sin configuración.
- **Excepciones de dominio tipadas por subdominio**: `<Dominio>DomainException` con subclases específicas + exception handler centralizado (`exception_handlers.py`) — patrón que el equipo afirmó adoptar también en frontend hacia adelante (ver `team.md` Q6, aún no implementado sistemáticamente en `apps/web`).
- **BFF proxy pattern**: rutas `route.ts` en Next.js que reenvían al backend, con variantes catch-all (`[...path]/route.ts`) para pasar sub-rutas completas.
- **Zod-mirror**: cada esquema de respuesta backend tiene un espejo Zod en frontend, parseado antes de usar (`safeParse`/`parse`), regla zero-tolerance del proyecto contra `as X` sin validar.
- **Acceso cross-org — tres variantes NO unificadas en `product_router.py`** (nuevo, scan `260910-export-cross-org`): (1) `_check_org_scope_permission()` + parámetro `organization_id` (lecturas listadas); (2) `is_org_admin` inline vía `has_permission(Permission.ORG_ADMIN_VIEW_ALL)` (lecturas single-resource, más `create_product` con validación de existencia adicional); (3) `has_role("super_admin")` literal, que bypassea el permiso `ORG_ADMIN_VIEW_ALL` por completo (acciones batch). No es un patrón consolidado — un endpoint nuevo debe elegir explícitamente cuál replicar, no inferirlo por analogía con el vecino más cercano en el archivo.
- **`OrganizationPicker`/`organizationStore.viewingOrgId` — único mecanismo cross-org de UI, hoy sin consumidores** (nuevo, scan `260911-export-org-selector`): patrón de estado global (Zustand) + componente gateado por permiso, pensado para "ver como otra organización" en toda la app, pero cuyo lado de consumo (qué hooks de datos honran `viewingOrgId`) nunca se completó — ver `architecture.md` § Interaction Diagrams diagrama 14.
- **`window.prompt()` con valor por defecto sugerido + `null`=cancelar — único patrón de "pedir un dato puntual" del flujo de export** (confirmado, scan `260911-cross-org-export-ux`): `catalog/page.tsx` tiene 2 sitios (`handleExportCsv`, sin default; `handleConfirmExportSummary`, CON default calculado). Ningún otro archivo de `apps/web/src` usa `window.prompt` — patrón de referencia obligado para los popups nuevos de `path`/`groups` (ítems 6-7 del intent), no un patrón a inventar.
- **Repositorio ya cross-tenant-ready, use case todavía no lo expone** (nuevo, scan `260911-cross-org-export-ux`): `product_repository_impl.py` ya soporta `tenant_id: UUID | None` en `get_all()`/`count()` para "levantar" el aislamiento multi-tenant cuando se necesita una vista global — patrón ya usado en otro punto del código (`list_products`), pero `ExportCatalogClientFormatUseCase` todavía no lo consume, y además resuelve datos org-dependientes (código de organización) una sola vez por ejecución en vez de por fila — antipatrón a corregir si se habilita el modo "todas las organizaciones".
- **Dos catálogos de "valores que acepta Facebook" con propósitos distintos, nunca reconciliados** (nuevo, scan `260915-vehicle-catalog`): `nhtsa_normalizer.py` (`NHTSA_TO_FACEBOOK`, tokens inglés/minúscula, consumido por el flujo de decode-VIN) y `facebook-values/index.ts` (catálogo editorial en español, consumido por el botón "Load from Facebook catalog" del schema editor) fueron construidos en momentos distintos para necesidades distintas, sin unificación ni validación cruzada — mismo espíritu de "patrón no consolidado, crecimiento orgánico" que el hallazgo ya documentado de los tres patrones de acceso cross-org en `product_router.py`.
