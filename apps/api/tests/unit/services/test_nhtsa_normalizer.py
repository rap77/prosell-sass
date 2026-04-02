"""
Tests para normalizador de NHTSA a Facebook Marketplace.
"""

import pytest
from prosell.infrastructure.services.nhtsa_normalizer import normalize_nhtsa_value


class TestNHTSANormalizer:
    """Tests para normalizador de NHTSA a Facebook Marketplace."""

    def test_normalize_make_basic(self):
        """Normalización de marcas básicas."""
        assert normalize_nhtsa_value("CHEVROLET", "make") == "chevrolet"
        assert normalize_nhtsa_value("FORD", "make") == "ford"
        assert normalize_nhtsa_value("TOYOTA", "make") == "toyota"
        assert normalize_nhtsa_value("HONDA", "make") == "honda"

    def test_normalize_make_with_spaces(self):
        """Normalización de marcas con espacios."""
        assert normalize_nhtsa_value("MERCEDES-BENZ", "make") == "mercedes"
        assert normalize_nhtsa_value("LAND ROVER", "make") == "land_rover"
        assert normalize_nhtsa_value("ALFA ROMEO", "make") == "alfa_romeo"
        assert normalize_nhtsa_value("ASTON MARTIN", "make") == "aston_martin"

    def test_normalize_make_unknown(self):
        """Marca no en mapping → lowercase con guiones."""
        assert normalize_nhtsa_value("UNKNOWN BRAND", "make") == "unknown_brand"
        assert normalize_nhtsa_value("NEW-MAKE", "make") == "new_make"

    def test_normalize_body_type_suv(self):
        """Normalización de SUV (varias variantes)."""
        assert normalize_nhtsa_value(
            "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)",
            "body_type"
        ) == "suv"
        assert normalize_nhtsa_value(
            "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV) (MPV)",
            "body_type"
        ) == "suv"

    def test_normalize_body_type_basic(self):
        """Normalización de tipos básicos."""
        assert normalize_nhtsa_value("Sedan/Saloon", "body_type") == "sedan"
        assert normalize_nhtsa_value("Pickup", "body_type") == "pickup"
        assert normalize_nhtsa_value("Coupe", "body_type") == "coupe"
        assert normalize_nhtsa_value("Hatchback/Liftback/Notchback", "body_type") == "hatchback"
        assert normalize_nhtsa_value("Convertible/Cabriolet/Roadster", "body_type") == "convertible"
        assert normalize_nhtsa_value("Wagon/Estate", "body_type") == "wagon"
        assert normalize_nhtsa_value("Minivan", "body_type") == "minivan"

    def test_normalize_body_type_fallback(self):
        """Fallback para tipos no reconocidos."""
        assert normalize_nhtsa_value("Unknown Body Type", "body_type") == "other"

    def test_normalize_drivetrain(self):
        """Normalización de tracción."""
        assert normalize_nhtsa_value("Front-Wheel Drive", "drivetrain") == "FWD"
        assert normalize_nhtsa_value("Rear-Wheel Drive", "drivetrain") == "RWD"
        assert normalize_nhtsa_value("All-Wheel Drive", "drivetrain") == "AWD"
        assert normalize_nhtsa_value("Four-Wheel Drive", "drivetrain") == "4WD"
        assert normalize_nhtsa_value("4-Wheel Drive", "drivetrain") == "4WD"

    def test_normalize_transmission(self):
        """Normalización de transmisión."""
        assert normalize_nhtsa_value("Automatic", "transmission") == "automatic"
        assert normalize_nhtsa_value("Manual", "transmission") == "manual"
        # CVT y Dual Clutch → automatic (FB solo tiene 2 opciones)
        assert normalize_nhtsa_value("CVT", "transmission") == "automatic"
        assert normalize_nhtsa_value("Dual Clutch", "transmission") == "automatic"

    def test_normalize_fuel_type(self):
        """Normalización de tipo de combustible."""
        assert normalize_nhtsa_value("Gasoline", "fuel_type") == "gasoline"
        assert normalize_nhtsa_value("Diesel", "fuel_type") == "diesel"
        assert normalize_nhtsa_value("Electric", "fuel_type") == "electric"
        assert normalize_nhtsa_value("Hybrid", "fuel_type") == "hybrid"
        assert normalize_nhtsa_value("Plug-in Hybrid", "fuel_type") == "plug_in"
        assert normalize_nhtsa_value("Flex Fuel", "fuel_type") == "flex"

    def test_normalize_none_values(self):
        """Manejo de valores nulos o vacíos."""
        assert normalize_nhtsa_value(None, "make") is None
        assert normalize_nhtsa_value("", "make") is None
        assert normalize_nhtsa_value("   ", "make") is None

    def test_normalize_whitespace_handling(self):
        """Manejo de espacios en blanco."""
        assert normalize_nhtsa_value("  CHEVROLET  ", "make") == "chevrolet"
        assert normalize_nhtsa_value("\tFORD\n", "make") == "ford"

    def test_normalize_case_insensitive_nhtsa(self):
        """Mapping debe ser case-insensitive para NHTSA."""
        # El mapping está en UPPERCASE, pero NHTSA puede variar
        # El fallback debería manejarlo
        assert normalize_nhtsa_value("Chevrolet", "make") == "chevrolet"

    def test_normalize_fallback_body_type_keywords(self):
        """Fallback detecta palabras clave en body_type."""
        assert normalize_nhtsa_value("Custom SUV Body", "body_type") == "suv"
        assert normalize_nhtsa_value("Truck Platform", "body_type") == "pickup"
        assert normalize_nhtsa_value("Coupe-like", "body_type") == "coupe"

    def test_normalize_fallback_drivetrain_keywords(self):
        """Fallback detecta palabras clave en drivetrain."""
        assert normalize_nhtsa_value("Front Wheel Drive System", "drivetrain") == "FWD"
        assert normalize_nhtsa_value("Rear Wheel", "drivetrain") == "RWD"
        assert normalize_nhtsa_value("All Wheel Permanent", "drivetrain") == "AWD"

    def test_normalize_fallback_transmission_keywords(self):
        """Fallback detecta palabras clave en transmission."""
        assert normalize_nhtsa_value("Manual Transmission", "transmission") == "manual"
        assert normalize_nhtsa_value("Auto Gearbox", "transmission") == "automatic"

    def test_normalize_fallback_fuel_type_keywords(self):
        """Fallback detecta palabras clave en fuel_type."""
        assert normalize_nhtsa_value("Gasoline Fuel", "fuel_type") == "gasoline"
        assert normalize_nhtsa_value("Diesel Engine", "fuel_type") == "diesel"
        assert normalize_nhtsa_value("Electric Motor", "fuel_type") == "electric"
        assert normalize_nhtsa_value("Hybrid System", "fuel_type") == "hybrid"
        assert normalize_nhtsa_value("Plug-in", "fuel_type") == "plug_in"
        assert normalize_nhtsa_value("Flex Fuel Capability", "fuel_type") == "flex"

    def test_all_46_brands_in_mapping(self):
        """Verificar que las 46 marcas de FB estén en el mapping."""
        from prosell.infrastructure.services.nhtsa_normalizer import NHTSA_TO_FACEBOOK

        # Marcas que deberían estar (del archivo fbVehicleOptions.ts)
        expected_brands = [
            "acura", "alfa_romeo", "aston_martin", "audi", "bmw", "bentley",
            "buick", "cadillac", "chevrolet", "chrysler", "dodge", "ferrari",
            "fiat", "ford", "gmc", "genesis", "honda", "hummer", "hyundai",
            "infiniti", "jaguar", "jeep", "kia", "land_rover", "lexus",
            "lincoln", "lucid", "mini", "maserati", "mazda", "mercedes",
            "mitsubishi", "nissan", "polestar", "pontiac", "porsche", "ram",
            "rivian", "rolls_royce", "subaru", "tesla", "toyota", "volkswagen",
            "volvo",
        ]

        mapped_brands = set(v for k, v in NHTSA_TO_FACEBOOK.items() if v in expected_brands)

        # Verificar que todas las marcas esperadas están mapeadas
        for brand in expected_brands:
            assert brand in mapped_brands, f"Marca '{brand}' no encontrada en mapping"
