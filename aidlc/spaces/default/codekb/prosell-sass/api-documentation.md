# API Documentation — prosell-sass

## Superficie general

Backend REST (FastAPI) en `apps/api/src/prosell/infrastructure/api/routers/` — **25 archivos de router**, **30 llamadas `include_router()`** en `main.py`. Cada router tiene su propio prefijo/tag; no se leyó `main.py` línea por línea en este pase (superficial), pero la lista de routers fue confirmada por el scan del desarrollador.

### Routers enumerados (superficial salvo donde se indica "profundo")

| Router                                            | Confianza                                      |
| ------------------------------------------------- | ---------------------------------------------- |
| `admin_organizations_router`                      | superficial                                    |
| `admin_router`                                    | superficial                                    |
| `appointment_router`                              | superficial                                    |
| `auth_router` (+ `auth_router.py.backup2` suelto) | superficial                                    |
| `branch_router`                                   | superficial                                    |
| `category_inference_router`                       | superficial                                    |
| `category_router`                                 | **profundo** (schema endpoints)                |
| `facebook_router`                                 | superficial                                    |
| `fb_account_router`                               | superficial                                    |
| `fb_credential_migration_router`                  | superficial                                    |
| `fb_sync_router`                                  | superficial                                    |
| `health_router`                                   | superficial                                    |
| `image_router`                                    | superficial                                    |
| `lead_router`                                     | superficial                                    |
| `marketplace_access_router`                       | superficial                                    |
| `notification_router`                             | superficial                                    |
| `org_router`                                      | superficial                                    |
| `org_verticals_router`                            | superficial                                    |
| `product_router`                                  | superficial (bulk-upload confirmado, resto no) |
| `public_product_router`                           | **profundo**                                   |
| `publisher_router`                                | superficial                                    |
| `team_router`                                     | superficial                                    |
| `test_cleanup_router`                             | superficial                                    |
| `test_router`                                     | superficial                                    |
| `user_branch_router`                              | superficial                                    |
| `user_router`                                     | superficial                                    |
| `vehicle_router`                                  | **profundo**                                   |
| `vendedor_router`                                 | superficial                                    |
| `wallet_router`                                   | superficial                                    |
| `webhook_router`                                  | superficial                                    |

## Endpoints documentados a fondo

### Public Product API (`public_product_router.py`) — superficie NO autenticada

- `GET /{slug}` — obtiene un producto público por slug. Construye `ProductResponse` directo desde `ProductModel`, **sin join hacia `Organization` ni sus contactos** — confirmado como causa raíz de BUG-4 (ver `architecture.md` § Interaction Diagrams #3). Solo expone `organization_id` (UUID pelado), ningún dato de contacto.
- `GET /{slug}/image-urls` — obtiene URLs firmadas de imágenes del producto.
- **Contrato de seguridad implícito**: al no incluir datos de contacto de organización, este endpoint hoy es "seguro por omisión" respecto a exposición de teléfono — pero también insuficiente para resolver BUG-4 sin una extensión deliberada.

### Category Schema API (`category_router.py`)

- `PATCH /{category_id}/schema` — actualiza el `attribute_schema` JSONB de una categoría; flujo con advertencia de migración (mencionado en scan, no detallado línea por línea). Persiste el JSONB sin validación de forma contra ningún contrato Zod específico — raíz de BUG-3/6.
- `GET /{category_id}/schema/template.csv` — genera la plantilla CSV de importación. Construye el orden de columnas como `list(UNIVERSAL_COLUMNS) + extra_cols + [schema keys]`, donde `UNIVERSAL_COLUMNS = {"title", "price", "category_id"}` es un **`set` de Python** — orden no garantizado entre reinicios de proceso. Relevante directamente para el diseño de FEAT-1 (export CSV): ver `architecture.md` § Interaction Diagrams #5.
- `POST /{category_id}/schema/clone-from/{source_category_id}` — clona schema de otra categoría.

### VIN Decode API (`vehicle_router.py`)

- `decode_vin` — endpoint principal usado por el formulario de creación de vehículo. Devuelve **28 campos normalizados agrupados en 10 grupos** (make, model, body_type, drivetrain, wheelbase_type, bed_type, cab_type, electrification_level, etc.). Internamente:
  - Llama a `nhtsa_vin_service.py`, que a su vez llama a la NHTSA API externa.
  - Pasa el resultado por `nhtsa_normalizer.py`, que mapea valores a minúsculas/snake_case estilo Facebook Marketplace (decisión correcta para el pipeline de scraping, pero reutilizada tal cual en este endpoint humano — raíz de BUG-5).
  - Tiene un helper interno `_normalize_model()` que hace `model.lower().strip()` incondicionalmente sobre cualquier valor de modelo decodificado.
- **Contrato de datos**: no se documentó (en este pase) el schema Pydantic exacto de request/response de `decode_vin` — se infiere de los 28 campos mencionados por el desarrollador y de `VinDecodeField.tsx`/`mapDecodedToForm()` en el frontend.

### Bulk Upload API (`product_router.py`)

- `bulk_upload_products` — carga masiva de productos vía CSV.
- `GET /bulk-upload/errors.csv` — descarga de errores de una carga fallida/parcial.
- Relevante para FEAT-1: la lógica de columnas de `csv_product_parser.py` (`parse_csv` + definición de columnas) debe ser la fuente de verdad que el nuevo endpoint de exportación espeje, según lo pedido explícitamente en el intent ("mismos campos/orden que el importador actual").

## Puertos internos (Application Layer)

`apps/api/src/prosell/application/ports/` — interfaces de infraestructura inyectadas por Clean Architecture / DI basada en interfaces:

- `IDOSpacesService` — abstrae el storage de imágenes (DigitalOcean Spaces / S3 vía boto3).
- `IVINDecoderService` — abstrae el proveedor de decodificación VIN (implementado por `nhtsa_vin_service.py`).
- (Lista no exhaustiva — solo los dos puertos nombrados explícitamente por el scan del desarrollador; el directorio completo no fue enumerado en este pase.)

## Frontend — Proxy API Routes (BFF)

`apps/web/src/app/api/v1/` — **no leído en este pase** (superficial). Riesgo conocido de una sesión previa (memoria persistente, no confirmado en este scan): el proxy `api/v1/products/[...path]/route.ts` solo reenviaba `Content-Type`/`Cookie` al backend real, descartando silenciosamente el header `If-Match` — rompiendo los endpoints de "deshacer" (reverse/resubmit/restore/revert-sale) cuando se invocaban desde el navegador real. Corregido en sesión 2026-08-21 según memoria — **no verificado en este pase si el mismo patrón existe en los proxies de `organizations` o `categories`**; queda como riesgo abierto a auditar (ver `architecture.md` § Improvement Opportunities #4).

## Frontend — Cliente API y contratos Zod

`apps/web/src/lib/api/` — 30 módulos enumerados por nombre de archivo (no leídos en este pase, salvo `schemas/categorySchema.ts`). Patrón confirmado por memoria de sesión y por el archivo leído: cada endpoint backend tiene un schema Zod espejo bajo `lib/api/schemas/`, usado con `parse()`/`safeParse()` en el `queryFn` del hook correspondiente — "cero casts `as X` no validados sobre respuestas del backend" es la convención declarada del equipo.

## Nota — intent `260827-react-doctor-cleanup`

Este intent es un refactor de tooling de análisis estático frontend (`react-doctor`); no toca ni re-audita la superficie de API. El contenido de este documento no fue revalidado en este pase — se preserva tal cual del pase anterior (`260826-prod-bugfixes-batch`). El riesgo abierto de headers descartados en los proxies BFF (`organizations`, `categories`) sigue sin auditar.

## Nota sobre completitud

Este documento cubre a fondo únicamente los 4 routers/flujos tocados por los bugs del intent activo (`public_product_router`, `category_router` en su porción de schema/template, `vehicle_router`, y la porción de `product_router` de bulk-upload). Los 21 routers restantes están enumerados por nombre pero sus endpoints, parámetros y contratos de request/response **no fueron leídos** en este pase — no asumir cobertura completa de la superficie REST del sistema a partir de este documento.
