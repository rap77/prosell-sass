# Unit ↔ Story Map — 260911-cross-org-export-ux

| Story | Unit    | Directory                                       |
| ----- | ------- | ----------------------------------------------- |
| US1.1 | U2      | u2-cross-org-export-ui                          |
| US1.2 | U2      | u2-cross-org-export-ui                          |
| US2.1 | U1 + U2 | u1-cross-org-export-api, u2-cross-org-export-ui |
| US2.2 | U1 + U2 | u1-cross-org-export-api, u2-cross-org-export-ui |
| US3.1 | U2      | u2-cross-org-export-ui                          |
| US3.2 | U2      | u2-cross-org-export-ui                          |
| US3.3 | U2      | u2-cross-org-export-ui                          |
| US4.1 | U1      | u1-cross-org-export-api                         |
| US4.2 | U1      | u1-cross-org-export-api                         |
| US4.3 | U1      | u1-cross-org-export-api                         |
| US4.4 | U1      | u1-cross-org-export-api                         |
| US4.5 | U1      | u1-cross-org-export-api                         |
| US5.1 | U2      | u2-cross-org-export-ui                          |
| US6.1 | U1      | u1-cross-org-export-api                         |
| US7.1 | U1      | u1-cross-org-export-api                         |
| US7.2 | U1      | u1-cross-org-export-api                         |
| US7.3 | U1      | u1-cross-org-export-api                         |
| US7.4 | U1      | u1-cross-org-export-api                         |
| US7.5 | U1      | u1-cross-org-export-api                         |
| US7.6 | U1      | u1-cross-org-export-api                         |
| US8.1 | U2      | u2-cross-org-export-ui                          |
| US8.2 | U1      | u1-cross-org-export-api                         |
| US9.1 | U2      | u2-cross-org-export-ui                          |
| US9.2 | U1      | u1-cross-org-export-api                         |

## Historias cross-cutting (más de una Unit)

- **US2.1** (elegir "todas las organizaciones" en el selector): U2
  implementa el sentinel de UI (`AC2.1.1`), U1 implementa el rechazo
  de permiso a nivel de use case (`AC2.1.2` — defensa en profundidad).
- **US2.2** (comportamiento por defecto): U2 fija el estado inicial
  del picker, U1 fija el comportamiento por defecto del endpoint
  (ninguno de los dos por sí solo cubre el AC completo).

## Orden de implementación dentro de cada Unit

**U1** (sin dependencia externa): FR7 (mapeo de columnas, más simple y
aislado) → FR4.2/FR4.1 (resolución batch + export "todas") → FR4.3/4.4
(límite + permiso) → FR6 (auditoría) → FR8.4/FR9.4 (uso de carpeta/
grupos ya confirmados).

**U2** (depende del contrato de U1, no de su implementación): FR1
(label + filtro, más simple y aislado) → FR2 (sentinel) → FR3
(filtrado real de grilla) → FR5 (confirmación reforzada) → FR8.1-8.3/
FR9.1-9.3 (popups).

## Cobertura

- Las 24 historias de `stories.md` (US1.1–US9.2) están asignadas a
  al menos una Unit.
- U1 tiene historias asignadas (14). U2 tiene historias asignadas
  (12, incluyendo las 2 cross-cutting).
