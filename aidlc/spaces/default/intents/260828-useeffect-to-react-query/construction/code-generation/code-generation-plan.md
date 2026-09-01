# Code Generation Plan — useEffect → React Query (onboarding / invite)

Zero-Unit directive (units-generation was SKIPped for this bugfix scope). Scoped directly from `requirements.md`. Frontend-only change (`apps/web`) — no backend, database, or API contract changes (see requirements.md Constraints C1-C5, Out of Scope).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implementar la capa aplicable (backend o frontend según el",
  "scope": "bugfix",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implementar la capa aplicable (backend o frontend según el\n  cambio) y luego escribir y correr los tests de esa capa, sin\n  backfillear cobertura en código pre-existente no tocado por el cambio.\n- La distinción entre \"Strict TDD Mode: enabled\" (memoria global del\n  usuario, configuración personal del asistente aplicable a todas sus\n  sesiones y proyectos) y la práctica real de este equipo/repo\n  (test-after) queda resuelta por evidencia, no por juicio en la\n  entrevista: el threshold de cobertura frontend fue rebajado\n  explícitamente después de medir cobertura ya escrita (patrón inverso a\n  TDD), y los aprendizajes ya persistidos en `project.md` para Code\n  Generation son explícitos y repetidos en esta dirección. La instrucción\n  de `~/.claude/CLAUDE.md` queda fuera de alcance de esta práctica de\n  equipo por ser config de asistente, no una afirmación de práctica de\n  proyecto.\n- **Asimetría de cobertura — aceptada tal cual (Q3).** El frontend tiene un\n  piso de cobertura configurado en `vitest.config.ts`\n  (`lines:40 functions:40 branches:75 statements:40`), rebajado\n  deliberadamente de un objetivo original de 80% tras medir la cobertura\n  real disponible. El backend **no tiene ningún piso de cobertura\n  enforced** (`pytest --cov=prosell --cov-report=xml` en CI genera el\n  reporte pero no pasa `--cov-fail-under`, y `apps/api/pyproject.toml` no\n  declara `fail_under`) — es decir, la asimetría es total, no solo un\n  matiz: ni el 80% que `org.md` fija como default para el scope `classic`\n  activo, ni ningún otro número, aplican al backend hoy. El equipo eligió\n  explícitamente aceptar esta asimetría (40% frontend / sin piso backend)\n  como la práctica vigente, en vez de subir el piso del frontend o de\n  agregar uno nuevo al backend.\n- CI ejecuta la suite completa en cada push/PR a `main` (`test-python`,\n  `test-node` jobs), y el pre-push hook local corre `pytest -q` — el gate\n  de \"suite completa en verde antes de merge\" SÍ está enforced\n  mecánicamente, aunque el umbral de cobertura backend no lo esté.\n- **Asimetría de gates de lint — intencional (Q4).** El hook `next-lint`\n  (ESLint completo) está deshabilitado en pre-commit y solo corre en CI;\n  `react-doctor`, en cambio, SÍ bloquea en pre-commit pero es solo\n  advisory en CI (`react-doctor.yml` no bloquea merge). El equipo confirmó\n  que esta dirección \"invertida\" es deliberada: ESLint completo es lento y\n  se reserva para CI; `react-doctor` es rápido y vale la pena que bloquee\n  localmente.\n- Para el scope `classic` activo de este intent (refactor de navegación\n  auth/frontend): el patrón de test correcto de cara a Build and Test es\n  unit/component (Vitest + Testing Library) sobre el código de navegación\n  tocado, no integración/E2E nuevo, consistente con el aprendizaje ya\n  registrado de no generar artefactos de test por ceremonia cuando el\n  cambio no lo amerita."
    },
    {
      "layer": "project",
      "text": "- En Build and Test, para un Unit kind: ui sin cruce de servicio/dominio, no generar integration-test-instructions.md cuando los tests de componente ya cubren la interacción real (fireEvent + verificación de efecto observable); tampoco generar performance-test-instructions.md ni security-test-instructions.md sin un NFR correspondiente en requirements.md. (learned 2026-08-30) \n\n- En Build and Test, con Test Strategy Minimal, no generar integration-test-instructions.md / performance-test-instructions.md / security-test-instructions.md cuando el intent no tiene NFR de performance/security y las FRs ya están cubiertas por regresiones de integración existentes — reconfirmado en el intent 260830-ci-seed-data. (learned 2026-08-30) \n- Para verificar NFR1.2 (suite completa de pytest backend) en Build and Test cuando no hay un Postgres de test corriendo: levantar un contenedor Docker temporal matching exacto de la config de CI (`postgres:17`, mismas credenciales/puerto que `postgres-test` en `ci.yml`), bootstrapear el schema con `create_test_schema.py`, correr la suite, y detener el contenedor al terminar. La convención ya aprendida de verificar con `git stash`/`pop` contra el baseline antes de asumir que una falla es \"pre-existente\" aplica también a la suite COMPLETA, no solo a los módulos tocados por el cambio. (learned 2026-08-30)"
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Include a targeted regression for the bug or vulnerability.",
      "Keep the existing test suite green."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:f7270057791a0b9961578f6f5c388a9872992de93d904d0aae4d35b15e5271bc",
  "contract_sha256": "sha256:1af05dc412ca77257789f16b94d802c75c3411d304ee4940218ad4cead23f52c"
}
```

Only **Frontend behavior** applies (no data model, repository, or API layer changes — see requirements.md Out of Scope). This is a `bugfix` scope under Test Strategy Minimal: one targeted regression test per requirement at the narrowest level (component tests), plus keeping the existing suite green. No integration/E2E test files — component tests already exercise the real interaction (render + fireEvent/waitFor + observable effect), consistent with the already-affirmed project practice for UI-kind changes with no service/domain crossing.

## Steps

- [x] **Step 1 — Verify test runner.** Confirm `apps/web` Vitest + Testing Library setup is runnable as-is (`vitest.config.ts` already configured, `@testing-library/react` installed, `QueryClientProvider` + fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })` wrapper pattern already established by `leads.test.tsx`/`TeamLeadList.test.tsx`). Record the exact unit-scoped run command in `unit-test-instructions.md`. No new runner/config needed — brownfield, existing setup verified sufficient.

- [x] **Step 2 — `orgApi.ts`: add `useMyOrganization()` hook (implements FR1.1).**
      Add `"use client"` directive at top of file (file now defines a React hook; all current importers are already client-only — `onboarding/page.tsx`, `import-client-csv/page.tsx`, `organizationStore.ts`, `stores/index.ts`, `lib/api/index.ts`). Add `ORG_ME_QUERY_KEY = ["org", "me"] as const` and `export function useMyOrganization()` using `useQuery` from `@tanstack/react-query`, `queryFn: () => orgApi.getMyOrganization()`, `retry: false` (mirrors the original `useEffect`'s single-attempt, no-retry semantics — a default-retrying query would change the observable time-to-settle for a new user with no org yet, violating FR1.2). No change to `orgApi.getMyOrganization()` itself or any other method — the hook wraps the existing call, per FR1's "hook colocated in the API module" convention (`notificationsApi.ts`, `leads.ts` precedent).

- [x] **Step 3 — `onboarding/page.tsx`: replace the mount `useEffect` with `useQuery` (implements FR1.1, FR1.2, FR1.4).**
      Replace `useState<Organization|null>` + `useState(isFetching)` + the `checkSetup()` `useEffect` with `const { data: org, isLoading: isFetching } = orgApi.useMyOrganization();`. Preserve the `setup_complete` → `router.replace("/dashboard")` redirect as a separate `useEffect` reacting to `org` (a navigation side-effect responding to already-fetched data, not a data-fetching effect — does not reintroduce the `AGENTS.md:333` violation). Drop the dead `setTeamName`-equivalent — none here, but drop the now-unused `Organization` local null-union nuance: `org` becomes `Organization | undefined` (from `useQuery`), update the two call sites (`defaultValues={{ name: org?.name ?? "" }}`, `if (org)` guard in `handleStep1`) to tolerate `undefined` the same way they tolerated `null`. `handleStep1` and `completeSetup` (FR1.3) are untouched — still imperative `orgApi.update()`/`orgApi.completeSetup()` calls, not converted to `useMutation`. No structural change to the wizard tree (FR1.4) — everything stays a client component.

- [x] **Step 4 — `teamApi.ts`: add `useAcceptInvitation()` hook (implements FR2.1, FR2.3).**
      Add `"use client"` directive at top (same client-only-importers check as Step 2: `invite/[token]/page.tsx`, `teamStore.ts`, `stores/index.ts`, `useTeams.ts`, `lib/api/index.ts`, `TeamSwitcher.test.tsx`). Add `export function useAcceptInvitation()` using `useMutation` from `@tanstack/react-query`, `mutationFn: (data: AcceptTeamInvitationRequest) => teamApi.acceptInvitation(data)`. No `onError`/`onSuccess` in the hook itself — those stay in the component per-call (FR2.3 needs the raw thrown `ApiError` to reach the caller's `onError` unchanged, so the hook must not swallow or rewrap it).

- [x] **Step 5 — `invite/[token]/page.tsx`: replace the mount `useEffect` fetch with a guarded `useMutation` trigger (implements FR2.1, FR2.2, FR2.3, FR2.4).**
      Replace the `state`/`message`/`setTeamName` `useState` trio and the `acceptInvitation` async function with: `const mutation = teamApi.useAcceptInvitation();` plus a local `errorState` (`{ kind: "expired" | "already_member" | "error"; message: string } | null`) and `successMessage` (`string`) `useState` pair, set only inside `mutation.mutate(...)`'s `onSuccess`/`onError` callbacks (async completions, not synchronous effect-body `setState` — this is what lets the `react-hooks/set-state-in-effect` suppressor at L57 be removed, per FR2.4/OQ1). The triggering `useEffect` becomes: `if (!token) return; if (mutation.status !== "idle") return; mutation.mutate({ token }, { onSuccess, onError });` — the idle-status check is the anti-double-fire guard (FR2.1), and it is correct under React 18 Strict Mode's dev double-invoke because `useMutation`'s status is preserved across the effect's cleanup+rerun for the same mounted instance. Derive the rendered `state`/`message` (for the existing `renderContent()`/`subtitle()` switch, unchanged) purely from `token` presence + `mutation.isSuccess` + `errorState` — no `useState` needed for the "no token" case, so it never calls `setState` synchronously in the effect body either. Preserve `onError`'s exact branching (`error instanceof ApiError`, `.message.toLowerCase().includes("expired"|"already"|"member")`, `.status === 401` → login redirect, generic fallback) verbatim (FR2.3) — this is why `teamApi.useAcceptInvitation()` must not swallow `ApiError`. Preserve both `setTimeout(..., 2000)` redirects (success → `/dashboard?welcome=team`, already_member → `/dashboard`) exactly. Drop the unused `setTeamName`/`teamName` state (the original set it but never rendered it — dead state, safe to drop; not an observable-behavior change).

- [x] **Step 6 — Frontend behavior: write component tests (implements NFR1, targeted regression floor).**
      New test files (Vitest + Testing Library, `QueryClientProvider` wrapper pattern from `leads.test.tsx`):
  - `apps/web/tests/app/onboarding/page.test.tsx` — happy path (org exists, not setup-complete → renders step 1 with `org.name` as default value), setup-complete redirect (`router.replace` called with `/dashboard`), and error/no-org path (fetch rejects → step 1 renders with empty defaults, no crash, no redirect).
  - `apps/web/tests/app/invite/[token]/page.test.tsx` — happy path (mutation resolves → success state renders, redirect fires after the 2s timeout), expired-token path (`ApiError` with `"expired"` message → expired state), already-member path (`ApiError` with `"already a member"` message → already_member state + redirect), and the no-token path (empty `token` param → error state, no mutation call: assert `mutate` was never invoked).

- [x] **Step 7 — Documentation and traceability.** Write `code-summary.md` and `traceability.json` mapping FR1.1-FR1.4, FR2.1-FR2.4, NFR1-NFR3 to the files above.

Plan Approval is recorded in `code-generation-questions.md` (sibling file), per stage protocol.
