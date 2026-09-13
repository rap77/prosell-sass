<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

- 2026-09-13T00:00:00Z — u1-cross-org-export-api Step 5: CategoryTranslationEntry se indexa por `slug` (str), no por UUID como decía el plan original — la vertical "Vehículos y Transporte" se siembra con un id generado en tiempo de inserción (`seed_vehicles_vertical()`), sin valor fijo hardcodeable; su slug (`"vehiculos-y-transporte"`) sí es determinístico. Corrección aplicada antes del dispatch, documentada inline en el archivo.

## Deviations

- 2026-09-13T00:00:00Z — ninguna respecto al stage file.

## Tradeoffs

- 2026-09-13T00:00:00Z — u1-cross-org-export-api Step 8: resolución batch de org_code usa el MISMO camino de código para modo puntual y modo "todas" (el set de organization_id distintos tiene 1 elemento en modo puntual) — evita duplicar la lógica de batch en dos ramas.
- 2026-09-13T00:00:00Z — u1-cross-org-export-api Step 8: decisión de bajo riesgo resuelta directo (sin escalar al humano) — si BR1.7 excluye TODOS los productos de un export "todas" (0 filas sobreviven un conteo inicial > 0), el comportamiento es un ZIP con CSV solo-header y product_count=0, SIN error nuevo. EmptyCatalogExportError ya se evalúa ANTES del filtro de traducción, sobre el conteo crudo de `published` (BR4.1) — no hay artefacto que pida un tercer camino de error para "0 sobrevivientes post-filtro", y agregar uno sería una decisión de producto no pedida por ningún FR/BR.
- 2026-09-13T00:00:00Z — el campo `user` del log `catalog_export.completed_all_orgs` (observability-design.md) NO se loguea en el use case (sin contexto de identidad ahí) — se agregó `organization_count` a `ExportCatalogClientFormatResult` para que el router (Step 10) extienda su propio log de auditoría cross-org ya existente con ese dato, sin duplicar lógica.

## Open questions

- 2026-09-13T00:00:00Z — ninguna.
