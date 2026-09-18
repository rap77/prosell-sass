# Unit Story Map — Catálogo Canónico de Vehículos para Facebook

## Mapeo de historias a Units

| Story ID | Unit ID | Directory                                                                                                                | Notas                                                                                                                                            |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| US1.1    | U1 + U2 | `u1-vehicle-catalog-api` (reconciliación backend) + `u2-vehicle-catalog-ui` (indicador de autocompletado fallido)        | Cross-cutting: el backend reconcilia, el frontend muestra el resultado y el estado de mismatch (AC1.1.2).                                        |
| US1.2    | U1 + U2 | `u1-vehicle-catalog-api` (catálogo canónico servido) + `u2-vehicle-catalog-ui` (consumo en `category-schema-editor.tsx`) | Cross-cutting: el backend expone el catálogo, el frontend deja de mantener la lista estática a mano.                                             |
| US2.1    | U2      | `u2-vehicle-catalog-ui`                                                                                                  | Solo UI — el backend ya persiste y prioriza `location_city`/`location_state` por producto (confirmado en `stories.md`), sin trabajo nuevo de U1. |

## Historias cross-cutting

- **US1.1** y **US1.2** son cross-cutting entre U1 y U2 — ambas requieren que el backend reconcilie/exponga el catálogo canónico ANTES de que la porción de frontend correspondiente pueda completarse end-to-end (aunque la UI puede maquetarse contra un mock mientras tanto, ver `unit-of-work-dependency.md`).
- **US2.1** vive enteramente en U2 — no es cross-cutting, no depende de trabajo nuevo de U1.

## Orden de implementación dentro de cada Unit

- **U1**: sin orden estricto exigido entre FR1 (reconciliación), FR3 (migración legacy), FR4 (documentación) y FR5 (sanitización CSV) — son subsistemas independientes entre sí dentro del mismo Unit. La secuencia real dentro de Construction es decisión del propio Unit al ejecutar (no de esta etapa).
- **U2**: la porción de US1.1/US1.2 requiere el contrato de integración de U1 (ver `unit-of-work-dependency.md`) antes de completarse; la porción de US2.1 no tiene esa restricción y puede implementarse en cualquier momento dentro del Unit.

## Verificación de cobertura

- Las 3 historias de `stories.md` (US1.1, US1.2, US2.1) están asignadas a al menos un Unit — sin huérfanos.
- Ambos Units (U1, U2) tienen al menos una historia asignada — sin Unit vacío.
- FR3, FR4, FR5 (sin historia de usuario propia, per `stories.md`) están cubiertos dentro de U1 como responsabilidades directas (`unit-of-work.md`), sin necesidad de una fila de historia en esta tabla.
