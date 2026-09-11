# Performance Requirements — u1-export-org-confirmation

Unit kind `ui` — `performance-requirements` aplica per `produces_kinds`,
pero este Unit no introduce ningún target numérico nuevo.

## Contexto

El cambio agrega:

- Una lectura de estado ya en memoria (`organizationStore.viewingOrgId`,
  Zustand — lectura síncrona, sin costo de red).
- Un consumo del resultado ya cacheado de `useOrganizations()` (TanStack
  Query, ya usado por `OrganizationPicker` — sin fetch nuevo en el camino
  crítico del render del badge, salvo el estado transitorio "loading" ya
  cubierto por `functional-spec.md`).
- Un render condicional (unión discriminada de 3 estados) dentro de un
  componente ya existente.

## NFR-PERF-1 — Sin latencia medible agregada

**Target**: el tiempo de render de `ExportSummaryBanner` con el badge no
aumenta de forma perceptible (sin presupuesto de latencia específico —
no hay llamada de red nueva en el camino crítico).

**Medible por**: inspección de código (sin `fetch`/`await` nuevo en el
render del badge) — no requiere benchmark dedicado dado el alcance
mínimo del cambio.

Sin NFR de inception (`requirements.md`) que origine este target — ver
convención ya usada en `260903-catalog-client-export` para NFRs
originados en esta etapa sin ID de inception previo.

## Sin otros targets de performance

Este Unit no toca ningún camino de alta concurrencia, no procesa datos en
volumen, y no introduce paginación, batching, ni procesamiento asíncrono
nuevo.
