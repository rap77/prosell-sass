# Requirements Analysis — Questions

Intent: `260910-export-cross-org` (scope: bugfix, depth: Minimal)

Reverse Engineering ya confirmó el bug, su causa raíz, el modelo de permisos existente (tres patrones cross-org en `product_router.py`), el test que codifica el bug como comportamiento correcto, y recomendó el patrón más cercano en semántica (`_check_org_scope_permission()` + `organization_id`, patrón 1, el mismo que usa `list_products`). Con eso ya resuelto, solo quedan dos puntos genuinamente abiertos para desbloquear `requirements.md`.

## Q1: Validación de existencia de la organización destino

Cuando un `super_admin`/usuario con `ORG_ADMIN_VIEW_ALL` pase un `organization_id` que **no corresponde a ninguna organización existente**, ¿cómo debe comportarse el endpoint de export?

`_check_org_scope_permission()` (usado por `list_products`) HOY no valida existencia — un `organization_id` inexistente simplemente resuelve en un catálogo vacío (0 productos). `create_product`, en cambio, SÍ valida existencia vía `org_repo.get_by_tenant_id()` y devuelve un error explícito si no existe.

A. Seguir el patrón de `list_products` (sin validar existencia) — más simple, consistente con el patrón elegido; un `organization_id` inexistente da el mismo resultado que una organización sin productos (catálogo vacío / 404 "sin productos", igual que hoy para el caso propio)
B. Agregar validación de existencia como `create_product` (404 explícito "organización no encontrada" si el `organization_id` no existe) — error más claro para el admin, pero agrega una nueva verificación al endpoint y a `_check_org_scope_permission()` (o solo a este endpoint)
C. No estoy seguro / que el equipo decida el detalle técnico en Functional Design
X. Other (please specify)

[Answer]: A. Seguir el patrón de list_products (sin validar existencia)

## Q2: Auditoría de exports cross-org

El export de catálogo entrega el catálogo COMPLETO de una organización (CSV + ZIP de imágenes). Hoy este endpoint no queda registrado en ningún log de auditoría cuando el caller exporta su PROPIA organización. Al habilitar que un `super_admin`/`ORG_ADMIN_VIEW_ALL` exporte el catálogo de OTRA organización, ¿debe quedar auditado quién exportó el catálogo de qué organización y cuándo?

A. Sí, auditar solo el caso cross-org (cuando el `organization_id` solicitado es distinto al propio del caller) — mínima superficie nueva, cubre el escenario más sensible
B. Sí, auditar todo uso del endpoint (propio y cross-org) — consistencia total, más simple de implementar que una rama especial
C. No, no hace falta — el mismo nivel de auditoría que ya tienen `list_products`/`get_category_filter_values`/`get_featured_products` hoy (ninguno) alcanza, ya que solo replica ese patrón de permiso ya existente
D. No estoy seguro
X. Other (please specify)

[Answer]: A. Sí, auditar solo el caso cross-org

## Consolidated Summary Confirmation

- Q1 (organización inexistente): seguir el patrón de `list_products` — sin validar existencia del `organization_id`, un valor inexistente resuelve en catálogo vacío, igual que hoy para el caso propio.
- Q2 (auditoría): auditar solo el caso cross-org — cuando el `organization_id` solicitado es distinto al `tenant_id` propio del caller.
- Todo lo demás quedó resuelto por Reverse Engineering: el fix replica el patrón 1 (`_check_org_scope_permission()` + parámetro `organization_id`), igual que `list_products`; el docstring del endpoint debe actualizarse (hoy afirma la restricción single-tenant como diseño intencional); el test `test_other_organizations_products_never_appear` debe revisarse explícitamente (mantener el caso default-propia-organización, agregar un caso nuevo de super_admin + organization_id cross-org).

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
