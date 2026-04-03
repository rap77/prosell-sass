"""Unit tests for endpoint analyzer."""

import importlib.util
from pathlib import Path

# Get project root and skills path
project_root = Path(__file__).parent.parent.parent
skills_path = project_root / ".skills" / "contract-testing"

# Import analyzer module directly
spec = importlib.util.spec_from_file_location("analyzer", skills_path / "analyzer.py")
analyzer_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analyzer_module)

analyze_endpoint = analyzer_module.analyze_endpoint
LayerRecommendation = analyzer_module.LayerRecommendation


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
        {
            "thresholds": {
                "external_api_keywords": ["nhtsa"],
                "normalization_keywords": ["normalize"],
                "schema_matching_fields": 10,
            }
        },
    )

    assert result.layer == 2
    assert "external API" in result.reason.lower() or "normalization" in result.reason.lower()
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
        {
            "thresholds": {
                "external_api_keywords": [],
                "normalization_keywords": [],
                "schema_matching_fields": 10,
            }
        },
    )

    # Should be Layer 1 since no external API, normalization, or critical path
    assert result.layer == 1
    assert "openapi" in result.reason.lower()


def test_analyzer_recommends_layer3_for_large_schema():
    """Endpoint with many fields should get Layer 3 recommendation."""
    # Create source code with 11+ field declarations to exceed threshold
    source_code = """
    class VehicleListResponse(BaseModel):
        field1: str
        field2: int
        field3: bool
        field4: str
        field5: str
        field6: int
        field7: str
        field8: str
        field9: bool
        field10: str
        field11: str
        field12: int
    """

    result = analyze_endpoint(
        "vehicle_router.py",
        source_code,
        {
            "thresholds": {
                "external_api_keywords": [],
                "normalization_keywords": [],
                "schema_matching_fields": 10,
            }
        },
    )

    assert result.layer == 3
    assert "schema matching" in result.reason.lower()
    assert result.confidence == "medium"


def test_analyzer_detects_critical_endpoints():
    """Auth/payment endpoints should get Layer 2 regardless of other factors."""
    source_code = """
    @router.post("/login", response_model=LoginResponse)
    async def login(credentials: LoginRequest):
        return {"token": "..."}
    """

    result = analyze_endpoint(
        "auth_router.py",
        source_code,
        {
            "thresholds": {
                "external_api_keywords": [],
                "normalization_keywords": [],
                "schema_matching_fields": 10,
            }
        },
    )

    assert result.layer == 2
    assert "critical" in result.reason.lower() or "business" in result.reason.lower()
