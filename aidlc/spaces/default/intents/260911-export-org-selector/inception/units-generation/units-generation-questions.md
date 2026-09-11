# Units Generation — Plan

## Nota sobre `components.md` ausente

`domain-design` fue SKIP en este intent (sin building blocks nuevos —
solo se modifican componentes ya existentes). Este stage formalmente
consume `components.md` como `required: true`, pero ese artefacto no
existe por diseño de scope, no por omisión. Este plan deriva la frontera
de Units directamente de la estructura ya establecida del monorepo
(`aidlc/spaces/default/codekb/prosell-sass/component-inventory.md` y
`architecture.md`, evidencia de reverse-engineering) y de `requirements.md`/
`stories.md`, siguiendo el mismo patrón ya confirmado en intents previos
(`260829-auth-navigation-refactor`, `260903-catalog-client-export`) para
cuando Domain Design se salteó legítimamente.

## Sin ambigüedad genuina de descomposición — se omite el bloque de preguntas de estrategia

Se omite el bloque interactivo de Step 3 (estrategia de boundary/
granularidad/dependencias) porque no hay ambigüedad real que amerite
juicio humano: las 3 historias (`stories.md`) tocan exclusivamente el
mismo archivo/componente frontend (`ExportSummaryBanner` dentro de
`catalog/page.tsx`, `apps/web`), sin ningún límite de despliegue,
servicio o dominio distinto que justifique más de un Unit — coincide
exactamente con el criterio "single-unit delivery" de
`workflow-planning-guide.md` (menos de 5 historias, todas comparten los
mismos componentes, sin fronteras independientes de deploy/test). Mismo
patrón ya reconfirmado en Units Generation de `260829-auth-navigation-refactor`
y `260903-catalog-client-export`.

## Step 5: Plan Approval

- **Estrategia de boundary**: un único Unit, por alcance de despliegue
  (todo el cambio vive en `apps/web`, no toca `apps/api`).
- **Cantidad estimada de Units**: 1.
- **Estructura de dependencias**: sin dependencias (Unit único, sin DAG
  que resolver).
- **Kind del Unit**: `ui` — es una superficie frontend, sin lógica de
  negocio nueva ni contrato público nuevo (el backend ya está resuelto en
  un intent previo y no se modifica).

```question
prompt: "¿Aprobamos este plan de un único Unit (kind: ui, sin dependencias) para las 3 historias de este intent?"
header: "Plan de Units"
multiSelect: false
options:
  - label: "Approve Plan"
    description: "Un solo Unit, kind ui, cubre las 3 historias — seguimos a generar los artefactos."
  - label: "Revise Plan"
    description: "Pedir otra descomposición — decime qué cambiar."
```

[Answer]: Approve Plan

## Consolidated Summary Confirmation

El plan de arriba (Step 5, ya aprobado) es el resultado completo de esta
etapa — un único Unit `U1` (kind: `ui`), sin dependencias, cubriendo las
3 historias. `unit-of-work.md`, `unit-of-work-dependency.md`,
`unit-of-work-story-map.md` y `traceability.json` se generan a partir de
esta decisión, sin más ambigüedad que resolver.

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
