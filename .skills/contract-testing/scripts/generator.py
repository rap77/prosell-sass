"""Test Generator - Creates contract tests from templates.

This module reads endpoint metadata, selects the appropriate template,
and generates a pytest test file.
"""

from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

# Constants
TEMPLATES_DIR = Path(__file__).parent / "templates"
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


def generate_test(
    endpoint_path: str,
    layer: int,
    project_root: Path = PROJECT_ROOT,
) -> Path:
    """Generate a contract test from template.

    Args:
        endpoint_path: API endpoint path (e.g., "/api/v1/vehicles/decode-vin")
        layer: Validation layer (1=OpenAPI, 2=Integration, 3=Schema)
        project_root: Root directory of the project

    Returns:
        Path to the generated test file
    """
    # 1. Extract endpoint metadata
    metadata = extract_endpoint_metadata(endpoint_path, project_root)

    # 2. Select template
    template_name = f"layer{layer}_integration_test.py.j2"
    template_path = TEMPLATES_DIR / template_name

    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_path}")

    # 3. Render with Jinja2
    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))
    template = env.get_template(template_name)
    test_content = template.render(**metadata)

    # 4. Write to tests/contract/
    layer_name = get_layer_name(layer)
    endpoint_name = endpoint_path.strip("/").replace("/", "_").replace("-", "_")
    test_filename = f"test_{endpoint_name}_contract.py"
    test_path = project_root / "apps" / "api" / "tests" / "contract" / layer_name / test_filename

    # Create directory if needed
    test_path.parent.mkdir(parents=True, exist_ok=True)

    # Write test file
    test_path.write_text(test_content)

    return test_path


def extract_endpoint_metadata(endpoint_path: str, _project_root: Path) -> dict[str, Any]:
    """Extract metadata from endpoint for template rendering.

    Args:
        endpoint_path: API endpoint path
        _project_root: Project root directory (unused, for future expansion)

    Returns:
        Dictionary with endpoint metadata
    """
    # For now, return basic metadata
    # In production, this would parse the router file and extract:
    # - HTTP method
    # - DTO name
    # - Response model
    # - Required imports

    endpoint_name = endpoint_path.strip("/").split("/")[-1]

    return {
        "endpoint_path": endpoint_path,
        "endpoint_name": endpoint_name,
        "test_name": f"test_{endpoint_name}_contract",
        "year": 2026,
    }


def get_layer_name(layer: int) -> str:
    """Get directory name for layer."""
    layer_names = {
        1: "openapi",
        2: "integration",
        3: "schema_matching",
    }
    return layer_names.get(layer, "integration")
