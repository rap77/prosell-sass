# Wireframes — Catálogo Canónico de Vehículos para Facebook

Boceto de baja fidelidad para las dos superficies de UI identificadas en `intent-statement.md` (Intent Capture) y confirmadas en `scope-document.md` / `intent-backlog.md`. Ambas reutilizan patrones ya establecidos en el proyecto (`CategorySelectorModal`, `GenericFormFields`/`GenericProductForm`, `OrganizationPicker`) — sin patrón visual nuevo.

## Screen 1: Crear/Editar Vehículo — Selects Canónicos de Categoría/Atributo

```
+--------------------------------------------------+
| Crear / Editar Vehiculo                          |
+--------------------------------------------------+
| Categoria:      [ Auto/Camioneta         v ]     |
| Marca:          [ Toyota                 v ]     |
| Tipo (canonico):[ Sedan                  v ]     |
| Estado titulo:  [ Clean                  v ]     |
| VIN:            [ 1HGCM82633A004352        ]     |
|                 (decodificado: OK)               |
|                                                  |
|              [ Cancelar ]   [ Guardar ]          |
+--------------------------------------------------+
```

<!-- Text fallback: Formulario de creación/edición de vehículo con selects dinámicos de categoría, marca y tipo canónico (los atributos disponibles cambian según la categoría elegida), campo de estado de título, campo de VIN con feedback de decodificación, y botones de acción al pie. -->

**Accesibilidad**: heading `h2` para el título del formulario; landmark `main` envolviendo el formulario; el select de Categoría es el primer elemento enfocable (entrada de teclado).

## Screen 2: Editar Default de Ubicación por Producto

```
+--------------------------------------------------+
| Producto: Toyota Corolla 2022 - VIN 1HGCM82633...|
+--------------------------------------------------+
| Ubicacion (default de organizacion): Sucursal A  |
|                                                  |
| Editar ubicacion para este producto:             |
| [ Sucursal A               v ]                   |
|                                                  |
|              [ Cancelar ]   [ Guardar ]          |
+--------------------------------------------------+
```

<!-- Text fallback: Vista de detalle de producto mostrando la ubicación default de la organización, con un select para sobrescribir la ubicación específicamente para ese producto, y botones de acción al pie. -->

**Accesibilidad**: heading `h3` dentro de la vista de detalle de producto (`main` ya provisto por la página contenedora); el select de ubicación es el primer elemento enfocable de este bloque.

## Assumptions & Open Questions

None.

## Review

READY

**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-16T00:17:50Z
**Iteration:** 1

### Findings

| #   | Severidad | Ubicación                                                                | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Recomendación                                                                                                                                                       |
| --- | --------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor     | `wireframes.md` Screen 1 y Screen 2, líneas 8-19 y 27-37 (bloques ASCII) | Los bordes de las cajas (`+---+`) miden 52 caracteres, pero la mayoría de las líneas de contenido (`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | ...                                                                                                                                                                 | `) miden 53 caracteres y dos líneas en blanco (línea 17, y líneas 32/35) miden 54 — el ancho no es consistente dentro de la misma caja, violando el estándar de `stage-protocol.md` §10 ("ancho de línea consistente dentro de cada caja"). Verificado carácter a carácter. | Igualar el padding de cada línea de contenido al ancho exacto del borde (52 caracteres) en ambos diagramas. |
| 2   | Minor     | `wireframes.md` (todo el archivo) y `user-flow.md` (todo el archivo)     | Ninguno de los dos artefactos cita literalmente `intent-statement.md` — `wireframes.md` línea 3 cita solo `scope-document.md`/`intent-backlog.md`, y `user-flow.md` línea 3 cita solo `rough-mockups-questions.md`. El sensor `upstream-coverage` de esta etapa exige que "la salida" referencie cada artefacto declarado en `consumes:` (`intent-statement`, `scope-document`, `intent-backlog`); la única referencia a `intent-statement` en todo el output de la etapa vive en la sección `## Sources` de `rough-mockups-questions.md`, no en los dos artefactos de diseño. No bloquea el gate (la referencia existe en algún archivo del set `produces[]`), pero conviene citar `intent-statement.md` explícitamente en al menos uno de los dos artefactos de diseño para blindar el sensor sin ambigüedad. | Agregar una referencia explícita a `intent-statement.md` en la intro de `wireframes.md` o `user-flow.md`.                                                           |
| 3   | Minor     | `wireframes.md` Screen 1                                                 | El diagrama ASCII y su nota de accesibilidad no muestran el carácter DINÁMICO de los selects de categoría/atributo (el punto central de Q1.A y del intent-statement: los atributos disponibles cambian según la categoría elegida) — solo el fallback de texto de la línea 21 lo menciona con la palabra "dinámicos", sin explicar el mecanismo. Aceptable para fidelidad baja, pero vale señalarlo para que Refined Mockups no repita la misma omisión con más fidelidad.                                                                                                                                                                                                                                                                                                                                      | En Refined Mockups, mostrar explícitamente el efecto de cambiar la Categoría sobre los selects de Marca/Tipo (ej. dos estados del mismo formulario, antes/después). |

### Cobertura verificada (sin hallazgos)

- Las dos superficies de UI confirmadas en Q1 (A: selects canónicos de categoría/atributo; B: default de ubicación por producto) están cubiertas, una por wireframe — sin pantallas inventadas fuera de los 4 grupos del backlog (Grupos 3 y 4, sin UI, correctamente excluidos).
- Ambos flujos de Q2 (C: "ambos") están cubiertos en `user-flow.md` — Flujo A y Flujo B, cada uno con diagrama + fallback de texto.
- Cada wireframe tiene su nota de accesibilidad de una línea con los tres elementos exigidos por el stage file: heading level, landmark region, punto de entrada de teclado.
- Ambos diagramas usan únicamente caracteres ASCII básicos (`+`, `-`, `|`, `[`, `]`, `v`, `->`) y tienen su fallback de texto debajo, tal como exige `stage-protocol.md` §10.
- Q3 (reutilizar `CategorySelectorModal`, `GenericFormFields`/`GenericProductForm`, `OrganizationPicker`) está declarado explícitamente en la intro de `wireframes.md` (línea 3) sin proponer un patrón visual nuevo — coherente con la respuesta afirmada.
- Ambos artefactos tienen `## Assumptions & Open Questions` con `None.` — formato correcto del sentinel.
- `rough-mockups-questions.md` tiene la sección `## Consolidated Summary Confirmation` con `[Answer]: Looks correct`, satisfaciendo el `summary_confirmation: required` del frontmatter.

### Summary

El artefacto cubre correctamente las dos superficies de UI y ambos flujos confirmados en la entrevista, sin inventar pantallas fuera del backlog, con notas de accesibilidad completas y diagramas ASCII con fallback de texto. Los tres hallazgos son mecánicos/cosméticos (ancho de caja inconsistente, cita de `intent-statement.md` ausente en los artefactos de diseño propiamente dichos, y el mecanismo dinámico de los selects no visualizado más allá del texto) — ninguno bloquea la implementación aguas abajo ni deja una decisión de producto sin resolver.
