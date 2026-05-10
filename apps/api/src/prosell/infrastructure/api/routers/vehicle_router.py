"""Vehicle router."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.services.nhtsa_normalizer import normalize_nhtsa_value
from prosell.infrastructure.services.nhtsa_vin_service import NHTSAVinService

router = APIRouter()

# Simple in-memory cache for VIN decode results (process-scoped, dev/test only)
_vin_cache: dict[str, tuple["DecodedVehicle", dict[str, Any]]] = {}  # vin → (vehicle, raw_data)


# Request/Response Models
class VINDecodeRequest(BaseModel):
    """VIN decode request."""

    vin: str = Field(..., min_length=17, max_length=17, description="17-character VIN")


class DecodedVehicle(BaseModel):
    """Decoded vehicle information."""

    year: int | None = Field(None, description="Model year")
    make: str | None = Field(None, description="Vehicle make (lowercase)")
    model: str | None = Field(None, description="Vehicle model (lowercase)")
    trim: str | None = Field(None, description="Trim level")
    body_type: str | None = Field(None, description="Body type (lowercase)")
    drivetrain: str | None = Field(None, description="Drivetrain (UPPERCASE)")
    transmission: str | None = Field(None, description="Transmission (lowercase)")
    fuel_type: str | None = Field(None, description="Fuel type (lowercase)")
    engine: str | None = Field(None, description="Engine description")


class VINDecodeResponse(BaseModel):
    """VIN decode response."""

    vin: str = Field(..., description="The decoded VIN")
    vehicle: DecodedVehicle = Field(..., description="Decoded vehicle information")
    cached: bool = Field(False, description="True if result was served from in-memory cache")
    raw_data: dict[str, Any] = Field(default_factory=dict, description="Raw NHTSA response data")


@router.get("", status_code=status.HTTP_200_OK)
async def list_vehicles(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
    skip: Annotated[int, Query(alias="offset", ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    search: Annotated[str | None, Query()] = None,
    make: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    """
    List vehicles (delegates to product catalog with auth).
    Returns vehicle products for the authenticated tenant.
    """
    from prosell.application.use_cases.product.list_products import ListProductsUseCase
    from prosell.infrastructure.repositories.product_repository_impl import SqlAlchemyProductRepository

    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )

    repo = SqlAlchemyProductRepository(db)
    use_case = ListProductsUseCase(repo)

    result = await use_case.execute(
        tenant_id=current_user.tenant_id,
        status=status_filter,
        search_query=search,
        skip=skip,
        limit=limit,
    )

    return {
        "items": [p.model_dump() for p in result.products],
        "total": result.total,
        "limit": limit,
        "offset": skip,
        "next_cursor": None,
        "has_more": False,
    }


@router.post("/decode-vin", response_model=VINDecodeResponse, status_code=status.HTTP_201_CREATED)
async def decode_vin(request: VINDecodeRequest) -> VINDecodeResponse:
    """
    Decode VIN using NHTSA VPIC API with Facebook Marketplace normalization.

    Normalization Rules:
    - make: lowercase (e.g., "chevrolet", "toyota")
    - body_type: lowercase (e.g., "suv", "sedan", "pickup")
    - drivetrain: UPPERCASE (e.g., "FWD", "AWD", "4WD")
    - transmission: lowercase (e.g., "automatic", "manual")
    - fuel_type: lowercase (e.g., "gasoline", "diesel", "electric")
    """
    vin_service = NHTSAVinService()

    # Check in-memory cache first
    vin_upper = request.vin.upper()
    if vin_upper in _vin_cache:
        cached_vehicle, cached_raw = _vin_cache[vin_upper]
        return VINDecodeResponse(vin=vin_upper, vehicle=cached_vehicle, cached=True, raw_data=cached_raw)

    # Validate VIN character set before calling NHTSA (I, O, Q not allowed)
    valid_chars = set("ABCDEFGHJKLMNPRSTUVWXYZ0123456789")
    invalid_chars = set(vin_upper) - valid_chars
    if invalid_chars:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid VIN characters: {', '.join(sorted(invalid_chars))}. VIN cannot contain I, O, or Q.",
        )

    try:
        # Decode VIN via NHTSA
        raw_data = await vin_service.decode_vin(request.vin)

        # Extract and normalize fields
        vehicle = DecodedVehicle(
            year=_parse_int(raw_data.get("Model Year")),
            make=normalize_nhtsa_value(raw_data.get("Make"), "make"),
            model=_normalize_model(raw_data.get("Model")),
            trim=raw_data.get("Trim"),
            body_type=normalize_nhtsa_value(raw_data.get("Body Class"), "body_type"),
            drivetrain=normalize_nhtsa_value(raw_data.get("Drive Type"), "drivetrain"),
            transmission=normalize_nhtsa_value(raw_data.get("Transmission Style"), "transmission"),
            fuel_type=normalize_nhtsa_value(raw_data.get("Fuel Type - Primary"), "fuel_type"),
            engine=raw_data.get("Engine"),
        )

        # Store in cache (vehicle + raw_data)
        _vin_cache[vin_upper] = (vehicle, raw_data)

        return VINDecodeResponse(vin=vin_upper, vehicle=vehicle, cached=False, raw_data=raw_data)

    except HTTPException:
        raise

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e

    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"VIN decode failed for {request.vin}: {e}")

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to decode VIN via NHTSA API",
        ) from e


def _parse_int(value: str | None) -> int | None:
    """Safely parse string to int."""
    if not value:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _normalize_model(model: str | None) -> str | None:
    """Normalize model name to lowercase."""
    if not model:
        return None
    return model.lower().strip()


# ============================================================================
# TESTING UTILITIES - These functions expose internal cache state for testing
# ============================================================================


def get_vin_cache_size_for_testing() -> int:
    """Get the current size of the VIN cache (TESTING ONLY).

    This function exposes internal cache state for integration testing.
    Do not use in production code.
    """
    return len(_vin_cache)


def get_vin_cache_entry_for_testing(vin: str) -> tuple[DecodedVehicle, dict[str, Any]] | None:
    """Get a specific entry from the VIN cache (TESTING ONLY).

    This function exposes internal cache state for integration testing.
    Do not use in production code.

    Args:
        vin: The VIN to look up (case-insensitive, will be uppercased)

    Returns:
        Tuple of (DecodedVehicle, raw_data) if found, None otherwise
    """
    return _vin_cache.get(vin.upper())


def clear_vin_cache_for_testing() -> None:
    """Clear all entries from the VIN cache (TESTING ONLY).

    This function clears the internal cache for testing isolation.
    Do not use in production code.
    """
    _vin_cache.clear()
