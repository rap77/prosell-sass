# Dependencies — ProSell SaaS

## Dependencias externas — backend (`apps/api`)

Ver `technology-stack.md` para el listado completo con versiones. Puntos relevantes de gestión de dependencias:

- **`stripe>=11.0.0`** — declarada en `pyproject.toml`, **cero imports (`import stripe`/`from stripe`) en `apps/api/src`** verificados este pase. No hay evidencia de integración de cobro activa; el módulo `wallet` (`wallet_router.py`, entidad `wallet.py`) parece operar como libro de saldo interno, no como flujo conectado a un proveedor de pagos externo.
- **`anthropic>=0.40.0`** — declarada en `pyproject.toml`, **cero imports (`import anthropic`) en `apps/api/src`** verificados este pase. Sin evidencia de pipeline de IA/ML activo — consistente con la ausencia total de código de scraping genérico o predicción de precio (ver `business-overview.md` § Corrección respecto a `CLAUDE.md`).
- Ambas son candidatas a remover del `pyproject.toml` si no hay plan concreto de uso, o a documentar explícitamente como "reservadas para funcionalidad futura" si el equipo confirma la intención.
- **`facebook-sdk>=3.1.0`** + **`playwright>=1.42.0`** — SÍ tienen uso real confirmado: `facebook_graph_api_client.py`, `graph_api_publisher.py`, `playwright_publisher.py`.
- **`boto3>=1.35.0`** — uso confirmado en `do_spaces_service.py` (almacenamiento DigitalOcean Spaces, API compatible con S3).

## Dependencias externas — frontend (`apps/web`)

- **Zod (`^4.4.0`)**: paquete instalado en versión 4, pero el código de `apps/web/src/lib/api/schemas/` sigue escrito en estilo Zod 3 (`.passthrough()` confirmado en 11 archivos este pase; `z.nativeEnum()` en `leads.ts`). `AGENTS.md` documenta la regla "usar Zod 3 hasta resolver issue #74" pese al paquete ya instalado en v4 — inconsistencia de intención vs. instalación real. Migración completa (41+ call sites según aprendizaje previo) trackeada aparte en el intent `260828-zod-3-to-4-migration`, aún sin ejecutar.
- **TanStack Query (`^5.0.0`)**: usado en la mayoría de la app para data-fetching; el área de navegación auth es una excepción confirmada — usa Zustand (`authStore.ts` con `persist`) en su lugar, no TanStack Query.
- **TailwindCSS (`3.4.17` exacto)**: pin de versión mayor 3, no 4 — ver drift de documentación en `technology-stack.md`.

## Servicios externos consumidos (integraciones runtime)

| Servicio                       | Propósito                                                         | Módulo(s) backend                                                                                 |
| ------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Facebook Graph API             | Publicación oficial de listados, OAuth de cuentas Facebook        | `facebook_graph_api_client.py`, `facebook_marketplace_oauth_service.py`, `graph_api_publisher.py` |
| Facebook Marketplace (browser) | Publicación vía automatización de navegador (estrategia fallback) | `playwright_publisher.py`                                                                         |
| NHTSA (VIN decoder)            | Decodificación de VIN para la vertical vehículos                  | `nhtsa_vin_service.py`, `nhtsa_normalizer.py`                                                     |
| fueleconomy.gov                | Datos de eficiencia de combustible                                | `fueleconomy_service.py`                                                                          |
| DigitalOcean Spaces            | Almacenamiento de imágenes (API compatible S3, vía boto3)         | `do_spaces_service.py`                                                                            |
| Resend                         | Envío de email transaccional                                      | `services/email/{message,renderer,retry,sender,service}.py`                                       |
| PostgreSQL 17                  | Persistencia principal                                            | SQLAlchemy 2.0 async, Alembic                                                                     |
| Redis 7.4+                     | Cache + broker de tareas asíncronas                               | `redis_service.py`, Taskiq                                                                        |
| Stripe                         | **Declarado, sin integración activa confirmada**                  | —                                                                                                 |
| Anthropic (Claude API)         | **Declarado, sin integración activa confirmada**                  | —                                                                                                 |

## Dependencia interna — CI `test-python` → `create_test_schema.py` → modelos ORM (NO Alembic)

Nuevo hallazgo del scan enfocado `260830-ci-seed-data`: el job `test-python` de `.github/workflows/ci.yml` (y el pre-push hook local, vía `sync-test-db.sh`) dependen de `apps/api/scripts/create_test_schema.py`, que a su vez depende directamente de `Base.metadata` (`infrastructure/database/base.py`) y de **todos los modelos SQLAlchemy registrados en ese metadata** — no de la cadena de migraciones de `alembic/versions/` (71 migraciones). Esta es una dependencia interna deliberada, no accidental (ver `architecture.md` para el porqué), pero tiene una consecuencia de acoplamiento concreta: **la cadena real de Alembic nunca se ejercita en CI**, así que un drift o rotura en esa cadena (ya documentado en `20260601_recreate_facebook_tables.py`) no se detecta por la suite de tests — solo se descubriría en un deploy real o una reconstrucción manual de DB. Cualquier cambio a un modelo SQLAlemy se refleja automáticamente en el schema de test (sin necesidad de generar una migración nueva para que CI pase), lo cual reduce fricción de desarrollo pero también reduce la señal de que "los tests pasan" implique "la migración real funciona".

## Dependencias internas nuevas — scan enfocado `260830-ci-fixes-round2`

- **`test_batch_review_api.py` → `product_repository_impl.py` → `product_router.py`**: la cadena de test de batch review pasa por el repositorio concreto de producto antes de llegar al router; el fix de FK (agregar `test_category`) debe respetar esta cadena.
- **`bulk_upload_vehicles.py` → `csv_field_mapper.py`, `csv_image_mapper.py`, `organization_repository.py`**: el use case de bulk upload depende del mapper de CSV (que a su vez decide el fallback `cod_organization ← title`), del mapper de imágenes, y del repositorio de organización para resolver el código a un `Organization` real.
- **`fb_sync_router.py` → `fb_unpublish_request_model.py`, `fb_account_model.py`, `marketplace_publication_model.py`**: el handler `unpublish_callback` toca tres modelos SQLAlchemy — el propio request de unpublish (cuya columna `status` tiene el `server_default="queued"` del que depende la rama `"failed"`), la cuenta de Facebook activa (`_get_active_fb_account`), y la publicación de marketplace asociada.

## Dependencias internas — cruce entre paquetes del monorepo

- **`apps/web` → `apps/api`**: exclusivamente vía HTTP en runtime, a través de las 31 rutas BFF (`app/api/{auth,v1}/**/route.ts`) y del redirect directo de navegador para OAuth. **Sin dependencia de build-time**.
- **`apps/api`**: sin dependencia de ningún otro paquete del monorepo — es el único consumidor real de la base de datos y de los servicios externos.
- **`packages/*`**: declarado en `pnpm-workspace.yaml` (glob `packages/*`) pero **el directorio no existe físicamente** — glob de workspace sin cumplir, cero paquetes compartidos reales. El contrato de tipos entre frontend y backend se sincroniza hoy a mano vía los esquemas Zod-mirror (`apps/web/src/lib/api/schemas/`), no vía un paquete compartido en build-time.
- **`tests/e2e` (`@prosell/e2e`)**: miembro de workspace independiente con su propio `package.json`, consume ambos `apps/web` y `apps/api` solo como stack levantado en runtime (Playwright contra URLs reales), sin dependencia de código en build-time.
- **`apps/app`**: micro-app huérfana de un solo archivo (`privacy/page.tsx`), sin `package.json` propio, no participa del grafo de build activo del workspace pnpm.

## Dependencias internas nuevas — scan enfocado `260828-useeffect-to-react-query` (onboarding / invite)

- **`orgApi.ts` ↔ `teamApi.ts`**: duplicación verbatim de la clase `ApiError` y de `handleResponse<T>()` entre ambos módulos — no es una dependencia formal (cada uno tiene su propia copia), pero es el punto natural de consolidación si se crea un archivo de hooks/utilidades compartido para envolver ambos en React Query.
- **`onboarding/page.tsx` → `orgApi.ts`**, **`invite/[token]/page.tsx` → `teamApi.ts`**: ninguno de los dos flujos pasa por `fetchWithAuth.ts` — a diferencia de `notificationsApi.ts`/`leads.ts`/`useInferCategory.ts`, que sí lo usan. Consecuencia: ambos flujos carecen hoy de auto-refresh de sesión en 401 (silencioso, no reportado como incidente pero sí como riesgo latente); envolver en React Query sin resolver esto preserva el gap tal cual.
- **`invite/[token]/page.tsx` → `ApiError` (tipo)**: dependencia de comportamiento no obvia — el branching de error de la página (`error.message.toLowerCase().includes(...)`, `error.status === 401`) depende de que el error lanzado conserve `status`/`message` reales del backend. Cualquier envoltura futura en `useMutation` que sustituya `ApiError` por un `Error` genérico (como hace `notificationsApi.ts`) rompería este branching.

## Dependencia interna — mocks de test frontend acoplados al contrato `productSchema` (scan enfocado `260901-frontend-test-debt`)

`products.test.tsx` y `reverseTransitions.test.tsx` construyen objetos `Product` mock a mano (sin factory compartida) que deben mantenerse sincronizados con `productSchema` (`apps/web/src/lib/api/products.ts`), que a su vez espeja `ProductModel` (backend). Cuando el commit `7315fdf2` endureció `published_to_marketplace` de opcional a requerido, arregló el archivo hermano `products.test.ts` pero no estos dos — no hay ningún mecanismo (factory, fixture compartida, contract test) que fuerce a los tests a seguir el schema automáticamente; cada archivo de test mantiene su propia copia del shape de `Product`. Ningún cambio de dependencia nueva — es acoplamiento interno ya existente, sin paquete de por medio.

## Dependencia interna — `teamApi.ts` ↔ `CreateTeamRequest`/`TeamResponse` (contrato de wire, mismatch confirmado, scan enfocado `260902-teamapi-create-param`)

`apps/web/src/lib/api/teamApi.ts` y `apps/web/src/lib/api/schemas/teamApi.ts` dependen implícitamente de mantener el nombre de campo `organization_id`/`org_id` sincronizado con `apps/api/src/prosell/application/dto/team/{create,response}.py` — no hay ningún mecanismo (contract test real, tipo compartido, `packages/*`) que lo fuerce. La dependencia se rompió en ambos sentidos (request y response) sin que ningún test lo detectara, porque `apps/web/src/app/api/v1/teams/route.ts` (mock BFF in-memory) intercepta la petición antes de que llegue al backend real — ver `architecture.md` § Interaction Diagrams (diagrama 11) y `api-documentation.md` para el contrato completo. Es el mismo patrón de fondo que la falta de "Layer 3" (schema-matching DTO↔TypeScript) que `.skills/contract-testing/SKILL.md` ya describe pero no implementa para `team`.

## Dependencias de infraestructura de calidad (dev-time)

- **GGA (Gentleman Guardian Angel)** — revisor de código con IA, proveedor `codex`, bloqueante en pre-commit, primero en el orden de hooks. Explícitamente NO es un SAST (no detecta injection/XSS/SSRF/deserialización insegura de forma determinística) — ver `code-quality-assessment.md`.
- **react-doctor** — auditoría de arquitectura/lint frontend, bloqueante en pre-commit (`--staged --blocking warning`), advisory-only en CI (`react-doctor.yml`).
- **Dependabot** — cobertura exclusiva del ecosistema `github-actions`; sin CVE scanning de dependencias npm (`apps/web`) ni Python/uv (`apps/api`).
