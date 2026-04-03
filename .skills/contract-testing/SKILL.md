---
name: contract-testing
description: >
  Multi-layer contract testing skill for API endpoints. Auto-generates integration tests
  to prevent and diagnose backend-frontend contract mismatches. Layer 1 validates OpenAPI
  structure, Layer 2 validates integration contracts with full format checks, Layer 3 detects
  schema drift between DTOs and TypeScript types.
  Trigger: When user reports API contract bug, endpoint lacks integration tests, PR adds
  new endpoint with external API integration, or data normalization layer is suspected to be
  disconnected.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- User reports API contract bug (data format mismatch, null vs undefined, casing differences)
- Endpoint lacks integration tests (has unit tests but no end-to-end validation)
- PR adds new endpoint with external API integration (NHTSA, Facebook, Google, etc.)
- Data normalization layer suspected to be disconnected (normalizer exists but not wired)
- "Contract testing", "API contract", "integration test", "schema validation"

## Critical Patterns

### Pattern 0: Skill Resolution (BEFORE generating tests)

Follow the **Skill Resolver Protocol** (`_shared/skill-resolver.md`) before generating tests:

1. Obtain the skill registry: search engram (`mem_search(query: "skill-registry", project: "{project}")`) → fallback to `.atl/skill-registry.md` from the project root → skip if none
2. Identify the target endpoint — what router/DTO are we testing?
3. Match relevant skills from the registry's **Compact Rules** by code context and task context
4. Build a `## Project Standards (auto-resolved)` block with matching compact rules
5. Inject this block into generated tests to ensure compliance with project-specific standards

**If no registry exists**: warn the user and proceed with generic test generation only.

### Pattern 1: Endpoint Analysis First

Before generating any test:

1. **Locate the endpoint**: Find router file, DTOs, use case
2. **Analyze characteristics**:
   - External API calls? (httpx, requests, aiohttp, nhtsa, facebook, google)
   - Normalization logic? (normalize, transform, map, convert)
   - Schema size? (>10 fields → consider Layer 3)
   - Critical path? (auth, payments, health)
3. **Recommend layer**: Use `analyzer.analyze_endpoint()` to get recommendation
4. **Present to user**: "Endpoint X has characteristics Y. Recommended: Layer Z because [reason]"

### Pattern 2: Layer Selection Logic

```
IF external_api_detected OR normalization_detected:
    → Layer 2 (Integration + Contract Validation)
    WHY: Full format validation catches data transformation bugs

ELIF schema_field_count > 10:
    → Layer 3 (Schema Matching)
    WHY: Large schemas prone to DTO ↔ TypeScript drift

ELSE:
    → Layer 1 (OpenAPI Validator)
    WHY: Fast structure check, no dependencies
```

### Pattern 3: Test Generation Pattern

1. **Read appropriate template** (`templates/layer{N}_test.py.j2`)
2. **Render with context**: endpoint path, DTO name, test data from `config.yaml`
3. **Write to tests/contract/{layer}/test_{endpoint}_contract.py`
4. **Run pytest**: Verify test exists and is discoverable
5. **Report results**: Pass/fail with diagnostic information

### Pattern 4: Test-First Bug Fix

For Layer 2 tests that reproduce existing bugs (e.g., VIN decode):

1. **Generate test FIRST** - expect it to FAIL (reproduces the bug)
2. **Run pytest** - confirm failure shows the bug
3. **Fix the bug** - connect normalizer, fix casing, etc.
4. **Run pytest again** - confirm test now PASSES
5. **Commit with conventional commit**: "fix: connect VIN normalizer in decode_vin.py"

This proves the test validates the real contract behavior.

## Workflow

1. **Analyze endpoint** (find router, DTO, characteristics)
2. **Recommend validation layer** based on endpoint type
3. **Generate appropriate test** using template (Layer 1/2/3)
4. **Execute test and report results** (pass/fail with diagnostics)
5. **If fails, diagnose root cause** and suggest fix

## Layers

### Layer 1: OpenAPI Schema Validator (Fast, Structure-Only)

- **Purpose**: Validate response structure matches OpenAPI schema
- **Use case**: Simple CRUD endpoints, no external APIs
- **Speed**: <100ms per endpoint
- **Dependencies**: None (uses FastAPI's OpenAPI schema directly)
- **Example**: `GET /api/v1/organizations` returns valid `OrganizationListResponse`

### Layer 2: Integration + Contract Validation (Full Format Checks)

- **Purpose**: Validate end-to-end contract with actual data format checks
- **Use case**: External API integration, normalization layers, critical paths
- **Speed**: 1-5s per endpoint (makes real HTTP calls)
- **Dependencies**: TestClient, test fixtures, database
- **Example**: `POST /api/v1/vehicles/decode-vin` returns normalized make ("chevrolet" not "CHEVROLET")

### Layer 3: Schema Matching (DTO ↔ TypeScript Drift Detection)

- **Usage**: Run periodically or before releases to detect schema drift
- **Purpose**: Detect when Pydantic DTO fields no longer match TypeScript interfaces
- **Use case**: Large schemas (>10 fields), shared types, versioned APIs
- **Speed**: 5-10s per DTO pair
- **Dependencies**: Pydantic model inspection, TypeScript file parsing
- **Example**: `VehicleDTO.title` vs `Vehicle.title` in frontend - detect mismatches

## Configuration

Edit `.skills/contract-testing/config.yaml` to customize:

```yaml
exclusions:
  - /health
  - /metrics
  - /docs

thresholds:
  schema_matching_fields: 10

external_api_keywords:
  - httpx
  - requests
  - aiohttp
  - nhtsa
  - facebook
  - google

normalization_keywords:
  - normalize
  - transform
  - map
  - convert
```

## Examples

### Example 1: VIN Decode Bug (Layer 2)

**Problem**: Backend returns `CHEVROLET` but frontend expects `chevrolet`

**Symptoms**: Select fields don't populate after VIN decode

**Diagnosis**:
```python
# analyzer.analyze_endpoint() detects:
# - external_api: True (NHTSA API)
# - normalization: True (nhtsa_normalizer exists)
# → Recommends Layer 2
```

**Test generates**:
```python
# tests/contract/integration/test_vin_decode_contract.py
async def test_vin_decode_returns_normalized_make():
    # Given: Valid VIN for Chevrolet vehicle
    vin = "2GNALBEK8H1615946"

    # When: Decode VIN
    response = await client.post(f"/api/v1/vehicles/decode-vin?vin={vin}")

    # Then: Make should be normalized (lowercase)
    assert response.status_code == 200
    data = response.json()
    assert data["make"] == "chevrolet"  # NOT "CHEVROLET"
    assert data["body_type"] in ["suv", "sedan", "pickup"]  # lowercase
    assert data["drivetrain"] in ["FWD", "AWD", "RWD", "4WD"]  # UPPERCASE
```

**Fix**: Connect normalizer in `decode_vin.py` use case

### Example 2: Organizations Endpoint (Layer 1)

**Problem**: Need to verify response structure is valid

**Test generates**:
```python
# tests/contract/openapi/test_organizations_schema.py
def test_organizations_openapi_schema_exists():
    # OpenAPI schema must include OrganizationListResponse
    openapi = client.app.openapi()
    assert "/api/v1/organizations" in openapi["paths"]
    assert "get" in openapi["paths"]["/api/v1/organizations"]
```

## Tool Resolution

Use `ToolSearch` to find:
- `mcp__serena__find_symbol` - Locate DTOs and routers
- `mcp__serena__read_file` - Read endpoint implementation
- `mcp__serena__search_for_pattern` - Find normalization keywords

## See Also

- `.skills/contract-testing/layers/` - Detailed documentation for each layer
- `.skills/contract-testing/templates/` - Jinja2 templates for test generation
- `.skills/contract-testing/analyzer.py` - Endpoint analysis logic
