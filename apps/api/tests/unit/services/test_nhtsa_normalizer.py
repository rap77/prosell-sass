"""
Tests para normalizador de NHTSA a Facebook Marketplace.
"""

from prosell.infrastructure.services.nhtsa_normalizer import normalize_nhtsa_value


class TestNHTSANormalizer:
    """Tests para normalizador de NHTSA a Facebook Marketplace."""

    def test_normalize_make_basic(self):
        """Normalización de marcas básicas."""
        assert normalize_nhtsa_value("CHEVROLET", "make") == "Chevrolet"
        assert normalize_nhtsa_value("FORD", "make") == "Ford"
        assert normalize_nhtsa_value("TOYOTA", "make") == "Toyota"
        assert normalize_nhtsa_value("HONDA", "make") == "Honda"

    def test_normalize_make_with_spaces(self):
        """Normalización de marcas con espacios."""
        assert normalize_nhtsa_value("MERCEDES-BENZ", "make") == "Mercedes-Benz"
        assert normalize_nhtsa_value("LAND ROVER", "make") == "Land Rover"
        assert normalize_nhtsa_value("ALFA ROMEO", "make") == "Alfa Romeo"
        assert normalize_nhtsa_value("ASTON MARTIN", "make") == "Aston Martin"

    def test_normalize_make_unknown(self):
        """Marca no en mapping → valor limpio (Spanish canonical label expected)."""
        assert normalize_nhtsa_value("UNKNOWN BRAND", "make") == "UNKNOWN BRAND"
        assert normalize_nhtsa_value("NEW-MAKE", "make") == "NEW-MAKE"

    def test_normalize_body_type_suv(self):
        """Normalización de SUV (varias variantes)."""
        assert (
            normalize_nhtsa_value(
                "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)", "body_type"
            )
            == "SUV"
        )
        assert (
            normalize_nhtsa_value(
                "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV) (MPV)", "body_type"
            )
            == "SUV"
        )

    def test_normalize_body_type_basic(self):
        """Normalización de tipos básicos."""
        assert normalize_nhtsa_value("Sedan/Saloon", "body_type") == "Sedán"
        assert normalize_nhtsa_value("Pickup", "body_type") == "Camioneta"
        assert normalize_nhtsa_value("Coupe", "body_type") == "Coupé"
        assert normalize_nhtsa_value("Hatchback/Liftback/Notchback", "body_type") == "Hatchback"
        assert normalize_nhtsa_value("Convertible/Cabriolet/Roadster", "body_type") == "Convertible"
        assert normalize_nhtsa_value("Wagon/Estate", "body_type") == "Familiar"
        assert normalize_nhtsa_value("Minivan", "body_type") == "Miniván"

    def test_normalize_body_type_fallback(self):
        """Fallback para tipos no reconocidos."""
        assert normalize_nhtsa_value("Unknown Body Type", "body_type") == "Otro"

    def test_normalize_drivetrain(self):
        """Normalización de tracción."""
        assert normalize_nhtsa_value("Front-Wheel Drive", "drivetrain") == "FWD"
        assert normalize_nhtsa_value("Rear-Wheel Drive", "drivetrain") == "RWD"
        assert normalize_nhtsa_value("All-Wheel Drive", "drivetrain") == "AWD"
        assert normalize_nhtsa_value("Four-Wheel Drive", "drivetrain") == "4WD"
        assert normalize_nhtsa_value("4-Wheel Drive", "drivetrain") == "4WD"

    def test_normalize_transmission(self):
        """Normalización de transmisión."""
        assert normalize_nhtsa_value("Automatic", "transmission") == "Transmisión automática"
        assert normalize_nhtsa_value("Manual", "transmission") == "Transmisión manual"
        assert normalize_nhtsa_value("CVT", "transmission") == "Transmisión automática"
        assert normalize_nhtsa_value("Dual Clutch", "transmission") == "Transmisión automática"

    def test_normalize_fuel_type(self):
        """Normalización de tipo de combustible."""
        assert normalize_nhtsa_value("Gasoline", "fuel_type") == "Gasolina"
        assert normalize_nhtsa_value("Diesel", "fuel_type") == "Diésel"
        assert normalize_nhtsa_value("Electric", "fuel_type") == "Eléctrico"
        assert normalize_nhtsa_value("Hybrid", "fuel_type") == "Híbrido"
        assert (
            normalize_nhtsa_value("Plug-in Hybrid", "fuel_type") == "Híbrido eléctrico enchufable"
        )
        assert normalize_nhtsa_value("Flex Fuel", "fuel_type") == "Flexible"

    def test_normalize_none_values(self):
        """Manejo de valores nulos o vacíos."""
        assert normalize_nhtsa_value(None, "make") is None
        assert normalize_nhtsa_value("", "make") is None
        assert normalize_nhtsa_value("   ", "make") is None

    def test_normalize_whitespace_handling(self):
        """Manejo de espacios en blanco."""
        assert normalize_nhtsa_value("  CHEVROLET  ", "make") == "Chevrolet"
        assert normalize_nhtsa_value("\tFORD\n", "make") == "Ford"

    def test_normalize_case_insensitive_nhtsa(self):
        """Mapping debe ser case-insensitive para NHTSA."""
        # El mapping está en UPPERCASE, pero NHTSA puede variar
        # El fallback debería manejarlo
        assert normalize_nhtsa_value("Chevrolet", "make") == "Chevrolet"

    def test_normalize_fallback_body_type_keywords(self):
        """Fallback detecta palabras clave en body_type."""
        assert normalize_nhtsa_value("Custom SUV Body", "body_type") == "SUV"
        assert normalize_nhtsa_value("Truck Platform", "body_type") == "Camioneta"
        assert normalize_nhtsa_value("Coupe-like", "body_type") == "Coupé"

    def test_normalize_fallback_drivetrain_keywords(self):
        """Fallback detecta palabras clave en drivetrain."""
        assert normalize_nhtsa_value("Front Wheel Drive System", "drivetrain") == "FWD"
        assert normalize_nhtsa_value("Rear Wheel", "drivetrain") == "RWD"
        assert normalize_nhtsa_value("All Wheel Permanent", "drivetrain") == "AWD"

    def test_normalize_fallback_transmission_keywords(self):
        """Fallback detecta palabras clave en transmission."""
        assert normalize_nhtsa_value("Manual Transmission", "transmission") == "Transmisión manual"
        assert normalize_nhtsa_value("Auto Gearbox", "transmission") == "Transmisión automática"

    def test_normalize_fallback_fuel_type_keywords(self):
        """Fallback detecta palabras clave en fuel_type."""
        assert normalize_nhtsa_value("Gasoline Fuel", "fuel_type") == "Gasolina"
        assert normalize_nhtsa_value("Diesel Engine", "fuel_type") == "Diésel"
        assert normalize_nhtsa_value("Electric Motor", "fuel_type") == "Eléctrico"
        assert normalize_nhtsa_value("Hybrid System", "fuel_type") == "Híbrido"
        assert normalize_nhtsa_value("Plug-in", "fuel_type") == "Híbrido eléctrico enchufable"
        assert normalize_nhtsa_value("Flex Fuel Capability", "fuel_type") == "Flexible"

    def test_all_brands_in_mapping(self):
        """Verificar que las marcas de FB estén en el mapping."""
        from prosell.infrastructure.services.nhtsa_normalizer import NHTSA_TO_FACEBOOK

        # Marcas en español que deberían estar (canonical values).
        expected_brands = {
            "Acura",
            "Alfa Romeo",
            "Aston Martin",
            "Audi",
            "BMW",
            "Bentley",
            "Buick",
            "Cadillac",
            "Chevrolet",
            "Chrysler",
            "Dodge",
            "Ferrari",
            "Fiat",
            "Ford",
            "GMC",
            "Genesis",
            "Honda",
            "Hummer",
            "Hyundai",
            "Infiniti",
            "Jaguar",
            "Jeep",
            "Kia",
            "Land Rover",
            "Lexus",
            "Lincoln",
            "Lucid",
            "MINI",
            "Maserati",
            "Mazda",
            "Mercedes-Benz",
            "Mitsubishi",
            "Nissan",
            "Polestar",
            "Pontiac",
            "Porsche",
            "Ram",
            "Rivian",
            "Rolls-Royce",
            "Subaru",
            "Tesla",
            "Toyota",
            "Volkswagen",
            "Volvo",
        }

        mapped_brands = {v for k, v in NHTSA_TO_FACEBOOK.items() if v in expected_brands}

        for brand in expected_brands:
            assert brand in mapped_brands, f"Marca '{brand}' no encontrada en mapping"
