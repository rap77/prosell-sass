# Component Inventory — prosell-sass

Confianza por componente: **profundo** (archivos leídos y entendidos en este pase) vs **superficial** (solo listado de directorio/nombres de archivo, vía `fd`/enumeración — no leído). Un componente puede mezclar ambos: se indica por sub-área.

---

## API Layer (FastAPI Routers)

- **Responsabilidad**: exponer la superficie REST del backend; validación de entrada, autenticación/autorización, orquestación hacia el Application Layer.
- **Ubicación**: `apps/api/src/prosell/infrastructure/api/routers/` (25 archivos de router, 30 `include_router()` en `main.py`).
- **Confianza**: profundo en `public_product_router.py`, `vehicle_router.py`, `category_router.py`; superficial (solo nombre) en los otros 22 routers (`admin_organizations_router`, `admin_router`, `appointment_router`, `auth_router`, `branch_router`, `category_inference_router`, `facebook_router`, `fb_account_router`, `fb_credential_migration_router`, `fb_sync_router`, `health_router`, `image_router`, `lead_router`, `marketplace_access_router`, `notification_router`, `org_router`, `org_verticals_router`, `product_router`, `publisher_router`, `team_router`, `test_cleanup_router`, `test_router`, `user_branch_router`, `user_router`, `vendedor_router`, `wallet_router`, `webhook_router`).
- **Dependencias**: Application Layer (use cases), Pydantic DTOs.
- **Hallazgo notable**: `auth_router.py.backup2` — archivo de respaldo suelto en el árbol del repo, no debería estar versionado.

## Domain Layer (Entidades y Value Objects)

- **Responsabilidad**: reglas de negocio puras, sin dependencias externas (regla explícita de `CLAUDE.md`: "Domain layer has ZERO external dependencies").
- **Ubicación**: `apps/api/src/prosell/domain/{entities,value_objects,services,exceptions}/`.
- **Confianza**: profundo en `entities/category.py` (sección de validación de atributos), `value_objects/organization_contact.py`, `services/template_composer.py`; superficial en el resto del subárbol (~421 archivos Python en todo `apps/api/src/prosell/` según conteo total, no desglosado por capa).
- **Dependencias**: ninguna (por diseño).
- **Hallazgo notable**: `Category.validate_attributes()` SÍ implementa la validación de pertenencia a `options` cuando el campo trae opciones — el backend de dominio ya soporta selects con opciones; el bug de BUG-3/6 está aguas abajo, en la UI de edición de schema (ver `architecture.md` § Interaction Diagrams #1).

## Application Layer (Use Cases y DTOs)

- **Responsabilidad**: orquestación de casos de uso, DTOs de transferencia, puertos hacia infraestructura.
- **Ubicación**: `apps/api/src/prosell/application/{use_cases,dto,ports}/`.
- **Confianza**: profundo en `dto/category/response.py`; superficial en el resto.
- **Dependencias**: Domain Layer (hacia adentro), implementado por Infrastructure (puertos).
- **Hallazgo notable — duplicación de caso de uso**: existen dos clases `CreateOrganizationUseCase` distintas en directorios hermanos —`application/use_cases/org/create_organization.py` (usado por `org_router.py`, auto-registro) y `application/use_cases/organization/create_organization.py` (usado por `admin_organizations_router.py`, creación por admin). Ambas están cableadas y en uso simultáneo; la partición `org/` vs `organization/` (con solapamiento adicional en `get_organization.py`/`update_organization.py` vs `invite_organization_owner.py`/`approve_marketplace_access.py`) es deuda de claridad arquitectónica, fuera del alcance de los bugs actuales pero digna de una unidad de refactor futura.

## Infraestructura de Persistencia (SQLAlchemy + Alembic)

- **Responsabilidad**: mapeo objeto-relacional, migraciones de esquema.
- **Ubicación**: `apps/api/src/prosell/infrastructure/{models,repositories}/`, `apps/api/alembic/versions/` (71 migraciones).
- **Confianza**: superficial (conteo de migraciones, no leídas individualmente).
- **Dependencias**: PostgreSQL 17, asyncpg.

## Infraestructura de Servicios e Integraciones

- **Responsabilidad**: adaptadores hacia servicios externos — decodificación VIN (NHTSA), storage de imágenes (Spaces/S3 vía boto3), pagos (Stripe), scraping/publicación (Facebook via `facebook-sdk` + Playwright server-side), 2FA (pyotp/qrcode), tareas asíncronas (taskiq+redis), i18n backend.
- **Ubicación**: `apps/api/src/prosell/infrastructure/services/`, `apps/api/src/prosell/infrastructure/i18n/`.
- **Confianza**: profundo en `nhtsa_vin_service.py`, `nhtsa_normalizer.py` (sección de mapeo MAKE/BODY_TYPE), `i18n/translator.py`; superficial en el resto.
- **Hallazgo notable**: `Translator`/`translator` singleton (`i18n/translator.py`) no es importado por nada fuera de su propio `__init__.py` — **código muerto**, confirmado por búsqueda de referencias. El backend no traduce ningún mensaje en runtime pese a tener la infraestructura montada.

## App Router (Next.js UI)

- **Responsabilidad**: enrutamiento de páginas, layouts, server components.
- **Ubicación**: `apps/web/src/app/` — grupos de rutas `(admin)`, `(seller)`, `api`, `auth`, `branch`, `invite`, `manager`, `onboarding`, `p`, `privacy`, `profile`, `terms`, `vendedor`.
- **Confianza**: profundo en `(admin)/admin/review-queue/page.tsx`, `(seller)/catalog/page.tsx`, `p/[slug]/page.tsx`; superficial (solo estructura de grupos) en el resto.
- **Dependencias**: Proxy API Routes (BFF), Componentes UI.

## Proxy API Routes (BFF)

- **Responsabilidad**: reenvío de requests del navegador hacia el backend FastAPI, con manejo de cookies httpOnly.
- **Ubicación**: `apps/web/src/app/api/v1/`.
- **Confianza**: superficial en este pase (no se abrió ningún archivo de proxy) — **riesgo conocido de memoria de sesión previa**: `api/v1/products/[...path]/route.ts` tenía un bug confirmado (corregido en sesión 2026-08-21, no verificado si aplica a otros proxys) donde solo reenviaba `Content-Type`/`Cookie` y descartaba silenciosamente `If-Match`, rompiendo endpoints de "deshacer". Ese hallazgo queda fuera del scan de este intent (no está entre los 7 bugs) pero es relevante para `dependencies.md` y para una auditoría futura de `organizations`/`categories` proxies con el mismo patrón.

## Componentes UI (React) — Formularios, Admin, Catálogo, Público

- **Responsabilidad**: presentación y lógica de interacción; formularios dinámicos guiados por schema, editor de schema de categorías, tabla de cola de revisión, vista pública de producto.
- **Ubicación**: `apps/web/src/components/{forms,admin,review,catalog,public,ui,i18n}/`.
- **Confianza**: profundo en `SchemaFieldRenderer.tsx`, `VinDecodeField.tsx`, `category-schema-editor.tsx`, `ReviewQueueTable.tsx`, `ShareMenu.tsx`, `ContactManager.tsx`, `ProductPublicView.tsx`, `ProductCard.tsx` (sección título/subtítulo), `LocaleSwitcher.tsx`; superficial en el resto de las 23 subcarpetas enumeradas bajo `components/`.
- **Hallazgo notable**: `SchemaFieldRenderer.tsx` decide renderizar un `<Select>` únicamente inspeccionando si `entry.options` es un array no vacío — nunca inspecciona `render_as` (comentario propio en el código: "check options array, not type — schema uses filter_type for select"). Ver root cause completo en `architecture.md`.

## Cliente API y Contratos Zod

- **Responsabilidad**: tipado y validación runtime de las respuestas del backend en el frontend (patrón "Zod-mirror" — cada endpoint backend tiene un schema Zod espejo).
- **Ubicación**: `apps/web/src/lib/api/` (30 módulos, enumerados por nombre de archivo, no leídos), `apps/web/src/lib/api/schemas/categorySchema.ts` (leído), `apps/web/src/types/category.ts` (leído).
- **Confianza**: profundo solo en los dos archivos de tipos de categoría.
- **Hallazgo notable — raíz de BUG-3/6**: dos definiciones de tipo paralelas e inconsistentes para el mismo concepto backend (JSONB `attribute_schema`):
  - `AttributeField` (Zod, `categorySchema.ts`) — usado por el editor de admin. `type` no incluye `"select"`, no tiene campo `options`. `render_as` SÍ incluye `"select"`.
  - `AttributeSchemaEntry` (`types/category.ts`) — usado por el renderer de formulario runtime y los filtros de catálogo. `type` SÍ incluye `"select"`, tiene `options?: (string|number)[]`. `render_as` solo admite `"vin_decode"|"textarea"` — NO incluye `"select"`.
  - El DTO backend (`CategoryResponse.attribute_schema: dict[str, dict[str, object]]`) es JSONB libre y persiste cualquier forma sin validar contra ninguno de los dos tipos frontend — por eso el admin puede elegir "Render As → select" sin que exista ningún control para poblar `options`, y el dato se guarda igual.

## Componente Legal — apps/app (micro-app)

- **Responsabilidad**: no confirmada con certeza — solo se encontró una página `privacy/` (`apps/app/privacy/page.tsx`). Hipótesis razonable: micro-app de páginas legales (privacidad/términos), posiblemente separada del dominio principal para servir contenido estático sin el bundle completo de `apps/web`. **No leído** — presencia confirmada, contenido no verificado.
- **Ubicación**: `apps/app/`.
- **Confianza**: superficial (solo enumeración de archivos).
- **Nota**: `CLAUDE.md` describe la estructura del monorepo como `apps/api` + `apps/web` únicamente — `apps/app` no está documentado ahí. Posible drift de documentación o app agregada después de escribir `CLAUDE.md`.

## Paquete `packages/shared-types`

- **Estado**: **NO ENCONTRADO en este pase**. `CLAUDE.md` lo describe bajo `## Monorepo Structure` como "Shared code (future)", y la carpeta `packages/` no existe en el árbol actual (verificado con `fd . packages -d 2`, sin resultados). Se documenta como **aspiracional, no implementado** — corrige la entrada equivalente de cualquier store previo que lo listara como presente.

## Suite E2E (Playwright)

- **Responsabilidad**: pruebas end-to-end de flujos de usuario reales.
- **Ubicación**: `tests/e2e/{specs,fixtures}/` — 88 archivos.
- **Confianza**: superficial (conteo, no leído).

## Infraestructura Docker y CI/CD

- **Responsabilidad**: empaquetado y despliegue — 3 variantes de `docker-compose` (dev/staging/prod), 4 Dockerfiles, Caddyfile; 6 pipelines de GitHub Actions.
- **Ubicación**: `docker/` (11 archivos), `.github/workflows/` (`ci.yml`, `deploy.yml`, `e2e.yml`, `graphify.yml`, `promote-prod.yml`, `recover-prod.yml`).
- **Confianza**: profundo en la primera mitad de `ci.yml` (jobs `lint-python`, `test-python`, inicio de `lint-node`); superficial (no abiertos) en `deploy.yml`, `e2e.yml`, `graphify.yml`, `promote-prod.yml`, `recover-prod.yml` y en todo `docker/`.
