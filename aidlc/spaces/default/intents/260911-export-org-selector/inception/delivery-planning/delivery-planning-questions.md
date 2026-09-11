# Delivery Planning — Plan

Un único Unit de trabajo (`U1`, sin dependencias — `unit-of-work-dependency.md`)
que no entrega valor de usuario de forma independiente por partes — es un
cambio chico y autocontenido. Siguiendo el mismo patrón ya confirmado en
`260903-catalog-client-export` para este caso (una sola Unit, sin Bolts
candidatos compitiendo por orden), se bundlea directo en un solo Bolt con
heurística value-first, sin scoring WSJF formal (el scoring solo aporta
valor cuando hay múltiples Bolts que ordenar).

Walking skeleton: `team.md` § Walking Skeleton ya afirma que el equipo NO
corre la ceremonia — este Bolt no es un walking skeleton, es un Bolt
regular.

## Preguntas estratégicas

### Q1 — Confirmación del plan de un único Bolt

```question
prompt: "¿Confirmamos un único Bolt que bundlea el único Unit (U1), sin scoring WSJF (no hace falta ordenar nada — es el único Bolt)?"
header: "Plan de Bolts"
multiSelect: false
options:
  - label: "A. Sí, un único Bolt"
    description: "El Unit único se construye completo en un solo Bolt — el plan de delivery más simple posible para este alcance."
  - label: "B. Preferís dividirlo en más Bolts"
    description: "Decime cómo — aunque U1 ya sea un único Unit sin dependencias."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. Sí, un único Bolt

### Q2 — Riesgo principal a atacar temprano

```question
prompt: "¿Qué te preocupa más de este build, para atacarlo temprano dentro del único Bolt?"
header: "Riesgo"
multiSelect: false
options:
  - label: "A. El estado skeleton/loading del badge (hallazgo Major ya resuelto en Refined Mockups)"
    description: "El riesgo de UX que motivó AC1.1.5 — que el diseño de carga funcione bien en la implementación real, no solo en el mockup."
  - label: "B. Ninguno en particular"
    description: "El alcance es chico y ya está bien acotado — no hay un riesgo dominante."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. El estado skeleton/loading del badge

## Consolidated Summary Confirmation

- Un único Bolt, bundleando el único Unit (`U1`), sin scoring WSJF, sin
  walking skeleton (ya afirmado en `team.md`).
- Riesgo principal a atacar temprano: el estado skeleton/loading del
  badge de confirmación de organización (hallazgo Major ya resuelto en
  diseño, Refined Mockups) — se prioriza dentro del Bolt.
- Mob: `aidlc-developer-agent` (Team Formation fue SKIP en scope classic,
  default per stage file).
- Sin dependencias externas que mapear — todo el backend necesario ya
  está resuelto y estable desde `260910-export-cross-org`.

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
