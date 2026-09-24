# CD Pipeline Configuration — Catalog Image Load Optimization

This bugfix introduces no new deployable component, environment, or CD
mechanism. It reuses the project's existing CD pipeline unchanged. This
document records that existing pipeline as of this intent (workspace
evidence, not a new design) since `ci-pipeline`/`infrastructure-design`
were out of scope for this bugfix.

## Pipeline topology

```
push/PR to main
      │
      ▼
  CI (.github/workflows/ci.yml)
   lint-python, test-python (Postgres 17 service),
   lint-node, test-node, validate-specs,
   validate-code-standards, build
      │  (workflow_run, on success, branch=main)
      ▼
  Deploy Staging (.github/workflows/deploy.yml)
   self-hosted runner, automatic
   docker compose --env-file .env.staging \
     -f docker/docker-compose.staging.yml build/up -d
      │  (manual only — never auto-triggered)
      ▼
  Promote to Production (.github/workflows/promote-prod.yml)
   workflow_dispatch, gated on confirm == "deploy"
   SSH to PROD_HOST, docker compose -f docker/docker-compose.prod.yml
     up -d --build, alembic upgrade head, health check
```

## Triggers

| Stage                 | Trigger                                                             | File                                 |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| CI                    | `push`/`pull_request` to `main`                                     | `.github/workflows/ci.yml`           |
| Deploy Staging        | `workflow_run` (CI success on `main`) or manual `workflow_dispatch` | `.github/workflows/deploy.yml`       |
| Promote to Production | `workflow_dispatch` only, `confirm` input must equal `"deploy"`     | `.github/workflows/promote-prod.yml` |

## Environments

| Environment | Compose file                        | Trigger                    | Runner                                              |
| ----------- | ----------------------------------- | -------------------------- | --------------------------------------------------- |
| Staging     | `docker/docker-compose.staging.yml` | Automatic on green CI      | self-hosted (local machine)                         |
| Production  | `docker/docker-compose.prod.yml`    | Manual, typed confirmation | GitHub-hosted (`ubuntu-latest`), SSH to `PROD_HOST` |

## Artifact/build steps for this intent

No new build artifacts. `apps/api` (interpreted Python, no build step) and
`apps/web` (`docker/api.Dockerfile`/equivalent web Dockerfile, built as part
of the existing `docker compose ... build` step) — this intent's new files
(`purge_product_image.py`, `cdn_invalidator_do.py`,
`batch_cover_urls.py`, the new `product_router.py` endpoints, the new
frontend batch hook) ship inside the same images the pipeline already
builds; no Dockerfile or build-step change was needed.

## Migration handling

`apps/api/alembic/versions/20260922_0001_add_thumbnail_image_key_to_product.py`
runs automatically via `alembic upgrade head`, invoked from the container
CMD (staging, `docker/api.Dockerfile`) and explicitly in
`promote-prod.yml` after the API container becomes ready (production). No
separate coordination step is required — this matches the pattern already
established for `20260812_0002_migrate_legacy_sedan_products.py`.

## Quality gates before deploy

CI's `build` job depends on `lint-python`, `lint-node`, `test-python`,
`test-node`, `validate-specs`, `validate-code-standards` — all must pass
before `Deploy Staging` can fire (it listens for CI's `workflow_run`
success). No additional gate is introduced by this intent.
