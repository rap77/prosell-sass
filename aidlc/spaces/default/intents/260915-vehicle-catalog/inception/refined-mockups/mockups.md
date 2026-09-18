# Refined Mockups — Catálogo Canónico de Vehículos para Facebook

Refina `wireframes.md`/`user-flow.md` (Rough Mockups) con los criterios de aceptación de `stories.md` (US1.1, US1.2, US2.1). Reutiliza patrones ya existentes (`CategorySelectorModal`, `GenericFormFields`/`GenericProductForm`, `OrganizationPicker`) — sin patrón visual nuevo, confirmado en Rough Mockups y reconfirmado acá.

## Screen 1: Crear/Editar Vehículo — Selects Canónicos (← US1.1)

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
| Combustible:    [                        v ] (i) |
|   No se pudo autocompletar - completar a mano    |
|                                                  |
|              [ Cancelar ]   [ Guardar ]          |
+--------------------------------------------------+
```

<!-- Text fallback: Formulario de creación/edición de vehículo. El campo "Combustible" quedó vacío porque el valor decodificado del VIN no calzó con ninguna opción del catálogo canónico (AC1.1.2) — se marca con un ícono de ayuda (i) y un texto de una línea debajo del campo (patrón tooltip/ayuda, Q1 opción C), sin bloquear el resto del formulario. Al guardar con un valor manual inválido en cualquier campo select-backed (AC1.1.3), el formulario muestra un error inline junto al campo específico y no permite guardar. -->

**Estados** (Q2, opción A): `loading` mientras se decodifica el VIN (spinner junto al campo VIN); `success` al guardar (toast de confirmación); `error` al intentar guardar con un valor inválido (mensaje inline junto al campo, formulario no se envía).

**Accesibilidad**: heading `h2`; landmark `main`; el ícono de ayuda (i) es accesible por teclado (foco + Enter/Espacio muestra el texto de ayuda) y anunciado por lector de pantalla vía `aria-describedby` apuntando al texto de ayuda.

## Screen 2: Editar Default de Ubicación por Producto (← US2.1)

Corrección post-revisión: el dato real de ubicación en `Product` (`location_city`/`location_state`, `apps/api/src/prosell/domain/entities/product.py`) son DOS strings libres, no una opción de una lista fija ("Sucursal"). Reemplaza el select único del boceto original por dos campos de texto, mismo par ya usado en `OrganizationFormFields.tsx` ("Ciudad"/"Provincia o Estado") para el default de organización — mismo patrón, aplicado ahora también a nivel de producto.

```
+--------------------------------------------------+
| Producto: Toyota Corolla 2022 - VIN 1HGCM8263... |
+--------------------------------------------------+
| Ciudad:      [ Rosario                    ]      |
| Provincia:   [ Santa Fe                    ]     |
|              [Heredado de organizacion]          |
|                                                  |
|              [ Cancelar ]   [ Guardar ]          |
+--------------------------------------------------+
```

<!-- Text fallback: Vista de detalle de producto. Los campos "Ciudad" y "Provincia" muestran el valor actual (heredado o override) como dos strings libres, no una opción de una lista fija — mismo par de campos ya usado en el default de organización (OrganizationFormFields.tsx). Una etiqueta "Heredado de organización" (patrón badge, Q1 opción C) aparece SOLO cuando AMBOS campos muestran el default de la organización (ninguno tiene override guardado), y desaparece en cuanto el usuario guarda un override para el producto (AC2.1.2). Al guardar con un solo campo completado (ej. ciudad sin estado, AC2.1.5) o con ambos vacíos tras haber tenido override, se muestra un error inline y el valor revierte al default de organización en vez de persistir un valor parcial o vacío — ciudad y estado se guardan como una unidad, no independientemente. -->

**Estados** (Q2, opción A): `loading` al cargar el detalle del producto; `success` al guardar (toast de confirmación, la etiqueta "Heredado de organización" se oculta); `error` al guardar un valor parcial (solo ciudad o solo estado) o inválido (mensaje inline, no se persiste el override) — AC2.1.5.

**Accesibilidad**: heading `h3` dentro de la vista de detalle de producto (`main` ya provisto por la página contenedora); la etiqueta "Heredado de organización" es texto real (no solo color), leído por el lector de pantalla junto a los dos campos.

## Nota de cobertura — US1.2 (Platform Admin, editor de schema de categorías)

AC1.2.1 (`stories.md`) no tiene mockup propio en esta etapa: el editor de schema de categorías (`category-schema-editor.tsx`, ya en producción, gateado a Platform Admin) no cambia visualmente — el único cambio es que las `options` de los campos select-backed pasan a poblarse desde el catálogo canónico reconciliado (FR1) en vez de la fuente actual. Es un cambio de origen de datos, no de interacción ni de layout; no amerita un mockup nuevo.

## Nota de cobertura — AC1.1.4

AC1.1.4 (`stories.md`) es una regla de `Category.validate_attributes()` en el dominio backend, sin superficie de usuario nueva — no tiene mockup correspondiente por diseño.

## Assumptions & Open Questions

None.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-16T11:16:09Z
**Iteration:** 1

### Hallazgos

| #   | Severidad | Ubicación                                                                                                                      | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Recomendación                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Critical  | `mockups.md` Screen 2 (líneas 30-46) / `interaction-spec.md` `ProductLocationField`                                            | El mockup modela "Ubicación" como UN ÚNICO select con un string ("Sucursal A"), pero el dato real de `Product` es `location_city` + `location_state` — dos strings libres independientes (verificado en `apps/api/src/prosell/domain/entities/product.py:65-66` y `apps/web/src/types/product.ts:60-61`; no existe un concepto de "Sucursal"/branch seleccionable como default de ubicación por producto). El propio AC2.1.5 de `stories.md` lo confirma indirectamente: su ejemplo de valor inválido es "ciudad sin estado" — un escenario que exige dos campos rellenables por separado y que un único `<select>` con `value: string \| null` (prop única de `ProductLocationField`) no puede representar ni validar. Un developer que construya desde estos artefactos armaría la forma de UI equivocada (un select de opciones fijas en vez de dos inputs de texto city/state) y no tendría forma de implementar la regla de AC2.1.5 tal como está especificada. | Rediseñar `ProductLocationField`/Screen 2 con dos campos de texto (ciudad, estado) — no un select de opciones predefinidas — y actualizar `interaction-spec.md` (props `value`→`city`/`state` o similar) y el diagrama de `mockups.md` para reflejar el shape real.                                                                                                                                                              |
| 2   | Critical  | `design-system-mapping.md` (fila "Selector de ubicación con badge de herencia") / `interaction-spec.md` `ProductLocationField` | Se afirma que `ProductLocationField` es una "extensión de `OrganizationPicker`" (`apps/web/src/components/admin/OrganizationPicker.tsx`). Verificado contra el código real: `OrganizationPicker` es un dropdown de header que le permite a un admin "ver como otra organización" (Subsystem D, cross-org viewing) — usa `useOrganizations()`/`organizationStore`, no tiene props `value`/`onChange`/`onSave`, no distingue heredado/override, y no vive embebido en una vista de detalle de producto. No hay ninguna relación estructural real entre ambos componentes — es una reutilización inventada, exactamente el riesgo que este review debía chequear (punto 5 del brief).                                                                                                                                                                                                                                                                                   | Quitar la referencia a `OrganizationPicker` como base de reutilización. Documentar `ProductLocationField` como campo genuinamente nuevo (o, si se resuelve el hallazgo #1 con dos inputs de texto, evaluar si ya existe un patrón de campo ciudad/estado reutilizable en el formulario de producto — ej. el mismo usado por `csv_product_parser`/`GenericFormFields` — antes de asumir que hace falta un componente 100% nuevo). |
| 3   | Major     | Todo `mockups.md`/`interaction-spec.md`/`design-system-mapping.md`/`accessibility-checklist.md`                                | US1.2 (`stories.md`, AC1.2.1 — el editor de schema de categorías del Platform Admin cargando `options` desde el catálogo reconciliado) no tiene NINGUNA cobertura en esta etapa: ni pantalla, ni entrada en la tabla de `design-system-mapping.md`, ni ítem en el checklist de accesibilidad, ni una nota explícita de "sin cambio visual, mismo screen ya existente". El propio brief de esta revisión pedía verificar cobertura de US1.1, US1.2 y US2.1 — US1.2 quedó completamente ausente, sin siquiera una justificación de por qué no necesita mockup propio (a diferencia de AC1.1.4, que sí es claramente no-UI por ser una regla de `validate_attributes()`). El gap ya venía de `wireframes.md` (Rough Mockups, generado antes de que `stories.md`/US1.2 existiera), pero esta etapa — cuyo propósito es refinar contra los AC de User Stories — no lo detectó ni lo cerró.                                                                                | Agregar una nota explícita en `mockups.md` (o un tercer bloque de pantalla si corresponde) sobre US1.2/AC1.2.1: si el editor de schema de categorías (`category-schema-editor.tsx`) no cambia visualmente y solo cambia la fuente de datos de `options`, decirlo explícitamente con esa justificación — no dejarlo en silencio.                                                                                                  |
| 4   | Minor     | `mockups.md` (todo el archivo)                                                                                                 | AC1.1.4 (`stories.md`) no tiene mención explícita de por qué queda fuera de esta etapa (es una regla de `Category.validate_attributes()` sin superficie de usuario nueva, correcto). No bloquea, pero una línea explícita evitaría la misma ambigüedad señalada en el hallazgo #3 para US1.2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Agregar una línea breve aclarando que AC1.1.4 es cobertura de backend/domain, sin mockup correspondiente.                                                                                                                                                                                                                                                                                                                        |

### Resumen

El patrón de interacción elegido por el humano (Q1=C: badge siempre visible para ubicación heredada, tooltip para autocompletado fallido) y los 3 estados básicos (Q2=A: loading/success/error) SÍ están aplicados de forma consistente entre `mockups.md`, `interaction-spec.md` y `accessibility-checklist.md` para Screen 1 y Screen 2 — sin hallazgos en ese eje. El problema real es más de fondo: Screen 2 modela un dato (`ubicación`) con una forma de UI (un único select de "Sucursal") que no corresponde a la forma real del dato en el backend (`location_city`+`location_state`, dos campos), y arrastra esa forma incorrecta desde `wireframes.md` sin corregirla en la etapa que existe precisamente para eso. Además reutiliza un componente (`OrganizationPicker`) que no tiene ninguna relación funcional con lo que se está construyendo, y omite por completo la cobertura de US1.2. Los 2 hallazgos Critical requieren rediseño real de Screen 2 (no son cosméticos) — de ahí el NOT-READY.

### Resolución del conductor (post-revisión, mismos 4 hallazgos)

Los 4 hallazgos son mecánicos/objetivos (verificados contra código real por el propio reviewer: `product.py`, `product.ts`, `OrganizationPicker.tsx`), no judgment calls — se corrigieron directo en los 4 artefactos de esta etapa, sin necesidad de una decisión humana nueva:

1. **Critical (Screen 2 shape)** — Corregido. Screen 2 rediseñada con dos campos de texto libre (Ciudad, Provincia/Estado) en vez de un select único de "Sucursal", reflejando `location_city`/`location_state`. Verificado que `OrganizationFormFields.tsx` ya usa exactamente este mismo par de campos para el default de organización — se reutiliza ese patrón, no se inventa uno nuevo. `interaction-spec.md` actualizado: `ProductLocationField` → `ProductLocationFields`, props `city`/`state` en vez de `value` único.
2. **Critical (reutilización inventada)** — Corregido. Se quitó la referencia a `OrganizationPicker` en `design-system-mapping.md`/`interaction-spec.md`; el componente base real de reutilización pasa a ser el par de campos ciudad/estado de `OrganizationFormFields.tsx`.
3. **Major (US1.2 sin cobertura)** — Corregido. Se agregó una nota de cobertura explícita en `mockups.md` y una fila en `design-system-mapping.md` aclarando que `category-schema-editor.tsx` no cambia visualmente — solo cambia la fuente de las `options`.
4. **Minor (AC1.1.4 sin nota)** — Corregido. Se agregó una nota de cobertura explícita en `mockups.md`.

**Verdict actualizado:** READY (tras corrección directa de los 4 hallazgos — sin cambios de fondo pendientes de decisión humana).
