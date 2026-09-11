# Practices Discovery — Preguntas (re-run)

Este es un re-run sobre una baseline ya extensamente afirmada en
`aidlc/spaces/default/memory/team.md`. El lead y las tres revisiones ciegas
(quality, developer, devsecops) coinciden en que este intent (selector de
organización para exportar catálogo, casi 100% frontend, backend ya resuelto)
**no necesita ninguna especialización nueva de práctica de equipo** en Way of
Working, Walking Skeleton, Deployment ni Code Style — mismo patrón ya
confirmado en el intent 260903-catalog-client-export, del cual este intent es
un sub-alcance.

El único punto real que las revisiones dejaron para el humano es un piso
mínimo de test específico de este intent (no una práctica de equipo nueva).

## Q1 — Piso mínimo de test para este intent

Quality propuso, y developer/devsecops no objetaron, un piso mínimo de test
puntual para este intent (no cambia el piso general del proyecto):

1. Regresión negativa explícita de gating por permiso: un usuario SIN
   `ORG_ADMIN_VIEW_ALL` nunca ve el selector, y el export sin `organization_id`
   sigue exportando su propia organización — no solo el camino feliz con
   permiso.
2. Test del wiring nuevo: confirmar que el `organization_id` elegido llega
   correctamente a `exportCatalogClientFormat()`.
3. Si la vía de diseño elegida reutiliza `organizationStore.viewingOrgId`
   (el mecanismo global ya existente): verificar que consumirlo desde el
   flujo de export no rompe el consumo existente del `OrganizationPicker` en
   el header.

¿Afirmamos este piso como obligatorio para este intent?

```question
prompt: "¿Afirmamos este piso mínimo de 3 puntos como obligatorio para el intent 260911-export-org-selector?"
header: "Testing Posture"
multiSelect: false
options:
  - label: "A. Sí, afirmar los 3 puntos tal cual"
    description: "Piso mínimo obligatorio para este intent: regresión de gating, test de wiring, no-regresión del picker existente si aplica"
  - label: "B. Ajustar el piso"
    description: "Afirmar una versión modificada — decime qué cambiar"
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. Sí, afirmar los 3 puntos tal cual

## Consolidated Summary Confirmation

Resumen final antes del gate de afirmación: las 5 secciones de
`team-practices.md` quedan sin especialización nueva de práctica de equipo
(0/3 OBJECT de las revisiones ciegas), salvo un piso mínimo de test puntual
para este intent en `## Testing Posture` (los 3 puntos de Q1, afirmados).
`discovered-rules.md` queda con `## Mandated`/`## Forbidden` vacíos —
ninguna decisión de este intent amerita promoción a restricción de proceso
de equipo. `evidence.md` documenta el proceso completo (3/3 AGREE).

[Answer]: Looks correct
