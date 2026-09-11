# User Stories — Plan

## Persona development approach

Dos personas, derivadas directamente de `requirements.md` (FR1/FR2) y de
`personas.md` de `260903-catalog-client-export` (reutilizado como
precedente, no reescrito desde cero):

1. **Admin con permiso cross-org** (`ORG_ADMIN_VIEW_ALL` — roles `admin` /
   `super_admin`): quiere exportar el catálogo de otra organización sin
   pasos extra, reutilizando el selector que ya usa en el resto de la app.
2. **Usuario sin permiso cross-org** (rol estándar de vendedor/dealer): no
   debe notar ningún cambio — sigue exportando solo su propia organización.

## Story format

Given/When/Then, formato estándar `As a [persona], I want [goal], so that
[benefit]`, IDs `US{group}.{seq}` + `AC{group}.{seq}.{n}`.

## Story prioritization (MoSCoW)

Dado que TODO el alcance de este intent es el objetivo explícito del pedido
del usuario (cerrar el gap UI↔backend), se espera que las historias
resultantes sean **Must Have** en su totalidad — no hay margen de "Could
Have" en un intent ya acotado a esto. Se confirma con el humano en Q1.

## Breakdown approach

Por comportamiento observable (positivo: admin exporta cross-org /
negativo: usuario sin permiso no ve cambios / error: organización sin
catálogo) — no por capa técnica, ya que la implementación es de una sola
capa (frontend, reutilizando estado existente).

## Preguntas

### Q1 — Prioridad MoSCoW

```question
prompt: "¿Las 2-3 historias de este intent son todas Must Have (dado que son exactamente el alcance pedido), o hay alguna que preferís marcar Should/Could Have?"
header: "Prioridad"
multiSelect: false
options:
  - label: "A. Todas Must Have"
    description: "El alcance completo de este intent es el objetivo pedido — no hay parte opcional."
  - label: "B. Alguna es Should/Could Have"
    description: "Decime cuál y qué prioridad."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. Todas Must Have

### Q2 — Cantidad y granularidad de historias

```question
prompt: "¿Te parece bien 3 historias (admin exporta cross-org exitosamente / admin ve mensaje claro si la org elegida no tiene catálogo / usuario sin permiso no ve ningún cambio), o preferís otra granularidad (ej. fusionar las primeras dos en una sola historia con múltiples ACs)?"
header: "Granularidad"
multiSelect: false
options:
  - label: "A. 3 historias como se propone"
    description: "Cada comportamiento observable distinto es su propia historia."
  - label: "B. Fusionar en menos historias"
    description: "Preferís consolidar — decime cómo."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. 3 historias como se propone

## Q3 — Judgment call de la ronda de mob: confirmación visual de la organización en el punto de export

El diseñador (ronda de mob, Round 1) señaló un riesgo real de UX: hoy
`OrganizationPicker` vive en el header, lejos del botón de exportar. Un
admin podría no notar qué organización tiene elegida y exportar por error
la organización equivocada — hoy ninguna AC confirma la organización
elegida en el punto de export mismo (solo se menciona en el mensaje de
error de catálogo vacío, US2). Requirements Analysis ya había decidido
explícitamente "no agregar ningún componente de UI nuevo" — esto podría
tensionar esa decisión si se agrega texto de confirmación.

```question
prompt: "¿Agregamos una historia/AC que confirme visualmente la organización elegida en el propio flujo de export (ej. un texto \"Exportando catálogo de: <Organización>\" en el banner de confirmación), o dejamos que el usuario confíe en lo que ya eligió en el header?"
header: "Confirmación UX"
multiSelect: false
options:
  - label: "A. Sí, agregar un texto de confirmación en el banner de export"
    description: "Pequeño agregado de texto (no un selector nuevo) en ExportSummaryBanner mostrando la organización activa antes de confirmar la descarga — mitiga el riesgo de exportar la org equivocada sin darse cuenta."
  - label: "B. No, alcanza con lo que ya se decidió (sin UI nueva)"
    description: "El usuario ya vio qué organización eligió en el header — no agregar nada más, mantener el alcance mínimo ya cerrado en Requirements Analysis."
  - label: "C. También agregar el nombre de la organización al archivo descargado"
    description: "Además de (A), que el nombre sugerido del archivo incluya la organización exportada — relacionado, señalado también por el diseñador."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. Sí, agregar texto de confirmación en el banner

## Consolidated Summary Confirmation

- 3 historias Must Have (US1 exportar cross-org, US2 mensaje de catálogo
  vacío, US3 sin cambios para usuarios sin permiso), reutilizando las
  personas de `260903-catalog-client-export`.
- Ronda de mob (design/developer/quality, ciegos entre sí, 3/3 escribieron
  contribución): sin contradicciones de fondo con el draft del lead.
  Hallazgos mecánicos integrados directo (AC1.1.1 precisado a nivel de
  wiring, AC1.1.4 nueva cubriendo el piso mínimo #3 de Practices
  Discovery, AC3.1.3 reescrita en lenguaje medible, nota no-bloqueante
  sobre organización borrada/inaccesible para Functional Design).
- Único judgment call (Q3): agregar un texto de confirmación de la
  organización en el banner de export (`ExportSummaryBanner`) — afirmado.
  Se descartó explícitamente reflejar la organización en el nombre del
  archivo. Nuevas AC1.1.5/AC1.1.6 documentan esto sin reabrir la decisión
  de "sin selector nuevo" de Requirements Analysis.
- `traceability.json` mapea los 10 IDs de `requirements.md` (FR1.1–FR3.2,
  NFR1–NFR2) contra historias/ACs concretos, todos `OK`.

Does this all look correct before I generate the final artifact?

```question
prompt: "Does this all look correct before I generate the final artifact?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, seguimos a la revisión del reviewer y al gate de aprobación"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de seguir"
```

[Answer]: Looks correct
