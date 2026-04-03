"""Endpoint analyzer for contract testing skill."""

import re
from typing import Literal

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


def analyze_endpoint(router_path: str, source_code: str, config: dict) -> LayerRecommendation:
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
    has_external_api = _detect_external_api(
        source_code, config["thresholds"]["external_api_keywords"]
    )
    has_normalization = _detect_normalization(
        source_code, config["thresholds"]["normalization_keywords"]
    )
    is_critical = _is_critical_endpoint(router_path)
    field_count = _count_response_fields(source_code)

    # Layer selection logic (from spec)
    if has_external_api or has_normalization or is_critical:
        return LayerRecommendation(
            layer=2,
            reason="Integration test + contract validation recommended (external API, normalization, or business critical)",
            confidence="high",
        )
    elif field_count > config["thresholds"]["schema_matching_fields"]:
        return LayerRecommendation(
            layer=3,
            reason=f"Schema matching recommended ({field_count} fields, high drift risk)",
            confidence="medium",
        )
    else:
        return LayerRecommendation(
            layer=1,
            reason="OpenAPI validation sufficient (simple CRUD endpoint)",
            confidence="high",
        )


def _detect_external_api(source_code: str, keywords: list[str]) -> bool:
    """Detect if endpoint calls external APIs."""
    if not keywords:
        return False
    keyword_pattern = r"\b(" + "|".join(keywords) + r")\b"
    return bool(re.search(keyword_pattern, source_code, re.IGNORECASE))


def _detect_normalization(source_code: str, keywords: list[str]) -> bool:
    """Detect if endpoint performs data normalization."""
    if not keywords:
        return False
    keyword_pattern = r"\b(" + "|".join(keywords) + r")\b"
    return bool(re.search(keyword_pattern, source_code, re.IGNORECASE))


def _is_critical_endpoint(router_path: str) -> bool:
    """Check if endpoint is business-critical."""
    critical_paths = ["auth", "payment", "oauth", "login", "register"]
    return any(path in router_path.lower() for path in critical_paths)


def _count_response_fields(source_code: str) -> int:
    """Count fields in response model."""
    # Simplified approach: count field declarations in the source code
    # In production, this would parse the actual Pydantic model
    field_pattern = r"\b(\w+)\s*:\s*(str|int|float|bool|list|dict|List|Dict)"
    fields = re.findall(field_pattern, source_code)
    return len(fields)
