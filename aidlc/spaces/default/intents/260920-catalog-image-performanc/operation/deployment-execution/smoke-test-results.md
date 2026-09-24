# Smoke Test Results — Catalog Image Load Optimization

Run against staging (`prosell-staging-*` containers, self-hosted runner /
local host) immediately after `Deploy Staging` (GitHub Actions run 35994273387) completed successfully.

## Environment health

| Container               | Status      |
| ----------------------- | ----------- |
| `prosell-staging-api`   | Up, healthy |
| `prosell-staging-web`   | Up, healthy |
| `prosell-staging-db`    | Up, healthy |
| `prosell-staging-redis` | Up, healthy |
| `prosell-staging-minio` | Up, healthy |

## Migration verification

API container startup log confirms:

```
INFO  [alembic.runtime.migration] Running upgrade 20260920_0001 -> 20260922_0001, add thumbnail_image_key to product
```

Confirms `20260922_0001_add_thumbnail_image_key_to_product.py` ran
automatically as part of container startup, per
`operation/deployment-pipeline/cd-config.md`'s documented mechanism —
matches the expected behavior exactly.

## Endpoint smoke test

Logged in as `admin@prosell.saas` (staging seed admin — see Deviations in
`deployment-execution/memory.md` for a password-value correction found
during this test) and exercised the new batch endpoint:

```
POST /api/v1/products/image-urls:batch
{"product_ids":["7d97fa0b-9b09-43b1-842f-baf8ee74c523","40e9f89f-a848-483a-bc40-d18522a64bcb"]}

→ 200 OK
{"covers":[],"batch_size":2}
```

**Result is correct, not a failure.** Both test product IDs (the only
`published` products currently in this staging dataset) have zero entries
in `image_urls`, no `cover_image_key`, and no `thumbnail_image_key` (verified
directly against the database). Per FR2.5 ("no thumbnail and no cover =
product omitted from the response"), an empty `covers` array with the
correct `batch_size` echoed back is the exact expected behavior for this
input — matches `TestBatchCoverUrlsLegacyFallback::test_drops_products_with_no_cover_at_all`.
Staging currently has no product with any image data to exercise the
signed-URL-returned path; this is a data-availability limit of the current
staging dataset, not a code issue.

## Structured logging verification (NFR4.1) — FINDING

Checked `docker logs prosell-staging-api` for the expected
`Batch cover-URL signing: batch_size=... user_id=... tenant_id=...` line
after the smoke-test request above. **Not present.** Investigated further:
every `INFO:` line in the container's entire log history is uvicorn's own
access-log format (`INFO:     <ip> - "<method> <path> HTTP/1.1" <status>`);
zero lines originate from any `prosell.*` application logger, including
pre-existing ones (this is not specific to the new endpoint).

**Root cause**: no `logging.basicConfig()` or equivalent root-logger
configuration exists anywhere in the application (`main.py`, `config.py`);
confirmed via `rg -n "basicConfig|setLevel|LOG_LEVEL|logging.config"` — no
matches. Python's root logger defaults to `WARNING` when unconfigured, so
every `logging.getLogger(__name__).info(...)` call across the entire
backend is silently dropped in this container. Uvicorn's own
`uvicorn.error`/`uvicorn.access` loggers are unaffected because uvicorn
configures them itself regardless of application code — which is why the
access-log lines DO appear. The unit test for this behavior
(`TestBatchCoverUrlsStructuredLogging::test_logs_batch_size_user_and_tenant`)
passes because pytest's `caplog` fixture captures at a level/propagation it
sets itself, independent of the application's (nonexistent) production
logging configuration — so the test's pass does not detect this gap.

**Scope decision**: this is a pre-existing, project-wide logging
configuration gap (affects every `logger.info()` call in the codebase, not
just this intent's new ones) — not introduced by this bugfix and not fixed
here, to avoid silently expanding this bugfix's scope into an
application-wide observability change. Flagged to the human directly during
this session; NFR4.1/NFR4.2 for this intent's new logging calls are
therefore **not currently observable in production**, though the code
itself is correct and unit-tested.

## Overall smoke-test verdict

Deployment succeeded, migration ran, health check passes, and the new
endpoint behaves correctly for the data available in staging. One real
production-observability gap found and documented (structured logging
never reaches container logs, project-wide, pre-existing) — not blocking
this deployment, but worth a fast-follow.
