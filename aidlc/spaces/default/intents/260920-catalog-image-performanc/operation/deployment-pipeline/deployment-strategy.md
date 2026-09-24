# Deployment Strategy — Catalog Image Load Optimization

## Strategy

**Recreate** (via `docker compose ... up -d --build`) — the project's
existing and only strategy. No blue/green, canary, or rolling deployment is
configured anywhere in this repository's pipeline, and this bugfix does not
introduce one. Confirmed with the human at this stage's gate (Q1: "Sí,
mismo camino de siempre").

This is a reasonable fit for this intent: the change is backend
(new endpoints + a nullable column) and frontend (a hook rewrite behind
the same `productImageUrlsBatch()` contract) — no schema-breaking change,
no traffic-shifting requirement, and the existing recreate strategy already
accepts a short window of container restart per service.

## Environment promotion gates

1. **CI → Staging**: fully automatic. `deploy.yml` fires on `workflow_run`
   when CI succeeds on `main`. No manual gate.
2. **Staging → Production**: fully manual. `promote-prod.yml` only runs on
   `workflow_dispatch` with the `confirm` input, and the job's `if` condition
   requires it to equal the literal string `"deploy"` — this is the
   project's permanent production gate (per `project.md` § Mandated: "ALWAYS
   requerir confirmación manual explícita... para promover a producción").

## Approval workflow

No separate reviewer/approval step beyond the typed `"deploy"` confirmation
— this repository is on a Free GitHub plan without Required Reviewers on
Environments, so the `workflow_dispatch` input itself IS the approval gate
(documented inline in `promote-prod.yml`'s header comment).

## Rollback procedure

See `rollback-runbook.md`.

## Feature flags

Not applicable. This project does not use a feature-flag system anywhere in
its pipeline or application code; confirmed at this stage's gate (Q1) and
verified against the existing `product_router.py` (no flag-gated branching
for the new endpoints — `POST /products/image-urls:batch` and
`DELETE /products/{id}/images/{key}` are always active once deployed).

## Database migration handling

Expand-only: the new `thumbnail_image_key` column is nullable, added via a
standard forward Alembic migration, with no backfill and no removal of
existing columns (`cover_image_key` and `image_urls` are untouched). This
already follows the expand-contract pattern's "expand" phase without a
contract phase needed — legacy rows continue to work via the runtime
fallback the code already implements (OQ1 resolution documented in
`code-summary.md`).
