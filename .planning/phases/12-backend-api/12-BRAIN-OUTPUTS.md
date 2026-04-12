# Phase 12 — Domain Brain Outputs
> Generated: 2026-04-11T13:45:00Z
> Status: complete

## Brain #1 — Backend System Design
**Recommendations:**
- Missing domain behavior – `Category.validate_attributes()` does not exist; the use‑case layer never calls it. Add the method (or extract a strategy) and unit‑test all attribute‑validation edge cases.  
- DTO ↔ Entity mismatch – `CategoryResponse.from_entity()` does not serialize `attribute_schema`. Expose the schema in the response model and keep it immutable after creation.  
- Use‑case coupling – `Category.create()` is invoked without passing `attribute_schema`. Refactor the create use‑case to inject the schema (or fetch it from a `CategoryRepository` cache) so the domain layer can enforce validation up‑front.  
- API surface gaps – `PATCH`, `DELETE`, and `attribute‑schema` endpoints are absent from the router. Implement them with proper Pydantic request/response models and inject the admin‑check logic directly in the router (avoid leaking auth concerns into the use‑case).  
- Missing test fixtures – E2E suite lacks `async_client`, `admin_user`, and `seller_user`. Add fixture utilities now; otherwise auth failures will surface only in CI and block the migration.  
- Orientation‑driven segment mapping – If `orientation === 'dealer'` forces the category to be owned by a dealer, enforce this rule in the repository (e.g., reject assignment to a non‑dealer tenant). Add a validation step in the create/update use‑cases to prevent silent mis‑assignments.  
- Safety net for missing flags – Reference implementation in `tests/e2e/phase-10-setup.py` handles `is_admin`; ensure the same flag is passed consistently throughout the admin workflow to avoid 403 errors.  
- Performance‑aware pagination – Consider cursor‑based pagination rather than offset for future scaling; update `ListCategoriesUseCase` signature accordingly.  
- Documentation boundary – Add OpenAPI schema definitions for the new `Patch/DeleteAttributeSchema` endpoints so generated docs reflect the contract.  
- Dependency‑injection hygiene – All use‑cases should depend only on interfaces (`IRepository`, `IAuthentication`) and not on concrete implementations. Audit the current DI graph for hidden circularities.  
- Error handling consistency – Raise domain‑level exceptions (`CategoryAttributeValidationError`, `DealerAccessDeniedError`) instead of bubbling raw HTTP 401/403 from the router. This keeps the API surface uniform and testable.

## Brain #2 — QA Strategy
**Recommendations:**
- Add auth fixtures: Create `admin_user` and `seller_user` fixtures with valid JWT cookies for integration tests to enable role‑based access verification.  
- Test attribute_schema validation: Write unit tests for `Category.validate_attributes()` to enforce domain rules (e.g., required fields, format checks).  
- Verify role‑based filtering: Ensure integration tests simulate different roles (admin/seller) and validate output includes/excludes protected data.  
- Confirm delete cascade behavior: Add integration tests for cascade deletes (e.g., delete a vehicle → verify related images/products are also deleted).  
- Validate delete method returns: Test `/api/v1/vehicles/{id}` DELETE endpoint explicitly checks returned `bool` value aligns with success/failure.  
- Document organization_id in fixtures: Confirm `admin_user` fixture includes `organization_id` and associate it with test documentation.  
- Add security tests: Implement tests for auth bypass attempts, input sanitization (e.g., SQL injection), and JWT validation.  
- Include performance tests: Measure API response times under load to ensure compliance with SLA (<100ms p95).  
- Implement contract tests: Use Pact to verify API contract compliance with OpenAPI specs (e.g., parameter validation, error responses).  
- Test database state isolation: Ensure fixtures reset database state between tests to prevent state leaks.  
- Coverage gaps: Expand test coverage for edge cases (e.g., extreme values in `attribute_schema`, empty payloads).  
- Add negative test cases: Verify the API rejects invalid inputs (e.g., incorrect VIN formats, unauthorized actions).

## Dispatch Meta
| Property | Value |
|----------|-------|
| Total brains dispatched | 2 |
| All returned successfully | yes |