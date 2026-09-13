<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

- 2026-09-12T00:00:00Z — deriví la frontera de Unit de component-inventory.md/architecture.md (no de components.md, ausente por el skip legítimo de Domain Design) — mismo patrón ya aprendido en 260911-export-org-selector.

## Deviations

- 2026-09-12T00:00:00Z — omití el bloque interactivo de Step 3 (estrategia de decomposición) porque la frontera coincide exactamente con la estructura de deployables ya existente (apps/api vs apps/web), sin ambigüedad genuina — mismo patrón ya reconfirmado varias veces.

## Tradeoffs

- 2026-09-12T00:00:00Z — 2 Units (backend + frontend) en vez de más granularidad (ej. separar el fix de mapeo CSV de "exportar todas" en Units distintas) — ambas piezas backend comparten el mismo archivo/función (csv_export.py, export_catalog_client_format.py) y no tienen ciclo de vida ni cadencia de cambio distinta, así que separar hubiera sido sobre-ingeniería.

## Open questions

- 2026-09-12T00:00:00Z — si el filtrado real de grilla (US3) usa el mismo endpoint/query param que el export, o uno nuevo, queda como decisión de Functional Design — no resuelto en esta etapa (solo se declaró el punto de integración).
