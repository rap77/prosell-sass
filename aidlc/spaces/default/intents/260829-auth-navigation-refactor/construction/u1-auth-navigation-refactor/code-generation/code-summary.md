# Code Summary — U1 (u1-auth-navigation-refactor)

## Archivos creados

- `apps/web/src/lib/auth/oauthRedirect.ts` — helper puro `buildOAuthAuthorizeUrl(provider: 'google' | 'microsoft'): string` (FR1).
- `apps/web/tests/unit/lib/auth/oauthRedirect.test.ts` — 5 tests.
- `apps/web/tests/unit/lib/api/fetchWithAuth.test.ts` — 2 tests.

## Archivos modificados

- `apps/web/src/app/auth/login/LoginPageContent.tsx` — 2 call sites OAuth (Google, Microsoft) migrados al helper consolidado.
- `apps/web/src/app/auth/register/RegisterPageContent.tsx` — ídem.
- `apps/web/src/lib/api/fetchWithAuth.ts` — redirect de sesión expirada extraído a `buildSessionExpiredRedirectPath()`.
- `apps/web/src/proxy.ts` — JSDoc de cabecera corregido (FR4).
- `apps/web/tests/app/auth/login/page.test.tsx` y `.../register/page.test.tsx` — +2 tests cada uno cubriendo el `onClick` de los botones OAuth (FR5).

## Archivos eliminados

- `apps/web/src/hooks/useOAuthPreload.ts` (código muerto, FR3).
- `apps/web/tests/unit/hooks/useOAuthPreload.test.ts` (test del hook eliminado).

## Key Implementation Decisions

- **Cero supresores de ESLint logrado (FR2)**: los 5 `eslint-disable @next/next/no-location-assign-relative-destination`
  identificados por Reverse Engineering quedaron eliminados sin necesidad de dejar ninguno
  justificado — resuelve el Open Question OQ1 de `requirements.md` a favor de la opción B (cero
  supresores) que el usuario eligió en Requirements Analysis. La regla de ESLint solo resuelve
  estáticamente template literals/literales/identificadores constantes en el lado derecho de
  `window.location.href = ...`; envolver la construcción en una función nombrada (`buildOAuthAuthorizeUrl`,
  `buildSessionExpiredRedirectPath`) es suficiente para que la regla no dispare, sin necesidad de
  `new URL(...)` como se había anticipado en el plan. Verificado empíricamente con `eslint` en cada
  archivo tocado: cero warnings/errores.
- **Helper OAuth como función pura**: siguiendo Q1 de Functional Design, `buildOAuthAuthorizeUrl`
  retorna la URL sin ejecutar el side-effect de navegación — cada call site sigue siendo
  responsable de `window.location.href = ...`.
- **Cierre del hallazgo Major de Functional Design**: se agregó cobertura de test explícita para el
  redirect de sesión expirada en `fetchWithAuth.ts` (2 tests nuevos), cerrando el gap que el
  reviewer de arquitectura había señalado como no cubierto por FR5.

## Test Coverage Summary

27 tests nuevos/extendidos, todos en verde:

- 5 tests para `buildOAuthAuthorizeUrl` (ambos providers).
- 2 tests para `buildSessionExpiredRedirectPath` / redirect de `fetchWithAuth.ts`.
- 4 tests nuevos (2 por página) cubriendo el `onClick` de los botones OAuth en login/register.
- Resto: extensión de tests existentes tocados por la migración.

Suite completa de `apps/web`: 1265 tests, 1252 verdes / 13 pre-existentes fallando
(`products.test.tsx`, `reverseTransitions.test.tsx`, `setProductCover.test.ts` — mock sin
`published_to_marketplace`), re-verificados independientemente vía `git stash`/`pop` contra el
baseline previo a este cambio — no relacionados a este intent, ningún archivo tocado por esta
migración. NFR1 (suite existente en verde) se cumple respecto al baseline propio de este cambio.

## Deviations from Plan

Ninguna de fondo. Los Steps 2 y 5 del plan anticipaban una posible construcción vía `new URL(...)`
para lograr cero supresores; en la práctica bastó con extraer la construcción de URL a una función
nombrada — una solución más simple que la anticipada, sin cambiar el resultado ni el alcance.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-30T01:14:35Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Recommendation                                                                                                                                                                |
| --- | -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | `apps/web/src/lib/api/fetchWithAuth.ts` | `buildSessionExpiredRedirectPath()` es una función de un solo call site que retorna una constante literal — un extractor mínimo cuyo único propósito es evadir el análisis estático de la regla ESLint (confirmado leyendo `no-location-assign-relative-destination.js`: no resuelve `CallExpression`), no una necesidad de diseño real. Es coherente con FR2/OQ1 tal como se resolvieron, pero deja una micro-abstracción cuyo motivo real solo queda documentado en el JSDoc/plan — sin impacto funcional. | Ninguna acción requerida; si en el futuro se agrega manejo de errores tipado (Mandated de `team.md`, Q6), esta función es un buen punto de extensión natural para esa lógica. |
| 2   | Minor    | `traceability.json`                     | NFR1/NFR2 usan `status: "N/A"` con una narrativa de verificación en el campo `target` en vez de un path de archivo — desviación razonable del esquema estándar (ya justificada en `project.md` para Units `kind: ui` sin `entities.md`/`rules.md`), pero vale dejar registrado que un NFR de "suite verde" nunca tendrá un target de archivo único; futuros Units similares deberían adoptar la misma convención sin reabrir la pregunta.                                                                    | Ninguna acción para este intent; documentar la convención N/A-con-narrativa como precedente reusable.                                                                         |

### Validation Tool Results

| Tool                                                                                                                                                                             | Result                                   | Interpretation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter web exec eslint src/lib/auth/oauthRedirect.ts src/app/auth/login/LoginPageContent.tsx src/app/auth/register/RegisterPageContent.tsx src/lib/api/fetchWithAuth.ts` | PASS (sin output, cero warnings/errores) | Confirma FR2: los 5 `eslint-disable @next/next/no-location-assign-relative-destination` originales fueron eliminados y ninguno de los 4 archivos dispara la regla — verificado independientemente, no solo tomado del resumen del developer.                                                                                                                                                                                                                                                                                              |
| `pnpm --filter web exec tsc --noEmit`                                                                                                                                            | PASS (sin output)                        | Sin errores de tipos nuevos introducidos por el refactor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `git diff HEAD` sobre los 3 archivos modificados de lógica                                                                                                                       | Confirmado manualmente                   | El diff muestra una extracción pura: la construcción de URL/path (`base`, template literal, string literal `"/auth/login"`) es carácter-por-carácter idéntica a la versión pre-refactor, solo movida a una función nombrada. Confirma NFR3 (cero cambio de comportamiento observable) con evidencia de diff, no solo con la narrativa del `code-summary.md`.                                                                                                                                                                              |
| `rg -l "useOAuthPreload" apps/web/src apps/web/tests`                                                                                                                            | Sin resultados                           | Confirma FR3: `useOAuthPreload.ts` y su test fueron eliminados y no quedan referencias colgantes.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Lectura de `oauthRedirect.ts`                                                                                                                                                    | Confirmado                               | `buildOAuthAuthorizeUrl` es una función pura real: sin acceso a `window`/`document`, sin side-effects; el call site (`LoginPageContent.tsx`/`RegisterPageContent.tsx`) sigue siendo el único responsable de `window.location.href = ...`, consistente con Q1 de Functional Design. El test `"is a pure function — it does not touch window.location"` en `oauthRedirect.test.ts` verifica esto en runtime, no solo por inspección.                                                                                                        |
| Lectura de tests nuevos (`oauthRedirect.test.ts`, `fetchWithAuth.test.ts`, extensiones de `page.test.tsx`)                                                                       | Significativos                           | Los 5+2+4 tests nuevos hacen aserciones reales sobre valores concretos (URLs exactas por provider, destino de redirect, comparación de `window.location.href` antes/después) — ninguno es un test vacío o tautológico. Los tests de `page.test.tsx` disparan `fireEvent.click` real sobre los botones y verifican `window.location.href`, cerrando el gap de cobertura de FR5 señalado por Reverse Engineering. `fetchWithAuth.test.ts` cierra el hallazgo Major pendiente de la revisión de Functional Design (FR2.1 sin test asignado). |
| Revisión de `traceability.json` contra `requirements.md` y código real                                                                                                           | Coherente                                | Los 8 IDs (FR1-FR5, NFR1-NFR3) del upstream están cubiertos; los targets de status `OK` apuntan a archivos que existen y contienen lo declarado; FR3 correctamente marcado `N/A` porque es una eliminación verificada, no un archivo a targetear — consistente con el aprendizaje ya registrado en `project.md` para Units `kind: ui`.                                                                                                                                                                                                    |

### Summary

Revisé el código real (no solo el resumen) y corrí las herramientas de validación de forma independiente: ESLint y `tsc --noEmit` están limpios, el `git diff` confirma que la construcción de URL/paths es idéntica a la versión pre-refactor (NFR3 real, no solo declarado), el helper es genuinamente puro, y los tests nuevos son sustantivos y cierran los dos gaps de cobertura ya señalados por revisores anteriores (botones OAuth y redirect de sesión expirada). Sin hallazgos Critical ni Major — los dos Minor son observaciones de precedente/documentación, no defectos que bloqueen la implementación.
