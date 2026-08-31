<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-29T15:40:00Z — "Strict TDD Mode: enabled" en ~/.claude/CLAUDE.md se interpretó como configuración personal del usuario para el asistente, no como evidencia de práctica de equipo; testing posture real se afirmó como test-after en base a evidencia mecánica del repo (umbral de cobertura, ausencia de gates TDD en CI)

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-29T15:40:00Z — se aceptó la asimetría de piso de cobertura (40% frontend / sin piso backend) y de gates de lint (next-lint solo CI / react-doctor bloqueante local) tal cual, en vez de forzar simetría — el humano confirmó ambas como intencionales

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-29T15:40:00Z — los gaps de seguridad hallados por devsecops (sin SAST real, sin DAST, secret-scanning liviano solo local, Dependabot sin cobertura npm/pnpm ni Python/uv) se registraron como aceptados por ahora — evaluar si ameritan un intent de seguridad dedicado más adelante
- 2026-08-29T15:40:00Z — los 3 hallazgos de código del área del intent (duplicación OAuth login/register, useOAuthPreload.ts código muerto, drift JSDoc middleware.ts→proxy.ts) quedaron parqueados para Requirements Analysis/Code Generation, no son práctica de equipo
