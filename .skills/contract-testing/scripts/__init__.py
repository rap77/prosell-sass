"""Contract Testing Skill - Python Scripts Package.

This package contains the executable Python code for the contract-testing skill,
following Anthropic's skill structure standards where scripts live in the scripts/
directory.

Components:
- analyzer: Endpoint characterization and layer recommendation
- generator: Test generation from Jinja2 templates
- fixer: Iterative auto-repair agent (makes tests pass automatically)

Usage:
    from scripts import analyzer, generator, fixer

    recommendation = analyzer.analyze_endpoint("/api/v1/vehicles/decode-vin")
    test_path = generator.generate_test("/api/v1/vehicles/decode-vin", layer=2)
    result = fixer.fix_until_pass(test_path)
"""

__version__ = "1.0.0"

from scripts.analyzer import LayerRecommendation, analyze_endpoint
from scripts.generator import generate_test

__all__ = [
    "LayerRecommendation",
    "analyze_endpoint",
    "generate_test",
]
