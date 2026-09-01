# Requirements — Migración useEffect → React Query (onboarding / invite)

## Intent analysis

El equipo quiere eliminar dos violaciones de la regla explícita `AGENTS.md:333` ("useEffect for data fetching - use Server Components or React Query"), descubiertas durante el intent `260827-react-doctor-cleanup` cuando GGA bloqueó un intento de fix parcial. El objetivo real no es solo "hacer pasar el linter": son dos flujos de negocio sensibles (primer login de organización nueva, alta de usuarios vía invitación) que hoy no tienen ningún test y usan `useEffect` para disparar fetch/mutación de datos en el mount, en vez de las herramientas de data-fetching que el proyecto ya estandarizó (TanStack Query v5, ya wireado vía `ReactQueryProvider`). El reverse-engineering enfocado (intent `260828-useeffect-to-react-query`) confirmó que la violación literal es acotada — solo el `useEffect` de mount en cada página — y triangulá riesgos colaterales (tres formas de manejo de error incompatibles en el área, gap de `fetchWithAuth`) que el usuario decidió dejar fuera de este bugfix puntual.

## Functional Requirements

### FR1 — Migrar `onboarding/page.tsx`: fetch de mount de `useEffect` a `useQuery`

**FR1.1** El fetch inicial de organización (`checkSetup()` → `orgApi.getMyOrganization()`), disparado hoy en un `useEffect` de mount, debe reimplementarse con `useQuery` de TanStack Query v5, siguiendo el patrón de hooks colocados en el propio módulo de API ya establecido en el repo (`notificationsApi.ts`, `leads.ts`) — es decir, el hook nuevo vive en `orgApi.ts`, no en un archivo de hooks separado.

**FR1.2** El comportamiento observable del wizard debe preservarse exactamente: los mismos estados de carga/error/éxito que el `useEffect` actual produce (paso inicial del wizard según exista o no organización, mensaje de error si la consulta falla) deben verse igual desde la perspectiva del usuario.

**FR1.3** `handleStep1` y `completeSetup` (llamadas imperativas disparadas por click, no por efecto) quedan tal cual están — fetch imperativo directo contra `orgApi.update()`/`orgApi.completeSetup()` — sin convertirse a `useMutation` en este intent (ver Out of Scope).

**FR1.4** El resto del wizard (`OnboardingStep1`-`OnboardingStep3`, navegación entre pasos, estado de formulario) sigue siendo client component sin cambios estructurales — no se introduce una separación Server Component / client component.

### FR2 — Migrar `invite/[token]/page.tsx`: mutación de mount de `useEffect` a `useMutation`

**FR2.1** La aceptación de invitación (`teamApi.acceptInvitation({token})`), disparada hoy en un `useEffect` de mount, debe reimplementarse con `useMutation` de TanStack Query v5 en un client component, con un guard anti-doble-disparo (por ejemplo, un flag por `useRef`, o disparando la mutación solo cuando su estado sea `idle`) para preservar la garantía de "se dispara una sola vez por carga de página" que el `useEffect` actual ofrece implícitamente.

**FR2.2** Los 5 estados de UI existentes (loading / success / error / expired / already_member) deben preservarse exactamente, incluyendo el timeout de redirect con cleanup ya arreglado en una sesión previa.

**FR2.3** El branching de error actual, que inspecciona `error.message.toLowerCase().includes("expired"|"already"|"member")` y `error.status === 401`, debe seguir funcionando igual — la migración a `useMutation` DEBE preservar el shape de `ApiError` (o un shape equivalente con `.message` y `.status`) en el `onError` de la mutación. No se reemplaza `ApiError` por un `Error` genérico (el patrón de `notificationsApi.ts`, que descarta ese detalle, NO debe copiarse aquí).

**FR2.4** El supresor `eslint-disable react-hooks/set-state-in-effect` en `invite/[token]/page.tsx:57` debe re-evaluarse tras la migración: si el estado ya no se setea dentro de un efecto, el supresor debe eliminarse; si por alguna razón sigue siendo necesario, debe justificarse explícitamente en el code-summary.

## Non-Functional Requirements

**NFR1** — Cobertura de test: ambas páginas no tienen ningún test hoy. La migración debe incluir tests de componente nuevos (Vitest + Testing Library, patrón ya establecido en el repo: `new QueryClient({...})` + `<QueryClientProvider>` wrapper) que cubran, como mínimo, el happy path y los estados de error de cada página — consistente con la postura de testing del scope `bugfix` (regresión dirigida a lo tocado + suite existente en verde, sin backfillear cobertura fuera de estos dos archivos).

**NFR2** — Regresión cero: la suite de tests existente del repo debe seguir en verde después del cambio; no se introduce ningún cambio de comportamiento fuera de las dos páginas migradas.

**NFR3** — Lint: `eslint --max-warnings=0` debe seguir pasando tras el cambio; el objetivo explícito de la regla `AGENTS.md:333` (cero `useEffect` para data-fetching en estas dos páginas) debe quedar satisfecho sin nuevos supresores.

## Constraints

- **C1**: No se modifica `orgApi.ts` ni `teamApi.ts` para agregar `fetchWithAuth` — el gap de auto-refresh de sesión en 401 queda fuera de alcance (ver Out of Scope).
- **C2**: No se construye una jerarquía de excepciones tipadas (equivalente a `OrgDomainException`/`AuthDomainException` del backend) para el frontend en este intent, pese a que el equipo ya afirmó esa dirección como convención hacia adelante (Q6 de `team.md`) — se preserva `ApiError` tal cual existe hoy.
- **C3**: `onboarding/page.tsx` sigue siendo enteramente client component — no se introduce una separación Server Component / client component para el fetch inicial.
- **C4**: `handleStep1` y `completeSetup` de `onboarding/page.tsx` no se tocan en este intent.
- **C5**: `invite/org/[token]/page.tsx` (flujo hermano a nivel de organización) no forma parte de este intent — solo se revisó como contraste.

## Assumptions

- **A1**: `ReactQueryProvider` ya está wireado en el árbol de la app (confirmado en reverse-engineering) — no se necesita configuración adicional de `QueryClient` para que `onboarding`/`invite` empiecen a usar `useQuery`/`useMutation`.
- **A2**: `@tanstack/react-query ^5.0.0` es la versión instalada (confirmada en `package.json`) — la migración usa la API de v5 (`useQuery`/`useMutation` con el shape de opciones de v5, no v4).
- **A3**: El guard anti-doble-disparo de FR2.1 es suficiente para preservar el comportamiento actual de "una sola aceptación de invitación por carga de página" — no se requiere idempotencia adicional del lado del backend (el endpoint `accept-invitation` ya maneja tokens ya usados con un 409/410 tipado, según el diagrama de secuencia de reverse-engineering).

## Out of Scope

- Convertir `handleStep1`/`completeSetup` de `onboarding/page.tsx` a `useMutation` (FR1.3 los deja tal cual).
- Cerrar el gap de `fetchWithAuth` en `orgApi.ts`/`teamApi.ts` (sin auto-refresh de sesión en 401 hoy) — deuda documentada, no se resuelve en este intent.
- Construir la jerarquía de excepciones tipadas + manejo centralizado para el frontend (convención Q6 de `team.md`) — queda como intent aparte.
- Consolidar la duplicación verbatim de `ApiError`/`handleResponse<T>()` entre `orgApi.ts` y `teamApi.ts`.
- Migrar `invite/org/[token]/page.tsx` (flujo hermano de invitación a nivel de organización).
- Cualquier cambio al backend (`org_router.py`, `team_router.py`) — este es un bugfix exclusivamente de frontend.

## Open Questions

- **OQ1**: El supresor ESLint de `invite/[token]/page.tsx:57` (`react-hooks/set-state-in-effect`) — confirmar en Code Generation si la migración a `useMutation` efectivamente permite eliminarlo, o si queda una razón residual para mantenerlo (ver FR2.4).

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-08-31T22:53:14Z
**Iteration:** 1

### Findings

| #   | Severity | Location    | Finding                                                                                                                                                                                                                                                                                                                                                                                                             | Recommendation                                                                                                                                                                           |
| --- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | FR2.4 / OQ1 | El re-evaluar el supresor ESLint de `invite/[token]/page.tsx:57` aparece tanto como requisito (FR2.4) como Open Question (OQ1), con texto casi idéntico. No es una contradicción — ambas versiones son consistentes entre sí — pero es redundante y podría fusionarse en una sola entrada para evitar que Code Generation trate el mismo punto dos veces.                                                           | Consolidar en una única mención (dejarlo en FR2.4 como requisito accionable, o en Open Questions si se prefiere tratarlo como decisión pendiente, no en ambos).                          |
| 2   | Minor    | NFR1        | El piso de test dice "como mínimo, el happy path y los estados de error de cada página" pero no enumera cuántos estados de error mínimos corresponden a `invite/[token]/page.tsx` (son 5 estados de UI: loading/success/error/expired/already_member, listados en FR2.2). Como User Stories está SKIP para este scope, requirements.md es el único lugar donde ese detalle testable podría anclarse explícitamente. | Opcional: referenciar explícitamente FR2.2 desde NFR1 ("los 5 estados de FR2.2") para que Code Generation no interprete "estados de error" de forma más laxa que los 5 ya identificados. |

### Summary

El documento está sólidamente anclado en el reverse-engineering (`code-structure.md`, `architecture.md`) y en las 4 preguntas respondidas — no encontré ningún FR/NFR inventado ni contradicción entre Functional Requirements, Constraints y Out of Scope (el alcance acotado a los dos `useEffect` de mount, confirmado en Q1, se refleja consistentemente en FR1.3, C4 y la primera línea de Out of Scope). Los IDs son estables y bien formados, y cada requisito trae suficiente detalle técnico (nombres de función, shape de `ApiError`, ubicación del hook, guard anti-doble-disparo) como para que Code Generation no tenga que adivinar. Los dos hallazgos son de pulido menor y no bloquean el arranque de la construcción.
