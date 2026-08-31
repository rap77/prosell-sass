# Requirements — Refactor de navegación Auth y eliminación de supresores de ESLint

> Intent: `260829-auth-navigation-refactor`. Scope: classic. Brownfield.
> Fuentes: `codekb/prosell-sass/{business-overview,architecture,code-structure,code-quality-assessment}.md`
> (scan enfocado), `inception/practices-discovery/team-practices.md`, y la entrevista de
> Requirements Analysis (`requirements-analysis-questions.md`).

## Intent Analysis

El pedido original del usuario fue: _"Refactor de navegación Auth y eliminación de supresores de
ESLint en redirecciones OAuth y fetchWithAuth"_. El objetivo real detrás de esa petición, según
la entrevista, es doble: (1) reducir duplicación y deuda de código en el flujo de navegación auth
del frontend (login/register/OAuth), y (2) eliminar por completo los supresores de ESLint
`@next/next/no-location-assign-relative-destination` en esa área — no solo consolidarlos —
siempre que exista una construcción de redirect que satisfaga la regla sin perder la navegación
completa del navegador que el flujo OAuth2 requiere genuinamente. El equipo decidió explícitamente
dejar fuera de este intent la adopción del nuevo patrón de manejo de errores tipados (afirmado en
Practices Discovery como convención futura) y cualquier otra deuda técnica no relacionada
encontrada durante el scan (Zod 3→4, useEffect→React Query, residuo de clases Tailwind, etc.),
todas ya trackeadas en intents separados.

## Functional Requirements

### FR1 — Consolidar el redirect OAuth de login/register en un helper compartido

Hoy `LoginPageContent.tsx` y `RegisterPageContent.tsx` repiten línea por línea el mismo patrón
`window.location.href = \`${base}/api/auth/oauth/${provider}/authorize\`` (2 supresores de ESLint
por página, 4 en total).

- **FR1.1**: Extraer un único helper de redirect OAuth (ubicación a definir en Code Generation,
  p.ej. `apps/web/src/lib/auth/`), parametrizado por `provider` (`google` | `microsoft`), usado por
  ambas páginas.
- **FR1.2**: Eliminar la duplicación línea por línea actual — ambas páginas invocan el mismo
  helper en vez de reconstruir la URL cada una.

### FR2 — Eliminar los supresores de ESLint del área (fetchWithAuth + helper OAuth)

- **FR2.1**: El helper OAuth de FR1 y el redirect existente en `fetchWithAuth.ts` (sesión
  expirada) deben construirse de forma que la regla `@next/next/no-location-assign-relative-destination`
  no necesite `eslint-disable` — por ejemplo, vía una construcción de URL tipada
  (`new URL(...)`) o cualquier patrón que la regla reconozca como no-relativo, preservando en
  ambos casos la navegación completa del navegador (no reemplazar por `fetch`/`router.push`, que
  rompería el flujo OAuth2 y el manejo de sesión expirada).
- **FR2.2**: Si, tras intentarlo, la regla de lint sigue disparando de forma genuina sobre
  cualquier construcción que preserve la navegación completa (ver Open Questions), documentar
  explícitamente por qué en el comentario de supresión restante y señalarlo en el gate de
  aprobación de Code Generation en vez de forzar una solución que rompa el flujo.

### FR3 — Eliminar código muerto `useOAuthPreload.ts`

- **FR3.1**: Eliminar `apps/web/src/hooks/useOAuthPreload.ts` — no tiene ningún import real en
  `apps/web/src` y referencia un componente inexistente (`@/components/auth/OAuthButtons`).
- **FR3.2**: Eliminar su test asociado (`apps/web/tests/unit/hooks/useOAuthPreload.test.ts`), que
  hoy ejercita un hook nunca wireado a producción (falso positivo de cobertura).

### FR4 — Corregir el JSDoc de cabecera de `proxy.ts`

- **FR4.1**: Actualizar el comentario de cabecera de `apps/web/src/proxy.ts`, que sigue
  describiéndolo como "Next.js Middleware" pese a haber sido renombrado desde `middleware.ts`.

### FR5 — Cobertura de test para los botones OAuth

- **FR5.1**: Agregar tests unitarios/de componente que cubran el `onClick` de los botones OAuth
  consolidados (helper de FR1) en los tests existentes de `login`/`register` page — hoy en 0% de
  cobertura sobre esa interacción específica.
- **FR5.2**: Los tests deben cubrir ambos providers (`google`, `microsoft`) y verificar que el
  helper construye la URL de redirect esperada para cada uno.

## Non-Functional Requirements

- **NFR1**: La suite de tests existente (frontend) debe permanecer en verde tras el refactor — sin
  regresiones, consistente con la Testing Posture afirmada (test-after).
- **NFR2**: No se introduce un nuevo piso de cobertura ni se altera el ya aceptado (40% frontend /
  sin piso backend, afirmado en Practices Discovery) — los tests nuevos de FR5 son adicionales, no
  un intento de subir el umbral global.
- **NFR3**: El comportamiento observable del flujo OAuth (redirect completo del navegador hacia
  el backend, manejo de cookies httpOnly, resolución de rol vía `deriveRole.ts`) no debe cambiar
  para el usuario final — este es un refactor interno de código, no un cambio de UX.

## Constraints

- Alcance exclusivamente frontend (`apps/web`) — `apps/api` queda fuera de este intent.
- El flujo OAuth2 requiere una navegación completa del navegador (`window.location.href` o
  equivalente) hacia el endpoint de autorización del backend; no puede reemplazarse por
  `fetch`/`XHR`/navegación interna de Next.js sin romper el flujo real de OAuth2.
- No se adopta en este intent el patrón de manejo de errores tipados por dominio afirmado en
  Practices Discovery (Q3) — queda como convención de equipo para trabajo futuro en esta área.
- Scope `classic` / Depth Standard / Test Strategy Standard ya vigentes para el workflow.

## Assumptions

- **A1**: Es posible construir la URL de redirect OAuth (y el redirect de sesión expirada en
  `fetchWithAuth.ts`) de una forma que la regla ESLint `@next/next/no-location-assign-relative-destination`
  no marque, sin perder la navegación completa del navegador. Esto no está verificado
  empíricamente todavía — Code Generation debe confirmarlo o refutarlo (ver Open Questions).
- **A2**: "Refactor de navegación Auth" se interpreta acotado al área ya analizada por Reverse
  Engineering (login/register OAuth, `fetchWithAuth.ts`, JSDoc de `proxy.ts`) y no como una
  reescritura más amplia de `authStore.ts`/`useAuth.ts` internals no relacionados con estos
  hallazgos.

## Out of Scope

- Backend (`apps/api`) — sin cambios.
- Adopción del patrón de manejo de errores tipados por dominio en frontend (afirmado como
  convención futura en Practices Discovery, Q3) — intent separado más adelante.
- Gaps de seguridad de pipeline (sin SAST real, sin DAST, secret-scanning liviano, Dependabot sin
  cobertura de deps de la app) — aceptados como conocidos en Practices Discovery, sin relación con
  este refactor.
- Cualquier otra deuda técnica no relacionada al área de auth encontrada durante el scan (Zod
  3→4, migración `useEffect`→React Query, residuo de clases Tailwind `.25`/`.75`, discrepancia de
  router backend no wireado, `apps/app/` huérfano) — cada una ya trackeada en su propio intent o
  sin intent propio todavía, pero fuera del alcance de este.

## Open Questions

- **OQ1**: Si, tras intentar una construcción de URL tipada, la regla de lint sigue disparando de
  forma genuina para el redirect OAuth (por ser una navegación cross-origin real), Code Generation
  debe traer la evidencia concreta al gate de esa etapa para decidir entre (a) aceptar 1-2
  supresores mínimos con justificación reforzada, o (b) alguna alternativa no evaluada todavía en
  Requirements Analysis. No se resuelve acá — es una verificación técnica, no una decisión de
  producto.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-08-29T16:41:16Z
**Iteration:** 1

### Findings

| #   | Severity | Location         | Finding                                                                                                                                                                                                                                                                                                                                                                                            | Recommendation                                                                                                                                       |
| --- | -------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | A1 / FR2.2 / OQ1 | El mismo punto de incertidumbre (si la construcción alternativa de URL sigue disparando la regla de lint) se registra tres veces casi textualmente — como Assumption, como sub-requerimiento y como Open Question. No es una contradicción ni un gap, pero es redundante y podría consolidarse en una sola entrada referenciada desde las otras dos.                                               | Consolidar en una única fuente de verdad (sugerido: dejarlo como OQ1 y que FR2.2/A1 solo la referencien por ID) en la próxima edición del artefacto. |
| 2   | Minor    | FR5.1/FR5.2      | El criterio es testeable pero no fija un mínimo de aserciones por caso (p.ej. "al menos 1 assertion por provider verificando la URL exacta construida, incluyendo el path `/api/auth/oauth/{provider}/authorize`"). Alcanza para que Code Generation no tenga que adivinar, pero un piso explícito de aserciones evitaría un test superficial que solo verifique que el handler no tira excepción. | Opcional: precisar el criterio de aceptación con la URL exacta esperada por provider.                                                                |

### Summary

Cada FR/NFR tiene un ID estable, traza a una respuesta concreta de la entrevista (Q1–Q5) o a un
hallazgo verificado del scan de Reverse Engineering (confirmé por grep: 5 supresores de ESLint
reales — 2 en `LoginPageContent.tsx`, 2 en `RegisterPageContent.tsx`, 1 en `fetchWithAuth.ts` — y
`useOAuthPreload.ts` efectivamente sin ningún import real fuera de su propio test). La tensión
aparente entre FR2 (cero supresores) y la Constraint de navegación completa del navegador está
resuelta explícitamente como una verificación técnica pendiente para Code Generation (A1/FR2.2/OQ1),
no como una ambigüedad de producto sin resolver — postura correcta dado que el equipo ya decidió
en Q1 que se busca cero supresores. Los criterios son verificables (existencia de helper, conteo de
supresores, tests por provider, borrado de archivos específicos). No encontré requerimientos
huérfanos ni scope creep — FR3/FR4/FR5 fueron confirmados explícitamente por el usuario en la
entrevista, no agregados unilateralmente. Los dos hallazgos son de pulido menor y no bloquean el
gate.
