# Security Design — U1 (`u1-vehicle-catalog-api`)

Basado en `nfr-requirements/security-requirements.md` (NFR-SEC-1 a NFR-SEC-4).

## Autenticación/autorización del endpoint nuevo (NFR-SEC-1)

`GET /categories/facebook-values/{field_key}` reutiliza el middleware de autenticación ya vigente (`get_current_auth_user_from_cookie`, mismo patrón que `GET /{category_id}/schema`) — sin capa de autorización adicional (`_require_platform_admin()` no aplica, per BR1.4). No se introduce un modelo de auth nuevo.

## Sanitización de fórmulas en CSV (NFR-SEC-2)

Función pura aplicada dentro de `build_client_format_row()` (`csv_export.py`): para cada valor de celda tipo string, `if value.startswith(("=", "+", "-", "@")): value = "'" + value`. Sin dependencia nueva — manipulación de string estándar de Python, `csv.writer` ya escribe el resultado tal cual.

## Manejo de credenciales del publisher (NFR-SEC-3)

Sin diseño nuevo — es un requisito de documentación (FR4.1), no de código. La documentación resultante (Code Generation) debe capturar la distinción de credenciales ya señalada (session cookies de Playwright vs. token de página de Graph API) como advertencia explícita para futuro código que interactúe con `IPublisherService`.

## Migración legacy sin exposición de datos (NFR-SEC-4)

El log de resumen de la migración (BR3.1) registra conteos e IDs de producto — nunca el valor de atributo completo en texto plano más allá de lo ya vigente en el precedente (`20260812_0002_migrate_legacy_sedan_products.py`). Sin diseño de encriptación nuevo (los datos migrados no son sensibles — atributos de vehículo público).

## Defensa en profundidad

Sin capa nueva más allá de las 4 anteriores — este Unit no introduce un boundary de confianza nuevo (mismo backend, mismos usuarios autenticados ya existentes).
