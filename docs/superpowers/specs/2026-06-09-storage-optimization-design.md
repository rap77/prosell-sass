# Storage Optimization — Design

> Cross-cutting cost optimization. **Not** part of Subsystem A (the generic
> ProductCard, parked at
> `docs/superpowers/specs/2026-06-09-subsystem-a-productcard-design.md`).
> Motivation: image storage on DigitalOcean Spaces (S3-compatible) is a
> recurring cost — fewer/smaller stored bytes = less monthly spend.

## 1. Goal

Reduce recurring object-storage cost on two independent fronts:

1. **Smaller new images** — store uploads as **WebP** instead of JPEG
   (~25–35% fewer bytes per image).
2. **Fewer images over time** — when a product is sold (and stays sold past a
   grace period), prune its gallery to **only the cover**.

Both ship independently (two PRs). Neither touches Subsystem A.

## 2. Current state (verified)

- Uploaded product photos are ALREADY optimized:
  `apps/api/src/prosell/infrastructure/images/image_optimizer.py` —
  `ImageOptimizer` (Pillow): resize ≤1920×1080, **JPEG quality 85**, strip EXIF,
  RGBA→RGB, LANCZOS. Runs in the upload flow (`image_router.py`).
- Storage adapter exposes a delete: `do_spaces_service.delete_file(key)`
  (DigitalOcean Spaces, S3-compatible).
- Product lifecycle (`domain/entities/product.py`):
  `DRAFT → PENDING → PUBLISHED → (RESERVED | PAUSED) → SOLD`. **`SOLD` is NOT
  terminal — products get returned** (user-confirmed), so image deletion must
  never be immediate.

## 3. Part 1 — WebP storage format

**Change:** `ImageOptimizer` outputs **WebP** for stored images (new uploads).

- Target: resize ≤1920×1080 (unchanged), **WebP quality ~82**, strip metadata.
- The optimizer already centralizes this; add a `format` option (WebP default
  for the storage path) rather than a second class.
- **Storage key + content-type:** persist with a `.webp` extension and
  `image/webp` content-type so signed-URL downloads carry the right type.

**Publish path (Facebook Marketplace) stays JPEG.** External marketplace APIs
reliably accept JPEG; sending WebP is a risk we don't control. So:

- When publishing, convert the stored WebP → **JPEG on the fly** (transient,
  not stored). Pillow does this in the same pipeline.
- Quality note: WebP(82) → JPEG re-encode is mildly double-lossy but visually
  fine for a marketplace listing.

**No backfill.** Existing JPEGs stay as-is. Rationale: re-encoding already-
compressed JPEG → WebP is double-lossy with diminishing savings (~15–20% on an
already-compressed file) plus processing cost/risk. The continuous win comes
from new uploads (WebP) + Part 2 (deletion, which beats re-encoding). Mixed
WebP/JPEG storage is fine — the publish path converts whatever it finds to JPEG.

**Why not WebP for the publish/marketplace path too:** the consumer is an
external API, not a browser. Format choice follows the consumer: browser →
WebP/AVIF; external API → JPEG. (For serving to our own frontend, `next/image`
can still negotiate WebP/AVIF — but that's the separate "serve signed URLs via
next/image" concern, out of scope here.)

## 4. Part 2 — Prune sold products' galleries (grace period)

When a product is sold and remains sold past a grace period, delete every image
**except the cover**, freeing storage. Reference (sold) listings keep only the
cover for history.

**Grace period: 30 days** (must be ≥ the return window; user-confirmed).

**Mechanism: periodic sweep** (NOT immediate delete, NOT a delayed task):

```
Daily job:
  SELECT products WHERE status = SOLD AND sold_at < (now - 30 days)
  for each:
    keys_to_delete = product image keys − {cover_image_key}
    for key in keys_to_delete: do_spaces_service.delete_file(key)
    update product image list → keep only cover_image_key
```

Why a sweep beats a delayed task queued at sale time:

1. **Returns handled for free** — a returned product leaves `SOLD`, so the
   query simply excludes it. No cancellation logic, no orphaned scheduled jobs.
2. **Idempotent & restart-safe** — re-running is a no-op for already-pruned
   products (only the cover remains). Survives process restarts (no in-flight
   task to lose).
3. **Simple to reason about** — one query + deletes.

**Invariants:**

- `cover_image_key` is NEVER deleted (it is excluded from `keys_to_delete`; if
  the cover also appears in the gallery list, dedupe it out).
- The product's stored image list/attributes are updated to reflect only the
  cover (no dangling keys pointing at deleted objects).
- Deletion is best-effort per key; a missing object (already gone) is not an
  error (idempotent).

## 5. Risks & mitigations

- **Irreversible deletion** → grace period (30 d) ≥ return window. After the
  window, a (rare) very-late return loses the gallery but keeps the cover —
  accepted tradeoff, set the window to cover the real return policy.
- **Double-lossy on publish** → store WebP at q82; JPEG re-encode for Facebook
  is visually fine.
- **Mixed-format storage** → no functional issue; publish converts to JPEG
  regardless of source format.

## 6. To verify during planning (implementation details, not design blockers)

- Does `Product.mark_sold()` set a `sold_at` timestamp? If not, add it (and a
  column + migration) — the sweep needs it.
- What scheduler runs the daily sweep? (Check for an existing task queue / cron
  — a `taskqueue` slice existed historically.) If none, the sweep can be a
  management command run by an external scheduler initially.
- Confirm the product image model: `cover_image_key` + the gallery key list
  (top-level `image_urls` and/or `attributes.images`) so the prune targets the
  right keys.

## 7. Out of scope

- Backfill of existing images to WebP.
- Serving MinIO/Spaces signed URLs through `next/image` (remote-host allowlist).
- Tuning the 1920×1080 / quality caps.
- Subsystem A (generic ProductCard) — parked, separate spec.

## 8. Testing

**Part 1 (WebP):**

- Optimizer produces a valid WebP within ≤1920×1080 at the target quality;
  output bytes < equivalent JPEG.
- Publish pipeline yields a valid JPEG from a WebP source.

**Part 2 (prune):**

- Sweep deletes non-cover keys for products `SOLD` and `sold_at` older than the
  grace period; keeps `cover_image_key`.
- A `SOLD` product within the grace period is untouched.
- A returned product (status ≠ SOLD) is excluded even past the period.
- Idempotent: second run is a no-op; missing object does not raise.
- Product image list after prune contains only the cover.
