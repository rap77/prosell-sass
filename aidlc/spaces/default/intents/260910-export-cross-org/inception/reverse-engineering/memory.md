<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-10T00:00:00Z — the codekb-scope-diff verdict was STALE (paths changed since intent 260903 built the store); presented the rescan question without a reuse option, per stage prose.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-10T00:00:00Z — human chose Focused scan over Full rescan; the intent's area (cross-org export permission gap) is narrow and well-bounded to product_router.py's permission model, so a focused pass avoids re-verifying the entire repo while preserving prior deep coverage under [PRESERVADO ÍNTEGRO].

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-10T00:00:00Z — three coexisting cross-org access patterns exist in product_router.py (_check_org_scope_permission+organization_id, standalone is_org_admin inline, has_role("super_admin") literal on batch actions). Requirements/Functional Design must pick which pattern the export fix follows rather than default to the nearest one.
- 2026-09-10T00:00:00Z — the existing integration test test_other_organizations_products_never_appear currently asserts the reported bug as correct behavior; needs explicit revision (not silent deletion) once the fix scope is confirmed.
