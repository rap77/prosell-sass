# Rollback Runbook — Catalog Image Load Optimization

## Application rollback (code)

Standard project procedure — no change introduced by this intent:

1. Identify the last known-good commit SHA on `main` (before this intent's
   squash-merge commit).
2. **Staging**: `git checkout <good-sha>` on the staging host (or `git
revert` on `main` + let `Deploy Staging` auto-redeploy), then re-run the
   deploy steps in `deploy.yml` manually if needed
   (`docker compose --env-file .env.staging -f
docker/docker-compose.staging.yml build && ... up -d`).
3. **Production**: re-run `promote-prod.yml` (`workflow_dispatch`, `confirm:
deploy`) against the reverted `main`, OR SSH to `PROD_HOST` and run the
   same `git pull` + `docker compose ... up -d --build` sequence manually
   against the prior commit if the GitHub Actions path is unavailable.

No blue/green or traffic-shifting rollback exists in this pipeline (see
`deployment-strategy.md`) — rollback is "redeploy the previous commit",
consistent with the recreate strategy.

## Database rollback (migration)

`20260922_0001_add_thumbnail_image_key_to_product.py` is a standard,
reversible Alembic migration:

- **`upgrade()`**: adds `Product.thumbnail_image_key` (nullable
  `String(500)`). No data transformation, no backfill.
- **`downgrade()`**: drops the column. Safe — no other migration or
  application code depends on the column's presence once reverted (the
  application's runtime fallback to `cover_image_key`/`image_urls[0]`
  already handles its absence for legacy rows; reverting simply returns
  every row to that same "absent" state).

**To roll back the migration** (only if the application rollback above is
insufficient — e.g., an emergency where the column itself is suspected):

```bash
docker exec prosell-prod-api python -m alembic downgrade -1
```

Run this **after** the application rollback (step above), never before —
running an old application version against a downgraded schema is fine
here (the column is nullable and optional), but downgrading the schema
before the code that stops referencing it is redeployed risks the
still-running new code hitting a missing column.

## Rollback triggers

- Health check failure: `promote-prod.yml`'s post-deploy step
  (`curl -fL .../api/v1/health/`) already fails the workflow on a
  non-2xx response, which is this project's existing automatic-abort
  signal — no new failure mode introduced by this intent.
- New-endpoint specific: a spike in 4xx/5xx on
  `POST /products/image-urls:batch` or
  `DELETE /products/{id}/images/{key}`, or CDN-invalidation error-rate,
  observed via structured logs (`NFR4.1`/`NFR4.2` — `batch_size`/
  `user_id`/`tenant_id` and purge `success`/`queued_retry`/
  `failed_no_retry` outcome logs, both already implemented). No new
  automated alarm was added by this intent (this project has no
  CloudWatch-equivalent alerting configured); manual log review triggers
  a manual rollback decision.

## Post-rollback

No data migration is required either direction — `cover_image_key` and
`image_urls` (the pre-existing fields) are untouched by this intent in
both directions, so no data-integrity risk exists from rolling back at any
point.
