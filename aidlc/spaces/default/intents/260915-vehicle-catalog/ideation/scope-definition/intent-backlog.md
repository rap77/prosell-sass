# Intent Backlog — Catálogo Canónico de Vehículos para Facebook

Backlog priorizado (proto-Units) para la iniciativa descrita en `intent-statement.md`, `feasibility-assessment.md` y `scope-document.md`.

## MoSCoW Prioritization

| #   | Proto-Unit                                                                                                             | MoSCoW    | Dependencias         | Notas                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------- | --------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Datos y validación de vehículos (schemas de categoría, selects dinámicos, decodificación de VIN, import/create/update) | Must Have | Ninguna — es la base | Prerequisito de los proto-Units 2, 3 y 4.                                                                                              |
| 2   | Defaults de ubicación/organización editables por producto                                                              | Must Have | Depende de #1        |                                                                                                                                        |
| 3   | Migración de registros legacy al catálogo canónico                                                                     | Must Have | Depende de #1        | Mayor incertidumbre técnica (riesgo R2 de `raid-log.md`) — candidato a atacar temprano si se prioriza risk-first en Delivery Planning. |
| 4   | Contratos de adapter de publisher (preparación para integración futura)                                                | Must Have | Depende de #1        | Sin automatización en vivo — solo el contrato/interfaz.                                                                                |

## Sequencing Preference

Dependency-first: el proto-Unit 1 (datos y validación) se entrega primero; los proto-Units 2, 3 y 4 pueden secuenciarse o paralelizarse después de eso según lo que determine Delivery Planning con más contexto de diseño (Domain Design / Units Generation).

## Value Stream Map

```
[Problema: catalogo de vehiculos no calza con Facebook]
        |
        v
[1. Datos y validacion de vehiculos] --(prerequisito de)--> [2. Defaults ubicacion/org]
        |                                                --> [3. Migracion legacy]
        |                                                --> [4. Contratos de adapter]
        v
[Resultado: catalogo canonico consistente + base para integracion futura]
```

<!-- Text fallback: Un problema único (catálogo no calza con Facebook) alimenta el proto-Unit 1 (datos y validación), que a su vez es prerequisito de los proto-Units 2, 3 y 4. Los cuatro convergen en el resultado: catálogo canónico consistente y base lista para una integración futura. -->

## Assumptions & Open Questions

None.
