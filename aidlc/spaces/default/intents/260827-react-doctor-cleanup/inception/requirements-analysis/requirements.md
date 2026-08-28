# Requirements — react-doctor cleanup (intent `260827-react-doctor-cleanup`)

## Intent Analysis

`apps/web` tiene un score de salud de código de 53/100 según `react-doctor`
(era 49/100 al arrancar la sesión), con 371 diagnostics restantes (9 errores,
362 warnings) después de una primera tanda de 7 archivos ya arreglados y
verificados. El objetivo no es alcanzar un score numérico específico ni vaciar
el backlog completo — es cerrar los errores de bailout del React Compiler que
ya tienen receta confirmada, y establecer (con evidencia, no solo intención)
que las categorías de warnings de gran volumen se pueden atacar de forma
segura mediante muestra representativa + aprobación antes de aplicar en masa,
dejando el resto del backlog documentado y priorizado para trabajo futuro.

## Functional Requirements

### FR1 — Cerrar los bailouts de React Compiler con receta confirmada

- **FR1.1**: Arreglar los 3 `try/finally` en `apps/web/src/app/onboarding/page.tsx` (`checkSetup`, `completeSetup`, `handleStep1`) sin cambiar su comportamiento observable (mismo manejo de éxito/error, mismo `finally`-equivalente).
- **FR1.2**: Arreglar el `try/finally` en `apps/web/src/components/forms/UnifiedProductForm.tsx` (línea ~470).
- **FR1.3**: Arreglar el `try/finally` en `apps/web/src/components/upload/BulkUploadCSV.tsx` (línea ~65).
- Receta a aplicar por caso: `Promise#finally()` para limpieza simple sin lógica de negocio en el `catch` (ya validado en `RefreshTrigger.tsx` y `fb-accounts/page.tsx` esta sesión); extracción a función a nivel de módulo (fuera del componente) cuando hay `try/catch/finally` con lógica de negocio o un `throw` dentro del `try` (ya validado en `migration-approval/page.tsx`).

### FR2 — Validar la receta de fix para cada categoría grande de warnings mediante muestra representativa

Para cada categoría con volumen alto, arreglar 1-3 archivos representativos,
confirmar que la receta no rompe comportamiento (test + lint + typecheck +
rescan de react-doctor en verde), y presentar un checkpoint de aprobación
antes de decidir si se aplica al resto de la categoría en un intent posterior:

- **FR2.1**: `zod-v4-no-deprecated-schema-apis` (39 ocurrencias) — migrar de API method-chain deprecada (`.email()`, `.uuid()`, `.url()`, `.datetime()`) a los validadores top-level de Zod v4 (`z.email()`, etc.).
- **FR2.2**: `deslop/unused-export` + `deslop/unused-file` (31 + 29 = 60 ocurrencias) — confirmar manualmente que cada export/archivo es realmente inalcanzable antes de borrar (no hay herramienta de segunda opinión tipo `knip`/`ts-prune` en el proyecto).
- **FR2.3**: Accesibilidad — `control-has-associated-label` (22), `label-has-associated-control` (19), y el resto de hallazgos de a11y (~44 adicionales).
- **FR2.4**: Performance — `js-combine-iterations` (18), `js-set-map-lookups` (10), `js-hoist-intl` (8), y el resto (~14 adicionales).
- **FR2.5**: `no-giant-component` + `only-export-components` (16 + 16 = 32 ocurrencias) — priorizar `UnifiedProductForm.tsx` y `category-schema-editor.tsx`, que ya están en alcance por FR1 (cargan simultáneamente bailout de compiler + componente gigante — una sola pasada combinada, no dos separadas).
- **FR2.6**: Bugs varios — `no-locale-format-in-render` (15), `no-fetch-response-used-without-status-check` (15), y el resto de la categoría Bugs (~25 adicionales).
- **FR2.7**: Seguridad — `tenant-static-proxy-risk` (3 ocurrencias en `organizations.ts`, `userApi.ts`, `verticals.ts`).
- **FR2.8**: `deslop/unused-dependency` + `deslop/unused-dev-dependency` (2 ocurrencias en `package.json`).

### FR3 — Preservar la suite de tests existente en verde

Cada fix (FR1 y FR2) debe dejar la suite de tests existente en verde. No se
exige piso de tests nuevo (posture de testing del scope `refactor`: sin piso
nuevo, la suite existente debe seguir pasando).

### FR4 — Verificar cada fix con rescan de react-doctor

Después de cada archivo o lote arreglado: correr lint + typecheck + tests
enfocados + un rescan de react-doctor para confirmar que el diagnostic
específico desapareció y que no se introdujo ningún diagnostic nuevo en los
archivos tocados (no comparar contra el score global, que puede moverse por
ruido de renumeración de línea — ver Learned en `memory.md` de esta etapa).

## Non-Functional Requirements

- **NFR1 (Comportamiento)**: Ningún fix de FR1 o FR2 debe cambiar el
  comportamiento observable del código — son refactors puros de calidad, no
  cambios de funcionalidad. Verificable: test suite existente sigue en verde.
- **NFR2 (No regresión)**: El score de react-doctor no debe bajar en ningún
  punto de la ejecución de Construction respecto del último estado verificado.
  Verificable: rescan antes/después de cada lote, comparado por diagnostic
  individual (no por score agregado, por el ruido de line-shift ya observado).

## Constraints

- **C1**: Los 4 imports dinámicos deliberados (`useOAuthPreload.ts` x2,
  `lib/api/products.ts:1220`, `lib/api/verticals.ts:134`) NO se convierten a
  import estático — es code-splitting intencional, decisión ya tomada por el
  usuario en esta sesión.
- **C2**: No se modifica la configuración de `react-doctor`
  (`doctor.config.*` / `package.json#reactDoctor`) para suprimir ningún
  finding — ni los 4 imports dinámicos ni el falso positivo de hidratación.
  El criterio de "cero errores" (ver Assumptions) aplica solo a los 5 fixes en
  alcance de FR1, no al conteo crudo de la herramienta.
- **C3**: El hook de pre-commit y el workflow de CI de `react-doctor`
  permanecen `advisory` (no bloqueantes) — pasar a bloqueante queda
  explícitamente fuera de alcance de este intent.

## Assumptions

- **A1**: "Terminado" para este intent significa cero errores de react-doctor
  sobre los 5 casos de FR1 (los que sí se tocan) — no sobre el conteo crudo
  total de la herramienta, que seguirá mostrando los 4 imports dinámicos y el
  falso positivo de hidratación como "error" indefinidamente salvo decisión
  futura de suprimirlos.
- **A2**: El tamaño de "muestra representativa" en FR2 es de 1 a 3 archivos
  por categoría, salvo que la categoría tenga menos ocurrencias (en cuyo caso
  se completa entera). El tamaño exacto por categoría se decide en
  Functional Design, caso por caso, según riesgo y volumen real de archivos
  distintos afectados.
- **A3**: Las categorías de FR2 no cubren necesariamente el 100% de sus
  ocurrencias en este intent — el resto queda documentado como backlog
  priorizado (ver Out of Scope) para una pasada futura, no se asume que se
  completen en esta misma ejecución de Construction.

## Out of Scope

- Resolver el 100% de los 362 warnings restantes en esta pasada.
- Pasar el gate de react-doctor (pre-commit y/o CI) de advisory a bloqueante.
- Tocar los 4 imports dinámicos deliberados o suprimir el falso positivo de
  hidratación en la configuración de react-doctor.
- Cambios de lógica de negocio o dominio identificados en el codekb pero no
  relacionados con este intent (plomería de contacto WhatsApp público,
  migración completa a `next-intl`, unificación del contrato `attribute_schema`,
  archivo de respaldo suelto `auth_router.py.backup2`, `UNIVERSAL_COLUMNS` como
  set no ordenado, drift de documentación de Tailwind) — documentados en
  `architecture.md` § Improvement Opportunities, fuera del alcance de este
  refactor de frontend.

## Open Questions

- **OQ1**: ¿El resto del backlog de warnings (todo lo no cubierto por la
  muestra representativa de FR2) se convierte en un intent nuevo inmediatamente
  después de que cierre este, o queda solo como documentación de backlog sin
  fecha? A decidir al cerrar este intent, no bloquea el arranque de
  Construction.
- **OQ2**: El tamaño exacto de muestra por categoría (A2) se resuelve en
  Functional Design en base a cuántos archivos distintos toca cada categoría
  y el riesgo de cada patrón — no se fija un número único acá.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-08-28T00:19:59Z
**Iteration:** 1

### Findings

| #   | Severity | Location    | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Recommendation |
| --- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | Major    | FR2.5       | FR2.5 states `UnifiedProductForm.tsx` y `category-schema-editor.tsx` "ya están en alcance por FR1" (already in scope via FR1) — but FR1 (FR1.1–FR1.3) only touches `onboarding/page.tsx`, `UnifiedProductForm.tsx`, and `BulkUploadCSV.tsx`. `category-schema-editor.tsx` is not one of the 5 try/finally fixes in FR1. This is an internal contradiction that could cause Functional Design/Construction to assume `category-schema-editor.tsx` already carries a confirmed compiler-bailout recipe (it doesn't) or to skip verifying its actual FR1 status. Correct FR2.5 to state the true relationship (e.g. "`category-schema-editor.tsx` fue parte de la tanda anterior de 7 archivos ya arreglados, no de FR1 de este intent" or drop the claim if it isn't accurate) before Construction reads this artifact. |
| 2   | Major    | FR2.8       | FR2.8 (`deslop/unused-dependency` + `deslop/unused-dev-dependency`, 2 occurrences) is not among the "categorías grandes" the human was asked to confirm in Q1 (Zod, deslop unused-export/file, accesibilidad, performance, componentes gigantes, bugs varios, seguridad) nor named anywhere else in the questions file. It appears to be sourced directly from codekb rather than from an answer the human explicitly confirmed at the checkpoint. Either trace FR2.8 to the specific upstream codekb artifact/section it came from (per the `upstream-coverage` sensor's intent), or fold it into a follow-up question/confirmation before Construction treats it as pre-approved scope.                                                                                                                             |
| 3   | Minor    | FR2.2 vs Q1 | Q1 states the deslop unused-export/file category has "x62" occurrences; FR2.2 breaks it down as "31 + 29 = 60" — a 2-item discrepancy against the source answer. Reconcile the count against the actual codekb/react-doctor output before Construction uses it to gauge sample-vs-total ratio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Summary

The artifact is well-grounded in the Q&A: FR1 correctly isolates the 5 confirmed try/finally fixes, FR2 correctly bounds the warning-category work to a representative-sample-plus-checkpoint pattern (matching Q1 answer B), and — critically — the Assumptions/Constraints sections reproduce the Q4 "cero errores" resolution exactly (scoped to the 5 FR1 fixes only, no config suppression), with no loosening or tightening of that explicitly negotiated boundary. IDs are stable and every FR/NFR has a testable, verifiable criterion (specific files, specific recipes, rescan/lint/typecheck/test gates). The two Major findings are a self-contradiction (FR2.5's scope claim about `category-schema-editor.tsx`) and one FR (FR2.8) that was never surfaced to the human for confirmation — both are easy to correct and don't block a developer from starting FR1 or the confirmed FR2 categories, so this clears the bar for READY, but both should be corrected before Functional Design locks in scope.
