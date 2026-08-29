# Requirements Analysis — Clarifying Questions

Intent: Update Next.js from 16.1.0 to latest stable 16.3.3 and React from 19.2.0 to latest stable 19.2.8 in `apps/web` — low-risk patch/minor version bump.

Depth: Minimal (express scope). Reverse-engineering was reused from a recent full-repo scan (intent `260828-fix-invalid-tailwind-spa`), which already confirmed the current pins (`next: ^16.1.0`, `react`/`react-dom`: `^19.2.0`, `@types/react`: `^19.0.0`, `eslint-config-next`: `^16.1.0`) and that no other workspace member (`apps/api`, root, `tests/e2e`) depends on Next.js or React. Confirmed via `apps/web/package.json` (2026-08-29): only `next`, `react`, `react-dom`, `@types/react`, `eslint-config-next` reference these packages.

## Q1: Companion package versions

`@types/react` is currently pinned at `^19.0.0` (not `^19.2.0`), and `eslint-config-next` tracks the Next.js major at `^16.1.0`. Bumping only `next`/`react`/`react-dom` and leaving these untouched risks type-definition drift or an ESLint config mismatch.

A. Bump `next`, `react`, `react-dom`, `@types/react`, `@types/react-dom` (if present), and `eslint-config-next` together to their versions matching the new Next.js 16.3.3 / React 19.2.8 line
B. Bump only `next`, `react`, `react-dom` — leave `@types/react` and `eslint-config-next` exactly as they are today
C. Bump `next`/`react`/`react-dom` plus `eslint-config-next` (keep them in lockstep since both track the Next major), but leave `@types/react` alone
X. Other (please specify)

[Answer]: A

## Q2: Acceptance criteria for "done"

Testing Posture for `express` scope (Minimal Test Strategy) requires the existing suite to remain green plus requirement-driven happy-path coverage — there is no dependency-bump-specific floor defined yet.

A. Existing Vitest unit/component suite green + `pnpm typecheck` + `pnpm lint` (`apps/web`) pass with no new warnings/errors — no new tests required, this is a dependency bump not new functionality
B. Same as A, plus a manual smoke check of the app running locally (`pnpm dev`) before considering the Bolt complete
C. Same as A, plus the `tests/e2e` Playwright suite must also pass against the bumped app
X. Other (please specify)

[Answer]: C

## Q3: Version pin strategy

`apps/web/package.json` currently uses caret ranges (`^16.1.0`, `^19.2.0`), not exact pins.

A. Keep caret ranges, bumped to the new floor (`^16.3.3`, `^19.2.8`) — consistent with how the repo already pins these two packages
B. Switch to exact pins (`16.3.3`, `19.2.8`, no `^`) as part of this change
X. Other (please specify)

[Answer]: A

## Q4: Breaking-change review scope

The request frames this as "low-risk patch/minor" (Next 16.1.0 → 16.3.3, React 19.2.0 → 19.2.8 — both same major, no codemod expected). No prior audit intent mentions any known Next.js/React breaking change relevant to this codebase.

A. Trust the patch/minor framing — no dedicated changelog/breaking-change review requirement; if `pnpm typecheck`/build/tests surface an incompatibility, treat it as a normal bug found during Code Generation/Build and Test
B. Require an explicit changelog review step (Next.js + React release notes between the two version ranges) documented as part of this change, before code changes are made
X. Other (please specify)

[Answer]: B

## Consolidated Summary Confirmation

- Subir en conjunto `next`, `react`, `react-dom`, `@types/react` (y `@types/react-dom` si aplica) y `eslint-config-next`, todos alineados con la línea Next.js 16.3.3 / React 19.2.8
- "Terminado" significa: suite de Vitest en verde + `pnpm typecheck` + `pnpm lint` sin errores nuevos, MÁS la suite Playwright de `tests/e2e` en verde contra la app ya actualizada — sin tests nuevos por ser un bump de dependencias
- Mantener rangos caret (`^16.3.3`, `^19.2.8`), consistente con el pineo actual del repo
- Se requiere un paso explícito de revisión de changelog (release notes de Next.js y React entre los rangos de versión) documentado antes de tocar código

- Looks correct
- Request changes

[Answer]: Looks correct
