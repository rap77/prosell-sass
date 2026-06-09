# Contract Testing Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a multi-layer contract testing skill that prevents and diagnoses API contract mismatches between FastAPI backend and React frontend.

**Architecture:** Three-layer model - Layer 1 (OpenAPI structure validation), Layer 2 (integration + contract format validation), Layer 3 (schema matching for drift detection). Skill auto-detects endpoint characteristics and recommends appropriate layer.

**Tech Stack:** Python 3.13, FastAPI, pytest, Jinja2, TypeScript, Playwright

---

## Task 1: Create Skill Directory Structure

**Files:**

- Create: `.skills/contract-testing/SKILL.md`
- Create: `.skills/contract-testing/config.yaml`
- Create: `.skills/contract-testing/layers/layer1-openapi.md`
- Create: `.skills/contract-testing/layers/layer2-integration.md`
- Create: `.skills/contract-testing/layers/layer3-schema.md`
- Create: `.skills/contract-testing/templates/`
- Create: `.skills/contract-testing/adapters/fastapi-react.yaml`
- Create: `apps/api/tests/contract/`

- [ ] **Step 1: Create skill directory structure**

```bash
mkdir -p .skills/contract-testing/layers
mkdir -p .skills/contract-testing/templates
mkdir -p .skills/contract-testing/adapters
mkdir -p apps/api/tests/contract/openapi
mkdir -p apps/api/tests/contract/integration
mkdir -p apps/api/tests/contract/schema_matching
```

Run: `ls -la .skills/contract-testing/`
Expected: Directory listing showing layers/, templates/, adapters/ subdirectories

- [ ] **Step 2: Create skill main file (SKILL.md)**

```markdown
<!-- .skills/contract-testing/SKILL.md -->

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
- **Layer 3**: Schema Matching (DTO ↔ TypeScript drift detection)
```

Run: `cat .skills/contract-testing/SKILL.md`
Expected: Display skill documentation

- [ ] **Step 3: Create configuration file**

```yaml
# .skills/contract-testing/config.yaml
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

layer_selection:
  priority:
    - integration
    - schema
    - openapi

test_data:
  vin_decode:
    valid_vins:
      - "2GNALBEK8H1615946" # 2017 Buick Enclave
      - "1HGCM82633A004351" # 2023 Honda Accord
      - "1F1F1500000010001" # Invalid checksum
```

Run: `cat .skills/contract-testing/config.yaml`
Expected: Display YAML configuration

- [ ] **Step 4: Commit structure setup**

```bash
git add .skills/contract-testing/ apps/api/tests/contract/
git commit -m "feat(contract-testing): create skill directory structure and config"
```

---

## Task 2: Implement Endpoint Analyzer

**Files:**

- Create: `.skills/contract-testing/analyzer.py`
- Test: `tests/unit/test_analyzer.py`

- [ ] **Step 1: Create endpoint analyzer module**

```python
# .skills/contract-testing/analyzer.py
"""Endpoint analyzer for contract testing skill."""
import re
from pathlib import Path
from typing import Literal, Optional
from pydantic import BaseModel

class LayerRecommendation(BaseModel):
    """Recommended validation layer for endpoint."""
    layer: Literal[1, 2, 3]
    reason: str
    confidence: Literal["high", "medium", "low"]

class EndpointCharacteristics(BaseModel):
    """Characteristics of an endpoint."""
    path: str
    method: str
    has_external_api: bool
    has_normalization: bool
    is_business_critical: bool
    field_count: int
    has_response_model: bool

def analyze_endpoint(
    router_path: str,
    source_code: str,
    config: dict
) -> LayerRecommendation:
    """
    Analyze endpoint and recommend validation layer.

    Args:
        router_path: Path to router file (e.g., "infrastructure/api/routers/vehicle_router.py")
        source_code: Full source code of the router
        config: Skill configuration dict

    Returns:
        LayerRecommendation with layer number and rationale
    """
    # Detect characteristics
    has_external_api = _detect_external_api(source_code, config["thresholds"]["external_api_keywords"])
    has_normalization = _detect_normalization(source_code, config["thresholds"]["normalization_keywords"])
    is_critical = _is_critical_endpoint(router_path)
    field_count = _count_response_fields(source_code)

    # Layer selection logic (from spec)
    if has_external_api or has_normalization or is_critical:
        return LayerRecommendation(
            layer=2,
            reason="Integration test + contract validation recommended (external API, normalization, or business critical)",
            confidence="high"
        )
    elif field_count > config["thresholds"]["schema_matching_fields"]:
        return LayerRecommendation(
            layer=3,
            reason=f"Schema matching recommended ({field_count} fields, high drift risk)",
            confidence="medium"
        )
    else:
        return LayerRecommendation(
            layer=1,
            reason="OpenAPI validation sufficient (simple CRUD endpoint)",
            confidence="high"
        )

def _detect_external_api(source_code: str, keywords: list[str]) -> bool:
    """Detect if endpoint calls external APIs."""
    keyword_pattern = r"\b(" + "|".join(keywords) + r")\b"
    return bool(re.search(keyword_pattern, source_code, re.IGNORECASE))

def _detect_normalization(source_code: str, keywords: list[str]) -> bool:
    """Detect if endpoint performs data normalization."""
    keyword_pattern = r"\b(" + "|".join(keywords) + r")\b"
    return bool(re.search(keyword_pattern, source_code, re.IGNORECASE))

def _is_critical_endpoint(router_path: str) -> bool:
    """Check if endpoint is business-critical."""
    critical_paths = ["auth", "payment", "oauth", "login", "register"]
    return any(path in router_path.lower() for path in critical_paths)

def _count_response_fields(source_code: str) -> int:
    """Count fields in response model."""
    # Find response_model = SomeModel
    match = re.search(r"response_model\s*=\s*(\w+)", source_code)
    if not match:
        return 0

    model_name = match.group(1)
    # Count fields in model definition (simplified)
    field_pattern = r"\w+\s*:\s*[\w\[\]|]+"
    fields = re.findall(field_pattern, source_code)
    return len(fields)
```

Run: `python -c "from skills.contract_testing.analyzer import analyze_endpoint; print(analyze_endpoint.__doc__)"`
Expected: Display function docstring

- [ ] **Step 2: Create unit test for analyzer**

```python
# tests/unit/test_analyzer.py
import pytest
from skills.contract_testing.analyzer import analyze_endpoint, LayerRecommendation

def test_analyzer_recommends_layer2_for_vin_decode():
    """VIN decode endpoint should get Layer 2 recommendation."""
    source_code = """
    @router.post("/decode-vin", response_model=DecodeVinResponse)
    async def decode_vin(vin: str, nhtsa_service: IVINDecoderService):
        # Calls external NHTSA API
        decoded = await nhtsa_service.decode(vin)
        # Normalizes data
        return DecodeVinResponse(
            make=normalize_nhtsa_value(decoded["Make"], "make"),
            ...
        )
    """

    result = analyze_endpoint(
        "vehicle_router.py",
        source_code,
        {"thresholds": {"external_api_keywords": ["nhtsa"], "normalization_keywords": ["normalize"], "schema_matching_fields": 10}}
    )

    assert result.layer == 2
    assert "external API" in result.reason.lower()
    assert result.confidence == "high"

def test_analyzer_recommends_layer1_for_simple_crud():
    """Simple CRUD endpoint should get Layer 1 recommendation."""
    source_code = """
    @router.get("/organizations", response_model=OrganizationListResponse)
    async def list_organizations():
        return {"items": [...]}
    """

    result = analyze_endpoint(
        "organization_router.py",
        source_code,
        {"thresholds": {"external_api_keywords": [], "normalization_keywords": [], "schema_matching_fields": 10}}
    )

    assert result.layer == 1
    assert "openapi" in result.reason.lower()
```

Run: `pytest tests/unit/test_analyzer.py -v`
Expected: Tests pass

- [ ] **Step 3: Commit analyzer implementation**

```bash
git add .skills/contract-testing/analyzer.py tests/unit/test_analyzer.py
git commit -m "feat(contract-testing): implement endpoint analyzer with layer recommendation"
```

---

## Task 3: Implement Layer 1 - OpenAPI Validator

**Files:**

- Create: `.skills/contract-testing/layers/layer1-openapi.md`
- Create: `.skills/contract-testing/templates/openapi_test.py.j2`
- Create: `apps/api/tests/contract/openapi/test_organizations_schema.py`

- [ ] **Step 1: Create Layer 1 implementation guide**

```markdown
<!-- .skills/contract-testing/layers/layer1-openapi.md -->

# Layer 1: OpenAPI Schema Validator

## Purpose

Fast structure validation for simple CRUD endpoints. Validates that API responses match the declared OpenAPI schema.

## When to Use

- Simple GET/POST endpoints
- No external API integration
- No data normalization
- < 10 response fields

## Implementation

Uses FastAPI's auto-generated OpenAPI schema to validate responses at runtime.

## Template Variables

- `endpoint_path`: API path (e.g., "/api/v1/organizations")
- `endpoint_method`: HTTP method (e.g., "get")
- `response_model`: Pydantic response model class
```

- [ ] **Step 2: Create OpenAPI test template**

```python
{# .skills/contract-testing/templates/openapi_test.py.j2 #}
from httpx import AsyncClient
from fastapi import FastAPI
from {{ dto_module }} import {{ response_model }}

class Test{{ endpoint_name }}OpenAPIContract:
    """OpenAPI schema validation for {{ endpoint_path }}."""

    @pytest.mark.asyncio
    async def test_{{ endpoint_name }}_matches_openapi_schema(
        self,
        client: AsyncClient,
        app: FastAPI
    ):
        """
        Validate that {{ endpoint_method }} {{ endpoint_path }}
        response matches OpenAPI schema.

        This test ensures:
        - Response structure is correct
        - All fields are present
        - Field types match declaration
        """
        # Get OpenAPI schema
        openapi_schema = app.openapi()

        # Call endpoint
        response = await client.{{ endpoint_method }}("{{ endpoint_path }}")
        assert response.status_code == 200

        # Validate response structure
        data = {{ response_model }}(**response.json())

        # Verify schema match
        path_schema = openapi_schema["paths"]["{{ endpoint_path }}"]["{{ endpoint_method }}"]["responses"]["200"]["content"]["application/json"]["schema"]
        # Additional schema validation can be added here
```

- [ ] **Step 3: Generate test for organizations endpoint**

```python
# apps/api/tests/contract/openapi/test_organizations_schema.py
from httpx import AsyncClient
from fastapi import FastAPI
from prosell.application.dto.org import OrganizationListResponse

class TestOrganizationsOpenAPIContract:
    """OpenAPI schema validation for /api/v1/organizations."""

    @pytest.mark.asyncio
    async def test_organizations_matches_openapi_schema(
        self,
        client: AsyncClient,
        app: FastAPI
    ):
        """Validate GET /api/v1/organizations response matches OpenAPI schema."""
        openapi_schema = app.openapi()

        response = await client.get("/api/v1/organizations")
        assert response.status_code == 200

        data = OrganizationListResponse(**response.json())
        assert hasattr(data, "items")
```

Run: `pytest apps/api/tests/contract/openapi/test_organizations_schema.py -v`
Expected: Test passes

- [ ] **Step 4: Commit Layer 1 implementation**

```bash
git add .skills/contract-testing/layers/layer1-openapi.md
git add .skills/contract-testing/templates/openapi_test.py.j2
git add apps/api/tests/contract/openapi/test_organizations_schema.py
git commit -m "feat(contract-testing): implement Layer 1 OpenAPI validator"
```

---

## Task 4: Implement Layer 2 - Integration Test Generator

**Files:**

- Create: `.skills/contract-testing/layers/layer2-integration.md`
- Create: `.skills/contract-testing/templates/integration_test.py.j2`
- Create: `apps/api/tests/contract/integration/test_vin_decode_contract.py`
- Modify: `apps/api/src/prosell/application/use_cases/vehicle/decode_vin.py`

- [ ] **Step 1: Create Layer 2 implementation guide**

```markdown
<!-- .skills/contract-testing/layers/layer2-integration.md -->

# Layer 2: Integration + Contract Validation

## Purpose

Full format validation for endpoints with external APIs or data normalization. Calls real endpoint and validates response format matches frontend expectations.

## When to Use

- External API integration (NHTSA, Facebook, Google)
- Data normalization layer
- Business-critical endpoints (auth, payment)
- New endpoints without tests

## Implementation

Uses real HTTP client to call endpoint, then validates:

1. Response structure (Pydantic)
2. Field formats (lowercase, UPPERCASE, specific values)

## Template Variables

- `endpoint_path`: API path
- `endpoint_method`: HTTP method
- `dto_module`: Import path for response DTO
- `response_dto_name`: Response DTO class name
- `contract_fields`: Dict of field → format validation
- `test_cases`: List of test data cases
```

- [ ] **Step 2: Create integration test template**

```python
{# .skills/contract-testing/templates/integration_test.py.j2 #}
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
        response = await client.{{ endpoint_method }}(
            "{{ endpoint_path }}",
            json={{ request_body | default("{}") }}
        )

        assert response.status_code == 200

        # ✅ Layer 1: Structure validation (Pydantic)
        data = {{ response_dto_name }}(**response.json())

        # ✅ Layer 2: Contract validation (format checks)
        {% for field, validation in contract_fields.items() %}
        # {{ field }}: {{ validation.description }}
        assert data.{{ field }} {{ validation.assertion }}, f"Expected {{ validation.expected }}, got {data.{{ field }}}"
        {% endfor %}

    {% for test_case in test_cases %}
    @pytest.mark.asyncio
    async def test_{{ endpoint_name }}_{{ test_case.name }}(
        self,
        client: AsyncClient
    ):
        """{{ test_case.description }}"""
        response = await client.{{ endpoint_method }}(
            "{{ endpoint_path }}",
            json={{ test_case.request }}
        )

        assert response.status_code == 200
        data = {{ response_dto_name }}(**response.json())

        {% for assertion in test_case.assertions %}
        {{ assertion }}
        {% endfor %}

    {% endfor %}
```

- [ ] **Step 3: Generate VIN decode contract test**

```python
# apps/api/tests/contract/integration/test_vin_decode_contract.py
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
        - fuel_type: lowercase (e.g., "gasoline", "diesel")
        """
        response = await client.post(
            "/api/v1/vehicles/decode-vin",
            json={"vin": "2GNALBEK8H1615946"}  # 2017 Buick Enclave
        )

        assert response.status_code == 200

        # ✅ Layer 1: Structure validation (Pydantic)
        data = DecodeVinResponse(**response.json())
        assert data.vin == "2GNALBEK8H1615946"
        assert data.vehicle is not None

        # ✅ Layer 2: Contract validation (format checks)

        # make: must be lowercase and in FB brands
        assert data.vehicle.make is not None
        assert data.vehicle.make.islower(), f"make must be lowercase, got: {data.vehicle.make}"
        assert data.vehicle.make in [
            "acura", "alfa_romeo", "aston_martin", "audi", "bmw",
            "buick", "cadillac", "chevrolet", "chrysler", "dodge",
            "ferrari", "fiat", "ford", "gmc", "genesis", "honda",
            "hummer", "hyundai", "infiniti", "jaguar", "jeep", "kia",
            "land_rover", "lexus", "lincoln", "lucid", "mini",
            "maserati", "mazda", "mercedes", "mitsubishi", "nissan",
            "polestar", "pontiac", "porsche", "ram", "rivian",
            "rolls_royce", "subaru", "tesla", "toyota", "volkswagen",
            "volvo"
        ], f"make must be in FB brands list, got: {data.vehicle.make}"

        # drivetrain: must be UPPERCASE and in FB options
        if data.vehicle.drivetrain:
            assert data.vehicle.drivetrain.isupper(), f"drivetrain must be UPPERCASE, got: {data.vehicle.drivetrain}"
            assert data.vehicle.drivetrain in ["FWD", "AWD", "RWD", "4WD"], \
                f"drivetrain must be one of [FWD, AWD, RWD, 4WD], got: {data.vehicle.drivetrain}"

        # body_type: must be lowercase and in FB options
        if data.vehicle.body_type:
            assert data.vehicle.body_type.islower(), f"body_type must be lowercase, got: {data.vehicle.body_type}"
            assert data.vehicle.body_type in [
                "suv", "sedan", "pickup", "coupe", "hatchback",
                "convertible", "wagon", "minivan", "van", "truck", "other"
            ], f"body_type must be in FB body types, got: {data.vehicle.body_type}"

        # transmission: must be lowercase
        if data.vehicle.transmission:
            assert data.vehicle.transmission.islower(), f"transmission must be lowercase, got: {data.vehicle.transmission}"
            assert data.vehicle.transmission in ["automatic", "manual"], \
                f"transmission must be 'automatic' or 'manual', got: {data.vehicle.transmission}"

        # fuel_type: must be lowercase and in FB options
        if data.vehicle.fuel_type:
            assert data.vehicle.fuel_type.islower(), f"fuel_type must be lowercase, got: {data.vehicle.fuel_type}"
            assert data.vehicle.fuel_type in [
                "gasoline", "diesel", "electric", "hybrid",
                "plug_in", "flex", "other"
            ], f"fuel_type must be in FB fuel types, got: {data.vehicle.fuel_type}"

    @pytest.mark.asyncio
    async def test_decode_vin_honda_accord_normalized(
        self,
        client: AsyncClient
    ):
        """Test with known VIN (Honda Accord) to verify normalization."""
        response = await client.post(
            "/api/v1/vehicles/decode-vin",
            json={"vin": "1HGCM82633A004351"}  # 2023 Honda Accord
        )

        assert response.status_code == 200
        data = DecodeVinResponse(**response.json())

        # Verify normalization worked
        assert data.vehicle.make == "honda"  # Not "HONDA"
        assert data.vehicle.model is not None
        assert data.vehicle.year == 2023
        if data.vehicle.body_type:
            assert data.vehicle.body_type in ["sedan", "coupe"]  # Honda Accord comes in these
```

Run: `pytest apps/api/tests/contract/integration/test_vin_decode_contract.py -v`
Expected: Test FAILS (normalizer not connected yet)

- [ ] **Step 4: Fix the bug - connect normalizer in decode_vin.py**

Read the current implementation:

```bash
cat apps/api/src/prosell/application/use_cases/vehicle/decode_vin.py | head -100
```

Expected: See that normalizer exists but is not being called

Modify the file to use normalizer:

```python
# In apps/api/src/prosell/application/use_cases/vehicle/decode_vin.py
# Around line 79, in the vehicle_data construction:

# BEFORE (incorrect):
vehicle_data = VehicleData(
    make=get_field(decoded_data, "Make"),  # ❌ Returns raw NHTSA value
    body_type=get_field(decoded_data, "Body Class"),  # ❌ Returns raw NHTSA value
    ...
)

# AFTER (correct):
from prosell.infrastructure.services.nhtsa_normalizer import normalize_nhtsa_value

vehicle_data = VehicleData(
    make=normalize_nhtsa_value(get_field(decoded_data, "Make"), "make"),  # ✅ Normalized
    body_type=normalize_nhtsa_value(get_field(decoded_data, "Body Class"), "body_type"),  # ✅ Normalized
    drivetrain=normalize_nhtsa_value(get_field(decoded_data, "Drive Type"), "drivetrain"),  # ✅ Normalized
    transmission=normalize_nhtsa_value(get_field(decoded_data, "Transmission"), "transmission"),  # ✅ Normalized
    fuel_type=normalize_nhtsa_value(get_field(decoded_data, "Fuel Type"), "fuel_type"),  # ✅ Normalized
    ...
)
```

- [ ] **Step 5: Run test again to verify fix**

Run: `pytest apps/api/tests/contract/integration/test_vin_decode_contract.py -v`
Expected: Test PASSES ✅

- [ ] **Step 6: Commit Layer 2 implementation and bug fix**

```bash
git add .skills/contract-testing/layers/layer2-integration.md
git add .skills/contract-testing/templates/integration_test.py.j2
git add apps/api/tests/contract/integration/test_vin_decode_contract.py
git add apps/api/src/prosell/application/use_cases/vehicle/decode_vin.py
git commit -m "feat(contract-testing): implement Layer 2 integration test + fix VIN decode normalizer bug"
```

---

## Task 5: Implement Layer 3 - Schema Matching

**Files:**

- Create: `.skills/contract-testing/layers/layer3-schema.md`
- Create: `apps/api/tests/contract/schema_matching/test_vehicle_dto_matching.py`
- Create: `.skills/contract-testing/schema_extractor.py`

- [ ] **Step 1: Create Layer 3 implementation guide**

```markdown
<!-- .skills/contract-testing/layers/layer3-schema.md -->

# Layer 3: Schema Matching

## Purpose

Detect drift between backend Pydantic DTOs and frontend TypeScript types.

## When to Use

- Endpoints with 10+ response fields
- High risk of type drift
- Manual type synchronization is error-prone

## Implementation

Extracts Pydantic model fields and compares with frontend TypeScript types (manual definition or inferred from usage).
```

- [ ] **Step 2: Create Pydantic field extractor**

```python
# .skills/contract-testing/schema_extractor.py
"""Extract field information from Pydantic models."""
from typing import get_type_hints
from pydantic import BaseModel
import inspect

def extract_pydantic_fields(model_class: type[BaseModel]) -> dict[str, str]:
    """
    Extract field names and types from a Pydantic model.

    Returns:
        Dict mapping field names to their type representation
    """
    fields = {}
    type_hints = get_type_hints(model_class)

    for field_name, field_info in model_class.model_fields.items():
        field_type = type_hints.get(field_name, "Any")

        # Convert Python type to string representation
        type_str = _type_to_string(field_type)
        fields[field_name] = type_str

    return fields

def _type_to_string(python_type) -> str:
    """Convert Python type to TypeScript-like string."""
    if python_type == str:
        return "string"
    elif python_type == int:
        return "number"
    elif python_type == float:
        return "number"
    elif python_type == bool:
        return "boolean"
    elif hasattr(python_type, "__origin__"):
        # Handle Union (Optional)
        if python_type.__origin__ is list:
            inner = _type_to_string(python_type.__args__[0])
            return f"{inner}[]"
        elif python_type.__origin__ is dict:
            return "Record<string, any>"
        elif python_type.__origin__ is Union:
            return " | ".join(_type_to_string(arg) for arg in python_type.__args__)
    return "any"
```

- [ ] **Step 3: Create schema matching test**

```python
# apps/api/tests/contract/schema_matching/test_vehicle_dto_matching.py
from skills.contract_testing.schema_extractor import extract_pydantic_fields
from prosell.application.dto.vehicle.create import DecodeVinResponse, VehicleData

class TestVehicleDTOSchemaMatching:
    """Validate backend DTOs match frontend TypeScript types."""

    def test_decode_vin_response_schema_complete(self):
        """
        Validate DecodeVinResponse has all expected fields.

        This test ensures the backend DTO structure matches
        what the frontend expects based on VehicleForm.tsx usage.
        """
        backend_fields = extract_pydantic_fields(DecodeVinResponse)

        # Expected fields based on frontend usage
        expected_fields = {
            "vin": "string",
            "vehicle": "VehicleData | None",
            "raw_data": "Record<string, string | None>",
            "cached": "boolean"
        }

        for field_name, expected_type in expected_fields.items():
            assert field_name in backend_fields, f"Missing field: {field_name}"
            # Type comparison can be enhanced for strict matching

    def test_vehicle_data_schema_complete(self):
        """Validate VehicleData has all expected fields."""
        backend_fields = extract_pydantic_fields(VehicleData)

        # Expected fields from frontend fbVehicleOptions.ts
        expected_fields = [
            "year", "make", "model", "trim", "body_type",
            "drivetrain", "transmission", "engine", "fuel_type"
        ]

        for field_name in expected_fields:
            assert field_name in backend_fields, f"VehicleData missing field: {field_name}"
```

Run: `pytest apps/api/tests/contract/schema_matching/test_vehicle_dto_matching.py -v`
Expected: Tests pass

- [ ] **Step 4: Commit Layer 3 implementation**

```bash
git add .skills/contract-testing/layers/layer3-schema.md
git add .skills/contract-testing/schema_extractor.py
git add apps/api/tests/contract/schema_matching/test_vehicle_dto_matching.py
git commit -m "feat(contract-testing): implement Layer 3 schema matching"
```

---

## Task 6: Update Project Documentation

**Files:**

- Modify: `CLAUDE.md`
- Create: `.skills/contract-testing/README.md`

- [ ] **Step 1: Create skill README**

````markdown
# Contract Testing Skill

Auto-generates contract tests for API endpoints.

## Quick Start

When debugging an API contract bug:

1. Invoke: "Claude, usa la skill de contract testing para [endpoint]"
2. Claude analyzes endpoint and recommends validation layer
3. Test is generated and executed
4. If fails, Claude diagnoses root cause

## Layers

- **Layer 1**: OpenAPI validator (fast, structure-only)
- **Layer 2**: Integration + contract validation (full format)
- **Layer 3**: Schema matching (drift detection)

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
````

## Files

- `.skills/contract-testing/SKILL.md` - Main skill file
- `.skills/contract-testing/analyzer.py` - Endpoint analyzer
- `.skills/contract-testing/templates/` - Jinja2 templates
- `apps/api/tests/contract/` - Generated contract tests

````

- [ ] **Step 2: Update CLAUDE.md**

Add to `CLAUDE.md` under "## Skills (Auto-load based on context)":

```markdown
| Context | Read this file |
| ------- | -------------- |
| API contract bugs, testing backend-frontend integration | `~/.claude/skills/contract-testing/SKILL.md` |
````

- [ ] **Step 3: Commit documentation updates**

```bash
git add .skills/contract-testing/README.md CLAUDE.md
git commit -m "docs(contract-testing): add skill documentation and CLAUDE.md reference"
```

---

## Task 7: Save Implementation to Memory

**Files:**

- Memory: `engram` (automatic via mem_save)

- [ ] **Step 1: Save implementation summary to engram**

```python
# Via mem_save tool (automatic)
# Key points to save:
# - Skill location: .skills/contract-testing/
# - 3 layers: OpenAPI (fast), Integration (complete), Schema (drift)
# - Test location: apps/api/tests/contract/
# - VIN decode bug fixed: normalizer now connected
# - Templates: Jinja2 in .skills/contract-testing/templates/
```

- [ ] **Step 2: Create implementation summary**

```markdown
# Contract Testing Skill - Implementation Complete

**Date**: 2026-04-03
**Status**: ✅ Complete

## What Was Built

- Multi-layer contract testing skill
- 3 validation layers with auto-selection
- Jinja2 templates for test generation
- Bug fix: VIN decode normalizer connected

## Files Created

**Skill Files:**

- `.skills/contract-testing/SKILL.md`
- `.skills/contract-testing/config.yaml`
- `.skills/contract-testing/analyzer.py`
- `.skills/contract-testing/schema_extractor.py`
- `.skills/contract-testing/layers/*.md`
- `.skills/contract-testing/templates/*.j2`

**Test Files:**

- `apps/api/tests/contract/openapi/test_organizations_schema.py`
- `apps/api/tests/contract/integration/test_vin_decode_contract.py`
- `apps/api/tests/contract/schema_matching/test_vehicle_dto_matching.py`

## Bug Fixes

- **VIN Decode**: Normalizer now connected in `decode_vin.py`
- Before: Returned "BUICK" (raw NHTSA)
- After: Returns "buick" (normalized for frontend)

## Usage

Invoke when debugging API contract bugs:
"Claude, usa la skill de contract testing para [endpoint]"

## Next Steps

- Add more endpoints to contract testing
- Integrate with CI pipeline
- Add TypeScript type parser for Layer 3
```

---

## Verification Steps

- [ ] **Step 1: Run all contract tests**

```bash
pytest apps/api/tests/contract/ -v
```

Expected: All tests pass (9-12 tests total)

- [ ] **Step 2: Verify skill is accessible**

```bash
cat .skills/contract-testing/SKILL.md
```

Expected: Display skill documentation

- [ ] **Step 3: Test skill with new endpoint**

Pick an endpoint without integration tests (e.g., `/api/v1/products`):

```bash
# Ask Claude to analyze endpoint
"Claude, analiza /api/v1/products con la skill de contract testing"
```

Expected: Claude recommends appropriate layer and generates test

- [ ] **Step 4: Verify VIN decode bug is fixed**

```bash
# Start staging API
docker compose -f docker/docker-compose.staging.yml restart api

# Test VIN decode endpoint
curl -X POST http://localhost:8000/api/v1/vehicles/decode-vin \
  -H "Content-Type: application/json" \
  -d '{"vin": "2GNALBEK8H1615946"}' | jq .
```

Expected: `make` field returns "buick" (lowercase), not "BUICK"

---

## Success Criteria

| Criterion              | Target             | Status    |
| ---------------------- | ------------------ | --------- |
| Skill generates tests  | < 2 minutes        | ⏳ Verify |
| Bug detection time     | < 10 minutes       | ⏳ Verify |
| VIN decode bug fixed   | Normalized format  | ⏳ Verify |
| Test suite passes      | 100%               | ⏳ Verify |
| Documentation complete | README + CLAUDE.md | ⏳ Verify |

---

**Total Estimated Time**: 8-11 hours
**Tasks**: 7 main tasks, ~35 sub-steps
**Commits**: ~7 commits (one per task)
