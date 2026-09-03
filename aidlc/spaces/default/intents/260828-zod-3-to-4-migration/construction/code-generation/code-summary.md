# Code Summary — Migración Zod 3 → Zod 4

## Files created

- `apps/web/tests/unit/lib/api/zod4-loose-object.test.ts` (4 tests)
- `apps/web/tests/unit/lib/api/zod4-enum-migration.test.ts` (4 tests)
- `apps/web/tests/unit/lib/schemas/profile-schema.test.ts` (2 tests)

## Files deleted

- `apps/web/src/lib/zod-resolver.ts` — shim de `zodResolver` de la migración #74, confirmado sin ningún import (verificado con `rg` antes y después). (FR4)

## Files modified

### FR1 — `.passthrough()` → `z.looseObject()` (36 call sites, 14 archivos)

- `apps/web/src/lib/api/schemas/orgApi.ts` — 1 sitio + comentario de cabecera reescrito.
- `apps/web/src/lib/api/schemas/category.ts` — 1 sitio + comentario de cabecera reescrito.
- `apps/web/src/lib/api/schemas/vendedores.ts` — 1 sitio.
- `apps/web/src/lib/api/schemas/organizations.ts` — 3 sitios (`OrganizationSchema`, `OrganizationProductSchema`, `UpdateOrganizationResponseSchema`) + comentario de cabecera reescrito.
- `apps/web/src/lib/api/schemas/productImageUrls.ts` — 2 sitios + comentario de cabecera reescrito.
- `apps/web/src/lib/api/schemas/leads.ts` — 7 sitios + comentario de cabecera reescrito.
- `apps/web/src/lib/api/schemas/walletApi.ts` — 2 sitios + comentario de cabecera reescrito.
- `apps/web/src/lib/api/schemas/authRoutes.ts` — 3 sitios (incluye un esquema anidado `user`).
- `apps/web/src/lib/api/schemas/appointments.ts` — 1 sitio.
- `apps/web/src/lib/api/schemas/authApi.ts` — 6 sitios + comentario de cabecera reescrito.
- `apps/web/src/lib/api/schemas/teamApi.ts` — 2 sitios + comentario de cabecera reescrito.
- `apps/web/src/lib/api/verticals.ts` — 4 sitios (incluye comentarios `ponytail:` reescritos de "passthrough" a "looseObject").
- `apps/web/src/lib/api/extractErrorMessage.ts` — 2 sitios (uno anidado dentro de un `z.union`).

### FR1.3 — Comentarios de cabecera reescritos (8 archivos confirmados por grep, no 8 aproximados)

Los 8 archivos con comentario de cabecera mencionando `.passthrough()` en prosa (de los 11 de FR1.1 — los 3 sin comentario de cabecera son `vendedores.ts`, `authRoutes.ts`, `appointments.ts`): `orgApi.ts`, `authApi.ts`, `teamApi.ts`, `productImageUrls.ts`, `leads.ts`, `category.ts`, `walletApi.ts`, `organizations.ts`. Todos reescritos a `z.looseObject()`. (Esto resuelve el hallazgo Major del reviewer en Requirements Analysis — el "8" era correcto, ahora está listado explícitamente en vez de dicho como aproximado.)

### FR1.4 — Caso especial `UnifiedProductForm.tsx`

- `FIXED_FIELDS_SCHEMA` (línea ~99): sin cambios de comportamiento, ahora exportada para testabilidad. Sigue usándose estricta en la línea ~290 (`.merge(attrSchema)`).
- Nueva `FIXED_FIELDS_SCHEMA_LOOSE` (z.looseObject, mismo shape): reemplaza el uso `.passthrough()` de la línea ~483 (`buildProductPayload`).

### FR2 — `z.nativeEnum()` → `z.enum()` (4 call sites, 2 archivos)

- `apps/web/src/lib/api/schemas/leads.ts:51,69,70` — `z.nativeEnum(LeadStatus)` → `z.enum(LeadStatus)`.
- `apps/web/src/lib/api/schemas/appointments.ts:31` — `z.nativeEnum(AppointmentStatus)` → `z.enum(AppointmentStatus)`.

### FR3 — `AGENTS.md`

Eliminada la sección completa `## Legacy Exceptions (DO NOT flag as errors)` (incluía únicamente el bloque `### Zod 3 Syntax (until issue #74 is resolved)`) — se quitó también el heading contenedor por quedar vacío, no solo el subbloque, para no dejar un heading fantasma sin contenido.

### FR5 — `profile/page.tsx`

- `apps/web/src/app/(seller)/settings/profile/page.tsx:28` — `.string().email({ message: "Correo inválido" })` → `z.email({ error: "Correo inválido" })`.
- `profileSchema` exportado (antes local) para permitir el test unitario sin renderizar el componente completo.

### Hallazgos adyacentes NO tocados (fuera del alcance aprobado en Requirements Analysis)

- `apps/web/src/components/forms/UnifiedProductForm.tsx:101` — `z.coerce.number().min(0, { message: "Price must be positive" })` usa la misma familia de sintaxis `{message}` vs `{error}` que FR5, pero no fue nombrado en el intent ni en las preguntas de Requirements Analysis (que acotaron FR5 específicamente a `profile/page.tsx:28`). Dejado sin tocar — candidato para un futuro intent de limpieza de sintaxis Zod, igual que `zod-resolver.ts` y el residuo de `profile/page.tsx:28` fueron señalados en Reverse Engineering antes de aprobarse su inclusión en este intent.

### Hallazgos GGA pre-existentes corregidos (en archivo ya tocado, por política de equipo)

`gga run` sobre los archivos migrados encontró, además de confirmar NFR2 (ninguna violación "Zod 4 Rule"), 5 violaciones **pre-existentes no relacionadas con Zod** en `UnifiedProductForm.tsx` y 3 archivos de schemas — corregidas en el mismo commit por la política ya afirmada del equipo ("fix ANY pre-existing GGA violation surfaced on a touched file, don't skip the hook"):

- `UnifiedProductForm.tsx`: 4 clases Tailwind no-semánticas (`text-amber-500`, `bg-amber-600 hover:bg-amber-700`, `text-orange-500`, `text-green-600`) → tokens ProSell (`text-ps-warning`, `bg-ps-warning hover:bg-ps-warning/90`, `text-ps-warning`, `text-ps-success`).
- `UnifiedProductForm.tsx`: `handleOrganizationChange` reescrita con early-return en vez de if/else anidado.
- `UnifiedProductForm.tsx`: ternario anidado del label del botón submit extraído a `loadingLabel`/`idleLabel` + `submitButtonContent`.
- `category.ts`, `orgApi.ts`, `organizations.ts`: indentación corregida vía `prettier --write` tras la conversión a `z.looseObject()`.

## Test coverage summary

10 tests nuevos en 3 archivos (ver `unit-test-instructions.md` para el detalle por requerimiento). Suite completa: 166 archivos, 1282 tests, 0 fallas (antes de este intent: 163/1272 — la diferencia son exactamente los 3 archivos/10 tests nuevos).

## Verification run log

- `pnpm tsc --noEmit` — 0 errores.
- `pnpm eslint <archivos tocados> --max-warnings=0` — 0 violaciones.
- `pnpm vitest run <3 archivos nuevos>` — 10/10 verde.
- `gga run --no-cache` — primera corrida: FAILED (4 violaciones Tailwind pre-existentes en `UnifiedProductForm.tsx`, ninguna de Zod). Tras corregirlas: nueva corrida FAILED (2 hallazgos de code-quality pre-existentes + 3 de indentación, ninguno de Zod). Tras corregir ambos: **PASSED** — confirma empíricamente NFR2 (la eliminación del bloque de `AGENTS.md` desbloquea GGA para este idioma Zod).
- `pnpm vitest run` (suite completa) — 166/166 archivos, 1282/1282 tests verdes — confirma NFR1 (cero regresión).

## Deviations from the plan

- Se corrigieron 3 hallazgos de GGA pre-existentes no nombrados en el plan original (2 de code-quality + 3 de indentación por formato), por la política de equipo ya afirmada de arreglar violaciones pre-existentes en archivos tocados — no es una expansión de alcance de negocio, es un requisito operacional ya vigente.

## Review

READY

**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-03T01:58:06Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                                                                            | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Recommendation                                                                                                                                                           |
| --- | -------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Minor    | `apps/web/src/lib/api/schemas/leads.ts:13-16`, `apps/web/src/lib/api/schemas/appointments.ts:11-15` | Both files carry a doc-comment on the enum declaration explicitly explaining the reason for the enum's placement ("...so the Zod schema below can validate it **with z.nativeEnum** without a circular import"), but the code directly below now reads `z.enum(LeadStatus)` / `z.enum(AppointmentStatus)` — the migration this very stage performed. Since these two files are exactly the ones FR2 touched (and the touched-file-comment-rewrite precedent from FR1.3 already establishes the team's practice of keeping prose in sync with the syntax it describes), leaving the one comment that names `z.nativeEnum` unrewritten is an internal inconsistency introduced within scope, not a pre-existing unrelated defect. It will mislead the next developer who reads it as still describing the current API. | Replace "with z.nativeEnum" with "with z.enum" (or equivalent) in both doc comments. Small, mechanical, no behavior risk.                                                |
| 2   | Minor    | `apps/web/src/components/forms/UnifiedProductForm.tsx:100` (unchanged line)                         | Pre-existing comment "The app currently pins Zod 3.25" is now doubly stale — `package.json` has pinned `zod: ^4.4.0` since 2026-07-20, and this migration is the project's own explicit "finish moving off Zod 3 syntax" effort. Verified via `git diff --cached` that this line was not touched (pre-existing, out of the diff), so it does not block this artifact, but it sits one line above code this very intent modified twice (export added, and the loose sibling copied the same comment-adjacent `{message}` call below it) without being corrected.                                                                                                                                                                                                                                                      | Note as a small follow-up cleanup (or fold into the already-flagged adjacent `{message}`-vs-`{error}` finding this artifact already tracks for line 101) — not blocking. |

No Critical or Major findings. Both Minor findings are documentation-only, verified against the actual diff, and neither affects runtime behavior, type-safety, or test coverage.

### Validation Tool Results

| Tool                                                                                        | Result                                                                                                                                                                 | Interpretation                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rg -n "\.passthrough\(\)" apps/web/src`                                                    | No matches (only match is a `describe()` string in the new test file)                                                                                                  | FR1 completeness confirmed — zero remaining `.passthrough()` call sites in source                                                                                                                                      |
| `rg -n "z\.nativeEnum\(" apps/web/src`                                                      | No matches (only match is a `describe()` string in the new test file)                                                                                                  | FR2 completeness confirmed — zero remaining `z.nativeEnum()` call sites                                                                                                                                                |
| `rg -n "z\.looseObject\("` per-file spot check                                              | Real call-site counts match code-summary's per-file claims exactly (e.g. leads.ts 7 sites, authApi.ts 6, organizations.ts 3) once header-comment mentions are excluded | No inflated/deflated completeness claim                                                                                                                                                                                |
| `pnpm tsc --noEmit`                                                                         | 0 errors                                                                                                                                                               | Confirms code-summary's claim                                                                                                                                                                                          |
| `pnpm eslint <18 touched files> --max-warnings=0`                                           | 0 warnings/errors                                                                                                                                                      | Confirms code-summary's claim                                                                                                                                                                                          |
| `pnpm vitest run <3 new test files>`                                                        | 10/10 passed                                                                                                                                                           | Confirms code-summary's claim; inspected test bodies — all assert real observable behavior (unknown-key tolerance, required-field rejection, invalid-enum-value rejection, exact error message), none are tautological |
| `pnpm vitest run` (full suite)                                                              | 166 files / 1282 tests, 0 failures                                                                                                                                     | Matches code-summary's "166/1282, 0 failures (was 163/1272 pre-intent)" claim exactly — NFR1 (zero regression) confirmed live, not just trusted from the log                                                           |
| `git diff --cached --stat`                                                                  | Exactly the 17 modified + 1 deleted + 3 new files claimed, no extras                                                                                                   | Scope discipline confirmed — no unauthorized file touched                                                                                                                                                              |
| Direct read: `UnifiedProductForm.tsx` diff                                                  | `FIXED_FIELDS_SCHEMA` (strict) untouched at the `.merge()` call site (line 300); new `FIXED_FIELDS_SCHEMA_LOOSE` used only at the former passthrough site (line 493)   | FR1.4 special case verified exactly as claimed                                                                                                                                                                         |
| Direct read: AGENTS.md diff                                                                 | `## Legacy Exceptions` section (with the Zod-3 exception block) removed in full, heading included                                                                      | FR3 verified                                                                                                                                                                                                           |
| Direct read: `zod-resolver.ts`                                                              | File deleted (`git status` shows `D`), zero remaining imports (`rg` clean)                                                                                             | FR4 verified                                                                                                                                                                                                           |
| Direct read: `profile/page.tsx`                                                             | `z.email({ error: "Correo inválido" })`, `profileSchema` exported                                                                                                      | FR5 verified; confirmed valid Zod 4 API (test suite exercises it live, not just typechecks)                                                                                                                            |
| Direct read: 3 excluded files (`vendedores.ts`, `authRoutes.ts`, `appointments.ts`) headers | None ever mentioned `.passthrough()` in prose                                                                                                                          | FR1.3's "8 of 11" claim (which resolved the prior Requirements Analysis Major finding) verified correct, not just asserted                                                                                             |
| Direct read: `products.ts`                                                                  | No `.passthrough()` present                                                                                                                                            | FR1.2's claim that `products.ts` needs no code change verified, resolving the Minor open item from Requirements Analysis                                                                                               |

### Summary

Every completeness, correctness, and scope-discipline claim in this artifact was independently re-verified against the actual working tree and tool output rather than taken on trust, and all of them held up: zero remaining `.passthrough()`/`z.nativeEnum()` call sites, exact per-file site counts, the `UnifiedProductForm.tsx` strict/loose split done precisely as specified, `AGENTS.md` and `zod-resolver.ts` cleanup both confirmed, live tsc/eslint/full-suite runs all green matching the logged numbers exactly, and the diff touches exactly the files claimed and nothing more. The two Minor findings are pre-existing-adjacent or introduced-but-cosmetic documentation staleness with no behavioral impact — well under the NOT-READY threshold.
