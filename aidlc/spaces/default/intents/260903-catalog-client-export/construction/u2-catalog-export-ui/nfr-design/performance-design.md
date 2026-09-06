# Performance Design — u2-catalog-export-ui

Diseña las soluciones concretas para `performance-requirements.md`
(NFR-PERF-UI-1/2/3) de este mismo Unit — responsividad de interfaz, sin
tocar el tiempo del request HTTP en sí (responsabilidad de
`u1-catalog-export-api`).

## Técnicas de implementación

Ninguna técnica nueva — el proyecto ya usa React 19 con React Compiler
(`technology-stack.md`), que optimiza re-renders automáticamente sin
necesidad de `useMemo`/`useCallback` manual (`AGENTS.md`, regla
zero-tolerance ya vigente). Los 3 targets de `performance-requirements.md`
se cumplen naturalmente con:

- **NFR-PERF-UI-1** (banner de resumen): `count` ya está en memoria del
  componente padre (`catalog/page.tsx`) — mostrar el banner es una
  actualización de estado local (`useState`), sin fetch ni cálculo
  costoso.
- **NFR-PERF-UI-2** (transición a loading): cambio de estado local
  síncrono (`setIsExporting(true)`) antes de disparar el `fetch()` — la
  UI refleja el cambio en el siguiente frame de render, sin bloqueo.
- **NFR-PERF-UI-3** (toast de resultado): el componente Toast ya
  existente (`sonner`) renderiza on-demand al invocar su API, sin
  overhead adicional de este Unit.

## Sin optimización adicional

Sin lazy loading, sin code-splitting específico para este feature — los
4 componentes (`frontend-components.md`) son livianos y ya viven dentro
del bundle de `catalog/page.tsx`, que ya se carga completo para esa
página. Consistente con `tech-stack-decisions.md` (nfr-requirements de
este Unit): ninguna dependencia nueva hace falta para cumplir estos
targets — React Compiler, `sonner` y `window.prompt()` nativo ya
resuelven la responsividad exigida sin librería adicional.

## Fuente

Deriva de `performance-requirements.md` (NFR-PERF-UI-1/2/3) y
`functional-spec.md`/`frontend-components.md` (Functional Design, los
componentes y transiciones exactas que esta sección optimiza) y
`contract-summary.md` (el punto donde el request HTTP separa la
responsabilidad de performance de este Unit vs. `u1-catalog-export-api`).
