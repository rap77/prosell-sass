"""Vehicle router."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.vehicle import (
    CatalogResponseDTO,
    CreateVehicleRequest,
    DecodeVinRequest,
    DecodeVinResponse,
)
from prosell.application.dto.vehicle.bulk_upload import BulkUploadResponse
from prosell.application.dto.vehicle.catalog import FilterParams
from prosell.application.ports.ivin_decoder_service import IVINDecoderService
from prosell.application.use_cases.vehicle.bulk_upload_vehicles import BulkUploadVehiclesUseCase
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
from prosell.infrastructure.api.main import limiter
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

# Constants for bulk upload limits
MAX_CSV_SIZE = 10 * 1024 * 1024  # 10MB
MAX_CSV_ROWS = 1000


async def get_vehicle_repository(session=Depends(get_async_session)) -> AbstractVehicleRepository:
    """Get vehicle repository instance."""
    return SqlAlchemyVehicleRepository(session)


async def get_product_repository(session=Depends(get_async_session)) -> AbstractProductRepository:
    """Get product repository instance."""
    return SqlAlchemyProductRepository(session)


async def get_vin_service() -> IVINDecoderService:
    """Get VIN decoder service."""
    return NHTSAVinService()


async def get_publication_repository(session=Depends(get_async_session)) -> IPublicationRepository:
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
    make: str | None = Query(None),
    model: str | None = Query(None),
    year_min: int | None = Query(None, ge=1900, le=2030),
    year_max: int | None = Query(None, ge=1900, le=2030),
    search: str | None = Query(None),
    current_user: Annotated[User, Depends(get_current_auth_user)] = None,  # type: ignore[assignment]
    use_case: GetVehicleCatalogUseCase = Depends(get_vehicle_catalog_use_case),
) -> CatalogResponseDTO:
    """
    Get vehicle catalog with role-based filtering and dynamic filters.

    Role-based access:
    - Admin: sees all vehicles in tenant
    - Dealer: sees only vehicles from their organization
    - Seller/Manager: sees vehicles from assigned dealers

    Pagination:
    - limit: number of vehicles to return (1-100, default 50)
    - cursor: pagination token from previous response
    - Response includes next_cursor and has_more flag

    Dynamic filters:
    - make: Filter by vehicle make (e.g., "Toyota")
    - model: Filter by vehicle model (e.g., "Corolla")
    - year_min/year_max: Filter by year range
    - search: Full-text search in make, model, VIN
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # Build filter params from query params
    filters = FilterParams(
        make=make,
        model=model,
        year_min=year_min,
        year_max=year_max,
        search=search,
    )

    return await use_case.execute(
        user=current_user,
        limit=limit,
        cursor=cursor,
        filters=filters,
    )


@router.post("/bulk-upload", response_model=BulkUploadResponse)
@limiter.limit("10/minute")  # 10 uploads per minute per user
async def bulk_upload_vehicles(
    csv_file: UploadFile,
    request: Request,  # noqa: ARG001 - Required by rate limiter
    current_user: Annotated[User, Depends(get_current_auth_user)] = None,  # type: ignore[assignment]
    db: AsyncSession = Depends(get_async_session),
) -> BulkUploadResponse:
    """
    Bulk upload vehicles from CSV file.

    CSV format (required columns marked with *):
    vin*,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,
    transmission,fuel_type,body_style,drivetrain,engine,cylinders,description

    Example:
    ```csv
    vin,year,make,model,trim,mileage,price,condition,color,transmission,fuel_type
    1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,Automatic,Gas
    ```

    Returns:
        BulkUploadResponse with created count and errors

    Raises:
        HTTPException: If user not authenticated or CSV format invalid
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # Validate file type
    if not csv_file.filename or not csv_file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed",
        )

    # Read and validate file size
    content = await csv_file.read()
    if len(content) > MAX_CSV_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {MAX_CSV_SIZE / 1024 / 1024}MB",
        )

    csv_content = content.decode("utf-8")

    # Get tenant_id and default organization_id from user
    tenant_id = current_user.tenant_id
    default_organization_id = current_user.organization_id

    if not default_organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to an organization to bulk upload vehicles",
        )

    # Execute use case
    vehicle_repo = SqlAlchemyVehicleRepository(db)
    product_repo = SqlAlchemyProductRepository(db)
    use_case = BulkUploadVehiclesUseCase(vehicle_repo, product_repo)

    return await use_case.execute(
        csv_content=csv_content,
        tenant_id=tenant_id,
        default_organization_id=default_organization_id,
    )
