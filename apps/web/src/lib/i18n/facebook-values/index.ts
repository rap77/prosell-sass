/**
 * Facebook Marketplace values generated from an external publisher catalog.
 *
 * Regenerate with:
 *   bun scripts/regen-facebook-values.ts /path/to/marketplace_options.json
 *
 * The source is deliberately not copied into this repository. ES and EN values
 * are paired by source position because the source has inconsistent English
 * year IDs from 1999 downward. IDs remain locale-specific. Device IDs are also
 * not unique in the source, so lookup returns every matching value.
 */

export type Locale = "es" | "en";

export interface FacebookValue {
  readonly key: string;
  readonly es: string;
  readonly en: string;
  readonly facebookIds: Readonly<Partial<Record<Locale, number>>>;
}

export type FacebookFieldKey =
  | "label"
  | "category"
  | "vehicle_type"
  | "body_style"
  | "vehicle_condition"
  | "fuel_type"
  | "transmission"
  | "brand"
  | "year"
  | "exterior_color"
  | "interior_color"
  | "item_state"
  | "platform"
  | "device";

export const FACEBOOK_FIELD_DOCS: Readonly<Record<FacebookFieldKey, string>> =
  Object.freeze({
    label: "UI labels",
    category: "Marketplace categories",
    vehicle_type: "Vehicle types",
    body_style: "Body styles",
    vehicle_condition: "Vehicle conditions",
    fuel_type: "Fuel types",
    transmission: "Transmissions",
    brand: "Vehicle brands",
    year: "Years",
    exterior_color: "Exterior colors",
    interior_color: "Interior colors",
    item_state: "Item states",
    platform: "Gaming platforms",
    device: "Mobile devices",
  });

export const LABEL_VALUES: readonly FacebookValue[] = Object.freeze([
  {
    key: "anadir_fotos",
    es: "Añadir fotos",
    en: "Add Photos",
    facebookIds: {},
  },
  { key: "titulo", es: "Título", en: "Title", facebookIds: {} },
  { key: "precio", es: "Precio", en: "Price", facebookIds: {} },
  { key: "descripcion", es: "Descripción", en: "Description", facebookIds: {} },
  { key: "estado", es: "Estado", en: "Condition", facebookIds: {} },
  { key: "plataforma", es: "Plataforma", en: "Platform", facebookIds: {} },
  {
    key: "nombre_del_dispositivo",
    es: "Nombre del dispositivo",
    en: "Compatible Cell Phone",
    facebookIds: {},
  },
  { key: "marketplace", es: "Marketplace", en: "Marketplace", facebookIds: {} },
  { key: "categoria", es: "Categoría", en: "Category", facebookIds: {} },
  { key: "siguiente", es: "Siguiente", en: "Next", facebookIds: {} },
  { key: "publicar", es: "Publicar", en: "Post", facebookIds: {} },
  {
    key: "coleccion_de_tus_articulos_de_marketplace",
    es: "Colección de tus artículos de Marketplace",
    en: "Collection",
    facebookIds: {},
  },
  { key: "eliminar", es: "Eliminar", en: "Delete", facebookIds: {} },
  { key: "cerrar", es: "Cerrar", en: "Close", facebookIds: {} },
  {
    key: "etiquetas_de_producto",
    es: "Etiquetas de producto",
    en: "Product tags",
    facebookIds: {},
  },
  {
    key: "tipo_de_vehiculo",
    es: "Tipo de vehículo",
    en: "Vehicle Type",
    facebookIds: {},
  },
  { key: "marca", es: "Marca", en: "Brand", facebookIds: {} },
  { key: "modelo", es: "Modelo", en: "Model", facebookIds: {} },
  { key: "ubicacion", es: "Ubicación", en: "Location", facebookIds: {} },
  { key: "ano", es: "Año", en: "Year", facebookIds: {} },
  { key: "millaje", es: "Millaje", en: "Mileage", facebookIds: {} },
  { key: "carroceria", es: "Carrocería", en: "Body Style", facebookIds: {} },
  {
    key: "color_del_exterior",
    es: "Color del exterior",
    en: "Exterior Color",
    facebookIds: {},
  },
  {
    key: "color_del_interior",
    es: "Color del interior",
    en: "Interior Color",
    facebookIds: {},
  },
  {
    key: "estado_del_vehiculo",
    es: "Estado del vehículo",
    en: "Vehicle Condition",
    facebookIds: {},
  },
  {
    key: "tipo_de_combustible",
    es: "Tipo de combustible",
    en: "Fuel Type",
    facebookIds: {},
  },
  {
    key: "transmision",
    es: "Transmisión",
    en: "Transmission",
    facebookIds: {},
  },
]);

export const CATEGORY_VALUES: readonly FacebookValue[] = Object.freeze([
  {
    key: "herramientas",
    es: "Herramientas",
    en: "Tools",
    facebookIds: { es: 2, en: 2 },
  },
  {
    key: "muebles",
    es: "Muebles",
    en: "Furniture",
    facebookIds: { es: 3, en: 3 },
  },
  { key: "hogar", es: "Hogar", en: "Household", facebookIds: { es: 4, en: 4 } },
  {
    key: "jardineria",
    es: "Jardinería",
    en: "Garden",
    facebookIds: { es: 5, en: 5 },
  },
  {
    key: "electrodomesticos",
    es: "Electrodomésticos",
    en: "Appliances",
    facebookIds: { es: 6, en: 6 },
  },
  {
    key: "videojuegos",
    es: "Videojuegos",
    en: "Video Games",
    facebookIds: { es: 8, en: 8 },
  },
  {
    key: "literatura_cine_y_musica",
    es: "Literatura, cine y musica",
    en: "Books, Movies & Music",
    facebookIds: { es: 9, en: 9 },
  },
  {
    key: "bolsos_y_equipaje",
    es: "Bolsos y equipaje",
    en: "Bags & Luggage",
    facebookIds: { es: 11, en: 11 },
  },
  {
    key: "ropa_y_calzado_de_mujer",
    es: "Ropa y calzado de mujer",
    en: "Women's clothing & shoes",
    facebookIds: { es: 12, en: 12 },
  },
  {
    key: "ropa_y_calzado_de_hombre",
    es: "Ropa y calzado de hombre",
    en: "Men's clothing & shoes",
    facebookIds: { es: 13, en: 13 },
  },
  {
    key: "joyas_y_accesorios",
    es: "Joyas y accesorios",
    en: "Jewelry & Accessories",
    facebookIds: { es: 14, en: 14 },
  },
  {
    key: "salud_y_belleza",
    es: "Salud y belleza",
    en: "Health & beauty",
    facebookIds: { es: 16, en: 16 },
  },
  {
    key: "suministros_para_mascotas",
    es: "Suministros para mascotas",
    en: "Pet Supplies",
    facebookIds: { es: 17, en: 17 },
  },
  {
    key: "bebes_y_ninos",
    es: "Bebes y niños",
    en: "Baby & kids",
    facebookIds: { es: 18, en: 18 },
  },
  {
    key: "juguetes_y_juegos",
    es: "Juguetes y juegos",
    en: "Toys & Games",
    facebookIds: { es: 19, en: 19 },
  },
  {
    key: "electronica_e_informatica",
    es: "Electronica e informatica",
    en: "Electronics & computers",
    facebookIds: { es: 21, en: 21 },
  },
  {
    key: "telefonos_moviles",
    es: "Telefonos moviles",
    en: "Mobile phones",
    facebookIds: { es: 22, en: 22 },
  },
  {
    key: "bicicletas",
    es: "Bicicletas",
    en: "Bicycles",
    facebookIds: { es: 24, en: 24 },
  },
  {
    key: "arte_y_manualidades",
    es: "Arte y manualidades",
    en: "Arts & Crafts",
    facebookIds: { es: 25, en: 25 },
  },
  {
    key: "deportes_y_actividades_al_aire_libre",
    es: "Deportes y actividades al aire libre",
    en: "Sports & Outdoors",
    facebookIds: { es: 26, en: 26 },
  },
  {
    key: "recambios_de_automoviles",
    es: "Recambios de automoviles",
    en: "Auto parts",
    facebookIds: { es: 27, en: 27 },
  },
  {
    key: "instrumentos_musicales",
    es: "Instrumentos musicales",
    en: "Musical Instruments",
    facebookIds: { es: 28, en: 28 },
  },
  {
    key: "antiguedades_y_articulos_coleccionables",
    es: "Antigüedades y articulos coleccionables",
    en: "Antiques & Collectibles",
    facebookIds: { es: 29, en: 29 },
  },
  {
    key: "venta_de_articulos_de_segunda_mano",
    es: "Venta de articulos de segunda mano",
    en: "Garage Sale",
    facebookIds: { es: 31, en: 31 },
  },
  {
    key: "varios",
    es: "Varios",
    en: "Miscellaneous",
    facebookIds: { es: 32, en: 32 },
  },
  {
    key: "vehiculos",
    es: "Vehiculos",
    en: "Vehicles",
    facebookIds: { es: 33, en: 33 },
  },
]);

export const VEHICLE_TYPE_VALUES: readonly FacebookValue[] = Object.freeze([
  {
    key: "auto_camioneta",
    es: "Auto/camioneta",
    en: "Car/Truck",
    facebookIds: { es: 1, en: 1 },
  },
  {
    key: "motocicleta",
    es: "Motocicleta",
    en: "Motorcycle",
    facebookIds: { es: 2, en: 2 },
  },
  {
    key: "todoterreno",
    es: "Todoterreno",
    en: "Powersport",
    facebookIds: { es: 3, en: 3 },
  },
  {
    key: "casa_rodante_caravana",
    es: "Casa rodante/caravana",
    en: "RV/Camper",
    facebookIds: { es: 4, en: 4 },
  },
  {
    key: "remolque",
    es: "Remolque",
    en: "Trailer",
    facebookIds: { es: 5, en: 5 },
  },
  { key: "barco", es: "Barco", en: "Boat", facebookIds: { es: 6, en: 6 } },
  {
    key: "comercial_industrial",
    es: "Comercial/industrial",
    en: "Commercial/Industrial",
    facebookIds: { es: 7, en: 7 },
  },
  { key: "otro", es: "Otro", en: "Other", facebookIds: { es: 8, en: 8 } },
]);

export const BODY_STYLE_VALUES: readonly FacebookValue[] = Object.freeze([
  { key: "coupe", es: "Coupé", en: "Coupe", facebookIds: { es: 1, en: 1 } },
  {
    key: "camioneta",
    es: "Camioneta",
    en: "Truck",
    facebookIds: { es: 2, en: 2 },
  },
  { key: "sedan", es: "Sedán", en: "Sedan", facebookIds: { es: 3, en: 3 } },
  {
    key: "hatchback",
    es: "Hatchback",
    en: "Hatchback",
    facebookIds: { es: 4, en: 4 },
  },
  { key: "suv", es: "SUV", en: "SUV", facebookIds: { es: 5, en: 5 } },
  {
    key: "convertible",
    es: "Convertible",
    en: "Convertible",
    facebookIds: { es: 6, en: 6 },
  },
  {
    key: "familiar",
    es: "Familiar",
    en: "Wagon",
    facebookIds: { es: 7, en: 7 },
  },
  {
    key: "minivan",
    es: "Miniván",
    en: "Minivan",
    facebookIds: { es: 8, en: 8 },
  },
  {
    key: "auto_pequeno",
    es: "Auto pequeño",
    en: "Small Car",
    facebookIds: { es: 9, en: 9 },
  },
  { key: "otro", es: "Otro", en: "Other", facebookIds: { es: 10, en: 10 } },
]);

export const VEHICLE_CONDITION_VALUES: readonly FacebookValue[] = Object.freeze(
  [
    {
      key: "excelente",
      es: "Excelente",
      en: "Excellent",
      facebookIds: { es: 1, en: 1 },
    },
    {
      key: "muy_bueno",
      es: "Muy bueno",
      en: "Very Good",
      facebookIds: { es: 2, en: 2 },
    },
    { key: "bueno", es: "Bueno", en: "Good", facebookIds: { es: 3, en: 3 } },
    {
      key: "aceptable",
      es: "Aceptable",
      en: "Fair",
      facebookIds: { es: 4, en: 4 },
    },
    { key: "malo", es: "Malo", en: "Poor", facebookIds: { es: 5, en: 5 } },
  ],
);

export const FUEL_TYPE_VALUES: readonly FacebookValue[] = Object.freeze([
  { key: "diesel", es: "Diésel", en: "Diesel", facebookIds: { es: 1, en: 1 } },
  {
    key: "electrico",
    es: "Eléctrico",
    en: "Electric",
    facebookIds: { es: 2, en: 2 },
  },
  {
    key: "gasolina",
    es: "Gasolina",
    en: "Gasoline",
    facebookIds: { es: 6, en: 6 },
  },
  {
    key: "flexible",
    es: "Flexible",
    en: "Flex",
    facebookIds: { es: 4, en: 4 },
  },
  {
    key: "hibrido",
    es: "Híbrido",
    en: "Hybrid",
    facebookIds: { es: 5, en: 5 },
  },
  {
    key: "hibrido_electrico_enchufable",
    es: "Híbrido eléctrico enchufable",
    en: "Plug-In Hybrid",
    facebookIds: { es: 7, en: 7 },
  },
  { key: "otro", es: "Otro", en: "Other", facebookIds: { es: 8, en: 8 } },
]);

export const TRANSMISSION_VALUES: readonly FacebookValue[] = Object.freeze([
  {
    key: "transmision_manual",
    es: "Transmisión manual",
    en: "Manual Transmission",
    facebookIds: { es: 1, en: 1 },
  },
  {
    key: "transmision_automatica",
    es: "Transmisión automática",
    en: "Automatic Transmission",
    facebookIds: { es: 2, en: 2 },
  },
]);

export const BRAND_VALUES: readonly FacebookValue[] = Object.freeze([
  { key: "acura", es: "Acura", en: "Acura", facebookIds: { es: 1, en: 1 } },
  {
    key: "alfa_romeo",
    es: "Alfa Romeo",
    en: "Alfa Romeo",
    facebookIds: { es: 2, en: 2 },
  },
  {
    key: "aston_martin",
    es: "Aston Martin",
    en: "Aston Martin",
    facebookIds: { es: 3, en: 3 },
  },
  { key: "audi", es: "Audi", en: "Audi", facebookIds: { es: 4, en: 4 } },
  { key: "bmw", es: "BMW", en: "BMW", facebookIds: { es: 5, en: 5 } },
  {
    key: "bentley",
    es: "Bentley",
    en: "Bentley",
    facebookIds: { es: 6, en: 6 },
  },
  { key: "buick", es: "Buick", en: "Buick", facebookIds: { es: 7, en: 7 } },
  { key: "coda", es: "CODA", en: "CODA", facebookIds: { es: 8, en: 8 } },
  {
    key: "cadillac",
    es: "Cadillac",
    en: "Cadillac",
    facebookIds: { es: 9, en: 9 },
  },
  {
    key: "chevrolet",
    es: "Chevrolet",
    en: "Chevrolet",
    facebookIds: { es: 10, en: 10 },
  },
  {
    key: "chrysler",
    es: "Chrysler",
    en: "Chrysler",
    facebookIds: { es: 11, en: 11 },
  },
  {
    key: "daewoo",
    es: "Daewoo",
    en: "Daewoo",
    facebookIds: { es: 12, en: 12 },
  },
  {
    key: "daihatsu",
    es: "Daihatsu",
    en: "Daihatsu",
    facebookIds: { es: 13, en: 13 },
  },
  { key: "dodge", es: "Dodge", en: "Dodge", facebookIds: { es: 14, en: 14 } },
  { key: "eagle", es: "Eagle", en: "Eagle", facebookIds: { es: 15, en: 15 } },
  {
    key: "ferrari",
    es: "Ferrari",
    en: "Ferrari",
    facebookIds: { es: 16, en: 16 },
  },
  { key: "fiat", es: "Fiat", en: "Fiat", facebookIds: { es: 17, en: 17 } },
  {
    key: "fisker",
    es: "Fisker",
    en: "Fisker",
    facebookIds: { es: 18, en: 18 },
  },
  { key: "ford", es: "Ford", en: "Ford", facebookIds: { es: 19, en: 19 } },
  {
    key: "freightliner",
    es: "Freightliner",
    en: "Freightliner",
    facebookIds: { es: 20, en: 20 },
  },
  { key: "gmc", es: "GMC", en: "GMC", facebookIds: { es: 21, en: 21 } },
  {
    key: "genesis",
    es: "Genesis",
    en: "Genesis",
    facebookIds: { es: 22, en: 22 },
  },
  { key: "geo", es: "Geo", en: "Geo", facebookIds: { es: 23, en: 23 } },
  { key: "honda", es: "Honda", en: "Honda", facebookIds: { es: 24, en: 24 } },
  {
    key: "hummer",
    es: "Hummer",
    en: "Hummer",
    facebookIds: { es: 25, en: 25 },
  },
  {
    key: "hyundai",
    es: "Hyundai",
    en: "Hyundai",
    facebookIds: { es: 26, en: 26 },
  },
  {
    key: "infiniti",
    es: "Infiniti",
    en: "Infiniti",
    facebookIds: { es: 27, en: 27 },
  },
  { key: "isuzu", es: "Isuzu", en: "Isuzu", facebookIds: { es: 28, en: 28 } },
  {
    key: "jaguar",
    es: "Jaguar",
    en: "Jaguar",
    facebookIds: { es: 29, en: 29 },
  },
  { key: "jeep", es: "Jeep", en: "Jeep", facebookIds: { es: 30, en: 30 } },
  { key: "kia", es: "Kia", en: "Kia", facebookIds: { es: 31, en: 31 } },
  {
    key: "lamborghini",
    es: "Lamborghini",
    en: "Lamborghini",
    facebookIds: { es: 32, en: 32 },
  },
  {
    key: "land_rover",
    es: "Land Rover",
    en: "Land Rover",
    facebookIds: { es: 33, en: 33 },
  },
  { key: "lexus", es: "Lexus", en: "Lexus", facebookIds: { es: 34, en: 34 } },
  {
    key: "lincoln",
    es: "Lincoln",
    en: "Lincoln",
    facebookIds: { es: 35, en: 35 },
  },
  { key: "lotus", es: "Lotus", en: "Lotus", facebookIds: { es: 36, en: 36 } },
  { key: "lucid", es: "Lucid", en: "Lucid", facebookIds: { es: 37, en: 37 } },
  { key: "mini", es: "MINI", en: "MINI", facebookIds: { es: 38, en: 38 } },
  {
    key: "maserati",
    es: "Maserati",
    en: "Maserati",
    facebookIds: { es: 39, en: 39 },
  },
  {
    key: "maybach",
    es: "Maybach",
    en: "Maybach",
    facebookIds: { es: 40, en: 40 },
  },
  { key: "mazda", es: "Mazda", en: "Mazda", facebookIds: { es: 41, en: 41 } },
  {
    key: "mclaren",
    es: "Mclaren",
    en: "Mclaren",
    facebookIds: { es: 42, en: 42 },
  },
  {
    key: "mercedes_benz",
    es: "Mercedes-Benz",
    en: "Mercedes-Benz",
    facebookIds: { es: 43, en: 43 },
  },
  {
    key: "mercury",
    es: "Mercury",
    en: "Mercury",
    facebookIds: { es: 44, en: 44 },
  },
  {
    key: "mitsubishi",
    es: "Mitsubishi",
    en: "Mitsubishi",
    facebookIds: { es: 45, en: 45 },
  },
  {
    key: "nissan",
    es: "Nissan",
    en: "Nissan",
    facebookIds: { es: 46, en: 46 },
  },
  {
    key: "oldsmobile",
    es: "Oldsmobile",
    en: "Oldsmobile",
    facebookIds: { es: 47, en: 47 },
  },
  { key: "panoz", es: "Panoz", en: "Panoz", facebookIds: { es: 48, en: 48 } },
  {
    key: "plymouth",
    es: "Plymouth",
    en: "Plymouth",
    facebookIds: { es: 49, en: 49 },
  },
  {
    key: "polestar",
    es: "Polestar",
    en: "Polestar",
    facebookIds: { es: 50, en: 50 },
  },
  {
    key: "pontiac",
    es: "Pontiac",
    en: "Pontiac",
    facebookIds: { es: 51, en: 51 },
  },
  {
    key: "porsche",
    es: "Porsche",
    en: "Porsche",
    facebookIds: { es: 52, en: 52 },
  },
  { key: "ram", es: "Ram", en: "Ram", facebookIds: { es: 53, en: 53 } },
  {
    key: "rivian",
    es: "Rivian",
    en: "Rivian",
    facebookIds: { es: 54, en: 54 },
  },
  {
    key: "rolls_royce",
    es: "Rolls-Royce",
    en: "Rolls-Royce",
    facebookIds: { es: 55, en: 55 },
  },
  { key: "srt", es: "SRT", en: "SRT", facebookIds: { es: 56, en: 56 } },
  { key: "saab", es: "Saab", en: "Saab", facebookIds: { es: 57, en: 57 } },
  {
    key: "saturn",
    es: "Saturn",
    en: "Saturn",
    facebookIds: { es: 58, en: 58 },
  },
  { key: "scion", es: "Scion", en: "Scion", facebookIds: { es: 59, en: 59 } },
  { key: "smart", es: "Smart", en: "Smart", facebookIds: { es: 60, en: 60 } },
  {
    key: "subaru",
    es: "Subaru",
    en: "Subaru",
    facebookIds: { es: 61, en: 61 },
  },
  {
    key: "suzuki",
    es: "Suzuki",
    en: "Suzuki",
    facebookIds: { es: 62, en: 62 },
  },
  { key: "tesla", es: "Tesla", en: "Tesla", facebookIds: { es: 63, en: 63 } },
  {
    key: "toyota",
    es: "Toyota",
    en: "Toyota",
    facebookIds: { es: 64, en: 64 },
  },
  {
    key: "volkswagen",
    es: "Volkswagen",
    en: "Volkswagen",
    facebookIds: { es: 65, en: 65 },
  },
  { key: "volvo", es: "Volvo", en: "Volvo", facebookIds: { es: 66, en: 66 } },
]);

export const YEAR_VALUES: readonly FacebookValue[] = Object.freeze([
  { key: "1901", es: "1901", en: "1901", facebookIds: { es: 127, en: 125 } },
  { key: "1902", es: "1902", en: "1902", facebookIds: { es: 126, en: 124 } },
  { key: "1903", es: "1903", en: "1903", facebookIds: { es: 125, en: 123 } },
  { key: "1904", es: "1904", en: "1904", facebookIds: { es: 124, en: 122 } },
  { key: "1905", es: "1905", en: "1905", facebookIds: { es: 123, en: 121 } },
  { key: "1906", es: "1906", en: "1906", facebookIds: { es: 122, en: 120 } },
  { key: "1907", es: "1907", en: "1907", facebookIds: { es: 121, en: 119 } },
  { key: "1908", es: "1908", en: "1908", facebookIds: { es: 120, en: 118 } },
  { key: "1909", es: "1909", en: "1909", facebookIds: { es: 119, en: 117 } },
  { key: "1910", es: "1910", en: "1910", facebookIds: { es: 118, en: 116 } },
  { key: "1911", es: "1911", en: "1911", facebookIds: { es: 117, en: 115 } },
  { key: "1912", es: "1912", en: "1912", facebookIds: { es: 116, en: 114 } },
  { key: "1913", es: "1913", en: "1913", facebookIds: { es: 115, en: 113 } },
  { key: "1914", es: "1914", en: "1914", facebookIds: { es: 114, en: 112 } },
  { key: "1915", es: "1915", en: "1915", facebookIds: { es: 113, en: 111 } },
  { key: "1916", es: "1916", en: "1916", facebookIds: { es: 112, en: 110 } },
  { key: "1917", es: "1917", en: "1917", facebookIds: { es: 111, en: 109 } },
  { key: "1918", es: "1918", en: "1918", facebookIds: { es: 110, en: 108 } },
  { key: "1919", es: "1919", en: "1919", facebookIds: { es: 109, en: 107 } },
  { key: "1920", es: "1920", en: "1920", facebookIds: { es: 108, en: 106 } },
  { key: "1921", es: "1921", en: "1921", facebookIds: { es: 107, en: 105 } },
  { key: "1922", es: "1922", en: "1922", facebookIds: { es: 106, en: 104 } },
  { key: "1923", es: "1923", en: "1923", facebookIds: { es: 105, en: 103 } },
  { key: "1924", es: "1924", en: "1924", facebookIds: { es: 104, en: 102 } },
  { key: "1925", es: "1925", en: "1925", facebookIds: { es: 103, en: 101 } },
  { key: "1926", es: "1926", en: "1926", facebookIds: { es: 102, en: 100 } },
  { key: "1927", es: "1927", en: "1927", facebookIds: { es: 101, en: 99 } },
  { key: "1928", es: "1928", en: "1928", facebookIds: { es: 100, en: 98 } },
  { key: "1929", es: "1929", en: "1929", facebookIds: { es: 99, en: 97 } },
  { key: "1930", es: "1930", en: "1930", facebookIds: { es: 98, en: 96 } },
  { key: "1931", es: "1931", en: "1931", facebookIds: { es: 97, en: 95 } },
  { key: "1932", es: "1932", en: "1932", facebookIds: { es: 96, en: 94 } },
  { key: "1933", es: "1933", en: "1933", facebookIds: { es: 95, en: 93 } },
  { key: "1934", es: "1934", en: "1934", facebookIds: { es: 94, en: 92 } },
  { key: "1935", es: "1935", en: "1935", facebookIds: { es: 93, en: 91 } },
  { key: "1936", es: "1936", en: "1936", facebookIds: { es: 92, en: 90 } },
  { key: "1937", es: "1937", en: "1937", facebookIds: { es: 91, en: 89 } },
  { key: "1938", es: "1938", en: "1938", facebookIds: { es: 90, en: 88 } },
  { key: "1939", es: "1939", en: "1939", facebookIds: { es: 89, en: 87 } },
  { key: "1940", es: "1940", en: "1940", facebookIds: { es: 88, en: 86 } },
  { key: "1941", es: "1941", en: "1941", facebookIds: { es: 87, en: 85 } },
  { key: "1942", es: "1942", en: "1942", facebookIds: { es: 86, en: 84 } },
  { key: "1943", es: "1943", en: "1943", facebookIds: { es: 85, en: 83 } },
  { key: "1944", es: "1944", en: "1944", facebookIds: { es: 84, en: 82 } },
  { key: "1945", es: "1945", en: "1945", facebookIds: { es: 83, en: 81 } },
  { key: "1946", es: "1946", en: "1946", facebookIds: { es: 82, en: 80 } },
  { key: "1947", es: "1947", en: "1947", facebookIds: { es: 81, en: 79 } },
  { key: "1948", es: "1948", en: "1948", facebookIds: { es: 80, en: 78 } },
  { key: "1949", es: "1949", en: "1949", facebookIds: { es: 79, en: 77 } },
  { key: "1950", es: "1950", en: "1950", facebookIds: { es: 78, en: 76 } },
  { key: "1951", es: "1951", en: "1951", facebookIds: { es: 77, en: 75 } },
  { key: "1952", es: "1952", en: "1952", facebookIds: { es: 76, en: 74 } },
  { key: "1953", es: "1953", en: "1953", facebookIds: { es: 75, en: 73 } },
  { key: "1954", es: "1954", en: "1954", facebookIds: { es: 74, en: 72 } },
  { key: "1955", es: "1955", en: "1955", facebookIds: { es: 73, en: 71 } },
  { key: "1956", es: "1956", en: "1956", facebookIds: { es: 72, en: 70 } },
  { key: "1957", es: "1957", en: "1957", facebookIds: { es: 71, en: 69 } },
  { key: "1958", es: "1958", en: "1958", facebookIds: { es: 70, en: 68 } },
  { key: "1959", es: "1959", en: "1959", facebookIds: { es: 69, en: 67 } },
  { key: "1960", es: "1960", en: "1960", facebookIds: { es: 68, en: 66 } },
  { key: "1961", es: "1961", en: "1961", facebookIds: { es: 67, en: 65 } },
  { key: "1962", es: "1962", en: "1962", facebookIds: { es: 66, en: 64 } },
  { key: "1963", es: "1963", en: "1963", facebookIds: { es: 65, en: 63 } },
  { key: "1964", es: "1964", en: "1964", facebookIds: { es: 64, en: 62 } },
  { key: "1965", es: "1965", en: "1965", facebookIds: { es: 63, en: 61 } },
  { key: "1966", es: "1966", en: "1966", facebookIds: { es: 62, en: 60 } },
  { key: "1967", es: "1967", en: "1967", facebookIds: { es: 61, en: 59 } },
  { key: "1968", es: "1968", en: "1968", facebookIds: { es: 60, en: 58 } },
  { key: "1969", es: "1969", en: "1969", facebookIds: { es: 59, en: 57 } },
  { key: "1970", es: "1970", en: "1970", facebookIds: { es: 58, en: 56 } },
  { key: "1971", es: "1971", en: "1971", facebookIds: { es: 57, en: 55 } },
  { key: "1972", es: "1972", en: "1972", facebookIds: { es: 56, en: 54 } },
  { key: "1973", es: "1973", en: "1973", facebookIds: { es: 55, en: 53 } },
  { key: "1974", es: "1974", en: "1974", facebookIds: { es: 54, en: 52 } },
  { key: "1975", es: "1975", en: "1975", facebookIds: { es: 53, en: 51 } },
  { key: "1976", es: "1976", en: "1976", facebookIds: { es: 52, en: 50 } },
  { key: "1977", es: "1977", en: "1977", facebookIds: { es: 51, en: 49 } },
  { key: "1978", es: "1978", en: "1978", facebookIds: { es: 50, en: 48 } },
  { key: "1979", es: "1979", en: "1979", facebookIds: { es: 49, en: 47 } },
  { key: "1980", es: "1980", en: "1980", facebookIds: { es: 48, en: 46 } },
  { key: "1981", es: "1981", en: "1981", facebookIds: { es: 47, en: 45 } },
  { key: "1982", es: "1982", en: "1982", facebookIds: { es: 46, en: 44 } },
  { key: "1983", es: "1983", en: "1983", facebookIds: { es: 45, en: 43 } },
  { key: "1984", es: "1984", en: "1984", facebookIds: { es: 44, en: 42 } },
  { key: "1985", es: "1985", en: "1985", facebookIds: { es: 43, en: 41 } },
  { key: "1986", es: "1986", en: "1986", facebookIds: { es: 42, en: 40 } },
  { key: "1987", es: "1987", en: "1987", facebookIds: { es: 41, en: 39 } },
  { key: "1988", es: "1988", en: "1988", facebookIds: { es: 40, en: 38 } },
  { key: "1989", es: "1989", en: "1989", facebookIds: { es: 39, en: 37 } },
  { key: "1990", es: "1990", en: "1990", facebookIds: { es: 38, en: 36 } },
  { key: "1991", es: "1991", en: "1991", facebookIds: { es: 37, en: 35 } },
  { key: "1992", es: "1992", en: "1992", facebookIds: { es: 36, en: 34 } },
  { key: "1993", es: "1993", en: "1993", facebookIds: { es: 35, en: 33 } },
  { key: "1994", es: "1994", en: "1994", facebookIds: { es: 34, en: 32 } },
  { key: "1995", es: "1995", en: "1995", facebookIds: { es: 33, en: 31 } },
  { key: "1996", es: "1996", en: "1996", facebookIds: { es: 32, en: 30 } },
  { key: "1997", es: "1997", en: "1997", facebookIds: { es: 31, en: 29 } },
  { key: "1998", es: "1998", en: "1998", facebookIds: { es: 30, en: 28 } },
  { key: "1999", es: "1999", en: "1999", facebookIds: { es: 29, en: 27 } },
  { key: "2000", es: "2000", en: "2000", facebookIds: { es: 28, en: 28 } },
  { key: "2001", es: "2001", en: "2001", facebookIds: { es: 27, en: 27 } },
  { key: "2002", es: "2002", en: "2002", facebookIds: { es: 26, en: 26 } },
  { key: "2003", es: "2003", en: "2003", facebookIds: { es: 25, en: 25 } },
  { key: "2004", es: "2004", en: "2004", facebookIds: { es: 24, en: 24 } },
  { key: "2005", es: "2005", en: "2005", facebookIds: { es: 23, en: 23 } },
  { key: "2006", es: "2006", en: "2006", facebookIds: { es: 22, en: 22 } },
  { key: "2007", es: "2007", en: "2007", facebookIds: { es: 21, en: 21 } },
  { key: "2008", es: "2008", en: "2008", facebookIds: { es: 20, en: 20 } },
  { key: "2009", es: "2009", en: "2009", facebookIds: { es: 19, en: 19 } },
  { key: "2010", es: "2010", en: "2010", facebookIds: { es: 18, en: 18 } },
  { key: "2011", es: "2011", en: "2011", facebookIds: { es: 17, en: 17 } },
  { key: "2012", es: "2012", en: "2012", facebookIds: { es: 16, en: 16 } },
  { key: "2013", es: "2013", en: "2013", facebookIds: { es: 15, en: 15 } },
  { key: "2014", es: "2014", en: "2014", facebookIds: { es: 14, en: 14 } },
  { key: "2015", es: "2015", en: "2015", facebookIds: { es: 13, en: 13 } },
  { key: "2016", es: "2016", en: "2016", facebookIds: { es: 12, en: 12 } },
  { key: "2017", es: "2017", en: "2017", facebookIds: { es: 11, en: 11 } },
  { key: "2018", es: "2018", en: "2018", facebookIds: { es: 10, en: 10 } },
  { key: "2019", es: "2019", en: "2019", facebookIds: { es: 9, en: 9 } },
  { key: "2020", es: "2020", en: "2020", facebookIds: { es: 8, en: 8 } },
  { key: "2021", es: "2021", en: "2021", facebookIds: { es: 7, en: 7 } },
  { key: "2022", es: "2022", en: "2022", facebookIds: { es: 6, en: 6 } },
  { key: "2023", es: "2023", en: "2023", facebookIds: { es: 5, en: 5 } },
  { key: "2024", es: "2024", en: "2024", facebookIds: { es: 4, en: 4 } },
  { key: "2025", es: "2025", en: "2025", facebookIds: { es: 3, en: 3 } },
  { key: "2026", es: "2026", en: "2026", facebookIds: { es: 2, en: 2 } },
  { key: "2027", es: "2027", en: "2027", facebookIds: { es: 1, en: 1 } },
]);

export const EXTERIOR_COLOR_VALUES: readonly FacebookValue[] = Object.freeze([
  { key: "negro", es: "Negro", en: "Black", facebookIds: { es: 1, en: 1 } },
  { key: "azul", es: "Azul", en: "Blue", facebookIds: { es: 2, en: 2 } },
  { key: "marron", es: "Marrón", en: "Brown", facebookIds: { es: 3, en: 3 } },
  { key: "dorado", es: "Dorado", en: "Gold", facebookIds: { es: 4, en: 4 } },
  { key: "verde", es: "Verde", en: "Green", facebookIds: { es: 5, en: 5 } },
  { key: "gris", es: "Gris", en: "Gray", facebookIds: { es: 6, en: 6 } },
  { key: "rosa", es: "Rosa", en: "Pink", facebookIds: { es: 7, en: 7 } },
  {
    key: "violeta",
    es: "Violeta",
    en: "Purple",
    facebookIds: { es: 8, en: 8 },
  },
  { key: "rojo", es: "Rojo", en: "Red", facebookIds: { es: 9, en: 9 } },
  {
    key: "plateado",
    es: "Plateado",
    en: "Silver",
    facebookIds: { es: 10, en: 10 },
  },
  {
    key: "naranja",
    es: "Naranja",
    en: "Orange",
    facebookIds: { es: 11, en: 11 },
  },
  { key: "blanco", es: "Blanco", en: "White", facebookIds: { es: 12, en: 12 } },
  {
    key: "amarillo",
    es: "Amarillo",
    en: "Yellow",
    facebookIds: { es: 13, en: 13 },
  },
  {
    key: "carbon",
    es: "Carbón",
    en: "Charcoal",
    facebookIds: { es: 14, en: 14 },
  },
  {
    key: "blanco_grisaceo",
    es: "Blanco grisáceo",
    en: "Off-White",
    facebookIds: { es: 15, en: 15 },
  },
  { key: "tostado", es: "Tostado", en: "Tan", facebookIds: { es: 16, en: 16 } },
  { key: "beige", es: "Beige", en: "Beige", facebookIds: { es: 17, en: 17 } },
  {
    key: "bordo",
    es: "Bordó",
    en: "Burgundy",
    facebookIds: { es: 18, en: 18 },
  },
  {
    key: "turquesa",
    es: "Turquesa",
    en: "Teal",
    facebookIds: { es: 19, en: 19 },
  },
]);

export const INTERIOR_COLOR_VALUES: readonly FacebookValue[] = Object.freeze([
  { key: "negro", es: "Negro", en: "Black", facebookIds: { es: 1, en: 1 } },
  { key: "azul", es: "Azul", en: "Blue", facebookIds: { es: 2, en: 2 } },
  { key: "marron", es: "Marrón", en: "Brown", facebookIds: { es: 3, en: 3 } },
  { key: "dorado", es: "Dorado", en: "Gold", facebookIds: { es: 4, en: 4 } },
  { key: "verde", es: "Verde", en: "Green", facebookIds: { es: 5, en: 5 } },
  { key: "gris", es: "Gris", en: "Gray", facebookIds: { es: 6, en: 6 } },
  { key: "rosa", es: "Rosa", en: "Pink", facebookIds: { es: 7, en: 7 } },
  {
    key: "violeta",
    es: "Violeta",
    en: "Purple",
    facebookIds: { es: 8, en: 8 },
  },
  { key: "rojo", es: "Rojo", en: "Red", facebookIds: { es: 9, en: 9 } },
  {
    key: "plateado",
    es: "Plateado",
    en: "Silver",
    facebookIds: { es: 10, en: 10 },
  },
  {
    key: "naranja",
    es: "Naranja",
    en: "Orange",
    facebookIds: { es: 11, en: 11 },
  },
  { key: "blanco", es: "Blanco", en: "White", facebookIds: { es: 12, en: 12 } },
  {
    key: "amarillo",
    es: "Amarillo",
    en: "Yellow",
    facebookIds: { es: 13, en: 13 },
  },
  {
    key: "carbon",
    es: "Carbón",
    en: "Charcoal",
    facebookIds: { es: 14, en: 14 },
  },
  {
    key: "blanco_grisaceo",
    es: "Blanco grisáceo",
    en: "Off-White",
    facebookIds: { es: 15, en: 15 },
  },
  { key: "tostado", es: "Tostado", en: "Tan", facebookIds: { es: 16, en: 16 } },
  { key: "beige", es: "Beige", en: "Beige", facebookIds: { es: 17, en: 17 } },
  {
    key: "bordo",
    es: "Bordó",
    en: "Burgundy",
    facebookIds: { es: 18, en: 18 },
  },
  {
    key: "turquesa",
    es: "Turquesa",
    en: "Teal",
    facebookIds: { es: 19, en: 19 },
  },
]);

export const ITEM_STATE_VALUES: readonly FacebookValue[] = Object.freeze([
  { key: "nuevo", es: "Nuevo", en: "New", facebookIds: { es: 1, en: 1 } },
  {
    key: "usado_como_nuevo",
    es: "Usado - Como nuevo",
    en: "Used - Like New",
    facebookIds: { es: 2, en: 2 },
  },
  {
    key: "usado_buen_estado",
    es: "Usado - Buen estado",
    en: "Used - Good",
    facebookIds: { es: 3, en: 3 },
  },
  {
    key: "usado_aceptable",
    es: "Usado - Aceptable",
    en: "Used - Fair",
    facebookIds: { es: 4, en: 4 },
  },
]);

export const PLATFORM_VALUES: readonly FacebookValue[] = Object.freeze([
  {
    key: "playstation_4",
    es: "PlayStation 4",
    en: "PlayStation 4",
    facebookIds: { es: 1, en: 1 },
  },
  {
    key: "nintendo_switch",
    es: "Nintendo Switch",
    en: "Nintendo Switch",
    facebookIds: { es: 2, en: 2 },
  },
  {
    key: "xbox_one",
    es: "Xbox One",
    en: "Xbox One",
    facebookIds: { es: 3, en: 3 },
  },
  {
    key: "ordenador",
    es: "Ordenador",
    en: "PC",
    facebookIds: { es: 4, en: 4 },
  },
  {
    key: "nintendo_ds",
    es: "Nintendo DS",
    en: "Nintendo DS",
    facebookIds: { es: 5, en: 5 },
  },
  {
    key: "nintendo_wiiu",
    es: "Nintendo WiiU",
    en: "Nintendo WiiU",
    facebookIds: { es: 6, en: 6 },
  },
  {
    key: "nintendo_wii",
    es: "Nintendo Wii",
    en: "Nintendo Wii",
    facebookIds: { es: 7, en: 7 },
  },
  {
    key: "nintendo_gamecube",
    es: "Nintendo GameCube",
    en: "Nintendo GameCube",
    facebookIds: { es: 8, en: 8 },
  },
  {
    key: "playstation_3",
    es: "PlayStation 3",
    en: "PlayStation 3",
    facebookIds: { es: 9, en: 9 },
  },
  {
    key: "xbox_360",
    es: "Xbox 360",
    en: "Xbox 360",
    facebookIds: { es: 10, en: 10 },
  },
]);

export const DEVICE_VALUES: readonly FacebookValue[] = Object.freeze([
  {
    key: "iphone_xs",
    es: "iPhone XS",
    en: "iPhone XS",
    facebookIds: { es: 1, en: 1 },
  },
  {
    key: "iphone_xs_max",
    es: "iPhone XS MAX",
    en: "iPhone XS MAX",
    facebookIds: { es: 2, en: 2 },
  },
  {
    key: "iphone_xr",
    es: "iPhone XR",
    en: "iPhone XR",
    facebookIds: { es: 3, en: 3 },
  },
  {
    key: "iphone_8_plus",
    es: "iPhone 8 Plus",
    en: "iPhone 8 Plus",
    facebookIds: { es: 4, en: 4 },
  },
  {
    key: "iphone_8",
    es: "iPhone 8",
    en: "iPhone 8",
    facebookIds: { es: 5, en: 5 },
  },
  {
    key: "iphone_x",
    es: "iPhone X",
    en: "iPhone X",
    facebookIds: { es: 6, en: 6 },
  },
  {
    key: "samsung_galaxy_s9",
    es: "Samsung Galaxy S9",
    en: "Samsung Galaxy S9",
    facebookIds: { es: 7, en: 7 },
  },
  {
    key: "samsung_galaxy_s9_plus",
    es: "Samsung Galaxy S9 Plus",
    en: "Samsung Galaxy S9 Plus",
    facebookIds: { es: 8, en: 8 },
  },
  {
    key: "samsung_galaxy_j",
    es: "Samsung Galaxy J",
    en: "Samsung Galaxy J",
    facebookIds: { es: 9, en: 9 },
  },
  {
    key: "samsung_galaxy_note_3",
    es: "Samsung Galaxy Note 3",
    en: "Samsung Galaxy Note 3",
    facebookIds: { es: 10, en: 10 },
  },
  {
    key: "samsung_galaxy_note_4",
    es: "Samsung Galaxy Note 4",
    en: "Samsung Galaxy Note 4",
    facebookIds: { es: 11, en: 11 },
  },
  {
    key: "samsung_galaxy_note_5",
    es: "Samsung Galaxy Note 5",
    en: "Samsung Galaxy Note 5",
    facebookIds: { es: 12, en: 12 },
  },
  {
    key: "samsung_galaxy_note_8",
    es: "Samsung Galaxy Note 8",
    en: "Samsung Galaxy Note 8",
    facebookIds: { es: 13, en: 13 },
  },
  {
    key: "samsung_galaxy_note_9",
    es: "Samsung Galaxy Note 9",
    en: "Samsung Galaxy Note 9",
    facebookIds: { es: 14, en: 14 },
  },
  {
    key: "samsung_galaxy_s_iii",
    es: "Samsung Galaxy S III",
    en: "Samsung Galaxy S III",
    facebookIds: { es: 15, en: 15 },
  },
  {
    key: "samsung_galaxy_s4",
    es: "Samsung Galaxy S4",
    en: "Samsung Galaxy S4",
    facebookIds: { es: 16, en: 16 },
  },
  {
    key: "samsung_galaxy_s5",
    es: "Samsung Galaxy S5",
    en: "Samsung Galaxy S5",
    facebookIds: { es: 17, en: 17 },
  },
  {
    key: "samsung_galaxy_s6_edge",
    es: "Samsung Galaxy S6 edge",
    en: "Samsung Galaxy S6 edge",
    facebookIds: { es: 18, en: 18 },
  },
  {
    key: "samsung_galaxy_s6_edge_plus",
    es: "Samsung Galaxy S6 edge+",
    en: "Samsung Galaxy S6 edge+",
    facebookIds: { es: 19, en: 19 },
  },
  {
    key: "samsung_galaxy_s6",
    es: "Samsung Galaxy S6",
    en: "Samsung Galaxy S6",
    facebookIds: { es: 20, en: 20 },
  },
  {
    key: "samsung_galaxy_s7_edge",
    es: "Samsung Galaxy S7 edge",
    en: "Samsung Galaxy S7 edge",
    facebookIds: { es: 21, en: 21 },
  },
  {
    key: "samsung_galaxy_s7",
    es: "Samsung Galaxy S7",
    en: "Samsung Galaxy S7",
    facebookIds: { es: 22, en: 22 },
  },
  {
    key: "samsung_galaxy_s8",
    es: "Samsung Galaxy S8",
    en: "Samsung Galaxy S8",
    facebookIds: { es: 23, en: 23 },
  },
  {
    key: "samsung_galaxy_s8_plus",
    es: "Samsung Galaxy S8+",
    en: "Samsung Galaxy S8+",
    facebookIds: { es: 24, en: 24 },
  },
  {
    key: "iphone_3gs",
    es: "iPhone 3GS",
    en: "iPhone 3GS",
    facebookIds: { es: 25, en: 25 },
  },
  {
    key: "iphone_4",
    es: "iPhone 4",
    en: "iPhone 4",
    facebookIds: { es: 26, en: 26 },
  },
  {
    key: "iphone_4s",
    es: "iPhone 4s",
    en: "iPhone 4s",
    facebookIds: { es: 27, en: 27 },
  },
  {
    key: "iphone_5",
    es: "iPhone 5",
    en: "iPhone 5",
    facebookIds: { es: 28, en: 28 },
  },
  {
    key: "iphone_5c",
    es: "iPhone 5c",
    en: "iPhone 5c",
    facebookIds: { es: 29, en: 29 },
  },
  {
    key: "iphone_5s",
    es: "iPhone 5S",
    en: "iPhone 5S",
    facebookIds: { es: 30, en: 30 },
  },
  {
    key: "iphone_6_plus",
    es: "iPhone 6 Plus",
    en: "iPhone 6 Plus",
    facebookIds: { es: 31, en: 31 },
  },
  {
    key: "iphone_6",
    es: "iPhone 6",
    en: "iPhone 6",
    facebookIds: { es: 32, en: 32 },
  },
  {
    key: "iphone_6s_plus",
    es: "iPhone 6s Plus",
    en: "iPhone 6s Plus",
    facebookIds: { es: 33, en: 33 },
  },
  {
    key: "iphone_6s",
    es: "iPhone 6s",
    en: "iPhone 6s",
    facebookIds: { es: 34, en: 34 },
  },
  {
    key: "iphone_7_plus",
    es: "iPhone 7 Plus",
    en: "iPhone 7 Plus",
    facebookIds: { es: 35, en: 35 },
  },
  {
    key: "iphone_7",
    es: "iPhone 7",
    en: "iPhone 7",
    facebookIds: { es: 36, en: 36 },
  },
  {
    key: "iphone_se",
    es: "iPhone SE",
    en: "iPhone SE",
    facebookIds: { es: 37, en: 37 },
  },
  { key: "lg_g3", es: "LG G3", en: "LG G3", facebookIds: { es: 38, en: 38 } },
  { key: "lg_g4", es: "LG G4", en: "LG G4", facebookIds: { es: 39, en: 39 } },
  { key: "lg_g5", es: "LG G5", en: "LG G5", facebookIds: { es: 40, en: 40 } },
  { key: "lg_g6", es: "LG G6", en: "LG G6", facebookIds: { es: 41, en: 41 } },
  { key: "lg_g7", es: "LG G7", en: "LG G7", facebookIds: { es: 42, en: 42 } },
  {
    key: "lg_g7_thinq",
    es: "LG G7 ThinQ",
    en: "LG G7 ThinQ",
    facebookIds: { es: 43, en: 43 },
  },
  {
    key: "lg_v20",
    es: "LG V20",
    en: "LG V20",
    facebookIds: { es: 44, en: 44 },
  },
  {
    key: "google_pixel",
    es: "Google Pixel",
    en: "Google Pixel",
    facebookIds: { es: 45, en: 45 },
  },
  {
    key: "google_pixel_2",
    es: "Google Pixel 2",
    en: "Google Pixel 2",
    facebookIds: { es: 46, en: 46 },
  },
  {
    key: "google_pixel_2_xl",
    es: "Google Pixel 2 XL",
    en: "Google Pixel 2 XL",
    facebookIds: { es: 47, en: 47 },
  },
  {
    key: "motorola_moto_e",
    es: "Motorola Moto E",
    en: "Motorola Moto E",
    facebookIds: { es: 48, en: 48 },
  },
  {
    key: "motorola_moto_g",
    es: "Motorola Moto G",
    en: "Motorola Moto G",
    facebookIds: { es: 49, en: 49 },
  },
  {
    key: "huawei_p20",
    es: "Huawei P20",
    en: "Huawei P20",
    facebookIds: { es: 50, en: 50 },
  },
  {
    key: "huawei_p20_pro",
    es: "Huawei P20 Pro",
    en: "Huawei P20 Pro",
    facebookIds: { es: 51, en: 51 },
  },
  {
    key: "huawei_nova_3",
    es: "Huawei nova 3",
    en: "Huawei nova 3",
    facebookIds: { es: 52, en: 52 },
  },
  {
    key: "huawei_mate_20_lite",
    es: "Huawei Mate 20 lite",
    en: "Huawei Mate 20 lite",
    facebookIds: { es: 53, en: 53 },
  },
  {
    key: "huawei_mate_10",
    es: "Huawei Mate 10",
    en: "Huawei Mate 10",
    facebookIds: { es: 54, en: 54 },
  },
  {
    key: "huawei_mate_10_pro",
    es: "Huawei Mate 10 Pro",
    en: "Huawei Mate 10 Pro",
    facebookIds: { es: 55, en: 55 },
  },
  {
    key: "xiaomi_redmi_note",
    es: "Xiaomi Redmi Note",
    en: "Xiaomi Redmi Note",
    facebookIds: { es: 56, en: 56 },
  },
  {
    key: "xiaomi_mi_a1",
    es: "Xiaomi Mi A1",
    en: "Xiaomi Mi A1",
    facebookIds: { es: 57, en: 57 },
  },
  {
    key: "xiaomi_redmi_5",
    es: "Xiaomi Redmi 5",
    en: "Xiaomi Redmi 5",
    facebookIds: { es: 58, en: 58 },
  },
  {
    key: "xiaomi_redmi_6",
    es: "Xiaomi Redmi 6",
    en: "Xiaomi Redmi 6",
    facebookIds: { es: 59, en: 59 },
  },
  {
    key: "oppo_f3_plus",
    es: "OPPO F3 Plus",
    en: "OPPO F3 Plus",
    facebookIds: { es: 60, en: 60 },
  },
  {
    key: "oppo_f7",
    es: "OPPO F7",
    en: "OPPO F7",
    facebookIds: { es: 60, en: 60 },
  },
  {
    key: "oppo_f9",
    es: "OPPO F9",
    en: "OPPO F9",
    facebookIds: { es: 61, en: 61 },
  },
  {
    key: "oneplus_one",
    es: "OnePlus One",
    en: "OnePlus One",
    facebookIds: { es: 62, en: 62 },
  },
  {
    key: "oneplus_2",
    es: "OnePlus 2",
    en: "OnePlus 2",
    facebookIds: { es: 63, en: 63 },
  },
  {
    key: "oneplus_x",
    es: "OnePlus X",
    en: "OnePlus X",
    facebookIds: { es: 64, en: 64 },
  },
  {
    key: "oneplus_3",
    es: "OnePlus 3",
    en: "OnePlus 3",
    facebookIds: { es: 65, en: 65 },
  },
  {
    key: "oneplus_3t",
    es: "OnePlus 3T",
    en: "OnePlus 3T",
    facebookIds: { es: 66, en: 66 },
  },
  {
    key: "oneplus_5",
    es: "OnePlus 5",
    en: "OnePlus 5",
    facebookIds: { es: 67, en: 67 },
  },
  {
    key: "oneplus_5t",
    es: "OnePlus 5T",
    en: "OnePlus 5T",
    facebookIds: { es: 68, en: 68 },
  },
  {
    key: "oneplus_6",
    es: "OnePlus 6",
    en: "OnePlus 6",
    facebookIds: { es: 69, en: 69 },
  },
  {
    key: "htc_one_m8",
    es: "HTC One M8",
    en: "HTC One M8",
    facebookIds: { es: 70, en: 70 },
  },
  {
    key: "htc_10",
    es: "HTC 10",
    en: "HTC 10",
    facebookIds: { es: 71, en: 71 },
  },
  {
    key: "htc_u11_plus",
    es: "HTC U11 Plus",
    en: "HTC U11 Plus",
    facebookIds: { es: 72, en: 72 },
  },
  {
    key: "htc_u12_plus",
    es: "HTC U12 Plus",
    en: "HTC U12 Plus",
    facebookIds: { es: 73, en: 73 },
  },
]);

export const FACEBOOK_FIELD_KEYS: readonly FacebookFieldKey[] = Object.freeze([
  "label",
  "category",
  "vehicle_type",
  "body_style",
  "vehicle_condition",
  "fuel_type",
  "transmission",
  "brand",
  "year",
  "exterior_color",
  "interior_color",
  "item_state",
  "platform",
  "device",
]);

export const FACEBOOK_VALUES: Readonly<
  Record<FacebookFieldKey, readonly FacebookValue[]>
> = Object.freeze({
  label: LABEL_VALUES,
  category: CATEGORY_VALUES,
  vehicle_type: VEHICLE_TYPE_VALUES,
  body_style: BODY_STYLE_VALUES,
  vehicle_condition: VEHICLE_CONDITION_VALUES,
  fuel_type: FUEL_TYPE_VALUES,
  transmission: TRANSMISSION_VALUES,
  brand: BRAND_VALUES,
  year: YEAR_VALUES,
  exterior_color: EXTERIOR_COLOR_VALUES,
  interior_color: INTERIOR_COLOR_VALUES,
  item_state: ITEM_STATE_VALUES,
  platform: PLATFORM_VALUES,
  device: DEVICE_VALUES,
});

export function getValueLabel(
  field: FacebookFieldKey,
  key: string,
  locale: Locale,
): string {
  const entry = FACEBOOK_VALUES[field].find((value) => value.key === key);
  return entry ? entry[locale] : key;
}

export function getValuesByFacebookId(
  field: FacebookFieldKey,
  facebookId: number,
  locale: Locale,
): readonly FacebookValue[] {
  return FACEBOOK_VALUES[field].filter(
    (value) => value.facebookIds[locale] === facebookId,
  );
}

export function getValues(field: FacebookFieldKey): readonly FacebookValue[] {
  return FACEBOOK_VALUES[field];
}

export function findKeyBySpanishValue(
  field: FacebookFieldKey,
  spanishValue: string,
): string | undefined {
  return FACEBOOK_VALUES[field].find((value) => value.es === spanishValue)?.key;
}

export function localeForCountry(country: string | null | undefined): Locale {
  if (!country) return "es";
  const normalized = country.trim().toLowerCase();
  const englishAliases = new Set([
    "us",
    "usa",
    "u.s.",
    "u.s.a.",
    "united states",
    "united states of america",
    "estados unidos",
    "uk",
    "u.k.",
    "united kingdom",
    "reino unido",
    "gb",
    "great britain",
    "ca",
    "canada",
    "canadá",
    "au",
    "australia",
    "ie",
    "ireland",
    "nz",
    "new zealand",
  ]);
  return englishAliases.has(normalized) ? "en" : "es";
}
