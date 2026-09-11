# Unit Story Map — 260911-export-org-selector

## Mapeo de historias a Units

| Story | Unit ID | Directory                  | Notas                                                                         |
| ----- | ------- | -------------------------- | ----------------------------------------------------------------------------- |
| US1.1 | U1      | u1-export-org-confirmation | Export cross-org vía `viewingOrgId` + badge de confirmación (AC1.1.1–AC1.1.6) |
| US2.1 | U1      | u1-export-org-confirmation | Mensaje de catálogo vacío cross-org (AC2.1.1–AC2.1.2)                         |
| US3.1 | U1      | u1-export-org-confirmation | Sin cambios para usuarios sin permiso (AC3.1.1–AC3.1.3)                       |

## Historias cross-cutting (spanning múltiples Units)

Ninguna — un solo Unit, todas las historias caen dentro de él.

## Orden de implementación dentro del Unit

Un solo Unit, sin orden de implementación entre historias que resolver
acá — Delivery Planning (2.9) decide la secuencia económica; dentro de
Construction, Functional Design del Unit U1 detalla el orden interno si
hiciera falta.

## Verificación de cobertura

- Las 3 historias (US1.1, US2.1, US3.1) tienen Unit asignado.
- El único Unit (U1) tiene las 3 historias asignadas — ningún Unit sin
  historias.
