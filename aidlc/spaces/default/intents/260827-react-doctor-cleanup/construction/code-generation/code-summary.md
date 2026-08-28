# Code Summary — react-doctor cleanup

## Resultado

Score react-doctor: 53/100 → **54/100**. Diagnostics: 371 → **346** (-25).
Suite de tests: 1240 passed / 13 failed (los 13 son el baseline pre-existente
ya documentado en `project.md` — `products.test.tsx`, `reverseTransitions.test.tsx`,
`setProductCover.test.ts`, mock sin `published_to_marketplace` — verificado
independientemente que ninguno de esos 3 archivos fue tocado por este batch).

## Archivos modificados

### FR1 — React Compiler bailouts (5/5 confirmados, todos verificados en verde)

- `apps/web/src/app/onboarding/page.tsx` — 3 `try/catch/finally` → promise chains (`checkSetup`, `completeSetup`, `handleStep1`)
- `apps/web/src/components/forms/UnifiedProductForm.tsx` — `try/finally` → `Promise#finally()`
- `apps/web/src/components/upload/BulkUploadCSV.tsx` — `try/catch/finally` → promise chain

### FR2.1 — Zod v3→v4 (2/2 muestra, ambos verificados)

- `apps/web/src/lib/api/extractErrorMessage.ts` — `.object().passthrough()` → `z.looseObject()`
- `apps/web/src/lib/api/schemas/appointments.ts` — `.object().passthrough()` → `z.looseObject()`, `z.nativeEnum()` → `z.enum()`

### FR2.3 — Accesibilidad (1/1 muestra, 12 diagnostics resueltos)

- `apps/web/src/app/(admin)/admin/fb-accounts/[id]/page.tsx` — agregados `id`/`htmlFor` en 7 pares label/control (Email, Alias, Estado, Contraseña, Navegador, Idioma, Delay) + `aria-label` en botón de toggle de contraseña y en select de categoría de grupo sin label visible

### FR2.6 — Bugs varios (1 fix aplicado, 1 rechazado)

- `apps/web/src/app/(admin)/admin/fb-accounts/page.tsx` — `.toLocaleDateString()` inline en render → `formatDate(account.last_used_at, "es-AR")`. Corrección tras revisión (iteración 1, ver `## Review` abajo): la primera versión pasaba a `formatDate()` sin locale, que cae al default `en-US` del helper — cambiaba el idioma de la fecha para todo usuario, no solo resolvía el mismatch de hidratación. Locale `es-AR` explícito adoptado siguiendo la convención ya usada en `(seller)/publications/page.tsx` (mismo patrón, misma área admin/seller en español) — preserva el idioma original de la fecha Y resuelve el mismatch server/cliente.

### FR2.8 — Dependencias no usadas (2/2)

- `apps/web/package.json` — removidas `swr` (dependency) y `@radix-ui/react-form` (devDependency), confirmadas sin importadores; `pnpm install` corrido, lockfile actualizado

## Hallazgos rechazados (evidencia insuficiente o falso positivo — sin cambios de código)

- **FR2.7** (`tenant-static-proxy-risk` x3, `organizations.ts`/`userApi.ts`/`verticals.ts`): falso positivo. Los 3 son hooks cliente que llaman a la API propia (`/api/v1/...`), no proxies de asset estático server-side — la regla dice explícitamente que aplica solo a "server route source files", y estos archivos están fuera de ese scope.
- **FR2.4** (`js-combine-iterations`, muestra de 2 ocurrencias): hipótesis de performance no confirmada — arrays chicos acotados por UI (selección de usuario, cuentas de FB de una org), sin evidencia de profiling que justifique el rewrite. La propia regla recomienda mantener la cadena legible para colecciones ordinarias.
- **FR2.6b** (`no-fetch-response-used-without-status-check`, `2fa/disable/route.ts`): el fix genérico de la regla rompería el comportamiento intencional de passthrough del proxy (reenviar status+body del backend tal cual, incluyendo errores).

## Diferido (documentado, no ejecutado)

- **FR2.5** (`no-giant-component`/`only-export-components`, `UnifiedProductForm.tsx` 1226 líneas + `category-schema-editor.tsx` 1156 líneas): requiere split estructural real (extraer subcomponentes/hooks), no es un fix mecánico. Recomendación: dividir por sección funcional del formulario (datos básicos, atributos dinámicos, imágenes, brokers) en un intent futuro con diseño previo — el riesgo de romper comportamiento sin ese diseño no es aceptable dentro de un checkpoint de muestra representativa.

## FR2.2 — revisión manual (3 candidatos muestreados, sin borrar)

- `ConfirmActionDialog.tsx` y `marketplace-access/hooks.ts` — CONFIRMADOS sin importadores en todo `src`. Hallazgo notable: `hooks.ts` es el mismo archivo tocado en el commit de esta sesión `588f7550` — se extrajo para reuso pero nunca se conectó a `MarketplaceAccessManager.tsx`, que sigue con su lógica de filtrado inline duplicada. Decisión (wire-in vs borrar) es de producto/arquitectura, fuera del alcance de "borrar código muerto confirmado" de este intent.
- `check-pages.ts` — INCONCLUSO, podría ser un script standalone de uso manual. Necesita criterio humano, no se clasifica con confianza.

## Cobertura de tests

Sin tests nuevos — todos los cambios son refactors de comportamiento idéntico
sobre código ya cubierto (o, para `onboarding/page.tsx` y `BulkUploadCSV.tsx`,
sin cobertura previa — ver `memory.md` para la justificación de no
backfillear tests fuera del alcance de este intent). Verificación por
archivo: lint + typecheck + rescan de react-doctor confirmando que el
diagnostic específico desapareció sin introducir uno nuevo en el archivo
tocado.

## Desviaciones del plan

Ver `memory.md` de este stage — incluye el workaround al bug de path doblado
de `aidlc-testing-posture.ts fingerprint` para stages zero-Unit, y la
corrección del piso de tests de `unit-test-instructions.md` para que
coincida con FR3 real (suite existente en verde, no backfill de cobertura).

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-28T00:59:43Z
**Iteration:** 2

### Findings

| #   | Severity | Location                | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Recommendation                                                                                            |
| --- | -------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | `code-summary.md` § FR1 | FR1 claims "5/5 confirmados" across 3 named files (onboarding/page.tsx: 3, UnifiedProductForm.tsx: 1, BulkUploadCSV.tsx: 1 = 5), but `git diff` shows `fb-accounts/page.tsx`'s `handleDelete` also converted from `try/await/finally` to `Promise#finally()` — an FR1-shaped change not listed under FR1 and not counted in the "5/5". The conversion itself is behaviorally sound (same cleanup-always-runs semantics, no new unhandled-rejection surface), so this is a documentation-completeness gap, not a functional defect, and it predates this iteration (not introduced by the iteration-2 fix). | Add `fb-accounts/page.tsx` to the FR1 file list and correct the count (6/6 or clarify why it's separate). |

### Verification of iteration-1 fixes

**1. CRITICAL (formatDate locale) — RESOLVED, verified independently.**

- Read `apps/web/src/app/(admin)/admin/fb-accounts/page.tsx:227`: confirmed `formatDate(account.last_used_at, "es-AR")` — explicit locale argument is present, not relying on the `en-US` default in `apps/web/src/lib/utils/format.ts:62`.
- Read `apps/web/src/app/(seller)/publications/page.tsx`: it defines its own local `formatDate()` (not the shared util) hardcoded to `Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" })`. The locale string `"es-AR"` matches; the fb-accounts fix uses the shared util's date-only formatting (no time component), which is a narrower but legitimate choice since `last_used_at` didn't previously render a time either — no regression in granularity.
- Searched the wider app for locale usage: `es-AR` is the dominant convention (8+ call sites — `LeadCard`, `KanbanColumn`, `ProductCard`, `CatalogDetailView`, `BranchStatsCard`, `ProductAuditTrail`, `vendedor/leads/[id]/page.tsx`, `publications/page.tsx`). One outlier exists (`MarketplaceAccessManager.tsx` uses `es-ES`) and several call sites pass no locale at all (`fb-accounts/[id]/page.tsx:179`, `ReviewQueueTable.tsx`, `StatusHistoryTimeline.tsx`, `schema-admin-client.tsx`, `LeadAuditTrail.tsx` uses `undefined`). This confirms the app's locale convention is genuinely inconsistent pre-existing debt, not something this fix invented — `es-AR` is the correct choice as the majority pattern (and matches the same admin/seller Spanish-UI area), and normalizing the other outliers is out of scope for this diagnostic-driven intent. Acceptable narrow fix.
- `pnpm exec tsc --noEmit`: no errors reported against this file.
- `pnpm exec eslint "src/app/(admin)/admin/fb-accounts/page.tsx"`: zero output, no violations.
- Independent `react-doctor --json --blocking none --yes --scope full` rescan: 346 total diagnostics across the repo (score 54/100, matching `code-summary.md`'s claimed 346/54), **zero diagnostics attributed to `fb-accounts/page.tsx`** — the original `no-locale-format-in-render` finding is gone and no new diagnostic was introduced on that file.

**2. MAJOR (traceability.json FR2.4) — RESOLVED, verified independently.**

- Read `traceability.json`: `{ "id": "FR2.4", "status": "N/A", "target": "rejected as unconfirmed performance hypothesis — see code-summary.md" }`, structurally consistent with `FR2.7`'s `{ "status": "N/A", "target": "rejected as false positive — see code-summary.md" }`. `FR2.6` correctly remains `"status": "OK"` (that finding was fixed, not rejected) — no over-correction.

**3. MINOR (unit-test-instructions.md floor) — RESOLVED, verified independently.**

- Read the "Regla de piso" section: accurately states the real obligation is "la suite existente debe seguir en verde", explicitly disclaims backfilling coverage for previously-untested touched files (`onboarding/page.tsx`, `BulkUploadCSV.tsx`), and correctly attributes this to FR3 + the `refactor` scope's testing-posture floor. No mismatch between stated and applied floor remains.

### New-defect check (adversarial)

- `git diff` on `fb-accounts/page.tsx` is minimal and surgical: one new import line, the FR1 `handleDelete` promise-chain conversion, and the FR2.6 locale fix — no unrelated formatting or refactor noise.
- No other files show uncommitted changes tied to this fix (`traceability.json`, `unit-test-instructions.md`, `code-summary.md` edits are the only artifact changes; `git status --porcelain` shows only the 3 admin fb-accounts source files plus the pre-existing session's unrelated changes).
- The fix does not touch `apps/web/src/lib/utils/format.ts` itself (i.e., it did not "fix" the shared default by changing it app-wide, which would have been out-of-scope blast radius for a single-file diagnostic fix) — correctly scoped to the one call site.

### Summary

All 3 prior findings are genuinely fixed and independently verified against the actual bytes, not just the claim: the locale is explicit and matches the dominant app convention, `traceability.json` is now internally consistent, and the test-floor documentation matches what was applied. The one new observation (FR1's file count omitting `fb-accounts/page.tsx`) is a pre-existing documentation-completeness gap, not a functional defect and not something the iteration-2 fix introduced — it does not block readiness.
