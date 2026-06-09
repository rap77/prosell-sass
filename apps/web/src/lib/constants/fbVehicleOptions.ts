/**
 * Facebook Marketplace vehicle field options — bilingual.
 *
 * Structure:
 *   key  → canonical value stored in DB and sent in PublishVehicleRequest
 *   es   → shown in ProSell UI (always Spanish for the vendedor)
 *   en   → used by Playwright when the FB profile is set to English
 *
 * Playwright receives the canonical key and resolves to the correct
 * localized string at runtime based on the detected FB UI language.
 */

export interface FbOption {
  key: string;
  es: string;
  en: string;
}

export const FB_VEHICLE_TYPES: FbOption[] = [
  { key: "car_truck", es: "Auto/camioneta", en: "Car/Truck" },
  { key: "motorcycle", es: "Motocicleta", en: "Motorcycle" },
  { key: "suv_4x4", es: "Todoterreno", en: "SUV/4x4" },
  { key: "rv_camper", es: "Casa rodante/caravana", en: "RV/Camper" },
  { key: "trailer", es: "Remolque", en: "Trailer" },
  { key: "boat", es: "Barco", en: "Boat" },
  {
    key: "commercial",
    es: "Comercial/industrial",
    en: "Commercial/Industrial",
  },
  { key: "other", es: "Otro", en: "Other" },
];

export const FB_BRANDS: FbOption[] = [
  { key: "acura", es: "Acura", en: "Acura" },
  { key: "alfa_romeo", es: "Alfa Romeo", en: "Alfa Romeo" },
  { key: "aston_martin", es: "Aston Martin", en: "Aston Martin" },
  { key: "audi", es: "Audi", en: "Audi" },
  { key: "bmw", es: "BMW", en: "BMW" },
  { key: "bentley", es: "Bentley", en: "Bentley" },
  { key: "buick", es: "Buick", en: "Buick" },
  { key: "cadillac", es: "Cadillac", en: "Cadillac" },
  { key: "chevrolet", es: "Chevrolet", en: "Chevrolet" },
  { key: "chrysler", es: "Chrysler", en: "Chrysler" },
  { key: "dodge", es: "Dodge", en: "Dodge" },
  { key: "ferrari", es: "Ferrari", en: "Ferrari" },
  { key: "fiat", es: "Fiat", en: "Fiat" },
  { key: "ford", es: "Ford", en: "Ford" },
  { key: "gmc", es: "GMC", en: "GMC" },
  { key: "genesis", es: "Genesis", en: "Genesis" },
  { key: "honda", es: "Honda", en: "Honda" },
  { key: "hummer", es: "Hummer", en: "Hummer" },
  { key: "hyundai", es: "Hyundai", en: "Hyundai" },
  { key: "infiniti", es: "Infiniti", en: "Infiniti" },
  { key: "jaguar", es: "Jaguar", en: "Jaguar" },
  { key: "jeep", es: "Jeep", en: "Jeep" },
  { key: "kia", es: "Kia", en: "Kia" },
  { key: "land_rover", es: "Land Rover", en: "Land Rover" },
  { key: "lexus", es: "Lexus", en: "Lexus" },
  { key: "lincoln", es: "Lincoln", en: "Lincoln" },
  { key: "lucid", es: "Lucid", en: "Lucid" },
  { key: "mini", es: "MINI", en: "MINI" },
  { key: "maserati", es: "Maserati", en: "Maserati" },
  { key: "mazda", es: "Mazda", en: "Mazda" },
  { key: "mercedes", es: "Mercedes-Benz", en: "Mercedes-Benz" },
  { key: "mitsubishi", es: "Mitsubishi", en: "Mitsubishi" },
  { key: "nissan", es: "Nissan", en: "Nissan" },
  { key: "polestar", es: "Polestar", en: "Polestar" },
  { key: "pontiac", es: "Pontiac", en: "Pontiac" },
  { key: "porsche", es: "Porsche", en: "Porsche" },
  { key: "ram", es: "Ram", en: "Ram" },
  { key: "rivian", es: "Rivian", en: "Rivian" },
  { key: "rolls_royce", es: "Rolls-Royce", en: "Rolls-Royce" },
  { key: "subaru", es: "Subaru", en: "Subaru" },
  { key: "tesla", es: "Tesla", en: "Tesla" },
  { key: "toyota", es: "Toyota", en: "Toyota" },
  { key: "volkswagen", es: "Volkswagen", en: "Volkswagen" },
  { key: "volvo", es: "Volvo", en: "Volvo" },
];

export const FB_BODY_STYLES: FbOption[] = [
  { key: "coupe", es: "Coupé", en: "Coupe" },
  { key: "pickup", es: "Camioneta", en: "Pickup Truck" },
  { key: "sedan", es: "Sedán", en: "Sedan" },
  { key: "hatchback", es: "Hatchback", en: "Hatchback" },
  { key: "suv", es: "SUV", en: "SUV" },
  { key: "convertible", es: "Convertible", en: "Convertible" },
  { key: "wagon", es: "Familiar", en: "Wagon" },
  { key: "minivan", es: "Miniván", en: "Minivan" },
  { key: "small_car", es: "Auto pequeño", en: "Small Car" },
  { key: "other", es: "Otro", en: "Other" },
];

export const FB_EXTERIOR_COLORS: FbOption[] = [
  { key: "black", es: "Negro", en: "Black" },
  { key: "blue", es: "Azul", en: "Blue" },
  { key: "brown", es: "Marrón", en: "Brown" },
  { key: "gold", es: "Dorado", en: "Gold" },
  { key: "green", es: "Verde", en: "Green" },
  { key: "gray", es: "Gris", en: "Gray" },
  { key: "pink", es: "Rosa", en: "Pink" },
  { key: "purple", es: "Violeta", en: "Purple" },
  { key: "red", es: "Rojo", en: "Red" },
  { key: "silver", es: "Plateado", en: "Silver" },
  { key: "orange", es: "Naranja", en: "Orange" },
  { key: "white", es: "Blanco", en: "White" },
  { key: "yellow", es: "Amarillo", en: "Yellow" },
  { key: "charcoal", es: "Carbón", en: "Charcoal" },
  { key: "off_white", es: "Blanco grisáceo", en: "Off-White" },
  { key: "tan", es: "Tostado", en: "Tan" },
  { key: "beige", es: "Beige", en: "Beige" },
  { key: "burgundy", es: "Bordó", en: "Burgundy" },
  { key: "turquoise", es: "Turquesa", en: "Turquoise" },
];

export const FB_INTERIOR_COLORS: FbOption[] = [
  { key: "black", es: "Negro", en: "Black" },
  { key: "blue", es: "Azul", en: "Blue" },
  { key: "brown", es: "Marrón", en: "Brown" },
  { key: "gold", es: "Dorado", en: "Gold" },
  { key: "green", es: "Verde", en: "Green" },
  { key: "gray", es: "Gris", en: "Gray" },
  { key: "pink", es: "Rosa", en: "Pink" },
  { key: "purple", es: "Violeta", en: "Purple" },
  { key: "red", es: "Rojo", en: "Red" },
  { key: "silver", es: "Plateado", en: "Silver" },
  { key: "orange", es: "Naranja", en: "Orange" },
  { key: "white", es: "Blanco", en: "White" },
  { key: "yellow", es: "Amarillo", en: "Yellow" },
  { key: "charcoal", es: "Carbón", en: "Charcoal" },
  { key: "off_white", es: "Blanco grisáceo", en: "Off-White" },
  { key: "tan", es: "Tostado", en: "Tan" },
  { key: "beige", es: "Beige", en: "Beige" },
  { key: "burgundy", es: "Bordó", en: "Burgundy" },
  { key: "turquoise", es: "Turquesa", en: "Turquoise" },
];

export const FB_VEHICLE_CONDITIONS: FbOption[] = [
  { key: "excellent", es: "Excelente", en: "Excellent" },
  { key: "very_good", es: "Muy bueno", en: "Very Good" },
  { key: "good", es: "Bueno", en: "Good" },
  { key: "fair", es: "Aceptable", en: "Fair" },
  { key: "poor", es: "Malo", en: "Poor" },
];

export const FB_FUEL_TYPES: FbOption[] = [
  { key: "gasoline", es: "Gasolina", en: "Gasoline" },
  { key: "diesel", es: "Diésel", en: "Diesel" },
  { key: "electric", es: "Eléctrico", en: "Electric" },
  { key: "hybrid", es: "Híbrido", en: "Hybrid" },
  { key: "plug_in", es: "Híbrido eléctrico enchufable", en: "Plug-in Hybrid" },
  { key: "flex", es: "Flexible", en: "Flex Fuel" },
  { key: "other", es: "Otro", en: "Other" },
];

export const FB_TRANSMISSIONS: FbOption[] = [
  { key: "automatic", es: "Transmisión automática", en: "Automatic" },
  { key: "manual", es: "Transmisión manual", en: "Manual" },
];

// Years descending (most recent first)
export const FB_YEARS: number[] = Array.from(
  { length: 2026 - 1901 + 1 },
  (_, i) => 2026 - i,
);

/**
 * Resolve a canonical key to its localized label.
 * Used by Playwright to pick the correct FB dropdown option at runtime.
 *
 * @example
 *   resolveFbLabel(FB_FUEL_TYPES, "gasoline", "en") // → "Gasoline"
 *   resolveFbLabel(FB_FUEL_TYPES, "gasoline", "es") // → "Gasolina"
 */
export function resolveFbLabel(
  options: FbOption[],
  key: string,
  lang: "es" | "en",
): string | undefined {
  return options.find((o) => o.key === key)?.[lang];
}
