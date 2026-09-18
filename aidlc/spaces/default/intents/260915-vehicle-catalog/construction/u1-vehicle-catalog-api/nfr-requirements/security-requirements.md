# Security Requirements — U1 (`u1-vehicle-catalog-api`)

Basado en `rules.md` (BR1.4, BR5.1), `requirements.md` (FR4.1, FR5.1) y `team-practices.md` § Deployment (correcciones de devsecops).

## NFR-SEC-1: Autenticación del endpoint de opciones canónicas

- **Requisito**: `GET /categories/facebook-values/{field_key}` requiere `CurrentUser` (usuario autenticado), SIN `_require_platform_admin()` — mismo patrón que `GET /{category_id}/schema` (BR1.4, decisión ya tomada en Functional Design). Es una lectura de catálogo estático, igual para toda la plataforma, sin dato sensible por tenant — no justifica un gate adicional.
- **Amenaza considerada y descartada**: exposición de datos sensibles a un usuario autenticado de bajo privilegio — descartada porque el catálogo es público dentro de la plataforma (mismos valores para cualquier organización).

## NFR-SEC-2: Sanitización contra inyección de fórmulas en el CSV export

- **Requisito**: BR5.1 — cualquier valor de celda que empiece con `=`, `+`, `-` o `@` se prefija con `'` antes de escribirse (`build_client_format_row`, `csv_export.py`). Neutraliza CSV/formula injection al abrir el archivo en Excel/Google Sheets.
- **Motivación** (ya documentada en `team-practices.md` por devsecops): la reconciliación de FR1 puede introducir, vía el fallback de "campo sin catálogo aplicable" (CASE 3 de BR1.2 — no CASE 2 "sin match", que devuelve `null` y nunca llega al CSV), valores que llegan sin la curación que tenían las `options` configuradas antes de este intent — aumenta la probabilidad de que un valor no sanitizado llegue a una celda del CSV.

## NFR-SEC-3: Manejo del contrato de `IPublisherService` (documentación, FR4.1)

- **Requisito**: la documentación de FR4.1 debe capturar explícitamente que el `access_token` del adapter de Playwright es en realidad session cookies de Facebook (credencial de mayor alcance que un token de página) — sin cambio de código, solo de documentación, per FR4.1.
- **Regla heredada** (ya vigente, sin cambio de comportamiento en este intent): nunca loguear `access_token` ni incluirlo en mensajes de excepción, en los 3 adapters concretos.

## NFR-SEC-4: Migración legacy sin exposición de datos sensibles

- **Requisito**: el script de migración (BR3.1) opera sobre datos ya existentes en la base, sin loguear valores de atributo completos en texto plano más allá de lo ya vigente en el log de resumen (conteos, IDs de producto) — mismo estándar ya usado en `20260812_0002_migrate_legacy_sedan_products.py`.
