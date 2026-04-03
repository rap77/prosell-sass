# Contract Testing Skill

Auto-generates contract tests for API endpoints to prevent and diagnose backend-frontend contract mismatches.

## When to Use

- User reports API contract bug (data format mismatch)
- Endpoint lacks integration tests
- PR adds new endpoint with external API integration
- Data normalization layer suspected to be disconnected

## Workflow

1. Analyze endpoint (find router, DTO, characteristics)
2. Recommend validation layer based on endpoint type
3. Generate appropriate test using template
4. Execute test and report results
5. If fails, diagnose root cause and suggest fix

## Layers

- **Layer 1**: OpenAPI Schema Validator (fast, structure-only)
- **Layer 2**: Integration + Contract Validation (full format checks)
- **Layer 3**: Schema Matching (DTO <-> TypeScript drift detection)
