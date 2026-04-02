# Docker Build Cache - Critical Lesson

**Problem**: New source files not copied to container during rebuild

## What Happened
When adding `nhtsa_normalizer.py` to the project, the Docker build cache detected no changes in the `apps/api/` layer and skipped the COPY command. The new file existed locally but was NOT copied to the container.

## Root Cause
Docker layer caching works by checking if upstream layers have changed:
```
# Layer 1: FROM python:3.13  <-- cached
# Layer 2: WORKDIR /app      <-- cached
# Layer 3: COPY apps/api/ ./  <-- SKIPPED (no change detected)
```

Even though `nhtsa_normalizer.py` existed in `apps/api/`, Docker didn't copy it because the layer itself hadn't changed structurally.

## Solution
Always use `--no-cache` flag when adding NEW source files:

```bash
# Wrong - uses cache, skips new files
docker build -f docker/api.Dockerfile -t prosell-api:staging .

# Correct - rebuilds all layers
docker build --no-cache -f docker/api.Dockerfile -t prosell-api:staging .
```

## When to Use --no-cache
- Adding NEW `.py` files to existing directories
- Adding NEW source files to already-copied directories
- After first build with new files, normal builds are fine

## When NOT to Use --no-cache
- Modifying EXISTING files (cache invalidates correctly)
- Changing dependencies in pyproject.toml (COPY layer gets invalidated)
- Normal development (cache is your friend!)

## Key Takeaway
Docker build cache is based on LAYER changes, not FILE changes. New files in existing layers may be skipped if the layer command itself hasn't changed.

**Rule of thumb**: First build with new files → use `--no-cache`. Subsequent builds → normal cache is fine.
