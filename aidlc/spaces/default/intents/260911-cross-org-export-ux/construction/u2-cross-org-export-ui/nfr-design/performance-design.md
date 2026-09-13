# Performance Design — u2-cross-org-export-ui

Diseña las soluciones concretas para `performance-requirements.md`
(NFR-PERF-UI-1 a NFR-PERF-UI-4) de este mismo Unit — responsividad de
interfaz, sin tocar el tiempo del request HTTP en sí (responsabilidad
de `u1-cross-org-export-api`). Extiende sin cambio el diseño ya
aprobado en `260903-catalog-client-export`.

## Técnicas de implementación

Ninguna técnica nueva — el proyecto ya usa React 19 con React Compiler
(`technology-stack.md`), que optimiza re-renders automáticamente sin
`useMemo`/`useCallback` manual (regla zero-tolerance ya vigente). Los 4
targets se cumplen naturalmente con:

- **NFR-PERF-UI-1** (banner de resumen, cualquier modo): el tipo de
  banner (`own`/`cross-org`/`all-orgs`) se deriva de `viewingOrgId`
  (`organizationStore`, ya en memoria) — actualización de estado local,
  sin fetch.
- **NFR-PERF-UI-2** (transición a loading tras el último popup):
  `setIsExporting(true)` síncrono antes de disparar el `fetch()` — sin
  cambio respecto a `260903`.
- **NFR-PERF-UI-3** (toast de resultado, incluyendo el nuevo 403 de
  `all_organizations`): componente Toast (`sonner`) ya existente,
  on-demand.
- **NFR-PERF-UI-4** (filtrado del picker por `product_count`, NUEVO):
  `organizations.filter(o => (o.product_count ?? 0) > 0)` sobre el
  array ya cargado por `useOrganizations()` — operación síncrona en
  memoria, sin request adicional, sobre un array de tamaño acotado
  (≤30 organizaciones reales).

## Sin optimización adicional

Sin lazy loading ni code-splitting específico — los componentes
(`frontend-components.md`) son livianos y ya viven dentro del bundle de
`catalog/page.tsx`/`Header.tsx`, que ya se cargan completos.
Consistente con `tech-stack-decisions.md` de este Unit: sin dependencia
nueva para cumplir estos targets.

## Fuente

Deriva de `performance-requirements.md` (NFR-PERF-UI-1 a 4) y
`functional-spec.md`/`frontend-components.md` (Functional Design) y
`contract-summary.md` (el punto donde el request HTTP separa la
responsabilidad de performance de este Unit vs. `u1-cross-org-export-api`).
