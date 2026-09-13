# Performance Requirements — u2-cross-org-export-ui

`requirements.md` no define ningún NFR de performance propio para este
Unit. Los targets EXTIENDEN sin cambio los ya establecidos en
`u2-catalog-export-ui` del intent hermano `260903-catalog-client-export`
(mismo Unit kind `ui`), sin `NFR{n}` de inception del que heredar un
sub-número. Este archivo cubre la responsividad de la INTERFAZ — el
tiempo del request HTTP del export en sí ya está cubierto en
`performance-requirements.md` de `u1-cross-org-export-api`
(NFR-PERF-1/2/4).

## Targets

| ID            | Métrica                                                                                             | Target  | Percentil | Condición                                                                                                      | Método de medición                            |
| ------------- | --------------------------------------------------------------------------------------------------- | ------- | --------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| NFR-PERF-UI-1 | Apertura del banner de resumen (`ExportSummaryBanner`) tras clic en el ítem de menú, cualquier modo | < 100ms | p95       | `count`/tipo de banner ya computado client-side, sin request de red (`functional-spec.md` § Workflow 2 paso 2) | Medición manual/perfilado en `build-and-test` |
| NFR-PERF-UI-2 | Transición a estado `loading`/`exporting-*` tras confirmar el último de los 3 `window.prompt()`     | < 100ms | p95       | Reacción inmediata de UI antes de que el request HTTP complete                                                 | Igual método                                  |
| NFR-PERF-UI-3 | Renderizado del toast de resultado (éxito/error, incluyendo 403 de `all_organizations`)             | < 100ms | p95       | Medido desde que la respuesta HTTP llega hasta que el toast es visible                                         | Igual método                                  |
| NFR-PERF-UI-4 | Filtrado client-side del picker por `product_count > 0` (FR1.2)                                     | < 50ms  | p95       | Sobre la lista ya cargada por `useOrganizations()` (≤30 organizaciones reales), sin request nuevo              | Igual método                                  |

Estos targets son estándar de responsividad de interfaz — no dependen
del tamaño del catálogo ni del cap global (`u1-cross-org-export-api`,
NFR3.2), que solo afecta la duración del request HTTP en sí, ya cubierta
aparte. Los 3 `window.prompt()` (nombre de archivo, carpeta base,
grupos de Facebook — `functional-spec.md` § Workflow 3) son diálogos
nativos síncronos y bloqueantes del navegador: no tienen un target de
"apertura" propio, ya que el tiempo lo determina el navegador, no el
código de la aplicación.

## Nota — refetch de la grilla al cambiar de organización (FR3.1)

El refetch de `useInfiniteProducts(apiFilters, 50)` al cambiar
`viewingOrgId` (Contract 1 de `contract-summary.md`) reusa el MISMO
endpoint (`GET /api/v1/products`) y el mismo mecanismo de paginación ya
vigente en toda la grilla — no es un endpoint nuevo ni modificado por
este intent (`contract-summary.md`: "sin cambio de forma del
endpoint"). Sin target de performance dedicado nuevo: el tiempo de
respuesta de ese endpoint ya está gobernado por su propio baseline de
performance existente, fuera del alcance de este intent.

## Fuente

Deriva de `functional-spec.md` § Workflows 1-3 (Functional Design de
este mismo Unit) y de `frontend-components.md`. Sin NFR de origen en
`requirements.md`.
