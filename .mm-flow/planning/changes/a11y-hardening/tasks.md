# Tasks — a11y-hardening

## Execution Rules

- Execute tasks in dependency order unless parallelization is explicitly safe.
- Update this file and the handoff when a task is completed or blocked.
- Each task must declare purpose, dependencies, likely file touchpoints, validation commands, and acceptance criteria.

## T1: Audit and locate the 3 a11y issues in the codebase

### Purpose

Find the exact files, components, and CSS values responsible for each issue before touching anything.

### Depends On

None

### Parallelizable

no

### Files / Areas Likely Touched

- `apps/web/` — sidebar component, dashboard page, aside elements

### Validation Commands

- `grep -r "aside" apps/web/src/ --include="*.tsx" -l`
- `grep -r "h3\|h2\|h1" apps/web/src/ --include="*.tsx" -l`
- Review Tailwind dark mode color classes on sidebar

### Acceptance Criteria

- [ ] File + line identified for sidebar dark mode contrast issue
- [ ] File + line identified for h3-without-h2 heading hierarchy
- [ ] Files identified for both aside elements lacking aria-label

## T2: Fix sidebar dark mode contrast

### Purpose

Bring text contrast in sidebar dark mode from 2.4:1 to ≥ 4.5:1 (WCAG AA).

### Depends On

T1

### Parallelizable

no

### Files / Areas Likely Touched

- Sidebar component or its Tailwind CSS classes (dark: variants)
- `tailwind.config.ts` if custom colors are involved

### Validation Commands

- Visual check: dark mode sidebar, use browser DevTools → Accessibility → Contrast
- `pnpm test` — no regressions

### Acceptance Criteria

- [ ] Sidebar text in dark mode has contrast ratio ≥ 4.5:1
- [ ] Light mode sidebar contrast unchanged

## T3: Fix heading hierarchy + aside aria-labels

### Purpose

Fix h3-without-h2 in dashboard and add differentiating aria-labels to the two aside elements.

### Depends On

T1

### Parallelizable

yes (can run in parallel with T2)

### Files / Areas Likely Touched

- Dashboard page component (`apps/web/src/`)
- Layout or sidebar components with aside elements

### Validation Commands

- `pnpm test` — no regressions
- Manual: run screen reader or axe DevTools extension on dashboard page

### Acceptance Criteria

- [ ] Dashboard heading hierarchy is correct (no h3 without preceding h2)
- [ ] Both aside elements have unique, descriptive aria-labels

## T4: Close the continuity loop

### Purpose

Refresh handoff and confirm all 3 issues are resolved with evidence.

### Depends On

T2, T3

### Parallelizable

no

### Files / Areas Likely Touched

- HANDOFF-CURRENT.md
- tasks.md
- todo.md

### Validation Commands

- `pnpm test` full suite — no regressions
- Confirm contrast ratios documented

### Acceptance Criteria

- [ ] All 3 a11y issues verified and documented as resolved
- [ ] Handoff updated with next recommended work
