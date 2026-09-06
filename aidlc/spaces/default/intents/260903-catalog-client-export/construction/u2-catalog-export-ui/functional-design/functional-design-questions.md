# Functional Design Questions — u2-catalog-export-ui

## Nota: bloque interactivo omitido

`interaction-spec.md` (Refined Mockups, READY) ya especifica a nivel de
componente todo lo que este stage normalmente preguntaría: jerarquía de
componentes, estados, props, integración con la API. No hay ambigüedad
genuina — esta etapa consolida esa especificación al formato de
Functional Design (`functional-spec.md`/`frontend-components.md`) y la
conecta explícitamente con el contrato de `contract-summary.md`.

## Plan propuesto

- **frontend-components.md**: 4 componentes de `interaction-spec.md`
  (`ExportClientFormatMenuItem`, `ExportSummaryBanner`,
  `ExportClientFormatButton`, Toast reusado) + el punto de integración
  API (`GET /api/v1/products/export-client-format.zip`, contrato de
  `contract-summary.md`).
- **functional-spec.md**: workflow de `mockups.md` (resumen → prompt →
  loading → éxito/error), sin máquina de estados de entidad (no hay
  entidad propia en U2) — sí una máquina de estados de UI (default →
  resumen → prompt → loading → éxito/error).
- **traceability.json**: ACs de U2 según `unit-of-work-story-map.md` —
  AC1.1.1 (E2E, complementa la precondición de U1), AC1.1.10, AC1.2.1-
  AC1.2.3 (US1.2 completa), AC1.3.1 (renderizado del mensaje, complementa
  el enforcement de U1).

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
