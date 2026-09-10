# Unit Test Instructions — Export Cross-Org Permission

Intent: `260910-export-cross-org` (scope: bugfix, Test Strategy: Minimal)

## Framework / Setup

pytest + pytest-asyncio, httpx `AsyncClient` + `ASGITransport` (unchanged — integration-style tests against the FastAPI app, no new tooling).

## Exact run command (scoped to this file)

```bash
cd apps/api && uv run pytest tests/integration/api/routers/test_product_router_export_client_format.py -v
```

Requires the CI-matching temporary Postgres (per `project.md` learning 260830-ci-seed-data): `postgres:17`, same credentials/port as `postgres-test` in `ci.yml`, schema bootstrapped with `create_test_schema.py`.

## Regression check for the shared guard (Step 6 of the plan)

```bash
cd apps/api && uv run pytest tests/integration/api/test_featured_route.py -v
```

(Confirmed via search: `tests/integration/api/test_featured_route.py` is the only integration test file that exercises `_check_org_scope_permission()` today, via `get_featured_products`. `list_products`/`get_category_filter_values` have no dedicated integration test file — this is a pre-existing coverage gap in the codebase, out of scope for this bugfix; just confirm the featured-route suite stays green.)

## Coverage targets

Requirement-driven per Minimal strategy — one test per open FR touching this endpoint's behavior, plus the mandatory bugfix-scope targeted regression:

| Test                                                                                                                                                                                 | Traces                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `test_super_admin_with_organization_id_sees_target_org_catalog`                                                                                                                      | FR1.2, FR4.2 — **the targeted regression for this bugfix** |
| `test_non_admin_with_organization_id_returns_403`                                                                                                                                    | FR1.3, FR4.3                                               |
| `test_nonexistent_organization_id_behaves_like_empty_catalog`                                                                                                                        | FR1.5                                                      |
| `test_cross_org_export_is_audited`                                                                                                                                                   | FR2.1                                                      |
| `test_own_org_export_is_not_audited`                                                                                                                                                 | FR2.2                                                      |
| `test_other_organizations_products_never_appear` (existing, unchanged)                                                                                                               | FR4.1, FR1.4, NFR1, NFR3                                   |
| `test_empty_catalog_returns_404`, `test_non_published_products_do_not_count`, `test_cap_exceeded_returns_413`, `test_returns_zip_content_type_and_disposition` (existing, unchanged) | regression floor — must stay green                         |

## Mocking / stubbing guidance

Reuse the file's existing fixtures verbatim: `shared_session` (real Postgres via `TEST_DB_URL`), `mock_spaces` (AsyncMock for `SpacesService`), `setup_override`, `_authenticate_as`. For the new permission-differentiated tests, build a second `_auth_user`-style helper (or parameterize the existing one) that returns a `User` WITHOUT the `SUPER_ADMIN`/`ORG_ADMIN_VIEW_ALL` role, to exercise the 403 path (FR1.3).

## Test data management

Reuse `_create_org`/`_create_category`/`_make_product` helpers — no new fixtures needed beyond the auth-role helper above.

## Audit log tests (FR2.1/FR2.2)

Use pytest's built-in `caplog` fixture at `logging.INFO` level scoped to the `product_router` logger's module name; assert on the presence/absence of the cross-org audit log record (match on a stable substring, not the full message) rather than parsing structured fields, since the log call is a plain `logger.info(f"...")` (see plan Step 3).
