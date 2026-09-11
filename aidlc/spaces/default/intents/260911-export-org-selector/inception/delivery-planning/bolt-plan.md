# Bolt Plan — 260911-export-org-selector

Un **Bolt** es un pase de construcción — una vuelta completa por las
etapas de Construction (3.1–3.7) para uno o más Units de trabajo. Este
plan tiene un único Bolt, porque `unit-of-work.md`/`unit-of-work-dependency.md`
(Units Generation) definieron un único Unit sin dependencias (`U1`).

## Bolt 1 — Export Org Confirmation

- **Units incluidas**: `U1` (`u1-export-org-confirmation`, kind: `ui`).
- **Walking skeleton**: NO — `team.md` § Walking Skeleton ya afirma que
  el equipo no corre esa ceremonia; este es un Bolt regular.
- **Definition of Done**:
  - `exportCatalogClientFormat()` envía `organization_id` cuando
    `organizationStore.viewingOrgId` está seteado (FR1.1–FR1.4).
  - `ExportSummaryBanner` muestra el badge de confirmación de
    organización con sus 3 estados (own/loading/cross-org — resuelto en
    Refined Mockups) (AC1.1.5, AC1.1.6, Major fix de Refined Mockups).
  - Mensaje específico de catálogo vacío cross-org (FR3.1, US2).
  - Usuarios sin `ORG_ADMIN_VIEW_ALL` no ven ningún cambio (FR2.1, FR2.2,
    US3) — regresión negativa explícita, per el piso mínimo de test
    afirmado en Practices Discovery.
  - Suite de tests existente sigue en verde (`team.md` § Testing Posture).
  - Pre-commit/pre-push completo en verde (GGA, ruff, pyright, ESLint,
    pytest).
- **Confidence hypothesis**: si este Bolt funciona, un admin con
  `ORG_ADMIN_VIEW_ALL` puede exportar el catálogo de cualquier
  organización que administre directamente desde `/catalog`, sin pasos
  extra, y sin arriesgar exportar la organización equivocada sin darse
  cuenta (el badge de confirmación, con su estado de carga correcto,
  hace visible en todo momento qué organización se está exportando).
- **Expected demo**: en staging, loguearse como un usuario con
  `ORG_ADMIN_VIEW_ALL`, elegir otra organización en el header, exportar
  el catálogo desde `/catalog`, y mostrar que el ZIP descargado
  corresponde a esa organización — con el badge visible en el banner
  antes de confirmar.
