# Refined Mockups — Questions

Sin rough-mockups previos (Ideation salteada por scope `classic`) — se diseña
directo desde `stories.md`/`requirements.md`. Ya existe un botón de export
genérico en `catalog/page.tsx` (`handleExportCsv`) y un precedente de
`window.prompt()` para pedir una ruta destino (FR8.3, intent
260826-prod-bugfixes-batch) — se usan como base, no se reinventa el patrón
salvo que el usuario pida lo contrario.

## Q1: Ubicación y disparo del nuevo export

¿Dónde vive el botón "Exportar catálogo (formato cliente)"?

A. Junto al botón de export genérico ya existente en `catalog/page.tsx`, como una segunda opción claramente diferenciada (ej. menú desplegable "Exportar" con dos opciones)
B. Reemplaza al botón de export genérico existente (el formato cliente pasa a ser el único)
C. En una ubicación completamente distinta (especificar dónde)
X. Other (please specify)

[Answer]: A. Junto al export genérico, como opción diferenciada

## Q2: Patrón de interacción para el nombre/ruta sugerido (US1.2)

¿Cómo se le pide al usuario el nombre/ruta base antes de exportar?

A. `window.prompt()` nativo del navegador, mismo patrón ya usado en FR8.3 — simple, sin componente de diseño nuevo
B. Un modal/dialog propio del sistema de diseño (ej. componente `Dialog` ya usado en otras partes de la app), con el campo de texto editable dentro
X. Other (please specify)

[Answer]: A. window.prompt() nativo, mismo patrón que FR8.3

## Q3: Confirmación antes de un export potencialmente grande

Dado que US1.3 exige avisar si el catálogo excede un límite de recursos, y el armado del ZIP puede tardar (US1.1 AC1.1.10 pide estado de loading): ¿el usuario ve algún resumen antes de confirmar (ej. "se van a exportar N productos"), o el export arranca directo al confirmar la ruta sugerida?

A. Arranca directo — sin paso de resumen previo, solo loading + resultado
B. Muestra un resumen breve (cantidad de productos a exportar) antes de confirmar
X. Other (please specify)

[Answer]: B. Muestra un resumen breve (cantidad de productos a exportar) antes de confirmar

## Q4: Accesibilidad y responsive

¿Aplica algún requisito de accesibilidad o responsive distinto al resto del panel de catálogo (que ya sigue el nivel WCAG y los breakpoints del design system vigente), o alcanza con heredar lo ya establecido para el resto de `catalog/page.tsx`?

A. Alcanza con heredar el nivel WCAG y los breakpoints ya vigentes en el resto del panel — sin requisito nuevo
B. Hay un requisito específico nuevo para este feature (especificar)
X. Other (please specify)

[Answer]: A. Alcanza con heredar lo ya vigente

## Consolidated Summary Confirmation

- Botón "Exportar catálogo (formato cliente)" junto al export genérico existente en `catalog/page.tsx`, como opción diferenciada (ej. menú desplegable con dos opciones).
- Ruta/nombre sugerido se pide con `window.prompt()` nativo, mismo patrón que FR8.3 — sin componente de diseño nuevo.
- Antes de confirmar, se muestra un resumen breve con la cantidad de productos `published` a exportar.
- Durante el armado del ZIP: estado de loading/deshabilitado (AC1.1.10); al terminar, confirmación de descarga.
- Accesibilidad y responsive: heredan el nivel WCAG y los breakpoints ya vigentes en el resto del panel de catálogo — sin requisito nuevo.
- Los artefactos a generar (mockups.md, interaction-spec.md, design-system-mapping.md, accessibility-checklist.md) documentan este flujo para las 3 historias (US1.1, US1.2, US1.3) y sus estados (loading, resumen, éxito, error de catálogo vacío, error de límite excedido).

Does this all look correct before I generate the requirements artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
