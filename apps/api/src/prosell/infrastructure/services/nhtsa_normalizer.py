"""
Normalizer para convertir valores NHTSA a valores Facebook Marketplace.

NHTSA VPIC API retorna valores descriptivos, pero nuestro sistema
usa los valores exactos de Facebook Marketplace para consistencia
entre scraping, publicación y frontend.
"""

# Mapping NHTSA → Facebook Marketplace
# Values are Spanish display labels (canonical_value in FACEBOOK_VEHICLE_VALUE_CATALOG).
# The legacy snake_case English aliases live in FACEBOOK_VEHICLE_VALUE_CATALOG.accepted_raw_aliases
# so reconcile() can still migrate older product rows. New products write directly in Spanish.
NHTSA_TO_FACEBOOK: dict[str, str] = {
    # ===== MAKE (Marca) =====
    "ACURA": "Acura",
    "ALFA ROMEO": "Alfa Romeo",
    "ASTON MARTIN": "Aston Martin",
    "AUDI": "Audi",
    "BMW": "BMW",
    "BENTLEY": "Bentley",
    "BUICK": "Buick",
    "CADILLAC": "Cadillac",
    "CHEVROLET": "Chevrolet",
    "CHRYSLER": "Chrysler",
    "DODGE": "Dodge",
    "FERRARI": "Ferrari",
    "FIAT": "Fiat",
    "FORD": "Ford",
    "GMC": "GMC",
    "GENESIS": "Genesis",
    "HONDA": "Honda",
    "HUMMER": "Hummer",
    "HYUNDAI": "Hyundai",
    "INFINITI": "Infiniti",
    "JAGUAR": "Jaguar",
    "JEEP": "Jeep",
    "KIA": "Kia",
    "LAND ROVER": "Land Rover",
    "LEXUS": "Lexus",
    "LINCOLN": "Lincoln",
    "LUCID": "Lucid",
    "MINI": "MINI",
    "MASERATI": "Maserati",
    "MAZDA": "Mazda",
    "MERCEDES-BENZ": "Mercedes-Benz",
    "MITSUBISHI": "Mitsubishi",
    "NISSAN": "Nissan",
    "POLESTAR": "Polestar",
    "PONTIAC": "Pontiac",
    "PORSCHE": "Porsche",
    "RAM": "Ram",
    "RIVIAN": "Rivian",
    "ROLLS-ROYCE": "Rolls-Royce",
    "SUBARU": "Subaru",
    "TESLA": "Tesla",
    "TOYOTA": "Toyota",
    "VOLKSWAGEN": "Volkswagen",
    "VOLVO": "Volvo",
    # ===== BODY TYPE (Tipo de Vehículo) =====
    "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)": "SUV",
    "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV) (MPV)": "SUV",
    "Sedan/Saloon": "Sedán",
    "Pickup": "Camioneta",
    "Coupe": "Coupé",
    "Hatchback/Liftback/Notchback": "Hatchback",
    "Convertible/Cabriolet/Roadster": "Convertible",
    "Wagon/Estate": "Familiar",
    "Minivan": "Miniván",
    "Multipurpose Passenger Vehicle (MPV)": "Miniván",
    "Truck": "Camioneta",
    # ===== DRIVETRAIN (Tracción) =====
    "Front-Wheel Drive": "FWD",
    "Rear-Wheel Drive": "RWD",
    "All-Wheel Drive": "AWD",
    "Four-Wheel Drive": "4WD",
    "4-Wheel Drive": "4WD",
    # ===== TRANSMISSION (Transmisión) =====
    "Automatic": "Transmisión automática",
    "Manual": "Transmisión manual",
    "Continuously Variable Transmission (CVT)": "Transmisión automática",
    "CVT": "Transmisión automática",
    "Dual Clutch": "Transmisión automática",
    "Automated Manual": "Transmisión automática",
    "Automatic Transmission": "Transmisión automática",
    "Manual Transmission": "Transmisión manual",
    # ===== FUEL TYPE (Tipo de Combustible) =====
    "Gasoline": "Gasolina",
    "Diesel": "Diésel",
    "Electric": "Eléctrico",
    "Hybrid": "Híbrido",
    "Plug-in Hybrid": "Híbrido eléctrico enchufable",
    "Flex Fuel": "Flexible",
    "Natural Gas": "Otro",
    "Propane": "Otro",
    # ===== ELECTRIFICATION LEVEL =====
    "BEV (Battery Electric Vehicle)": "BEV",
    "Battery Electric Vehicle (BEV)": "BEV",
    "PHEV (Plug-in Hybrid Electric Vehicle)": "PHEV",
    "Plug-in Hybrid Electric Vehicle (PHEV)": "PHEV",
    "HEV (Hybrid Electric Vehicle)": "Híbrido",
    "Hybrid Electric Vehicle (HEV)": "Híbrido",
    "Mild Hybrid": "Híbrido ligero",
    "Strong HEV": "Híbrido",
    "ICE": "Ninguno",
    # ===== WHEELBASE TYPE =====
    "Short Wheel Base": "Corta",
    "SWB": "Corta",
    "Standard Wheel Base": "Estándar",
    "Long Wheel Base": "Larga",
    "LWB": "Larga",
    "Extended Wheel Base": "Larga",
    # ===== BED TYPE (pickups) =====
    "Short Bed": "Corta",
    "Standard Bed": "Estándar",
    "Regular Bed": "Estándar",
    "Long Bed": "Larga",
    # ===== CAB TYPE (pickups) =====
    "Regular Cab": "Regular",
    "Standard Cab": "Regular",
    "Extended Cab": "Extendida",
    "SuperCab": "Extendida",
    "King Cab": "Extendida",
    "Access Cab": "Extendida",
    "Crew Cab": "Doble cabina",
    "Double Cab": "Doble cabina",
    "Quad Cab": "Doble cabina",
    "SuperCrew": "Doble cabina",
    "Mega Cab": "Doble cabina",
}


def normalize_nhtsa_value(
    nhtsa_value: str | None,
    field_type: str,
) -> str | None:
    """
    Normaliza un valor de NHTSA al formato de Facebook Marketplace.

    Args:
        nhtsa_value: Valor crudo de NHTSA VPIC API
        field_type: Tipo de campo ("make", "body_type", "drivetrain",
                     "transmission", "fuel_type")

    Returns:
        Valor normalizado (Spanish canonical label) para Facebook Marketplace,
        o None si no hay valor

    Examples:
        >>> normalize_nhtsa_value("CHEVROLET", "make")
        "Chevrolet"
        >>> normalize_nhtsa_value(  # noqa: E501
        ...     "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)", "body_type"
        ... )
        "SUV"
        >>> normalize_nhtsa_value("Front-Wheel Drive", "drivetrain")
        "FWD"
    """
    if not nhtsa_value:
        return None

    # Limpiar valor
    cleaned = nhtsa_value.strip()
    if not cleaned:
        return None

    # Buscar en mapping (case-insensitive para NHTSA)
    normalized = NHTSA_TO_FACEBOOK.get(cleaned)
    if normalized:
        return normalized

    # Fallback según tipo de campo
    if field_type == "make":
        # Marca no encontrada → retornar el valor limpio
        return cleaned

    elif field_type == "body_type":
        cleaned_lower = cleaned.lower()
        if "suv" in cleaned_lower or "sport utility" in cleaned_lower:
            return "SUV"
        elif "sedan" in cleaned_lower:
            return "Sedán"
        elif "pickup" in cleaned_lower or "truck" in cleaned_lower:
            return "Camioneta"
        elif "coupe" in cleaned_lower:
            return "Coupé"
        elif "hatchback" in cleaned_lower:
            return "Hatchback"
        elif "convertible" in cleaned_lower or "cabriolet" in cleaned_lower:
            return "Convertible"
        elif "wagon" in cleaned_lower or "estate" in cleaned_lower:
            return "Familiar"
        elif "minivan" in cleaned_lower or "mpv" in cleaned_lower:
            return "Miniván"
        return "Otro"

    elif field_type == "drivetrain":
        cleaned_lower = cleaned.lower()
        if "front" in cleaned_lower or "fwd" in cleaned_lower:
            return "FWD"
        elif "rear" in cleaned_lower or "rwd" in cleaned_lower:
            return "RWD"
        elif "all" in cleaned_lower or "awd" in cleaned_lower:
            return "AWD"
        elif "four" in cleaned_lower or "4wd" in cleaned_lower or "4x4" in cleaned_lower:
            return "4WD"
        return cleaned.upper()

    elif field_type == "transmission":
        cleaned_lower = cleaned.lower()
        if "manual" in cleaned_lower:
            return "Transmisión manual"
        return "Transmisión automática"

    elif field_type == "fuel_type":
        cleaned_lower = cleaned.lower()
        if "gasoline" in cleaned_lower or "gas" in cleaned_lower:
            return "Gasolina"
        elif "diesel" in cleaned_lower:
            return "Diésel"
        elif "electric" in cleaned_lower:
            return "Eléctrico"
        elif "hybrid" in cleaned_lower:
            return "Híbrido"
        elif "plug" in cleaned_lower:
            return "Híbrido eléctrico enchufable"
        elif "flex" in cleaned_lower:
            return "Flexible"
        return "Gasolina"

    elif field_type == "electrification":
        cleaned_lower = cleaned.lower()
        if "bev" in cleaned_lower or "battery electric" in cleaned_lower:
            return "BEV"
        elif "phev" in cleaned_lower or "plug-in hybrid" in cleaned_lower:
            return "PHEV"
        elif "mild hybrid" in cleaned_lower:
            return "Híbrido ligero"
        elif "hybrid" in cleaned_lower or "hev" in cleaned_lower:
            return "Híbrido"
        return "Ninguno"

    elif field_type == "boolean":
        cleaned_lower = cleaned.lower()
        if cleaned_lower in ("yes", "y", "true", "1"):
            return "true"
        return "false"

    elif field_type == "wheelbase_type":
        cleaned_lower = cleaned.lower()
        if "short" in cleaned_lower or "swb" in cleaned_lower:
            return "Corta"
        elif "long" in cleaned_lower or "lwb" in cleaned_lower or "extended" in cleaned_lower:
            return "Larga"
        return "Estándar"

    elif field_type == "bed_type":
        cleaned_lower = cleaned.lower()
        if "short" in cleaned_lower:
            return "Corta"
        elif "long" in cleaned_lower:
            return "Larga"
        return "Estándar"

    elif field_type == "cab_type":
        cleaned_lower = cleaned.lower()
        crew_kw = ("crew", "double", "quad", "mega")
        extended_kw = ("extended", "super", "king", "access")
        if any(kw in cleaned_lower for kw in crew_kw):
            return "Doble cabina"
        if any(kw in cleaned_lower for kw in extended_kw):
            return "Extendida"
        return "Regular"

    # Default: retornar valor limpio
    return cleaned
