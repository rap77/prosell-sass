"""Vehicle entity - Extension of Product for vehicles."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from pydantic import Field, field_validator

from prosell.domain.base import DomainModel


class Vehicle(DomainModel):
    """
    Vehicle entity (extends Product).

    Pure domain logic - no external dependencies.
    Stores vehicle-specific attributes and VIN decoding data.
    """

    # Required fields
    id: UUID
    product_id: UUID  # Reference to Product

    # VIN (Vehicle Identification Number)
    vin: str = Field(..., min_length=17, max_length=17)

    # Basic vehicle info (from VIN decode or manual entry)
    year: int | None = Field(None, ge=1900, le=2100)
    make: str | None = None  # e.g., "Toyota"
    model: str | None = None  # e.g., "Camry"
    trim: str | None = None  # e.g., "LE", "XSE"

    # Specifications
    body_type: str | None = None  # e.g., "Sedan", "SUV", "Truck"
    body_style: str | None = None  # e.g., "4 Door Sedan"
    drivetrain: str | None = None  # e.g., "FWD", "AWD", "4WD"
    transmission: str | None = None  # e.g., "Automatic", "Manual"

    # Performance
    engine: str | None = None  # e.g., "2.5L 4-Cylinder"
    fuel_type: str | None = None  # e.g., "Gasoline", "Hybrid", "Electric"
    mpg_city: int | None = Field(None, ge=0)
    mpg_highway: int | None = Field(None, ge=0)
    mpg_combined: int | None = Field(None, ge=0)

    # Mileage
    mileage: int | None = Field(None, ge=0)  # Odometer reading
    mileage_unit: str = Field(default="mi")  # "mi" or "km"

    # Exterior
    exterior_color: str | None = None
    interior_color: str | None = None

    # Features
    has_sunroof: bool = False
    has_navigation: bool = False
    has_leather: bool = False
    has_backup_camera: bool = False
    has_bluetooth: bool = False
    has_remote_start: bool = False
    seat_material: str | None = None  # "Cloth", "Leather", "Vinyl"

    # VIN decode data (cache from NHTSA API)
    vin_decoded_data: dict[str, str] = Field(default_factory=dict)
    vin_decoded_at: datetime | None = None  # When VIN was decoded

    # Listing info
    stock_number: str | None = None
    vin_verified: bool = False  # VIN verified against database

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @field_validator("vin")
    @classmethod
    def validate_vin(cls, vin: str) -> str:
        """
        Validate VIN format.

        VIN must be:
        - Exactly 17 characters
        - Alphanumeric (no I, O, Q)
        - Valid checksum (ISO 3779)

        Args:
            vin: VIN to validate

        Returns:
            Uppercase VIN

        Raises:
            ValueError: If VIN is invalid
        """
        vin_upper = vin.upper()

        if len(vin_upper) != 17:
            raise ValueError("VIN must be exactly 17 characters")

        # Check for invalid characters (I, O, Q)
        invalid_chars = {"I", "O", "Q"}
        if any(char in invalid_chars for char in vin_upper):
            raise ValueError("VIN cannot contain I, O, or Q")

        # Check alphanumeric
        if not vin_upper.isalnum():
            raise ValueError("VIN must be alphanumeric")

        # Validate checksum (position 9 is the check digit)
        if not cls._validate_vin_checksum(vin_upper):
            raise ValueError("VIN checksum is invalid")

        return vin_upper

    @staticmethod
    def _validate_vin_checksum(vin: str) -> bool:
        """
        Validate VIN checksum using ISO 3779 algorithm.

        Args:
            vin: Uppercase VIN (17 characters)

        Returns:
            True if checksum is valid
        """
        # Transliteration values for A-Z (I, O, Q excluded)
        transliteration = {
            "A": 1,
            "B": 2,
            "C": 3,
            "D": 4,
            "E": 5,
            "F": 6,
            "G": 7,
            "H": 8,
            "J": 1,
            "K": 2,
            "L": 3,
            "M": 4,
            "N": 5,
            "P": 7,
            "R": 9,
            "S": 2,
            "T": 3,
            "U": 4,
            "V": 5,
            "W": 6,
            "X": 7,
            "Y": 8,
            "Z": 9,
        }

        # Position weights for 17-character VIN
        weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

        # Calculate weighted sum
        total = 0
        for i, char in enumerate(vin):
            if i == 8:  # Position 9 is the check digit itself, skip
                continue

            # Get transliteration value
            if char.isdigit():
                value = int(char)
            else:
                value = transliteration.get(char, 0)

            total += value * weights[i]

        # Calculate check digit
        remainder = total % 11
        check_digit = "X" if remainder == 10 else str(remainder)

        return vin[8] == check_digit

    @classmethod
    def create(
        cls,
        product_id: UUID,
        vin: str,
        **kwargs,
    ) -> "Vehicle":
        """
        Factory method for new vehicle creation.

        Args:
            product_id: Product ID
            vin: Vehicle Identification Number
            **kwargs: Additional optional fields

        Returns:
            New Vehicle entity
        """
        return cls(
            id=uuid4(),
            product_id=product_id,
            vin=vin,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            **kwargs,
        )

    def update_from_vin_decode(self, decoded_data: dict[str, str]) -> None:
        """
        Update vehicle from NHTSA VIN decode data.

        Args:
            decoded_data: Dict from NHTSA API decode response
                Format: {"Make": "Toyota", "Model": "Camry", ...}
        """
        # Map NHTSA fields to our fields
        field_mapping = {
            "Make": "make",
            "Model": "model",
            "Model Year": "year",
            "Trim": "trim",
            "Body Class": "body_type",
            "Drive Type": "drivetrain",
            "Transmission": "transmission",
            "Engine": "engine",
            "Fuel Type": "fuel_type",
            "Manufacturer Name": "make",  # Fallback
        }

        for nhtsa_field, our_field in field_mapping.items():
            value = decoded_data.get(nhtsa_field)
            if value:
                if our_field == "year":
                    import contextlib

                    with contextlib.suppress(ValueError, TypeError):
                        setattr(self, our_field, int(value))
                else:
                    setattr(self, our_field, value)

        # Store full decode data for reference
        self.vin_decoded_data = decoded_data
        self.vin_decoded_at = datetime.now(UTC)
        self.updated_at = datetime.now(UTC)

    def set_mileage(self, mileage: int, unit: str = "mi") -> None:
        """
        Set vehicle mileage.

        Args:
            mileage: Odometer reading
            unit: "mi" or "km"

        Raises:
            ValueError: If mileage is negative or unit is invalid
        """
        if mileage < 0:
            raise ValueError("mileage must be >= 0")
        if unit not in ("mi", "km"):
            raise ValueError('mileage_unit must be "mi" or "km"')

        self.mileage = mileage
        self.mileage_unit = unit
        self.updated_at = datetime.now(UTC)

    def update_colors(self, exterior: str | None = None, interior: str | None = None) -> None:
        """
        Update vehicle colors.

        Args:
            exterior: Exterior color
            interior: Interior color
        """
        if exterior is not None:
            self.exterior_color = exterior
        if interior is not None:
            self.interior_color = interior

        self.updated_at = datetime.now(UTC)

    def update_specifications(
        self,
        body_type: str | None = None,
        drivetrain: str | None = None,
        transmission: str | None = None,
        engine: str | None = None,
        fuel_type: str | None = None,
    ) -> None:
        """
        Update vehicle specifications.

        Args:
            body_type: Body type (e.g., "Sedan", "SUV")
            drivetrain: Drivetrain (e.g., "FWD", "AWD")
            transmission: Transmission type
            engine: Engine description
            fuel_type: Fuel type
        """
        if body_type is not None:
            self.body_type = body_type
        if drivetrain is not None:
            self.drivetrain = drivetrain
        if transmission is not None:
            self.transmission = transmission
        if engine is not None:
            self.engine = engine
        if fuel_type is not None:
            self.fuel_type = fuel_type

        self.updated_at = datetime.now(UTC)

    def update_mpg(
        self, city: int | None = None, highway: int | None = None, combined: int | None = None
    ) -> None:
        """
        Update fuel economy ratings.

        Args:
            city: City MPG
            highway: Highway MPG
            combined: Combined MPG
        """
        if city is not None:
            if city < 0:
                raise ValueError("mpg_city must be >= 0")
            self.mpg_city = city
        if highway is not None:
            if highway < 0:
                raise ValueError("mpg_highway must be >= 0")
            self.mpg_highway = highway
        if combined is not None:
            if combined < 0:
                raise ValueError("mpg_combined must be >= 0")
            self.mpg_combined = combined

        self.updated_at = datetime.now(UTC)

    def update_features(
        self,
        has_sunroof: bool | None = None,
        has_navigation: bool | None = None,
        has_leather: bool | None = None,
        has_backup_camera: bool | None = None,
        has_bluetooth: bool | None = None,
        has_remote_start: bool | None = None,
        seat_material: str | None = None,
    ) -> None:
        """
        Update vehicle features.

        Args:
            has_sunroof: Has sunroof
            has_navigation: Has navigation system
            has_leather: Has leather seats
            has_backup_camera: Has backup camera
            has_bluetooth: Has Bluetooth
            has_remote_start: Has remote start
            seat_material: Seat material
        """
        if has_sunroof is not None:
            self.has_sunroof = has_sunroof
        if has_navigation is not None:
            self.has_navigation = has_navigation
        if has_leather is not None:
            self.has_leather = has_leather
        if has_backup_camera is not None:
            self.has_backup_camera = has_backup_camera
        if has_bluetooth is not None:
            self.has_bluetooth = has_bluetooth
        if has_remote_start is not None:
            self.has_remote_start = has_remote_start
        if seat_material is not None:
            self.seat_material = seat_material

        self.updated_at = datetime.now(UTC)

    def verify_vin(self) -> None:
        """Mark VIN as verified."""
        self.vin_verified = True
        self.updated_at = datetime.now(UTC)

    def set_stock_number(self, stock_number: str) -> None:
        """
        Set stock number.

        Args:
            stock_number: Dealer stock number
        """
        self.stock_number = stock_number
        self.updated_at = datetime.now(UTC)

    @property
    def is_vin_decoded(self) -> bool:
        """Check if VIN has been decoded."""
        return len(self.vin_decoded_data) > 0

    @property
    def vin_decode_age_hours(self) -> float | None:
        """Hours since VIN was decoded (None if never decoded)."""
        if self.vin_decoded_at is None:
            return None
        return (datetime.now(UTC) - self.vin_decoded_at).total_seconds() / 3600

    @property
    def should_refresh_vin_decode(self) -> bool:
        """Check if VIN decode should be refreshed (older than 24 hours)."""
        if not self.is_vin_decoded:
            return False
        age = self.vin_decode_age_hours
        return age is None or age > 24

    @property
    def full_name(self) -> str:
        """Get full vehicle name (Year Make Model Trim)."""
        parts = []
        if self.year:
            parts.append(str(self.year))
        if self.make:
            parts.append(self.make)
        if self.model:
            parts.append(self.model)
        if self.trim:
            parts.append(self.trim)
        return " ".join(parts) if parts else "Unknown Vehicle"

    @property
    def short_name(self) -> str:
        """Get short vehicle name (Year Make Model)."""
        parts = []
        if self.year:
            parts.append(str(self.year))
        if self.make:
            parts.append(self.make)
        if self.model:
            parts.append(self.model)
        return " ".join(parts) if parts else "Unknown Vehicle"
