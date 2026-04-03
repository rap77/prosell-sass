"""Unit tests for contract testing skill analyzer."""

import importlib.util
from pathlib import Path

# Get project root and scripts path
project_root = Path(__file__).parent.parent.parent
scripts_path = project_root / ".skills" / "contract-testing" / "scripts"

# Import analyzer module from scripts/
spec = importlib.util.spec_from_file_location("analyzer", scripts_path / "analyzer.py")
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
        body_type=normalize_nhtsa_value(decoded["bodyType"], "body_type"),
    )
"""

    result = analyze_endpoint(
        endpoint_path="/api/v1/vehicles/decode-vin",
        source_code=source_code,
        project_root=project_root,
    )

    assert result.layer == 2
    assert "external" in result.reason.lower() or "normalization" in result.reason.lower()
    assert result.confidence in ["high", "medium", "low"]


def test_analyzer_recommends_layer1_for_simple_crud():
    """Simple CRUD endpoint should get Layer 1 recommendation."""
    source_code = """
@router.get("/organizations", response_model=OrganizationListResponse)
async def list_organizations():
    return OrganizationListResponse(organizations=[], total=0)
"""

    result = analyze_endpoint(
        endpoint_path="/api/v1/organizations",
        source_code=source_code,
        project_root=project_root,
    )

    assert result.layer == 1
    assert "openapi" in result.reason.lower() or "structure" in result.reason.lower()


def test_analyzer_recommends_layer3_for_large_schema():
    """Large schema endpoint should get Layer 3 recommendation."""
    # Schema with 12 fields
    source_code = """
class LargeDTO(BaseModel):
    field1: str
    field2: str
    field3: str
    field4: str
    field5: str
    field6: str
    field7: str
    field8: str
    field9: str
    field10: str
    field11: str
    field12: str

@router.get("/large", response_model=LargeDTO)
async def get_large():
    return LargeDTO(...)
"""

    result = analyze_endpoint(
        endpoint_path="/api/v1/large",
        source_code=source_code,
        project_root=project_root,
    )

    assert result.layer == 3
    assert "schema" in result.reason.lower() or "field" in result.reason.lower()


def test_analyzer_detects_critical_endpoints():
    """Critical endpoints like auth should get Layer 2."""
    source_code = """
@router.post("/login")
async def login(credentials: LoginRequest):
    # Authentication logic
    return Token(access_token="...")
"""

    result = analyze_endpoint(
        endpoint_path="/api/v1/auth/login",
        source_code=source_code,
        project_root=project_root,
    )

    # Critical endpoints get Layer 2
    assert result.layer == 2
