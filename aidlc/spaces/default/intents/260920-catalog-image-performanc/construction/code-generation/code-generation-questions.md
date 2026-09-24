# Code Generation Questions

## Plan Approval

**Plan summary:** Implement and test, in `test-after` order, the private 600×600 derivative, batch cover contract, mandatory `do_cdn_endpoint` routing for signed private URLs, purge compensation, and the frontend change that removes the N+1 fan-out. `cover_image_key` remains the existing gallery-cover contract; a separate nullable thumbnail representation and migration are conditional on the approved persistence decision.

**Test instructions:** Scoped Pytest and Vitest runners are verified first. Tests cover the targeted batch regression, signed-image privacy and tenant-prefix checks, cross-org behavior, legacy fallback, 600×600 processing, purge/retry compensation, and frontend consumption; all external services are mocked.

**Testing Contract:** The complete `## Testing Contract` embedded in `code-generation-plan.md` is binding: `test-after`, `minimal`, `bugfix`, a targeted regression, and existing suites remain green. It requires runner verification before tests and tests after each implemented layer.

[Approval Fingerprint]: sha256:v3:70a1ec4127b48697ee1bd29d1669132ee23ef88615cc3ab6220260dd0d7a77ef
[Planned Source]: 9ae5842cf9509a99dbaecd7e3118e1810148a22cbf0372eea4f91f15fb1baca9

- `Approve Plan` — proceed to code generation.
- `Request Changes` — revise the plan and instructions.

[Answer]: Approve Plan
