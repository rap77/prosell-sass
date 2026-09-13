# Functional Design — Preguntas (u2-cross-org-export-ui)

La mayoría del diseño de U2 ya está fijado por `refined-mockups/`
(mockups.md, interaction-spec.md, design-system-mapping.md,
accessibility-checklist.md) y `contract-summary.md` (contrato exacto
de query params). Queda 1 pregunta genuina, ya señalada como diferida
en `design-system-mapping.md`.

## Q1 — Ícono para "Todas las organizaciones"

`design-system-mapping.md` dejó esto abierto: "confirmar cuál ícono
en Functional Design — ej. Layers/Grid de la misma librería que ya
provee el ícono Building2 usado hoy".

```question
prompt: "¿Qué ícono usamos para la opción \"Todas las organizaciones\" en el picker?"
header: "Ícono 'todas'"
multiSelect: false
options:
  - label: "A. Layers (Recommended)"
    description: "De lucide-react (misma librería que Building2 ya usado) — sugiere \"múltiples capas/organizaciones apiladas\""
  - label: "B. Grid"
    description: "Sugiere \"vista de conjunto\" en vez de \"apilado\""
  - label: "X. Other (please specify)"
    description: "Otro ícono"
```

[Answer]: A. Layers

## Consolidated Summary Confirmation

- Ícono para "todas": `Layers` (lucide-react).
- El resto del diseño de U2 ya está fijado por `refined-mockups/` (estados, accesibilidad, componentes extendidos) y `contract-summary.md` (contrato exacto de query params) — sin preguntas adicionales.

Does this all look correct before I generate the functional design artifacts for u2-cross-org-export-ui?

```question
prompt: "Does this all look correct before I generate the functional design artifacts for u2-cross-org-export-ui?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, generá los artefactos"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de generar"
```

[Answer]: Looks correct
