# Requirements — Optimización de carga de imágenes del catálogo

## Intent Analysis

El usuario quiere resolver el fan-out N+1 de URLs firmadas que sufre la página de catálogo de ProSell SaaS. Hoy `CatalogPage` dispara una request React Query por cada producto visible, y cada request firma la galería completa aunque `ProductCard` solo consume `images[0].url`. Además hoy no existe un derivado thumbnail privado apto para tarjetas (solo WebP full-size + Open Graph JPEG público), y `do_cdn_endpoint` está configurado pero ningún path de aplicación lo lee. El éxito se mide por: (1) una sola round-trip para la grilla del catálogo, (2) tarjetas que consumen un derivado privado de 600×600, (3) comportamiento de caché/CDN explícito y testeable, (4) defensa-en-profundidad de tenant-prefix preservada.

**Out of scope (límites explícitos):**

- Re-diseño del esquema de `Product.image_urls` o modelo relacional profundo
- Publisher pipeline (Playwright/Graph API) — fuera del bugfix
- Migración Alembic para alterar schema (la nueva columna `cover_image_key` se agrega al modelo `Product` con migración; ver FR2)
- Cambios al derivado público Open Graph JPEG

## Functional Requirements

### FR1 — Contrato batch de URLs de portada

- **FR1.1** La API debe exponer un endpoint batch que reciba N IDs de producto y devuelva una URL de portada firmada por producto en una sola round-trip.
- **FR1.2** El endpoint debe autorizar el acceso a cada producto usando los mismos chequeos de autorización ya existentes (`product_router.py`).
- **FR1.3** El endpoint debe validar que cada `cover_image_key` pertenezca al namespace del tenant del producto (tenant-prefix check existente, no relajar).
- **FR1.4** El endpoint debe firmar **únicamente** el derivado de portada seleccionado, no la galería completa.
- **FR1.5** El endpoint debe aplicar el routing CDN obligatorio (ver FR3) a todas las URLs firmadas que devuelve.

### FR2 — Derivado privado thumbnail de portada

- **FR2.1** El pipeline de upload debe producir un nuevo derivado privado de 600×600 px con aspect 1:1 (cuadrado) y recorte centrado.
- **FR2.2** El derivado debe almacenarse como objeto privado (sin `public-read`).
- **FR2.3** El modelo `Product` debe exponer una nueva columna `cover_image_key` (nullable para legacy), apuntando al derivado thumbnail.
- **FR2.4** El response de producto debe exponer la URL firmada del derivado thumbnail como campo de portada.
- **FR2.5** Si `cover_image_key` está ausente (producto legacy sin migración), el response debe caer al primer elemento válido de `image_urls` con el comportamiento actual.

### FR3 — Routing CDN obligatorio

- **FR3.1** El backend debe leer la configuración `do_cdn_endpoint` y aplicarla como prefijo obligatorio a las URLs firmadas privadas.
- **FR3.2** Si `do_cdn_endpoint` no está configurado al deploy, la aplicación debe fallar rápido (fail-fast) en el arranque — sin fallback silencioso al path directo de object storage.
- **FR3.3** El routing CDN debe aplicar tanto al derivado thumbnail como a URLs de galería firmadas (consistencia de superficie privada).

### FR4 — Invalidación inmediata de caché

- **FR4.1** Cuando el vendedor reemplaza una imagen, el flujo debe invalidar el caché CDN de la key anterior y purgar el objeto previo de storage, en el mismo flujo (sin ventana de stale).
- **FR4.2** Cuando el vendedor elimina una imagen, el flujo debe invalidar el caché CDN de la key correspondiente y purgar el objeto, en el mismo flujo.
- **FR4.3** La invalidación de caché debe ser síncrona con la confirmación al cliente — el response 2xx garantiza que el purge está en curso.
- **FR4.4** Si la operación de invalidación falla después de un upload exitoso, el flujo debe registrar el fallo en logs y dejar el purge a una cola de compensación (retry), sin perder la versión nueva.

### FR5 — Integración frontend

- **FR5.1** `ProductCard` debe consumir una única URL de portada (la del nuevo derivado), sin re-fetching por tarjeta.
- **FR5.2** `CatalogPage` debe consolidar las requests de cover URLs en una sola llamada batch (reemplazando `productImageUrlsBatch.ts:19-51` por una nueva implementación que use el endpoint batch).
- **FR5.3** El frontend debe mantener el comportamiento actual de `next/image unoptimized` para URLs firmadas (no se cambia la lógica de optimización; el objetivo es solo reducir fan-out y servir tamaño correcto).
- **FR5.4** El frontend debe preservar el fallback a `attributes.image_urls` legacy cuando el response no expone `cover_image_url` (productos anteriores a la migración).

### FR6 — Alcance cross-organización

- **FR6.1** Un administrador con `ORG_ADMIN_VIEW_ALL` debe ver las portadas en la nueva ruta batch con el mismo alcance que para su propia organización, sin gating adicional cross-org.
- **FR6.2** La validación de tenant-prefix debe aplicar idénticamente para el acceso cross-org y own-org — sin excepciones por rol.

## Non-Functional Requirements

### NFR1 — Performance

- **NFR1.1** Una página de catálogo con K productos visibles debe resolverse con exactamente **1 request HTTP** al backend para las URLs de portada (no K requests).
- **NFR1.2** La response del endpoint batch debe completarse en ≤300ms p95 para K≤50 productos.
- **NFR1.3** El derivado thumbnail de 600×600 debe descargarse en ≤200ms p95 desde el endpoint CDN con caché caliente.

### NFR2 — Seguridad y privacidad

- **NFR2.1** El derivado thumbnail de portada **no debe** ser público bajo ninguna circunstancia — todo acceso vía URL firmada con tenant-prefix validado.
- **NFR2.2** Defense-in-depth: authorization check + tenant-prefix check deben ejecutarse en cada request batch antes de firmar.
- **NFR2.3** La firma de URL debe tener TTL explícito y documentado (default sugerido: 15min, ajustable por configuración).

### NFR3 — Reliability

- **NFR3.1** Si el purge de storage falla tras un upload exitoso, el response al cliente debe ser 2xx pero la operación de purge encola para retry (no se rompe el flujo de upload).
- **NFR3.2** Si la invalidación CDN falla tras un upload exitoso, mismo principio: response 2xx, retry en cola, alerta al ops.

### NFR4 — Observability

- **NFR4.1** El endpoint batch debe loguear `batch_size`, `user_id` y `tenant_id` en cada request (sin contenido sensible, ej. no loguear URLs firmadas).
- **NFR4.2** Los flujos de upload/delete deben loguear el resultado del purge (`success`/`queued_retry`/`failed_after_retry`) para auditoría operativa.
- **NFR4.3** Métricas de uso del CDN (cache hit/miss) deben quedar expuestas vía logs estructurados o métrica del backend.

### NFR5 — Deploy / configuración

- **NFR5.1** La aplicación debe fallar al arranque si `do_cdn_endpoint` no está configurado en el entorno (fail-fast en config validation).
- **NFR5.2** La columna `Product.cover_image_key` debe agregarse vía migración Alembic (no script manual), siguiendo el patrón ya establecido en `20260812_0002_migrate_legacy_sedan_products.py`.

## Constraints

- **C1** Stack fijo: Next.js 16 + React 19 + TypeScript (frontend), FastAPI + SQLAlchemy 2.0 async + PostgreSQL 17 (backend), `IDOSpacesService` (object storage).
- **C2** Defense-in-depth: authorization + tenant-prefix check en cada signed URL, sin simplificación.
- **C3** Frontend mantiene `next/image unoptimized` para URLs firmadas (no se introduce la ruta de optimización Next por las limitaciones de Next de alcanzar el host privado MinIO).
- **C4** Cross-org admin scope sigue exactamente el patrón de `ORG_ADMIN_VIEW_ALL` ya existente — no se introduce un permiso nuevo para imágenes.

## Assumptions

- **A1** El pipeline actual de upload (`image_router.py`) puede extenderse para producir el derivado thumbnail 600×600 sin romper el flujo WebP full-size ni el Open Graph JPEG público.
- **A2** `IDOSpacesService` puede extenderse para (a) generar una URL firmada del CDN (no del host interno de storage), y (b) invocar una API de invalidación CDN.
- **A3** `do_cdn_endpoint` apunta a un endpoint compatible con operaciones de invalidación (purge por key) — DigitalOcean Spaces CDN u otro proveedor equivalente.
- **A4** La grilla del catálogo renderiza típicamente ≤50 productos por página; el endpoint batch se dimensiona para ese techo.
- **A5** Los productos legacy sin `cover_image_key` son una pequeña fracción del inventario (verificable en staging) — el fallback a `image_urls[0]` cubre la transición sin necesidad de backfill agresivo.

## Open Questions

- **OQ1** ¿La migración backfillea `cover_image_key` para productos existentes (un job async de una sola vez) o solo se calcula on-the-fly desde el primer elemento de `image_urls` cuando la columna es null?
- **OQ2** TTL exacto del firmado para el endpoint batch — ¿15min consistente con el endpoint actual, o un valor más corto alineado con la vida de una página de catálogo?
- **OQ3** Tamaño máximo del batch — ¿hard cap en el endpoint (ej. 100), error si excede, o se documenta como soft limit con paginación?

## Traceability Index

- FR1 (batch endpoint) → cubre el N+1 fan-out documentado en RE
- FR2 (derivado thumbnail privado) → cubre el gap del derivado no existente
- FR3 (CDN obligatorio) → cubre el `do_cdn_endpoint` configurado pero no usado
- FR4 (invalidación inmediata) → cubre la consistencia caché/storage
- FR5 (frontend integration) → cubre `productImageUrlsBatch.ts` + `ProductCard.tsx`
- FR6 (cross-org scope) → preserva el patrón actual sin cambios
- NFR1.1 → métrica observable del éxito (1 request por página)
- NFR2.1 → preserva la privacidad del bucket original
- NFR5.2 → encaja en el patrón Alembic ya establecido (corre automáticamente vía `alembic upgrade head` en deploy)
