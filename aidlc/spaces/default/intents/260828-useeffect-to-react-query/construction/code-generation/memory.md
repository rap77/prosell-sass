<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-31T23:05:00Z — El plan describía los hooks nuevos como "colocated en el módulo de API" (patrón notificationsApi.ts/leads.ts): esos hooks son funciones exportadas standalone (`useMyOrganization`, `useAcceptInvitation`), importadas directamente por los componentes — NO métodos del objeto `orgApi`/`teamApi`. Un primer intento las llamó como `orgApi.useMyOrganization()`/`teamApi.useAcceptInvitation()`, lo cual falla en runtime (`TypeError: ... is not a function`); corregido a imports directos antes de correr los tests.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-31T23:05:00Z — Generación de código hecha directamente en el rol de developer (sin dispatch Task/Agent), reconfirmando el workaround ya documentado en project.md para code-generation zero-Unit: plan-approval-guard/testing-posture fingerprint doblan el path `construction/<unit>/code-generation/` cuando el unit-name coincide con el propio slug del stage.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-31T23:05:00Z — Se corrieron vitest/tsc/eslint sobre los archivos tocados directamente en esta etapa (no solo los pasos del plan) en vez de diferir toda verificación a Build and Test — permitió atrapar y arreglar el bug de import de hooks (orgApi.useMyOrganization is not a function) antes del gate, en vez de que apareciera recién en Build and Test.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-31T23:05:00Z — El supresor `react-hooks/set-state-in-effect` en invite/[token]/page.tsx:57 fue eliminado (ya no hay setState síncrono dentro del efecto); confirmar en Build and Test que ESLint no lo señala como faltante/necesario en algún escenario no cubierto por los 7 tests nuevos.
