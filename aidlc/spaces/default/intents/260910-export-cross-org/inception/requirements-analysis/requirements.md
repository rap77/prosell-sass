# Requirements — Export Cross-Org Catalog Export Permission

Intent: `260910-export-cross-org` (scope: bugfix, depth: Minimal)

## Sources

- `[desc]` Initial description: verbatim project description in `aidlc-state.md` § Project Information (endpoint `GET /api/v1/products/export-client-format.zip`, `product_router.py:735-779`, resuelve `organization_id`/`tenant_id` exclusivamente del JWT, sin respetar `ORG_ADMIN_VIEW_ALL`/`super_admin`).
- Reverse Engineering (brownfield): `aidlc/spaces/default/codekb/prosell-sass/architecture.md` § Interaction Diagrams diagrama 13, § Key Design Decisions; `code-structure.md` § Módulos nuevos inventariados `260910-export-cross-org`; `business-overview.md` § Actores / usuarios y § Funcionalidad clave (nota `260910-export-cross-org`).
- `[Q1]`, `[Q2]` — answers in `requirements-analysis-questions.md`.

## Intent Analysis

El endpoint de export de catálogo en formato cliente (`GET /api/v1/products/export-client-format.zip`, agregado por el intent `260903-catalog-client-export`) resuelve la organización exclusivamente del JWT de quien llama — un `super_admin`/usuario con permiso `ORG_ADMIN_VIEW_ALL` hoy solo puede exportar el catálogo de su PROPIA organización, pese a que ya puede ver y gestionar el resto de las organizaciones en toda la aplicación (`list_products`, cola de revisión, auditoría/reverse-transition, vía `_check_org_scope_permission()`). El objetivo de este intent es ampliar el scope del endpoint de export para que honre el mismo modelo de permisos cross-org que el resto del router — no es una regresión a revertir, es una omisión de scope confirmada en los propios artefactos de diseño del intent `260903` (`personas.md` excluyó explícitamente a `super_admin` del flujo de export).

## Functional Requirements

### FR1 — El endpoint de export respeta el modelo de permisos cross-org existente

**FR1.1** El endpoint `GET /api/v1/products/export-client-format.zip` debe aceptar un parámetro de consulta opcional `organization_id`, replicando el patrón ya usado por `list_products`/`get_category_filter_values`/`get_featured_products` (patrón 1: `_check_org_scope_permission()`).

**FR1.2** Cuando el caller tiene el permiso `ORG_ADMIN_VIEW_ALL` (vía rol `super_admin` u otro rol que lo otorgue) y pasa `organization_id`, el endpoint debe exportar el catálogo de la organización solicitada, no la propia del caller.

**FR1.3** Cuando el caller NO tiene `ORG_ADMIN_VIEW_ALL` y pasa `organization_id`, el endpoint debe responder con el mismo error 403 que ya usa `_check_org_scope_permission()` para este caso en los demás endpoints del router (mensaje "Cannot filter products by another organization's organization_id" o equivalente).

**FR1.4** Cuando `organization_id` se omite, el endpoint debe seguir exportando exclusivamente el catálogo del `tenant_id` propio del caller — el comportamiento default hoy vigente no cambia.

**FR1.5** Cuando el `organization_id` solicitado no corresponde a ninguna organización existente, el endpoint debe comportarse igual que `list_products` hoy: no valida existencia explícitamente, el resultado es un catálogo vacío para ese `organization_id` (mismo tratamiento que una organización real sin productos). `[Q1]`

### FR2 — Auditoría de exports cross-org

**FR2.1** Cuando el `organization_id` efectivamente exportado es distinto al `tenant_id` propio del caller (export cross-org), el sistema debe registrar un evento de auditoría identificando quién exportó, qué organización, y cuándo. `[Q2]`

**FR2.2** Un export de la propia organización del caller (`organization_id` omitido, o igual al propio `tenant_id`) NO requiere un registro de auditoría nuevo — mantiene el mismo nivel de auditoría (ninguno) que ya tienen `list_products`/`get_category_filter_values`/`get_featured_products` hoy. `[Q2]`

### FR3 — Documentación del endpoint actualizada

**FR3.1** El docstring del endpoint `export-client-format.zip` (`product_router.py:747-750`) debe actualizarse: hoy afirma la restricción single-tenant como diseño intencional citando `BR1.2`/`NFR1` del intent `260903`; debe reflejar el nuevo comportamiento cross-org.

### FR4 — Cobertura de test revisada explícitamente

**FR4.1** El test `TestExportClientFormatTenantIsolation::test_other_organizations_products_never_appear` (`test_product_router_export_client_format.py`), que hoy autentica con `RoleType.SUPER_ADMIN` y asertaa que el producto de otra organización es invisible, debe revisarse: el caso default (sin `organization_id`, incluso para un `super_admin`) sigue devolviendo únicamente el catálogo propio — ese caso permanece válido y no se elimina.

**FR4.2** Debe agregarse un caso de test nuevo: un caller con `ORG_ADMIN_VIEW_ALL`/`super_admin` que pasa `organization_id` de OTRA organización SÍ ve el catálogo de esa organización.

**FR4.3** Debe agregarse un caso de test para el 403 de FR1.3 (caller sin `ORG_ADMIN_VIEW_ALL` intentando pasar `organization_id` de otra organización).

**Nota (no es un sub-requerimiento, ya cubierta en `## Out of Scope`):** el bug de mapeo de campo en `build_image_folder_name()` (`csv_export.py`, lee `attrs.get("color")` en vez de `attributes["exterior_color"]`) queda fuera del alcance de este intent — es un intent separado, no relacionado al modelo de permisos.

## Non-Functional Requirements

**NFR1** (Seguridad) — El fix no debe debilitar el comportamiento single-tenant default para usuarios sin `ORG_ADMIN_VIEW_ALL`: sin ese permiso, el caller nunca debe poder ver ni exportar el catálogo de una organización que no es la suya, con o sin `organization_id` en la query.

**NFR2** (Observabilidad) — Todo export cross-org debe quedar auditado per FR2.1, sin excepción, incluyendo el caso donde el `organization_id` solicitado no existe (FR1.5) — si el intento de export cross-org se hizo con un permiso válido, se audita el intento aunque el resultado sea un catálogo vacío. Postura ante fallo del propio mecanismo de auditoría: fail-open — un fallo al escribir el registro de auditoría NO debe bloquear la respuesta del export, pero debe quedar logueado como error (consistente con que la auditoría es observabilidad, no un control de autorización).

**NFR3** (Compatibilidad) — El cambio debe ser retrocompatible: cualquier caller que hoy llama al endpoint sin `organization_id` (el 100% del tráfico actual, dado que el parámetro no existe hoy) debe seguir recibiendo exactamente el mismo comportamiento (su propio catálogo).

## Constraints

- El fix debe replicar el patrón 1 (`_check_org_scope_permission()` + `organization_id`) ya usado por `list_products`/`get_category_filter_values`/`get_featured_products` — no introducir un cuarto patrón de acceso cross-org en `product_router.py` (confirmado por Reverse Engineering, `architecture.md` § Key Design Decisions).
- `ExportCatalogClientFormatUseCase.execute()` recibe un único `tenant_id: UUID` — no requiere cambio de firma; toda la resolución de qué `tenant_id` pasar (propio vs. cross-org) pertenece al router, no al use case.
- Ninguna dependencia nueva — el fix es exclusivamente sobre lógica de permisos ya existente en el router.

## Assumptions

- El endpoint sigue exportando UNA organización por llamada (la propia por default, o la solicitada vía `organization_id` si el caller tiene permiso) — no se pidió ni se asume la capacidad de exportar el catálogo combinado de VARIAS organizaciones en un solo export.
- "Super admin / plataforma" (per `business-overview.md` § Actores) y cualquier otro rol que otorgue `ORG_ADMIN_VIEW_ALL` (per `ROLE_PERMISSIONS`) quedan cubiertos por igual — el fix chequea el permiso `ORG_ADMIN_VIEW_ALL`, no el rol `super_admin` literal, consistente con el patrón 1 ya elegido (a diferencia del patrón 3 de batch actions, que sí chequea rol literal y queda fuera de alcance).
- El mensaje de error 403 de FR1.3 puede ser literalmente el mismo string que ya usa `_check_org_scope_permission()`, sin necesidad de un mensaje distinto para este endpoint.

## Out of Scope

- Unificar los tres patrones de acceso cross-org coexistentes en `product_router.py` (list-style, single-resource inline, batch-actions por rol literal) — deuda técnica ya documentada, intent separado.
- El bug de mapeo de campo `color`/`exterior_color` en `build_image_folder_name()` (`csv_export.py`) — confirmado en Reverse Engineering, sin relación al modelo de permisos, intent separado si no fue arreglado ya.
- Agregar `get_object()`/descarga a `IDOSpacesService`, o cualquier trabajo del ensamblado del ZIP de imágenes — ya resuelto/en curso vía el intent `260903-catalog-client-export`, no relacionado a permisos.
- Extender el fix al endpoint de export CSV genérico (`GET /api/v1/products/export.csv`) — el intent nombra específicamente `export-client-format.zip`; si el CSV genérico tiene el mismo gap, es un hallazgo separado a confirmar en otro intent.

## Open Questions

Ninguna — ambos puntos genuinamente abiertos (Q1, Q2) fueron resueltos por el usuario en `requirements-analysis-questions.md`. El resto de las decisiones de diseño de bajo nivel (nombre exacto del parámetro en la firma del router, si `_check_org_scope_permission()` se reutiliza tal cual o se extiende) queda para Functional Design/Code Generation, per el patrón ya elegido.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-10T22:14:03Z
**Iteration:** 1

### Findings

| #   | Severity | Location | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Recommendation                                                                                                                                                                                                                                                                                                  |
| --- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | FR4.4    | El bug de `color`/`exterior_color` en `build_image_folder_name()` está listado como un sub-requerimiento con ID `FR4.4` dentro de la sección "Functional Requirements", pero su contenido es una exclusión de alcance ("queda fuera del alcance de este intent") que ya está duplicada literalmente en la sección `## Out of Scope` (tercer bullet). Un ID `FR{n}.{m}` es una clave de trazabilidad permanente que Functional Design/Code Generation/traceability.json tratarán como algo a implementar — una entrada que en realidad dice "no implementar esto" bajo ese esquema puede generar confusión o un renglón fantasma en `traceability.json`. | Quitar el ID `FR4.4` y dejar la exclusión únicamente en `## Out of Scope` (donde ya está), o si se quiere preservar como nota dentro de FR4, escribirla sin numeración `FR{n}.{m}` (p. ej. como una aclaración en prosa bajo FR4).                                                                              |
| 2   | Minor    | NFR2     | Especifica que todo export cross-org debe auditarse "sin excepción", pero no dice si un fallo al escribir el registro de auditoría debe bloquear la respuesta del export (fail-closed) o solo registrarse best-effort (fail-open) — no es ambiguo para el caso feliz, pero QA no puede escribir un caso de test para el modo de falla del propio mecanismo de auditoría a partir de esta redacción.                                                                                                                                                                                                                                                     | Aceptable diferir la decisión a Functional Design dado el Depth Minimal de este intent, pero dejarlo explícito como pregunta abierta en vez de implícito — o agregar una cláusula corta en NFR2 fijando la postura (ej. "un fallo al auditar no debe impedir el export, pero debe quedar logueado como error"). |

### Summary

`requirements.md` traza correctamente a sus fuentes (descripción inicial, los tres artefactos de Reverse Engineering para `260910-export-cross-org`, y las respuestas Q1/Q2), refleja sin desvío las dos decisiones del humano (FR1.5 ↔ Q1 opción A; FR2/NFR2 ↔ Q2 opción A), y cubre las seis dimensiones de completitud esperadas para esta etapa (funcional, no-funcional, contexto técnico/negocio, out-of-scope, asunciones) incluyendo los hallazgos que el RE scan ya había surfaceado (docstring desactualizado, test que codifica el bug, los tres patrones cross-org coexistentes). Cada FR/NFR tiene un criterio pass/fail verificable. Los dos hallazgos Minor son de higiene documental/trazabilidad, no bloquean el trabajo de diseño posterior.
