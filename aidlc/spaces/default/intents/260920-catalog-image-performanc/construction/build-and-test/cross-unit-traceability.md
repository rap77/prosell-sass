# Cross-Unit Final Coverage Gate — Catalog Image Load Optimization

## Verdict

**FAIL** — 34 of 36 enumerated IDs are covered `OK` with an existing target
file; 2 (NFR1.2, NFR1.3) are `Deferred`, not `OK`, and have no owning stage
left in this bugfix scope's execution plan to redeem that deferral (see
`build-and-test-summary.md` and `test-results.md` for the full analysis).

This is a zero-Unit, stage-level bugfix run (`units-generation`/`user-stories`
were skipped) — there is one stage-level `traceability.json`
(`construction/code-generation/traceability.json`), no per-Unit files, and
no three-segment `ACn.m.seq` IDs from `stories.md` to enumerate (stories.md
does not exist for this scope).

## Enumeration source

`inception/requirements-analysis/requirements.md` — 23 `FR` IDs (FR1.1–FR1.5,
FR2.1–FR2.5, FR3.1–FR3.3, FR4.1–FR4.4, FR5.1–FR5.4, FR6.1–FR6.2) + 13 `NFR`
IDs (NFR1.1–NFR1.3, NFR2.1–NFR2.3, NFR3.1–NFR3.2, NFR4.1–NFR4.3, NFR5.1–NFR5.2)
= 36 total.

## Per-ID coverage

| ID         | Status (traceability.json) | Target file                                                                     | File exists | Verdict                                                                                                                                                        |
| ---------- | -------------------------- | ------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1.1      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered                                                                                                                                                        |
| FR1.2      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered                                                                                                                                                        |
| FR1.3      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered                                                                                                                                                        |
| FR1.4      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered                                                                                                                                                        |
| FR1.5      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered                                                                                                                                                        |
| FR2.1      | OK                         | `apps/api/src/prosell/infrastructure/images/image_optimizer.py`                 | yes         | Covered                                                                                                                                                        |
| FR2.2      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/image_router.py`               | yes         | Covered                                                                                                                                                        |
| FR2.3      | OK                         | `apps/api/src/prosell/infrastructure/models/product_model.py`                   | yes         | Covered                                                                                                                                                        |
| FR2.4      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered (evidence cites a raw-key field rather than the signed-URL surface — see reviewer finding R-05, citation-only)                                         |
| FR2.5      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered                                                                                                                                                        |
| FR3.1      | OK                         | `apps/api/src/prosell/infrastructure/services/do_spaces_service.py`             | yes         | Covered                                                                                                                                                        |
| FR3.2      | OK                         | `apps/api/src/prosell/infrastructure/services/do_spaces_service.py`             | yes         | Covered (mechanically OK; behaviorally lazy-at-first-use, not startup fail-fast — see reviewer finding R-03/R-01 in the code-generation review, accepted risk) |
| FR3.3      | OK                         | `apps/api/src/prosell/infrastructure/services/do_spaces_service.py`             | yes         | Covered (mechanically OK; gallery endpoint still uses the non-CDN signer — see reviewer finding R-02, accepted risk)                                           |
| FR4.1      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered (mechanically OK; only the DELETE path purges, not the replace/update path — see reviewer finding R-01, accepted risk)                                 |
| FR4.2      | OK                         | `apps/api/src/prosell/application/use_cases/product/purge_product_image.py`     | yes         | Covered                                                                                                                                                        |
| FR4.3      | OK                         | `apps/api/src/prosell/application/use_cases/product/purge_product_image.py`     | yes         | Covered                                                                                                                                                        |
| FR4.4      | OK                         | `apps/api/src/prosell/infrastructure/tasks/use_cases/purge_cdn_cache_task.py`   | yes         | Covered                                                                                                                                                        |
| FR5.1      | OK                         | `apps/web/src/components/catalog/ProductCard.tsx`                               | yes         | Covered                                                                                                                                                        |
| FR5.2      | OK                         | `apps/web/src/lib/api/productImageUrlsBatch.ts`                                 | yes         | Covered                                                                                                                                                        |
| FR5.3      | OK                         | `apps/web/src/components/catalog/ProductCard.tsx`                               | yes         | Covered                                                                                                                                                        |
| FR5.4      | OK                         | `apps/web/src/lib/api/productImageUrlsBatch.ts`                                 | yes         | Covered                                                                                                                                                        |
| FR6.1      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered                                                                                                                                                        |
| FR6.2      | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered                                                                                                                                                        |
| NFR1.1     | OK                         | `apps/web/src/lib/api/productImageUrlsBatch.ts`                                 | yes         | Covered                                                                                                                                                        |
| **NFR1.2** | **Deferred**               | `operation/performance-validation/` (not scheduled)                             | n/a         | **Uncovered**                                                                                                                                                  |
| **NFR1.3** | **Deferred**               | `operation/performance-validation/` (not scheduled)                             | n/a         | **Uncovered**                                                                                                                                                  |
| NFR2.1     | OK                         | `apps/api/src/prosell/infrastructure/api/routers/image_router.py`               | yes         | Covered                                                                                                                                                        |
| NFR2.2     | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered                                                                                                                                                        |
| NFR2.3     | OK                         | `apps/api/src/prosell/infrastructure/services/do_spaces_service.py`             | yes         | Covered                                                                                                                                                        |
| NFR3.1     | OK                         | `apps/api/src/prosell/application/use_cases/product/purge_product_image.py`     | yes         | Covered                                                                                                                                                        |
| NFR3.2     | OK                         | `apps/api/src/prosell/application/use_cases/product/purge_product_image.py`     | yes         | Covered                                                                                                                                                        |
| NFR4.1     | OK                         | `apps/api/src/prosell/infrastructure/api/routers/product_router.py`             | yes         | Covered                                                                                                                                                        |
| NFR4.2     | OK                         | `apps/api/src/prosell/application/use_cases/product/purge_product_image.py`     | yes         | Covered                                                                                                                                                        |
| NFR4.3     | OK                         | `apps/api/src/prosell/application/use_cases/product/purge_product_image.py`     | yes         | Covered (mechanically OK; no real cache hit/miss signal implemented — see reviewer finding R-04, accepted risk)                                                |
| NFR5.1     | OK                         | `apps/api/src/prosell/infrastructure/services/do_spaces_service.py`             | yes         | Covered                                                                                                                                                        |
| NFR5.2     | OK                         | `apps/api/alembic/versions/20260922_0001_add_thumbnail_image_key_to_product.py` | yes         | Covered                                                                                                                                                        |

## Uncovered elements

- **NFR1.2** — "La response del endpoint batch debe completarse en ≤300ms
  p95 para K≤50 productos." No owning validation stage scheduled in this
  bugfix run.
- **NFR1.3** — "El derivado thumbnail de 600×600 debe descargarse en ≤200ms
  p95 desde el endpoint CDN con caché caliente." Same gap.

Both require measurement against a live, deployed CDN endpoint under
representative load — inherently outside what Build and Test (or any
earlier Construction stage) can execute. `performance-validation` (Stage
4.6) is the framework's designated owner for exactly this kind of
requirement, but it is not part of the `bugfix` scope's execution plan.

## Notes on `OK`-but-disputed entries

Six entries above (FR2.4, FR3.2, FR3.3, FR4.1, FR4.3, NFR4.3) are
mechanically `Covered` per this gate's literal check (status `OK` + target
file exists) but were flagged as behaviorally incomplete or imprecisely
cited by the Code Generation stage's advisory reviewer. The human explicitly
chose **Approve** at that gate, which maps every one of those findings to
Accepted risk under protocol. This gate does not re-litigate that decision —
it surfaces it here because these are the same IDs this table already
reports on, and a reader of this file should not assume "Covered" means
"behaviorally complete against the FR's literal wording" for these six.
