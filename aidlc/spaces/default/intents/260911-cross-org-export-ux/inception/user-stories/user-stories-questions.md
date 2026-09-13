# User Stories — Plan de historias (260911-cross-org-export-ux)

## Enfoque de personas

`requirements.md` y el codekb (`business-overview.md` § Actores) ya
identifican dos actores distintos afectados por este intent:

1. **Super Admin / plataforma** (rol `super_admin`, permiso
   `ORG_ADMIN_VIEW_ALL`): único actor que ve el modo "todas las
   organizaciones" en el selector, exporta el catálogo completo de la
   plataforma, y ve el filtrado real de grilla aplicado a cualquier
   organización que elija.
2. **Vendedor/Dealer** (rol seller/dealer, sin `ORG_ADMIN_VIEW_ALL`):
   exporta únicamente su propio catálogo — se beneficia del fix de
   columnas del CSV (FR7) y ve los dos popups nuevos (FR8/FR9) igual
   que el Super Admin, pero NUNCA ve la opción "todas las
   organizaciones" ni el filtrado cross-org de grilla.

## Formato de historia

Formato estándar INVEST: "Como [persona], quiero [acción], para que
[beneficio]." Criterios de aceptación en Given/When/Then, IDs
`US{group}.{seq}` / `AC{group}.{seq}.{n}`.

## Enfoque de desglose

Las 9 áreas de FR de `requirements.md` mapean naturalmente a grupos de
historias por área funcional (no por persona ni por workflow) porque
cada FR-group ya es una unidad de valor demostrable independiente:

- US1 — Selector: label + filtro por `product_count` (FR1)
- US2 — Selector: modo "todas las organizaciones" (FR2)
- US3 — Filtrado real de la grilla de `/catalog` (FR3)
- US4 — Export "todas las organizaciones" (FR4)
- US5 — Confirmación de UI reforzada para "todas" (FR5)
- US6 — Auditoría distinguible para "todas" (FR6)
- US7 — Corrección del mapeo de columnas del CSV cliente (FR7)
- US8 — Popup de carpeta base de imágenes (FR8)
- US9 — Popup de grupos de Facebook (FR9)

## Priorización (MoSCoW)

- **Must Have**: US1, US2, US3, US4, US7 — sin esto el intent no
  resuelve ninguno de los gaps reales reportados por el usuario.
- **Should Have**: US5, US6 — mitigación de riesgo del radio de
  explosión ampliado de "exportar todas", ya afirmado como necesario en
  Practices Discovery, pero el feature funciona sin ellos (solo con
  más riesgo residual).
- **Could Have**: US8, US9 — mejoran la UX del export pero no son
  bloqueantes: sin los popups, el export sigue funcionando con los
  valores por defecto embebidos en el código (no hay caso donde el
  export directamente falle por su ausencia).

La frontera de MVP formal se decide en Delivery Planning; estas
prioridades son insumo para esa decisión.

## Pregunta

```question
prompt: "¿Este enfoque de 2 personas (Super Admin vs. Vendedor/Dealer) + 9 grupos de historias por área de FR + la priorización MoSCoW propuesta te parece correcto, o preferís otro desglose (ej. por journey de usuario en vez de por área de FR)?"
header: "Plan de historias"
multiSelect: false
options:
  - label: "A. Aprobar tal cual (Recommended)"
    description: "2 personas, 9 grupos de historias por área de FR, priorización MoSCoW como está propuesta"
  - label: "B. Ajustar desglose"
    description: "Preferís otro criterio de agrupación de historias (por journey, por persona, etc.)"
  - label: "X. Other (please specify)"
    description: "Otro ajuste al plan"
```

[Answer]: A. Aprobar tal cual

## Consolidated Summary Confirmation

- 2 personas (Ana, Super Admin; Marcos, Vendedor/Dealer), 9 grupos de historias (US1-US9, 25 sub-historias) mapeados 1:1 a las 9 áreas de FR de `requirements.md`.
- Ronda de mob-elaboration (design, developer, quality) completada, mutuamente ciega — sin disputas de conocimiento ni judgment calls que requirieran escalar a pregunta humana; los tres colaboradores fueron `AGREE` con hallazgos aditivos no bloqueantes, ya integrados directo en `stories.md` (2 ACs nuevos de casos límite, 1 historia nueva US4.5, notas para Functional Design).
- `traceability.json` cubre las 31 IDs de FR/NFR de `requirements.md`, todas `OK` salvo FR3.3 y NFR3 (`N/A`, justificados).
- 2 aprendizajes seleccionados y persistidos en `project.md`.

Does this all look correct before closing the User Stories stage?

```question
prompt: "Does this all look correct before closing the User Stories stage?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, cerrar la etapa"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de cerrar"
```

[Answer]: Looks correct
