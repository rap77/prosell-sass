"""Vehicle router."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_spaces_service,
)
from prosell.infrastructure.api.routers.image_router import sign_image_urls
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
    """Decoded vehicle information (28 fields across 10 groups)."""

    # Group: basic
    year: int | None = Field(None, description="Model year")
    make: str | None = Field(None, description="Vehicle make (lowercase)")
    model: str | None = Field(None, description="Vehicle model (lowercase)")
    trim: str | None = Field(None, description="Trim level")

    # Group: engine
    engine: str | None = Field(None, description="Engine description")
    fuel_type: str | None = Field(None, description="Fuel type (lowercase)")
    cylinders: int | None = Field(None, description="Number of cylinders")
    displacement_l: float | None = Field(None, description="Engine displacement in liters")
    horsepower: int | None = Field(None, description="Engine horsepower")
    engine_kw: float | None = Field(None, description="Engine power in kW")
    turbo: bool | None = Field(None, description="Has turbocharger")
    transmission: str | None = Field(None, description="Transmission (lowercase)")

    # Group: dimensions
    body_type: str | None = Field(None, description="Body type (lowercase)")
    drivetrain: str | None = Field(None, description="Drivetrain (UPPERCASE)")
    doors: int | None = Field(None, description="Number of doors")
    windows: int | None = Field(None, description="Number of windows")
    wheelbase_type: str | None = Field(None, description="Wheelbase type (short/standard/long)")
    bed_type: str | None = Field(None, description="Bed type for pickups (short/standard/long)")
    cab_type: str | None = Field(None, description="Cab type for pickups (regular/extended/crew)")

    # Group: capacity
    seats: int | None = Field(None, description="Number of seats")
    seat_rows: int | None = Field(None, description="Number of seat rows")
    seatbelts: int | None = Field(None, description="Number of seatbelts")
    gvwr: int | None = Field(None, description="Gross Vehicle Weight Rating (lbs)")

    # Group: electric
    electrification_level: str | None = Field(None, description="Electrification level")
    battery_kwh: float | None = Field(None, description="Battery capacity in kWh")
    battery_type: str | None = Field(None, description="Battery chemistry type")
    charger_level: str | None = Field(None, description="Onboard charger level")
    charger_power_kw: float | None = Field(None, description="Charger power in kW")
    ev_drive_unit: str | None = Field(None, description="EV drive unit configuration")

    # Group: manufacturing
    manufacturer: str | None = Field(None, description="Manufacturer name")
    plant_city: str | None = Field(None, description="Manufacturing plant city")
    plant_state: str | None = Field(None, description="Manufacturing plant state")
    plant_country: str | None = Field(None, description="Manufacturing plant country")


class VINDecodeResponse(BaseModel):
    """VIN decode response."""

    vin: str = Field(..., description="The decoded VIN")
    vehicle: DecodedVehicle = Field(..., description="Decoded vehicle information")
    cached: bool = Field(False, description="True if result was served from in-memory cache")
    raw_data: dict[str, Any] = Field(default_factory=dict, description="Raw NHTSA response data")


class VehicleListItem(BaseModel):
    """Single vehicle in list response."""

    items: list[dict[str, Any]] = Field(..., description="List of vehicle products")
    total: int = Field(..., description="Total number of vehicles")
    limit: int = Field(..., description="Page size limit")
    offset: int = Field(..., description="Number of items skipped")
    next_cursor: None = Field(None, description="Cursor for next page (not implemented)")
    has_more: bool = Field(False, description="Whether more vehicles exist")


@router.get("", response_model=VehicleListItem, status_code=status.HTTP_200_OK)
async def list_vehicles(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
    spaces: Annotated[IDOSpacesService, Depends(get_spaces_service)],
    skip: Annotated[int, Query(alias="offset", ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    search: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    """
    List vehicles (delegates to product catalog with auth).
    Returns vehicle products for the authenticated tenant.
    """
    from prosell.application.use_cases.product.list_products import ListProductsUseCase
    from prosell.infrastructure.repositories.product_repository_impl import (
        SqlAlchemyProductRepository,
    )

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

    # Transform photo_url and image_urls[] to signed download URLs.
    # SECURITY: scope all signed URLs to the caller's tenant to prevent
    # cross-tenant data exposure via attacker-controlled image_urls.
    items = []
    for p in result.products:
        item = p.model_dump()
        if item.get("photo_url"):
            # Extract DO Spaces key from URL and scope to caller's tenant.
            # If the key is not under the caller's tenant prefix, drop the
            # photo_url entirely (fail-closed).
            photo_url = item["photo_url"]
            tenant_prefix = f"orgs/{current_user.tenant_id}/"
            try:
                key = photo_url.split(f"{spaces.bucket}/", 1)[1]
                if key.startswith(tenant_prefix):
                    item["photo_url"] = await spaces.generate_download_url(key)
                else:
                    item["photo_url"] = None
            except (IndexError, AttributeError):
                item["photo_url"] = None
        if item.get("image_urls"):
            item["image_urls"] = await sign_image_urls(
                item["image_urls"],
                spaces,
                tenant_id=current_user.tenant_id,
            )
        items.append(item)

    return {
        "items": items,
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
        return VINDecodeResponse(
            vin=vin_upper, vehicle=cached_vehicle, cached=True, raw_data=cached_raw
        )

    # Validate VIN character set before calling NHTSA (I, O, Q not allowed)
    valid_chars = set("ABCDEFGHJKLMNPRSTUVWXYZ0123456789")
    invalid_chars = set(vin_upper) - valid_chars
    if invalid_chars:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid VIN characters: {', '.join(sorted(invalid_chars))}. VIN cannot contain I, O, or Q.",  # noqa: E501
        )

    try:
        # Decode VIN via NHTSA
        raw_data = await vin_service.decode_vin(request.vin)

        # Extract and normalize fields (28 fields across 10 groups)
        vehicle = DecodedVehicle(
            # basic
            year=_parse_int(raw_data.get("Model Year")),
            make=normalize_nhtsa_value(raw_data.get("Make"), "make"),
            model=_normalize_model(raw_data.get("Model")),
            trim=raw_data.get("Trim"),
            # engine
            engine=raw_data.get("Engine"),
            fuel_type=normalize_nhtsa_value(raw_data.get("Fuel Type - Primary"), "fuel_type"),
            cylinders=_parse_int(raw_data.get("Engine Number of Cylinders")),
            displacement_l=_parse_float(raw_data.get("Displacement (L)")),
            horsepower=_parse_int(raw_data.get("Engine Brake (hp) From")),
            engine_kw=_parse_float(raw_data.get("Engine Power (kW)")),
            turbo=_parse_bool(raw_data.get("Turbo")),
            transmission=normalize_nhtsa_value(raw_data.get("Transmission Style"), "transmission"),
            # dimensions
            body_type=normalize_nhtsa_value(raw_data.get("Body Class"), "body_type"),
            drivetrain=normalize_nhtsa_value(raw_data.get("Drive Type"), "drivetrain"),
            doors=_parse_int(raw_data.get("Doors")),
            windows=_parse_int(raw_data.get("Windows")),
            wheelbase_type=normalize_nhtsa_value(raw_data.get("Wheel Base Type"), "wheelbase_type"),
            bed_type=normalize_nhtsa_value(raw_data.get("Bed Type"), "bed_type"),
            cab_type=normalize_nhtsa_value(raw_data.get("Cab Type"), "cab_type"),
            # capacity
            seats=_parse_int(raw_data.get("Number of Seats")),
            seat_rows=_parse_int(raw_data.get("Number of Seat Rows")),
            seatbelts=_parse_int(raw_data.get("Seat Belt Type")),
            gvwr=_parse_int(raw_data.get("Gross Vehicle Weight Rating From")),
            # electric
            electrification_level=normalize_nhtsa_value(
                raw_data.get("Electrification Level"), "electrification"
            ),
            battery_kwh=_parse_float(raw_data.get("Battery Energy (kWh) From")),
            battery_type=raw_data.get("Battery Type"),
            charger_level=raw_data.get("Charger Level"),
            charger_power_kw=_parse_float(raw_data.get("Charger Power (kW)")),
            ev_drive_unit=raw_data.get("Electric Drive Unit"),
            # manufacturing
            manufacturer=raw_data.get("Manufacturer Name"),
            plant_city=raw_data.get("Plant City"),
            plant_state=raw_data.get("Plant State"),
            plant_country=raw_data.get("Plant Country"),
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
        return int(float(value))  # Handle "8.0" → 8
    except (ValueError, TypeError):
        return None


def _parse_float(value: str | None) -> float | None:
    """Safely parse string to float."""
    if not value:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _parse_bool(value: str | None) -> bool | None:
    """Parse NHTSA boolean string to Python bool."""
    if not value:
        return None
    normalized = normalize_nhtsa_value(value, "boolean")
    return normalized == "true" if normalized else None


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
