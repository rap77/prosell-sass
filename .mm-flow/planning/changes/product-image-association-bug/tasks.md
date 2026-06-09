# Tasks — Product Image Association Bug

**Objective slug:** `product-image-association-bug`
**Date created:** 2026-06-03

| ID  | Description                                                                                                                       | TDD Phase | Status         | Notes                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------- | ---------------------------------------------- |
| T1  | Write `requirements.md` and `design.md`                                                                                           | —         | ✅ completed   | Done in checkpoint                             |
| T2  | Scaffold remaining artifacts (`tasks.md`, `todo.md`, `execution-state.json`, `HANDOFF-CURRENT.md`)                                | —         | 🔄 in_progress | Doing now                                      |
| T3  | Write 3 failing tests: `create_persists_image_urls_top_level`, `get_image_urls_returns_signed`, `bulk_upload_persists_image_urls` | **RED**   | ⏳ pending     | Run tests, confirm they FAIL with current code |
| T4  | Add `image_urls: list[str]` to `CreateProductRequest` DTO                                                                         | **GREEN** | ⏳ pending     |                                                |
| T5  | Modify `create_product.py` to pass `image_urls` to `Product.create(...)`                                                          | **GREEN** | ⏳ pending     | First test should pass                         |
| T6  | Add `image_urls: list[str] \| None` to `UpdateProductRequest` DTO                                                                 | **GREEN** | ⏳ pending     |                                                |
| T7  | Modify `update_product.py` (or `product_router.py:274`) to assign `existing.image_urls = request.image_urls`                      | **GREEN** | ⏳ pending     | Second test should pass                        |
| T8  | Implement bulk_upload_vehicles.py TODO: persist `image_urls` top-level                                                            | **GREEN** | ⏳ pending     | Third test should pass                         |
| T9  | Modify `apps/web/src/app/(seller)/catalog/create/page.tsx:59` — move `image_urls` to top-level of POST body                       | **GREEN** | ⏳ pending     |                                                |
| T10 | `rg` sweep frontend for other places sending `image_urls` nested                                                                  | —         | ⏳ pending     | Update all found                               |
| T11 | Create Alembic migration `backfill_product_image_urls`                                                                            | —         | ⏳ pending     | Validate row count, run in TX                  |
| T12 | `rg` sweep for `product_images` / `ProductImage` references                                                                       | —         | ⏳ pending     | Pre-flight for drop                            |
| T13 | Create Alembic migration `drop_product_images_table`                                                                              | —         | ⏳ pending     | After T12 confirms no consumers                |
| T14 | Local verification: `pnpm test` + `pytest` full suite green                                                                       | —         | ⏳ pending     | 840 frontend + 1124 Python tests               |
| T15 | Deploy to staging via `/mm:ship`                                                                                                  | —         | ⏳ pending     |                                                |
| T16 | Manual drag-and-drop smoke test on staging                                                                                        | —         | ⏳ pending     | Create a test product, verify images show      |
| T17 | Schedule prod maintenance window with user                                                                                        | —         | ⏳ pending     |                                                |
| T18 | Deploy to prod: alembic upgrade head + API restart                                                                                | —         | ⏳ pending     | In window                                      |
| T19 | Manual smoke test on prod                                                                                                         | —         | ⏳ pending     | Verify on a real product                       |
| T20 | `/mm:archive-objective` — close, persist final state                                                                              | —         | ⏳ pending     |                                                |
