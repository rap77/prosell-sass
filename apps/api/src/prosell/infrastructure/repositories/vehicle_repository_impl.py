"""SQLAlchemy implementation of Vehicle repository."""

import base64
import json
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.vehicle.catalog import FilterParams
from prosell.domain.entities.user import User
from prosell.domain.entities.vehicle import Vehicle
from prosell.domain.exceptions.auth_exceptions import Unauthorized
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.models.user_dealer_model import UserDealerModel
from prosell.infrastructure.models.vehicle_model import VehicleModel


class SqlAlchemyVehicleRepository(AbstractVehicleRepository):
    """SQLAlchemy implementation of VehicleRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, vehicle: Vehicle) -> Vehicle:
        """Create a new vehicle."""
        model = VehicleModel(
            id=vehicle.id,
            product_id=vehicle.product_id,
            vin=vehicle.vin,
            year=vehicle.year,
            make=vehicle.make,
            model=vehicle.model,
            trim=vehicle.trim,
            body_type=vehicle.body_type,
            body_style=vehicle.body_style,
            drivetrain=vehicle.drivetrain,
            transmission=vehicle.transmission,
            engine=vehicle.engine,
            fuel_type=vehicle.fuel_type,
            mpg_city=vehicle.mpg_city,
            mpg_highway=vehicle.mpg_highway,
            mpg_combined=vehicle.mpg_combined,
            mileage=vehicle.mileage,
            mileage_unit=vehicle.mileage_unit,
            exterior_color=vehicle.exterior_color,
            interior_color=vehicle.interior_color,
            has_sunroof=vehicle.has_sunroof,
            has_navigation=vehicle.has_navigation,
            has_leather=vehicle.has_leather,
            has_backup_camera=vehicle.has_backup_camera,
            has_bluetooth=vehicle.has_bluetooth,
            has_remote_start=vehicle.has_remote_start,
            seat_material=vehicle.seat_material,
            vin_decoded_data=vehicle.vin_decoded_data,
            vin_decoded_at=vehicle.vin_decoded_at,
            stock_number=vehicle.stock_number,
            vin_verified=vehicle.vin_verified,
            created_at=vehicle.created_at,
            updated_at=vehicle.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, vehicle_id: UUID) -> Vehicle | None:
        """Get vehicle by ID."""
        stmt = select(VehicleModel).where(VehicleModel.id == vehicle_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_product_id(self, product_id: UUID) -> Vehicle | None:
        """Get vehicle by product ID."""
        stmt = select(VehicleModel).where(VehicleModel.product_id == product_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_vin(self, vin: str) -> Vehicle | None:
        """Get vehicle by VIN."""
        stmt = select(VehicleModel).where(VehicleModel.vin == vin.upper())
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update(self, vehicle: Vehicle) -> Vehicle:
        """Update an existing vehicle."""
        stmt = select(VehicleModel).where(VehicleModel.id == vehicle.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Vehicle not found: {vehicle.id}")

        model.vin = vehicle.vin
        model.year = vehicle.year
        model.make = vehicle.make
        model.model = vehicle.model
        model.trim = vehicle.trim
        model.body_type = vehicle.body_type
        model.body_style = vehicle.body_style
        model.drivetrain = vehicle.drivetrain
        model.transmission = vehicle.transmission
        model.engine = vehicle.engine
        model.fuel_type = vehicle.fuel_type
        model.mpg_city = vehicle.mpg_city
        model.mpg_highway = vehicle.mpg_highway
        model.mpg_combined = vehicle.mpg_combined
        model.mileage = vehicle.mileage
        model.mileage_unit = vehicle.mileage_unit
        model.exterior_color = vehicle.exterior_color
        model.interior_color = vehicle.interior_color
        model.has_sunroof = vehicle.has_sunroof
        model.has_navigation = vehicle.has_navigation
        model.has_leather = vehicle.has_leather
        model.has_backup_camera = vehicle.has_backup_camera
        model.has_bluetooth = vehicle.has_bluetooth
        model.has_remote_start = vehicle.has_remote_start
        model.seat_material = vehicle.seat_material
        model.vin_decoded_data = vehicle.vin_decoded_data
        model.vin_decoded_at = vehicle.vin_decoded_at
        model.stock_number = vehicle.stock_number
        model.vin_verified = vehicle.vin_verified

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, vehicle_id: UUID) -> bool:
        """Delete a vehicle."""
        stmt = select(VehicleModel).where(VehicleModel.id == vehicle_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        await self.session.delete(model)
        await self.session.flush()
        return True

    async def exists_by_vin(self, vin: str) -> bool:
        """Check if vehicle with VIN exists."""
        stmt = select(func.count(VehicleModel.id)).where(
            VehicleModel.vin == vin.upper(),
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0  # type: ignore[assignment]
        return count > 0

    async def get_vins_batch(self, vins: list[str], tenant_id: UUID) -> list[str]:
        """
        Get all existing VINs in a single query (N+1 optimization).

        Args:
            vins: List of VINs to check
            tenant_id: Tenant UUID for isolation

        Returns:
            List of VINs that already exist in database
        """
        stmt = (
            select(VehicleModel.vin)
            .join(ProductModel, VehicleModel.product_id == ProductModel.id)
            .where(ProductModel.tenant_id == tenant_id)
            .where(VehicleModel.vin.in_(vins))
        )
        result = await self.session.execute(stmt)
        return [row[0] for row in result.fetchall()]

    async def search_by_make_model(
        self,
        make: str | None = None,
        model: str | None = None,
        year: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Vehicle]:
        """Search vehicles by make, model, year."""
        stmt = select(VehicleModel)

        if make is not None:
            stmt = stmt.where(VehicleModel.make.ilike(f"%{make}%"))

        if model is not None:
            stmt = stmt.where(VehicleModel.model.ilike(f"%{model}%"))

        if year is not None:
            stmt = stmt.where(VehicleModel.year == year)

        stmt = stmt.order_by(VehicleModel.year.desc(), VehicleModel.make, VehicleModel.model)
        stmt = stmt.offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_catalog_for_user(
        self,
        user: User,
        limit: int = 50,
        cursor: str | None = None,
        filters: FilterParams | None = None,
    ) -> tuple[list[Vehicle], str | None, bool]:
        """
        Get vehicles for user based on role with cursor pagination and dynamic filters.

        Role-based filtering:
        - Admin: sees all vehicles in tenant (no dealer filter)
        - Dealer: sees only vehicles from their organization (dealer_id == user.dealer_id)
        - Seller/Manager: sees vehicles from assigned dealers (IN subquery)

        Args:
            user: User entity with roles and tenant_id
            limit: Max vehicles to return (default 50)
            cursor: Pagination cursor (encoded vehicle ID + timestamp)
            filters: Dynamic filter parameters (make, model, year range, price range, etc.)

        Returns:
            Tuple of (vehicles list, next_cursor or None, has_more flag)

        Raises:
            Unauthorized: If seller/manager has no dealer assignments
        """
        # Base query with tenant isolation
        stmt = (
            select(VehicleModel)
            .join(ProductModel, VehicleModel.product_id == ProductModel.id)
            .where(ProductModel.tenant_id == user.tenant_id)
        )

        # Role-based filtering
        if user.has_role("admin"):
            # Admin sees all vehicles - no dealer filter
            pass
        elif user.has_role("dealer"):
            # Dealer sees only their organization's vehicles
            if not user.tenant_id:
                raise Unauthorized("Dealer has no organization assigned")
            stmt = stmt.where(ProductModel.organization_id == user.tenant_id)
        else:
            # Seller/Manager: get assigned dealer IDs via subquery
            dealer_ids = await self._get_user_dealer_ids(user.id, user.tenant_id)
            if not dealer_ids:
                raise Unauthorized("No dealers assigned to user")
            stmt = stmt.where(ProductModel.organization_id.in_(dealer_ids))

        # Dynamic filters (applied after role-based filtering)
        if filters:
            stmt = self._apply_filters(stmt, filters)

        # Cursor pagination
        if cursor:
            cursor_data = self._decode_cursor(cursor)
            if cursor_data:
                stmt = stmt.where(VehicleModel.id > cursor_data["id"])

        # Order by ID for consistent pagination
        stmt = stmt.order_by(VehicleModel.id)

        # Fetch one extra to determine if there are more results
        stmt = stmt.limit(limit + 1)

        result = await self.session.execute(stmt)
        models = result.scalars().all()

        # Determine if there are more results
        has_more = len(models) > limit
        if has_more:
            models = models[:limit]  # Remove the extra item
            last_vehicle = models[-1]
            next_cursor = self._encode_cursor(last_vehicle.id, last_vehicle.created_at)
        else:
            next_cursor = None

        vehicles = [self._to_entity(m) for m in models]
        return (vehicles, next_cursor, has_more)

    async def _get_user_dealer_ids(self, user_id: UUID, tenant_id: UUID) -> list[UUID]:
        """
        Get dealer IDs assigned to user via M:N relationship.

        Args:
            user_id: User UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            List of dealer IDs (empty if none assigned)
        """
        stmt = select(UserDealerModel.dealer_id).where(
            UserDealerModel.user_id == user_id,
            UserDealerModel.tenant_id == tenant_id,
        )

        result = await self.session.execute(stmt)
        dealer_ids = result.scalars().all()
        return list(dealer_ids)

    def _encode_cursor(self, vehicle_id: UUID, created_at) -> str:
        """Encode cursor from vehicle ID and timestamp."""
        cursor_data = {
            "id": str(vehicle_id),
            "created_at": created_at.isoformat(),
        }
        json_str = json.dumps(cursor_data)
        return base64.urlsafe_b64encode(json_str.encode()).decode()

    def _decode_cursor(self, cursor: str) -> dict | None:
        """Decode cursor to vehicle ID and timestamp."""
        try:
            json_str = base64.urlsafe_b64decode(cursor.encode()).decode()
            return json.loads(json_str)
        except Exception:
            return None

    def _apply_filters(
        self,
        stmt: Select[VehicleModel],
        filters: FilterParams,
    ) -> Select[VehicleModel]:
        """
        Apply dynamic filters to the query statement.

        Args:
            stmt: SQLAlchemy Select statement
            filters: FilterParams with filter criteria

        Returns:
            Modified Select statement with filters applied
        """

        # String equality filters
        if filters.make:
            stmt = stmt.where(VehicleModel.make == filters.make)
        if filters.model:
            stmt = stmt.where(VehicleModel.model == filters.model)
        if filters.condition:
            stmt = stmt.where(VehicleModel.condition == filters.condition)

        # Numeric range filters
        if filters.year_min:
            stmt = stmt.where(VehicleModel.year >= filters.year_min)
        if filters.year_max:
            stmt = stmt.where(VehicleModel.year <= filters.year_max)
        if filters.price_min:
            # Convert to cents
            stmt = stmt.where(VehicleModel.price_cents >= filters.price_min * 100)
        if filters.price_max:
            # Convert to cents
            stmt = stmt.where(VehicleModel.price_cents <= filters.price_max * 100)

        # Full-text search (search in make, model, vin)
        if filters.search:
            search_term = f"%{filters.search}%"
            stmt = stmt.where(
                (VehicleModel.make.ilike(search_term))
                | (VehicleModel.model.ilike(search_term))
                | (VehicleModel.vin.ilike(search_term))
            )

        return stmt

    def _to_entity(self, model: VehicleModel) -> Vehicle:
        """Convert ORM model to domain entity."""
        return Vehicle.model_validate(model, from_attributes=True)
