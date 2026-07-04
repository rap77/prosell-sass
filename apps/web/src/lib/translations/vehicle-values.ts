/**
 * Vehicle attribute value translations (DB values → Spanish labels).
 * ponytail: dict only, no i18n lib. Add next-intl when multi-locale needed.
 */

const es = {
  fuel_type: {
    gasoline: "Gasolina",
    diesel: "Diésel",
    hybrid: "Híbrido",
    electric: "Eléctrico",
    plug_in: "Híbrido Enchufable",
    flex: "Flex Fuel",
  },
  transmission: {
    automatic: "Automática",
    manual: "Manual",
  },
  drivetrain: {
    FWD: "Tracción Delantera",
    RWD: "Tracción Trasera",
    AWD: "Tracción Integral",
    "4WD": "4x4",
  },
  electrification_level: {
    bev: "100% Eléctrico",
    phev: "Híbrido Enchufable",
    hybrid: "Híbrido",
    mild_hybrid: "Híbrido Suave",
    none: "Combustión",
  },
  body_type: {
    sedan: "Sedán",
    hatchback: "Hatchback",
    suv: "SUV",
    pickup: "Pick-up",
    coupe: "Coupé",
    convertible: "Convertible",
    wagon: "Familiar",
    minivan: "Minivan",
    other: "Otro",
  },
  wheelbase_type: {
    short: "Corta",
    standard: "Estándar",
    long: "Larga",
  },
  bed_type: {
    short: "Corta",
    standard: "Estándar",
    long: "Larga",
  },
  cab_type: {
    regular: "Cabina Simple",
    extended: "Cabina Extendida",
    crew: "Cabina Doble",
  },
} as const;

type Field = keyof typeof es;

export function tv(field: string, value: string | undefined | null): string {
  if (!value) return "";
  const fieldDict = es[field as Field];
  if (!fieldDict) return value;
  return (fieldDict as Record<string, string>)[value] ?? value;
}

// Field label translations
const fieldLabels: Record<string, string> = {
  vin: "VIN",
  stock_number: "Número de Stock",
  make: "Marca",
  model: "Modelo",
  year: "Año",
  trim: "Versión",
  engine: "Motor",
  fuel_type: "Combustible",
  cylinders: "Cilindros",
  displacement_l: "Cilindrada (L)",
  horsepower: "Caballos de Fuerza",
  engine_kw: "Potencia (kW)",
  turbo: "Turbo",
  transmission: "Transmisión",
  body_type: "Tipo de Carrocería",
  drivetrain: "Tracción",
  doors: "Puertas",
  windows: "Ventanas",
  wheelbase_type: "Distancia entre Ejes",
  bed_type: "Tipo de Caja",
  cab_type: "Tipo de Cabina",
  seats: "Asientos",
  seat_rows: "Filas de Asientos",
  seatbelts: "Cinturones",
  gvwr: "Peso Bruto (lbs)",
  electrification_level: "Electrificación",
  battery_kwh: "Batería (kWh)",
  battery_type: "Tipo de Batería",
  charger_level: "Nivel de Cargador",
  charger_power_kw: "Potencia de Carga (kW)",
  ev_drive_unit: "Unidad de Tracción EV",
  mileage: "Kilometraje",
  exterior_color: "Color Exterior",
  interior_color: "Color Interior",
  has_sunroof: "Techo Solar",
  has_navigation: "Navegación",
  has_leather: "Cuero",
  has_backup_camera: "Cámara de Reversa",
  has_bluetooth: "Bluetooth",
  manufacturer: "Fabricante",
  plant_city: "Ciudad de Planta",
  plant_state: "Estado de Planta",
  plant_country: "País de Fabricación",
};

export function tLabel(field: string): string {
  return fieldLabels[field] ?? field;
}
