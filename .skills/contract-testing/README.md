# Contract Testing Skill

Auto-generates contract tests for API endpoints to prevent and diagnose backend-frontend contract mismatches.

## Quick Start

When debugging an API contract bug:

1. Invoke: "Claude, usa la skill de contract testing para [endpoint]"
2. Claude analyzes endpoint and recommends validation layer
3. Test is generated and executed
4. If fails, Claude diagnoses root cause

## Layers

- **Layer 1**: OpenAPI validator (fast, structure-only)
  - For simple CRUD endpoints
  - Validates response matches OpenAPI schema

- **Layer 2**: Integration + contract validation (full format)
  - For endpoints with external APIs or normalization
  - Validates field formats (lowercase, UPPERCASE, specific values)

- **Layer 3**: Schema matching (drift detection)
  - For endpoints with 10+ response fields
  - Detects drift between Pydantic DTOs and TypeScript types

## Example

```python
# Bug: VIN decode returns "BUICK" instead of "buick"

# Step 1: Invoke skill
Usuario: "Claude, hay un bug en /decode-vin. Usa contract testing."

# Step 2: Skill generates test
# → tests/contract/integration/test_vin_decode_contract.py

# Step 3: Test runs and fails
# → AssertionError: Expected 'buick', got 'BUICK'

# Step 4: Claude fixes bug
# → Add normalize_nhtsa_value() calls in decode_vin.py

# Step 5: Test passes ✅
```

## Files

- `.skills/contract-testing/SKILL.md` - Main skill file
- `.skills/contract-testing/config.yaml` - Configuration
- `.skills/contract-testing/analyzer.py` - Endpoint analyzer
- `.skills/contract-testing/scripts/schema_extractor.py` - Schema extractor
- `.skills/contract-testing/layers/*.md` - Layer implementation guides
- `.skills/contract-testing/templates/*.j2` - Jinja2 templates
- `apps/api/tests/contract/` - Generated contract tests

## Usage

Invoke when:
- User reports API contract bug (data format mismatch)
- Endpoint lacks integration tests
- PR adds new endpoint with external API integration
- Data normalization layer suspected to be disconnected
