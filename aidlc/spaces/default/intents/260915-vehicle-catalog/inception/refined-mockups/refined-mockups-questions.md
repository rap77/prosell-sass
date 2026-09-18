## Sources

- [consumes:wireframes] `aidlc/spaces/default/intents/260915-vehicle-catalog/ideation/rough-mockups/wireframes.md`
- [consumes:user-flow] `aidlc/spaces/default/intents/260915-vehicle-catalog/ideation/rough-mockups/user-flow.md`
- [consumes:stories] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/user-stories/stories.md`
- [consumes:requirements] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/requirements-analysis/requirements.md`
- [consumes:team-practices] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/practices-discovery/team-practices.md`

Rough Mockups ya confirmó: reutilizar patrones de UI existentes (sin patrón visual nuevo), mismos form factors de la plataforma, sin requisito de accesibilidad nuevo (WCAG ya vigente en el resto de la plataforma). Estas 2 preguntas cubren solo lo que User Stories agregó de nuevo: los indicadores visuales de AC1.1.2/AC2.1.2 y los estados de error de AC1.1.3/AC2.1.5.

## Q1. Los criterios de aceptación de User Stories piden dos indicadores visuales nuevos: (a) un campo que quedó vacío porque el VIN decodificado no calzó con ninguna opción (AC1.1.2), y (b) distinguir si una ubicación mostrada es el default heredado de la organización o un override ya guardado (AC2.1.2). ¿Qué patrón de interacción preferís para ambos?

A. Badge/etiqueta inline junto al campo (ej. "No se pudo autocompletar" / "Heredado de organización") — visible sin interacción adicional.
B. Tooltip/ícono de ayuda que el usuario pasa el mouse o toca para ver el detalle — menos intrusivo visualmente.
C. Combinación — badge para el caso de ubicación heredada (siempre visible), tooltip para el caso de autocompletado fallido (menos frecuente).
D. Todavía no definido — que Functional Design lo decida con más detalle de implementación.
X. Otro (especificar)

[Answer]: C

## Q2. ¿Qué estados hay que manejar explícitamente en las dos pantallas (loading, empty, error, success, partial)?

A. Los 3 estados básicos ya cubiertos implícitamente por los AC (decodificando VIN = loading; guardado exitoso = success; rechazo de AC1.1.3/AC2.1.5 = error) — no hace falta agregar nada más.
B. Además de A, un estado "partial" explícito cuando algunos campos se autocompletaron y otros quedaron vacíos por mismatch (AC1.1.2) — mostrar un resumen de cuántos campos requieren atención manual.
C. Todavía no definido.
X. Otro (especificar)

[Answer]: A

## Consolidated Summary Confirmation

- Q1 (Indicadores): C — combinación: badge para ubicación heredada, tooltip para autocompletado fallido.
- Q2 (Estados): A — los 3 básicos (loading, success, error) alcanzan.

- Looks correct
- Request changes

[Answer]: Looks correct
