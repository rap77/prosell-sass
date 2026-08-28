# Code Generation Plan — Fix invalid Tailwind spacing classes

Zero-Unit stage (scope `express`, no Units Generation). Traces `requirements.md` FR1–FR3 directly.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
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
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
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
  "input_sha256": "sha256:44364bf5637ac0114353eb6ccd22fce3dc324acf9a77e1387c0b368eafced9af",
  "contract_sha256": "sha256:f85e912f690a168de9eb91013b6643e19e6923376ea6481d84f73ef8ac7847cc"
}
```

Only the **Frontend behavior / configuration** layer applies here — no data model, repository, business logic, or API changes. This is a config + markup fix; no new markup is written (the existing `h-9.5`/`px-4.5`/`h-8.5` classNames are already correct once the theme scale exists).

## Plan Steps

- [ ] Step 1: Verify the existing test runner/configuration and record the exact unit-scoped command (`unit-test-instructions.md`)
- [ ] Step 2: Frontend behavior — implement: extend `apps/web/tailwind.config.ts` `theme.extend.spacing` with the `4.5` / `8.5` / `9.5` steps (FR1, FR1.1, FR1.2)
- [ ] Step 3: Frontend behavior — write and run test after implementation: add `apps/web/tests/config/tailwind-spacing.test.ts` asserting the three new spacing values (FR1)
- [ ] Step 4: Verify no markup change is needed in the 7 affected files — confirm each file's existing className strings now resolve to valid CSS once Step 2 lands (FR2.1–FR2.7)
- [ ] Step 5: Documentation — correct the `TailwindCSS | 4.0` row to `TailwindCSS | 3.4.17` in the "Tech Stack 2026" table of the root `CLAUDE.md` (FR3)
- [ ] Step 6: Documentation and traceability — write `code-summary.md` and `traceability.json`

## Story-to-Code-Step Traceability

| Plan Step | Requirement                                                                                                                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step 2    | FR1, FR1.1, FR1.2                                                                                                                                                                                         |
| Step 3    | FR1 (test)                                                                                                                                                                                                |
| Step 4    | FR2.1 (`OnboardingStep3.tsx`), FR2.2 (`publications/page.tsx`), FR2.3 (`PublishForm.tsx`), FR2.4 (`privacy/page.tsx`), FR2.5 (`terms/page.tsx`), FR2.6 (`AppointmentForm.tsx`), FR2.7 (`KanbanBoard.tsx`) |
| Step 5    | FR3                                                                                                                                                                                                       |

## Approval

**[Approval Fingerprint]**: sha256:a9c750c1f1215cf0e8e873f91bd977d740442d7604433fde9ac482c6fd2f6063
