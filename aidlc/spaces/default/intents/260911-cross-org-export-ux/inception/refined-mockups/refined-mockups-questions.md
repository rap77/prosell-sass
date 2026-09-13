# Refined Mockups — Preguntas (260911-cross-org-export-ux)

Este intent no tiene `rough-mockups` (scope `classic`, sin fase de
Ideation) — diseño directo desde `stories.md`/`requirements.md`, sin
inventar contenido de wireframes/user-flow ausentes (carve-out ya
documentado en el stage file, reconfirmado en el intent
`260903-catalog-client-export`).

Además, este intent NO introduce pantallas nuevas — extiende 3
componentes ya existentes y en producción: `OrganizationPicker.tsx`
(header), `ExportSummaryBanner` (dentro de `catalog/page.tsx`), y el
flujo de `window.prompt()` de export. El trabajo de diseño real es
anotar los estados NUEVOS de esos componentes, no crear una interfaz
desde cero — eso acota el alcance de preguntas genuinas.

## Q1 — Tratamiento visual de "Todas las organizaciones" en el picker

`OrganizationPicker.tsx` hoy lista organizaciones puntuales con
nombre + badge de `product_count` (a confirmar contra el componente
real en Domain Design/Functional Design). La opción "Todas las
organizaciones" es conceptualmente distinta (no es UNA organización,
es un modo).

```question
prompt: "¿La opción \"Todas las organizaciones\" debe destacarse visualmente del resto de la lista (ej. separador, ícono distinto, posición fija arriba/abajo de la lista), o debe listarse como una fila más entre las organizaciones puntuales?"
header: "Opción 'todas'"
multiSelect: false
options:
  - label: "A. Destacada (separador + posición fija) (Recommended)"
    description: "Ej. separador visual y ubicada siempre primera o última en la lista, con ícono distinto (ej. capas/grid en vez de building)"
  - label: "B. Fila más entre las organizaciones puntuales"
    description: "Mismo tratamiento visual que cualquier organización, ordenada alfabéticamente o por posición natural"
  - label: "X. Other (please specify)"
    description: "Otro tratamiento"
```

[Answer]: A. Destacada (separador + posición fija)

## Q2 — Estado de carga del export "todas las organizaciones"

`stories.md` § Notes for Functional Design (hallazgo de design) señala
que ninguna historia cubre feedback visual durante un export "todas"
que puede tardar sensiblemente más que un export de una sola
organización (arma el ZIP completo en memoria, según NFR3).

```question
prompt: "¿El botón de export debe mostrar un estado de carga distinguible (ej. spinner + texto \"Exportando todas las organizaciones...\") durante un export \"todas\", o alcanza con el estado de carga genérico que ya usa el botón de export para una sola organización?"
header: "Estado de carga"
multiSelect: false
options:
  - label: "A. Estado de carga distinguible para 'todas' (Recommended)"
    description: "Texto específico durante la espera más larga, mismo patrón de spinner ya usado"
  - label: "B. Reusar el estado de carga genérico existente"
    description: "Sin texto especial — el usuario ve el mismo spinner que para un export puntual"
  - label: "X. Other (please specify)"
    description: "Otro tratamiento"
```

[Answer]: A. Estado de carga distinguible para 'todas'

## Q3 — Accesibilidad y breakpoints

```question
prompt: "¿Se mantiene el nivel WCAG 2.1 AA ya afirmado como baseline del proyecto, y los breakpoints responsive ya usados por Header.tsx/catalog/page.tsx (sin breakpoints nuevos), para todos los componentes extendidos por este intent?"
header: "A11y / Responsive"
multiSelect: false
options:
  - label: "A. Sí, mantener baseline existente (Recommended)"
    description: "WCAG 2.1 AA, mismos breakpoints ya usados por los componentes existentes — sin diseño responsive nuevo"
  - label: "B. Requiere un nivel/breakpoint distinto"
    description: "Especificar qué cambia"
  - label: "X. Other (please specify)"
    description: "Otro criterio"
```

[Answer]: A. Sí, mantener baseline existente

## Consolidated Summary Confirmation

- La opción "Todas las organizaciones" en el picker se destaca visualmente (separador + posición fija + ícono distinto), no es una fila más entre organizaciones puntuales.
- El export "todas las organizaciones" muestra un estado de carga distinguible (texto específico), distinto del spinner genérico ya usado para un export puntual.
- Se mantiene el baseline existente de WCAG 2.1 AA y los breakpoints responsive ya usados por los componentes extendidos — sin accesibilidad ni responsive design nuevo.

Does this all look correct before I generate the refined mockups artifacts?

```question
prompt: "Does this all look correct before I generate the refined mockups artifacts?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, generá los artefactos"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de generar"
```

[Answer]: Looks correct
