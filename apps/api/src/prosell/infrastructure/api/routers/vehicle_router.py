"""Vehicle router."""

from typing import Annotated

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.vehicle import (
    CatalogResponseDTO,
    CreateVehicleRequest,
    DecodeVinRequest,
    DecodeVinResponse,
)
from prosell.application.ports.ivin_decoder_service import IVINDecoderService
from prosell.application.use_cases.vehicle.create_vehicle import CreateVehicleUseCase
from prosell.application.use_cases.vehicle.decode_vin import DecodeVinUseCase
from prosell.application.use_cases.vehicle.get_vehicle_catalog import GetVehicleCatalogUseCase
from prosell.domain.entities.user import User
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository
from prosell.infrastructure.api.dependencies import (
    get_async_session,
    get_current_auth_user,
)
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)
from prosell.infrastructure.repositories.publication_repository_impl import (
    SqlAlchemyPublicationRepository,
)
from prosell.infrastructure.repositories.vehicle_repository_impl import (
    SqlAlchemyVehicleRepository,
)
from prosell.infrastructure.services.nhtsa_vin_service import NHTSAVinService

router = APIRouter()


async def get_vehicle_repository(session: AsyncSession) -> AbstractVehicleRepository:
    """Get vehicle repository instance."""
    return SqlAlchemyVehicleRepository(session)


async def get_product_repository(session: AsyncSession) -> AbstractProductRepository:
    """Get product repository instance."""
    return SqlAlchemyProductRepository(session)


async def get_vin_service() -> IVINDecoderService:
    """Get VIN decoder service."""
    return NHTSAVinService()


async def get_publication_repository(session: AsyncSession) -> IPublicationRepository:
    """Get publication repository instance."""
    return SqlAlchemyPublicationRepository(session)


async def get_vehicle_catalog_use_case(
    vehicle_repo: AbstractVehicleRepository = Depends(get_vehicle_repository),
    publication_repo: IPublicationRepository = Depends(get_publication_repository),
) -> GetVehicleCatalogUseCase:
    """Get GetVehicleCatalogUseCase instance."""
    return GetVehicleCatalogUseCase(vehicle_repo, publication_repo)


@router.post("/decode-vin", response_model=DecodeVinResponse)
async def decode_vin(
    request: DecodeVinRequest,
    vin_service: IVINDecoderService = Depends(get_vin_service),
    db: AsyncSession = Depends(get_async_session),
) -> DecodeVinResponse:
    """
    Decode a VIN using NHTSA VPIC API.

    Returns vehicle information including make, model, year, trim, etc.
    Results are cached for 24 hours.
    """
    try:
        vehicle_repo = SqlAlchemyVehicleRepository(db)
        use_case = DecodeVinUseCase(vin_service, vehicle_repo)

        return await use_case.execute(request)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    request: CreateVehicleRequest,
    _current_user=Depends(get_current_auth_user),
    db: AsyncSession = Depends(get_async_session),
) -> dict:
    """
    Create a vehicle for a product.

    Links vehicle-specific data (VIN, make, model, etc.) to an existing product.
    """
    vehicle_repo = SqlAlchemyVehicleRepository(db)
    product_repo = SqlAlchemyProductRepository(db)
    use_case = CreateVehicleUseCase(vehicle_repo, product_repo)

    vehicle = await use_case.execute(request)

    return {
        "id": vehicle.id,
        "product_id": vehicle.product_id,
        "vin": vehicle.vin,
        "year": vehicle.year,
        "make": vehicle.make,
        "model": vehicle.model,
    }


@router.get("/vin/{vin}", response_model=dict)
async def get_vehicle_by_vin(
    vin: str,
    _current_user=Depends(get_current_auth_user),
    db: AsyncSession = Depends(get_async_session),
) -> dict:
    """Get vehicle information by VIN."""
    vehicle_repo = SqlAlchemyVehicleRepository(db)
    vehicle = await vehicle_repo.get_by_vin(vin.upper())

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    return {
        "id": vehicle.id,
        "product_id": vehicle.product_id,
        "vin": vehicle.vin,
        "year": vehicle.year,
        "make": vehicle.make,
        "model": vehicle.model,
        "trim": vehicle.trim,
        "body_type": vehicle.body_type,
        "drivetrain": vehicle.drivetrain,
        "transmission": vehicle.transmission,
    }


@router.get("/product/{product_id}", response_model=dict)
async def get_vehicle_by_product(
    product_id: UUID,
    _current_user=Depends(get_current_auth_user),
    db: AsyncSession = Depends(get_async_session),
) -> dict:
    """Get vehicle information by product ID."""
    vehicle_repo = SqlAlchemyVehicleRepository(db)
    vehicle = await vehicle_repo.get_by_product_id(product_id)

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    return {
        "id": vehicle.id,
        "product_id": vehicle.product_id,
        "vin": vehicle.vin,
        "year": vehicle.year,
        "make": vehicle.make,
        "model": vehicle.model,
        "trim": vehicle.trim,
        "mileage": vehicle.mileage,
        "exterior_color": vehicle.exterior_color,
        "interior_color": vehicle.interior_color,
    }


@router.get("", response_model=CatalogResponseDTO)
async def get_vehicle_catalog(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    cursor: str | None = None,
    current_user: Annotated[User, Depends(get_current_auth_user)] = None,  # type: ignore[assignment]  # noqa: E501
    use_case: GetVehicleCatalogUseCase = Depends(get_vehicle_catalog_use_case),
) -> CatalogResponseDTO:
    """
    Get vehicle catalog with role-based filtering.

    Role-based access:
    - Admin: sees all vehicles in tenant
    - Dealer: sees only vehicles from their organization
    - Seller/Manager: sees vehicles from assigned dealers

    Pagination:
    - limit: number of vehicles to return (1-100, default 50)
    - cursor: pagination token from previous response
    - Response includes next_cursor and has_more flag
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    return await use_case.execute(
        user=current_user,
        limit=limit,
        cursor=cursor,
    )
