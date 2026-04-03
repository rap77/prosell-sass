# Contract Testing Skill - Design Document

**Date**: 2026-04-03
**Author**: Rafael Padrón + Claude
**Status**: Approved - Ready for Implementation
**Type**: Technical Design Specification

---

## Executive Summary

A multi-layer contract testing skill that prevents and diagnoses API contract mismatches between backend (FastAPI/Python) and frontend (React/TypeScript). The skill automatically detects endpoint characteristics and applies the appropriate validation layer:

- **Layer 1**: OpenAPI Schema Validator (fast structure validation)
- **Layer 2**: Integration Test + Contract Validation (full format validation)
- **Layer 3**: Schema Matching (DTO ↔ TypeScript drift detection)

**Business Value**:
- Reduces debugging time from 2-3 hours to < 10 minutes
- Prevents contract bugs from reaching staging
- Provides clear diagnostic messages when contracts fail
- Leverages existing test infrastructure (458 tests, fixtures, patterns)

---

## Context

### Problem Statement

The ProSell SaaS project experienced a contract bug where:
- Backend returns normalized data: `"chevrolet"` (lowercase)
- Frontend expects: `"chevrolet"` (lowercase)
- But without integration tests, there was no validation that the normalizer was connected

**Root Cause**: Unit tests exist for the normalizer, entity, and frontend components, but no integration test validates the full request flow.

### Current State

| Aspect | Status |
|--------|--------|
| Backend DTOs | ✅ 41 Pydantic models in `/application/dto/` |
| Frontend Types | ⚠️ Scattered, no centralization |
| Type Sharing | ❌ None (manual duplication) |
| OpenAPI Docs | ✅ Available in dev, disabled in prod |
| Unit Tests | ✅ 355+ backend tests |
| Integration Tests | ⚠️ 103 tests, gaps in critical endpoints |
| E2E Tests | ✅ 65 Playwright tests |

### Design Decisions

1. **Generic but Pragmatic**: Core skill is framework-agnostic, with adapters for specific stacks
2. **Multi-Layer**: Use the right validation approach for each endpoint type
3. **Leverage Existing**: Build on top of mature test infrastructure (fixtures, helpers, patterns)
4. **CI-First**: Tests run in CI to prevent regressions, not just debugging tool

---

## Architecture

### Three-Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│  CONTRACT TESTING SKILL                                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  LAYER 1: OpenAPI Schema Validator                 │    │
│  │  - Fast structure validation                       │    │
│  │  - Use: Simple CRUD endpoints                      │    │
│  │  - Speed: ⚡ Ultra fast (no API call)              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  LAYER 2: Integration + Contract Validation         │    │
│  │  - Full format validation                          │    │
│  │  - Use: External APIs, normalization, critical     │    │
│  │  - Speed: 🐢 Slower (real API call)                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  LAYER 3: Schema Matching                          │    │
│  │  - DTO ↔ TypeScript drift detection                │    │
│  │  - Use: Many fields, high drift risk               │    │
│  │  - Speed: ⏱️ Medium (static analysis)              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Layer Selection Matrix

| Endpoint Characteristics | Recommended Layer | Rationale |
|-------------------------|-------------------|-----------|
| Simple CRUD (GET/POST) | Layer 1 | Structure validation sufficient |
| External API integration | Layer 2 | Need real API test + format validation |
| Data normalization | Layer 2 | Format critical (e.g., VIN decode) |
| Many fields (10+) | Layer 3 | Drift detection valuable |
| Business critical (auth, payment) | Layer 2 | Runtime validation necessary |
| New endpoint (no tests) | Layer 2 | Start with full coverage |

---

## Technical Design

### Skill Structure

```
.skills/contract-testing/
├── SKILL.md                    # Main skill file
├── layers/
│   ├── layer1-openapi.md       # OpenAPI validator implementation
│   ├── layer2-integration.md   # Integration test generator
│   └── layer3-schema.md        # Schema matching implementation
├── templates/
│   ├── integration_test.py.j2  # Jinja2 template for Layer 2
│   └── contract_test.py.j2     # Contract validation template
├── adapters/
│   ├── fastapi-react.md        # FastAPI + React adapter
│   └── express-vue.md          # Express + Vue adapter (future)
└── examples/
    └── vin_decode_case.md      # VIN decode example
```

### Core Components

#### 1. Endpoint Analyzer

**Purpose**: Inspect endpoint and recommend layer

**Algorithm**:
```python
def analyze_endpoint(endpoint_path: str) -> LayerRecommendation:
    """
    Analyze endpoint characteristics and recommend validation layer.
    """
    # 1. Find router definition
    router = find_router(endpoint_path)

    # 2. Check characteristics
    has_external_api = detect_external_api_calls(router)
    has_normalization = detect_data_normalization(router)
    is_business_critical = is_critical_endpoint(endpoint_path)
    field_count = count_response_fields(router)

    # 3. Recommend layer
    if has_external_api or has_normalization or is_business_critical:
        return LayerRecommendation(
            layer=2,
            reason="Integration test + contract validation recommended",
            confidence="high"
        )
    elif field_count > 10:
        return LayerRecommendation(
            layer=3,
            reason="Schema matching recommended (many fields)",
            confidence="medium"
        )
    else:
        return LayerRecommendation(
            layer=1,
            reason="OpenAPI validation sufficient",
            confidence="high"
        )
```

#### 2. Layer 1: OpenAPI Validator

**Implementation**:
```python
# tests/contract/test_openapi_schema.py

import pytest
from httpx import AsyncClient
from fastapi import FastAPI

class TestOpenAPIContract:
    """Validate API responses match OpenAPI schema."""

    @pytest.mark.asyncio
    async def test_endpoint_matches_openapi_schema(
        self,
        client: AsyncClient,
        app: FastAPI
    ):
        """Test that response matches declared OpenAPI schema."""
        # Get OpenAPI schema
        openapi_schema = app.openapi()

        # Call endpoint
        response = await client.get("/api/v1/organizations")
        assert response.status_code == 200

        # Validate against schema
        # (using pydantic or openapi-schema-validator)
        validate_response_against_schema(
            response.json(),
            openapi_schema,
            "/api/v1/organizations",
            "get"
        )
```

#### 3. Layer 2: Integration Test Generator

**Template** (Jinja2):
```python
# templates/integration_test.py.j2

from httpx import AsyncClient
from {{ dto_module }} import {{ response_dto_name }}

class Test{{ endpoint_name }}Contract:
    """Contract tests for {{ endpoint_path }}."""

    @pytest.mark.asyncio
    async def test_{{ endpoint_name }}_returns_valid_format(
        self,
        client: AsyncClient
    ):
        """
        CRITICAL: This test validates that {{ endpoint_path }}
        returns data in the format expected by the frontend.

        Frontend expects:
        {% for field, format in contract_fields.items() %}
        - {{ field }}: {{ format.description }}
        {% endfor %}
        """
        response = await client.{{ method }}(
            "{{ endpoint_path }}",
            json={{ request_body | default("{}") }}
        )

        assert response.status_code == 200

        # ✅ Layer 1: Structure validation (Pydantic)
        data = {{ response_dto_name }}(**response.json())

        # ✅ Layer 2: Contract validation (format checks)
        {% for field, validation in contract_fields.items() %}
        # {{ field }}: {{ validation.description }}
        assert data.{{ field }} {{ validation.assertion }}
        {% endfor %}

    @pytest.mark.asyncio
    async def test_{{ endpoint_name }}_with_test_data(
        self,
        client: AsyncClient
    ):
        """Test with known test data for verification."""
        {% for test_case in test_cases %}
        # {{ test_case.description }}
        response = await client.{{ method }}(
            "{{ endpoint_path }}",
            json={{ test_case.request }}
        )

        assert response.status_code == 200
        data = {{ response_dto_name }}(**response.json())

        {% for assertion in test_case.assertions %}
        assert {{ assertion }}
        {% endfor %}

        {% endfor %}
```

**Example Usage** (VIN Decode):
```python
# Generated: tests/integration/api/test_vin_decode_contract.py

from httpx import AsyncClient
from prosell.application.dto.vehicle.create import DecodeVinResponse

class TestVinDecodeContract:
    """Contract tests for POST /api/v1/vehicles/decode-vin."""

    @pytest.mark.asyncio
    async def test_decode_vin_returns_normalized_format(
        self,
        client: AsyncClient
    ):
        """
        CRITICAL: This test validates that /decode-vin
        returns data in the format expected by the frontend.

        Frontend expects (from fbVehicleOptions.ts):
        - make: lowercase (e.g., "chevrolet")
        - drivetrain: UPPERCASE (e.g., "FWD", "AWD")
        - body_type: lowercase (e.g., "suv", "sedan")
        - transmission: lowercase (e.g., "automatic", "manual")
        """
        response = await client.post(
            "/api/v1/vehicles/decode-vin",
            json={"vin": "2GNALBEK8H1615946"}
        )

        assert response.status_code == 200
        data = DecodeVinResponse(**response.json())

        # ✅ Contract validation
        assert data.vehicle.make == "buick"  # Not "BUICK"
        assert data.vehicle.drivetrain in ["FWD", "AWD", "RWD", "4WD"]
        assert data.vehicle.body_type in ["suv", "sedan", "pickup", ...]
```

#### 4. Layer 3: Schema Matching

**Implementation**:
```python
# tests/contract/test_schema_matching.py

class TestSchemaMatching:
    """Validate backend DTOs match frontend TypeScript types."""

    def test_decode_vin_response_matches_frontend(self):
        """
        Validate that DecodeVinResponse (Python) matches
        the inferred TypeScript type in the frontend.
        """
        # Backend DTO
        backend_fields = extract_pydantic_fields(DecodeVinResponse)

        # Frontend type (inferred from VehicleForm.tsx)
        frontend_fields = {
            "vin": "string",
            "vehicle": {
                "year": "number | null",
                "make": "string | null",
                "model": "string | null",
                # ...
            }
        }

        # Compare
        for field, backend_type in backend_fields.items():
            frontend_type = frontend_fields.get(field)
            assert frontend_type is not None, f"Field {field} missing in frontend"
            assert types_match(backend_type, frontend_type), \
                f"Field {field}: backend={backend_type}, frontend={frontend_type}"
```

---

## Workflow

### Invocation Methods

#### Method 1: Manual (User invokes)

```bash
# User is debugging a contract bug
Usuario: "Claude, hay un bug con el VIN decode. Usa la skill de contract testing."

Claude: 📋 Analyzing endpoint: POST /api/v1/vehicles/decode-vin
       ✅ Found: DecodeVinResponse DTO
       ❌ Missing: Integration test
       🎯 Layer 2 recommended (integration + contract)

       [Generates test, runs it, diagnoses issue]
```

#### Method 2: Auto-Detection (Claude suggests)

```python
# Pattern: endpoint exists but no integration test
if (
    has_response_model(router)
    and not has_integration_test(router.path)
    and not is_excluded(router.path)
):
    suggest_contract_testing(router.path)
```

**Suggestion message**:
```
🔍 Detected: Endpoint /api/v1/vehicles/decode-vin has no integration test.

   This endpoint integrates external API (NHTSA) and performs data normalization.
   Consider generating contract tests to validate format matches frontend expectations.

   Options:
   - Generate integration test now (Layer 2)
   - Generate OpenAPI validator (Layer 1)
   - Skip for now
```

### Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. INVOCATION                                             │
│     Manual (user request) or Auto (pattern detection)      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  2. ENDPOINT ANALYSIS                                      │
│     - Find router definition                               │
│     - Detect characteristics (external API, normalization)  │
│     - Recommend layer                                      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  3. USER CONFIRMATION                                     │
│     - Show recommended layer with rationale                │
│     - User confirms or selects different layer             │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  4. TEST GENERATION                                       │
│     - Use appropriate template for layer                   │
│     - Fill in endpoint-specific details                    │
│     - Generate test file                                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  5. TEST EXECUTION                                        │
│     - Run generated test                                   │
│     - Capture results (pass/fail)                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
         ┌───────────┴───────────┐
         ↓                       ↓
    [PASS]                  [FAIL]
         ↓                       ↓
    ┌─────────┐          ┌─────────────────┐
    │ SUCCESS │          │ DIAGNOSTIC      │
    │ Add to  │          │ - Analyze fail  │
    │ CI      │          │ - Show root     │
    └─────────┘          │   cause         │
                        │ - Suggest fix    │
                        └─────────────────┘
```

---

## File Structure

### Generated Test Files

```
apps/api/tests/
├── contract/                          # NEW: Contract tests directory
│   ├── openapi/                       # Layer 1 tests
│   │   ├── test_organizations_schema.py
│   │   ├── test_vehicles_schema.py
│   │   └── test_products_schema.py
│   ├── integration/                   # Layer 2 tests
│   │   ├── test_vin_decode_contract.py
│   │   ├── test_oauth_callback_contract.py
│   │   └── test_bulk_upload_contract.py
│   └── schema_matching/               # Layer 3 tests
│       ├── test_vehicle_dto_matching.py
│       └── test_auth_dto_matching.py
├── conftest.py                        # EXISTING: Add contract fixtures
└── integration/                       # EXISTING: Current integration tests
```

### Skill Files

```
.skills/contract-testing/
├── SKILL.md                           # Main skill entry point
├── config.yaml                        # Configuration (exclusions, thresholds)
├── layers/
│   ├── layer1-openapi.md              # Layer 1 implementation guide
│   ├── layer2-integration.md          # Layer 2 implementation guide
│   └── layer3-schema.md               # Layer 3 implementation guide
├── adapters/
│   ├── fastapi-react.yaml             # FastAPI + React adapter config
│   └── express-vue.yaml               # Future adapter
└── templates/
    ├── integration_test.py.j2         # Layer 2 template
    └── openapi_test.py.j2             # Layer 1 template
```

---

## Implementation Plan

### Phase 1: Skill Framework + Layer 1 (OpenAPI)
**Duration**: 2-3 hours

**Tasks**:
1. Create `.skills/contract-testing/` directory structure
2. Implement `SKILL.md` with workflow logic
3. Create endpoint analyzer (detects characteristics)
4. Implement Layer 1 (OpenAPI validator)
5. Create OpenAPI test template
6. Test with simple CRUD endpoint (e.g., `/api/v1/organizations`)

**Deliverables**:
- Working skill that generates OpenAPI validation tests
- Test file: `tests/contract/openapi/test_organizations_schema.py`

### Phase 2: Layer 2 (Integration Test Generator)
**Duration**: 3-4 hours

**Tasks**:
1. Create integration test template (Jinja2)
2. Implement contract validation logic (format checks)
3. Add test data helpers (valid VINs, users, etc.)
4. Generate integration test for VIN decode
5. Run test, verify it fails (reproduces bug)
6. Fix bug (connect normalizer)
7. Verify test passes

**Deliverables**:
- Working Layer 2 implementation
- Test file: `tests/contract/integration/test_vin_decode_contract.py`
- Bug fix: Normalizer connected in `decode_vin.py`

### Phase 3: Layer 3 (Schema Matching)
**Duration**: 2-3 hours

**Tasks**:
1. Implement Pydantic field extractor
2. Implement TypeScript type parser
3. Create schema matching algorithm
4. Generate schema matching test
5. Run test, verify it detects drift

**Deliverables**:
- Working Layer 3 implementation
- Test file: `tests/contract/schema_matching/test_vehicle_dto_matching.py`

### Phase 4: Documentation & Memory
**Duration**: 30 minutes

**Tasks**:
1. Write skill documentation (SKILL.md)
2. Save implementation details to engram
3. Create usage examples
4. Update CLAUDE.md with skill reference

**Deliverables**:
- Complete skill documentation
- Engram memory: `contract-testing-skill-implementation-2026-04-03`

### Phase 5: CI Integration (Optional)
**Duration**: 1-2 hours

**Tasks**:
1. Add contract tests to CI pipeline
2. Configure test execution order (contract → unit → e2e)
3. Add contract test coverage reporting

**Deliverables**:
- CI workflow update
- Contract test coverage badge

---

## Configuration

### Skill Configuration (`config.yaml`)

```yaml
# Contract Testing Skill Configuration

exclusions:
  # Endpoints to exclude from auto-detection
  - /health
  - /metrics
  - /docs

thresholds:
  # Field count threshold for Layer 3 recommendation
  schema_matching_fields: 10

  # External API detection keywords
  external_api_keywords:
    - httpx
    - requests
    - aiohttp
    - nhtsa
    - facebook
    - google

  # Normalization detection keywords
  normalization_keywords:
    - normalize
    - transform
    - map
    - convert

layer_selection:
  # Priority order for layer selection
  priority:
    - integration  # Layer 2 (highest priority)
    - schema       # Layer 3
    - openapi      # Layer 1

test_data:
  # Known test data for endpoints
  vin_decode:
    valid_vins:
      - "2GNALBEK8H1615946"  # 2017 Buick Enclave
      - "1HGCM82633A004351"  # 2023 Honda Accord
      - "1F1F1500000010001"  # Invalid checksum (negative test)

  oauth:
    test_providers:
      - google
      - facebook
```

---

## Success Criteria

### Technical Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Bug detection time | < 10 minutes | Time from bug report to root cause identified |
| Test generation time | < 2 minutes | Time from invocation to test file created |
| Test execution time | < 5 minutes | Contract test suite execution time |
| Contract bug leakage | 0 in staging | No contract bugs reach staging environment |

### Qualitative Metrics

- Developers can invoke skill without reading documentation (intuitive)
- Generated tests are readable and maintainable
- Diagnostic messages are clear and actionable
- Skill adapts to different endpoint types (CRUD, external API, etc.)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test execution too slow | Medium | Layer 1 for fast feedback, Layer 2 for critical paths only |
| False positives (over-strict validation) | Medium | User confirmation before generating tests, easy exclusions |
| Template inflexibility | Low | Jinja2 templates allow customization |
| TypeScript parsing complexity | Medium | Start with manual type definition, add parser later |
| Maintenance burden | Low | Leverage existing test infrastructure, templates are reusable |

---

## Future Enhancements

1. **OpenAPI Code Generation**: Generate TypeScript types from OpenAPI spec
2. **Runtime Validation**: Add Zod/validation library to frontend for runtime checks
3. **Performance Testing**: Measure API response times in contract tests
4. **Backward Compatibility**: Detect breaking changes in API contracts
5. **Multi-Stack Support**: Add adapters for Express, Vue, Angular, etc.

---

## References

- FastAPI OpenAPI docs: https://fastapi.tiangolo.com/tutorial/openapi/
- Pydantic validation: https://docs.pydantic.dev/
- Contract testing patterns: https://martinfowler.com/bliki/ContractTest.html
- Pact (contract testing): https://docs.pact.io/

---

**Document Version**: 1.0
**Last Updated**: 2026-04-03
**Status**: Approved - Ready for Implementation
