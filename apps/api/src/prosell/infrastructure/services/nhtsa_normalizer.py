"""
Normalizer para convertir valores NHTSA a valores Facebook Marketplace.

NHTSA VPIC API retorna valores descriptivos, pero nuestro sistema
usa los valores exactos de Facebook Marketplace para consistencia
entre scraping, publicación y frontend.
"""

# Mapping NHTSA → Facebook Marketplace
NHTSA_TO_FACEBOOK: dict[str, str] = {
    # ===== MAKE (Marca) =====
    # Convertir UPPERCASE → lowercase con guiones bajos
    "ACURA": "acura",
    "ALFA ROMEO": "alfa_romeo",
    "ASTON MARTIN": "aston_martin",
    "AUDI": "audi",
    "BMW": "bmw",
    "BENTLEY": "bentley",
    "BUICK": "buick",
    "CADILLAC": "cadillac",
    "CHEVROLET": "chevrolet",
    "CHRYSLER": "chrysler",
    "DODGE": "dodge",
    "FERRARI": "ferrari",
    "FIAT": "fiat",
    "FORD": "ford",
    "GMC": "gmc",
    "GENESIS": "genesis",
    "HONDA": "honda",
    "HUMMER": "hummer",
    "HYUNDAI": "hyundai",
    "INFINITI": "infiniti",
    "JAGUAR": "jaguar",
    "JEEP": "jeep",
    "KIA": "kia",
    "LAND ROVER": "land_rover",
    "LEXUS": "lexus",
    "LINCOLN": "lincoln",
    "LUCID": "lucid",
    "MINI": "mini",
    "MASERATI": "maserati",
    "MAZDA": "mazda",
    "MERCEDES-BENZ": "mercedes",
    "MITSUBISHI": "mitsubishi",
    "NISSAN": "nissan",
    "POLESTAR": "polestar",
    "PONTIAC": "pontiac",
    "PORSCHE": "porsche",
    "RAM": "ram",
    "RIVIAN": "rivian",
    "ROLLS-ROYCE": "rolls_royce",
    "SUBARU": "subaru",
    "TESLA": "tesla",
    "TOYOTA": "toyota",
    "VOLKSWAGEN": "volkswagen",
    "VOLVO": "volvo",
    # ===== BODY TYPE (Tipo de Vehículo) =====
    # Descriptivo largo → lowercase simple
    "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)": "suv",
    "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV) (MPV)": "suv",
    "Sedan/Saloon": "sedan",
    "Pickup": "pickup",
    "Coupe": "coupe",
    "Hatchback/Liftback/Notchback": "hatchback",
    "Convertible/Cabriolet/Roadster": "convertible",
    "Wagon/Estate": "wagon",
    "Minivan": "minivan",
    "Multipurpose Passenger Vehicle (MPV)": "minivan",
    "Truck": "pickup",
    # ===== DRIVETRAIN (Tracción) =====
    # Descriptivo → UPPERCASE acronym
    "Front-Wheel Drive": "FWD",
    "Rear-Wheel Drive": "RWD",
    "All-Wheel Drive": "AWD",
    "Four-Wheel Drive": "4WD",
    "4-Wheel Drive": "4WD",
    # ===== TRANSMISSION (Transmisión) =====
    # Title case → lowercase
    "Automatic": "automatic",
    "Manual": "manual",
    "Continuously Variable Transmission (CVT)": "automatic",
    "CVT": "automatic",
    "Dual Clutch": "automatic",
    "Automated Manual": "automatic",
    "Automatic Transmission": "automatic",
    "Manual Transmission": "manual",
    # ===== FUEL TYPE (Tipo de Combustible) =====
    # Title case → lowercase
    "Gasoline": "gasoline",
    "Diesel": "diesel",
    "Electric": "electric",
    "Hybrid": "hybrid",
    "Plug-in Hybrid": "plug_in",
    "Flex Fuel": "flex",
    "Natural Gas": "other",
    "Propane": "other",
    # ===== ELECTRIFICATION LEVEL =====
    "BEV (Battery Electric Vehicle)": "bev",
    "Battery Electric Vehicle (BEV)": "bev",
    "PHEV (Plug-in Hybrid Electric Vehicle)": "phev",
    "Plug-in Hybrid Electric Vehicle (PHEV)": "phev",
    "HEV (Hybrid Electric Vehicle)": "hybrid",
    "Hybrid Electric Vehicle (HEV)": "hybrid",
    "Mild Hybrid": "mild_hybrid",
    "Strong HEV": "hybrid",
    "ICE": "none",
    # ===== WHEELBASE TYPE =====
    "Short Wheel Base": "short",
    "SWB": "short",
    "Standard Wheel Base": "standard",
    "Long Wheel Base": "long",
    "LWB": "long",
    "Extended Wheel Base": "long",
    # ===== BED TYPE (pickups) =====
    "Short Bed": "short",
    "Standard Bed": "standard",
    "Regular Bed": "standard",
    "Long Bed": "long",
    # ===== CAB TYPE (pickups) =====
    "Regular Cab": "regular",
    "Standard Cab": "regular",
    "Extended Cab": "extended",
    "SuperCab": "extended",
    "King Cab": "extended",
    "Access Cab": "extended",
    "Crew Cab": "crew",
    "Double Cab": "crew",
    "Quad Cab": "crew",
    "SuperCrew": "crew",
    "Mega Cab": "crew",
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
        Valor normalizado para Facebook Marketplace, o None si no hay valor

    Examples:
        >>> normalize_nhtsa_value("CHEVROLET", "make")
        "chevrolet"
        >>> normalize_nhtsa_value(  # noqa: E501
        ...     "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)", "body_type"
        ... )
        "suv"
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
        # Marca no encontrada → intentar lowercase con guiones
        return cleaned.lower().replace(" ", "_").replace("-", "_")

    elif field_type == "body_type":
        # Tipo no encontrado → buscar palabras clave
        cleaned_lower = cleaned.lower()
        if "suv" in cleaned_lower or "sport utility" in cleaned_lower:
            return "suv"
        elif "sedan" in cleaned_lower:
            return "sedan"
        elif "pickup" in cleaned_lower or "truck" in cleaned_lower:
            return "pickup"
        elif "coupe" in cleaned_lower:
            return "coupe"
        elif "hatchback" in cleaned_lower:
            return "hatchback"
        elif "convertible" in cleaned_lower or "cabriolet" in cleaned_lower:
            return "convertible"
        elif "wagon" in cleaned_lower or "estate" in cleaned_lower:
            return "wagon"
        elif "minivan" in cleaned_lower or "mpv" in cleaned_lower:
            return "minivan"
        return "other"

    elif field_type == "drivetrain":
        # Tracción no encontrada → intentar extraer acronym
        cleaned_lower = cleaned.lower()
        if "front" in cleaned_lower or "fwd" in cleaned_lower:
            return "FWD"
        elif "rear" in cleaned_lower or "rwd" in cleaned_lower:
            return "RWD"
        elif "all" in cleaned_lower or "awd" in cleaned_lower:
            return "AWD"
        elif "four" in cleaned_lower or "4wd" in cleaned_lower or "4x4" in cleaned_lower:
            return "4WD"
        # Default: retornar en uppercase
        return cleaned.upper()

    elif field_type == "transmission":
        # Transmisión no encontrada → detectar automática vs manual
        cleaned_lower = cleaned.lower()
        if "manual" in cleaned_lower:
            return "manual"
        # Default: asumir automática
        return "automatic"

    elif field_type == "fuel_type":
        # Combustible no encontrado → detectar tipo
        cleaned_lower = cleaned.lower()
        if "gasoline" in cleaned_lower or "gas" in cleaned_lower:
            return "gasoline"
        elif "diesel" in cleaned_lower:
            return "diesel"
        elif "electric" in cleaned_lower:
            return "electric"
        elif "hybrid" in cleaned_lower:
            return "hybrid"
        elif "plug" in cleaned_lower:
            return "plug_in"
        elif "flex" in cleaned_lower:
            return "flex"
        # Default: asumir gasoline
        return "gasoline"

    elif field_type == "electrification":
        cleaned_lower = cleaned.lower()
        if "bev" in cleaned_lower or "battery electric" in cleaned_lower:
            return "bev"
        elif "phev" in cleaned_lower or "plug-in hybrid" in cleaned_lower:
            return "phev"
        elif "mild hybrid" in cleaned_lower:
            return "mild_hybrid"
        elif "hybrid" in cleaned_lower or "hev" in cleaned_lower:
            return "hybrid"
        return "none"

    elif field_type == "boolean":
        cleaned_lower = cleaned.lower()
        if cleaned_lower in ("yes", "y", "true", "1"):
            return "true"
        return "false"

    elif field_type == "wheelbase_type":
        cleaned_lower = cleaned.lower()
        if "short" in cleaned_lower or "swb" in cleaned_lower:
            return "short"
        elif "long" in cleaned_lower or "lwb" in cleaned_lower or "extended" in cleaned_lower:
            return "long"
        return "standard"

    elif field_type == "bed_type":
        cleaned_lower = cleaned.lower()
        if "short" in cleaned_lower:
            return "short"
        elif "long" in cleaned_lower:
            return "long"
        return "standard"

    elif field_type == "cab_type":
        cleaned_lower = cleaned.lower()
        crew_kw = ("crew", "double", "quad", "mega")
        extended_kw = ("extended", "super", "king", "access")
        if any(kw in cleaned_lower for kw in crew_kw):
            return "crew"
        if any(kw in cleaned_lower for kw in extended_kw):
            return "extended"
        return "regular"

    # Default: retornar valor limpio en lowercase
    return cleaned.lower()
