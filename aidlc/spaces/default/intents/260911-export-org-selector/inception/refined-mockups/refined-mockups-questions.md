# Refined Mockups — Preguntas

Scope classic: sin Ideation, sin rough-mockups/user-flow previos — diseño
directo desde `stories.md`/`requirements.md`, sin inventar contenido de
wireframes ausentes (regla ya reconfirmada varias veces en `project.md`).

El alcance visual real de este intent es MÍNIMO: no se agrega ningún
componente ni pantalla nueva. El único cambio de UI es un texto de
confirmación de organización dentro de `ExportSummaryBanner` (ya existente),
afirmado en AC1.1.5/AC1.1.6 de `stories.md`. `OrganizationPicker` (el
selector en sí) no se toca.

## Q1 — Texto exacto del mensaje de confirmación

```question
prompt: "¿Qué texto exacto debería mostrar el banner cuando se va a exportar una organización distinta a la propia (AC1.1.5)?"
header: "Copy"
multiSelect: false
options:
  - label: "A. \"Exportando catálogo de: {nombre de organización}\""
    description: "Directo, nombra la acción y la organización."
  - label: "B. \"Vas a exportar el catálogo de {nombre de organización}\""
    description: "Tono más conversacional, en segunda persona."
  - label: "C. Otro texto"
    description: "Decime el texto que preferís."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. "Exportando catálogo de: {organización}"

## Q2 — Estilo visual del texto de confirmación

```question
prompt: "¿El texto de confirmación necesita algún tratamiento visual especial (ej. badge/chip con el nombre de la organización, ícono), o alcanza con texto plano dentro del banner ya existente?"
header: "Estilo"
multiSelect: false
options:
  - label: "A. Texto plano, sin tratamiento especial"
    description: "Se integra como una línea más de texto dentro del banner existente — cambio mínimo, sin nuevos elementos visuales."
  - label: "B. Destacado (badge/negrita/ícono)"
    description: "El nombre de la organización se resalta visualmente para que sea imposible pasarlo por alto."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: B. Destacado (badge/negrita/ícono)

## Consolidated Summary Confirmation

- El único cambio de UI es un texto de confirmación DESTACADO (badge/negrita)
  dentro de `ExportSummaryBanner` (ya existente): `"Exportando catálogo de:
{organización}"`, visible solo cuando se exporta cross-org (AC1.1.5). Sin
  cambios cuando se exporta la organización propia (AC1.1.6).
- No se agrega ningún componente, pantalla, ni selector nuevo —
  `OrganizationPicker` no se toca.
- Los 5 estados de pantalla (empty/loading/success/error/partial) del banner
  ya existen y no cambian, salvo el estado "success" del camino cross-org,
  que ahora incluye el texto destacado.

Does this all look correct before I generate the artifacts?

```question
prompt: "Does this all look correct before I generate the artifacts?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, generá los artefactos"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de generar"
```

[Answer]: Looks correct
