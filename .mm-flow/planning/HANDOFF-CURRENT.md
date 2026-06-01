# Handoff — a11y-hardening

## Current objective
- `a11y-hardening`

## Decisions already made
- Use a per-objective planning package instead of relying on a single root planning surface forever.
- Another model should be able to resume from artifacts, not from chat memory alone.

## Blockers / risks
- The package is scaffolded from repository evidence and may need refinement for deeper implementation context.
- Historical legacy material may still exist under archive/legacy, but it is not part of the active workflow.

## Context
3 a11y issues identificados en `docs/mvp-status.md`:
1. Sidebar dark mode contrast: 2.4:1 → necesita ≥ 4.5:1 (WCAG AA)
2. `<h3>` sin `<h2>` precedente en dashboard
3. Dos `<aside>` sin `aria-label` diferenciador

## Exact next recommended task
- `/mm:complete-task T1 --brief`

## Validation commands
- `pnpm test` — no regressions
- Browser DevTools → Accessibility → Contrast (sidebar dark mode)
