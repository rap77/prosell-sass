"""Unit — _CAR_SCHEMA select options reflect the canonical Facebook catalog.

The `attribute_schema.options` list for vehicle selects must agree with the
Facebook Marketplace canonical catalog (`facebook_vehicle_value_catalog.py`)
and with the Excel `data39` sheet the client uses to publish. Without this
test a future change to one catalog can drift the other two and reintroduce
the silent mismatch tracked as code-quality finding #87.

Schema values are stored in Spanish (display labels). The catalog keys are
the Spanish canonical values used by `Category.validate_attributes`.
"""

from prosell.infrastructure.database.seed_categories import _CAR_SCHEMA


def test_car_schema_make_options_cover_catalog_brands():
    catalog_brands = {
        "Acura",
        "Alfa Romeo",
        "Aston Martin",
        "Audi",
        "BMW",
        "Bentley",
        "Buick",
        "CODA",
        "Cadillac",
        "Chevrolet",
        "Chrysler",
        "Daewoo",
        "Daihatsu",
        "Dodge",
        "Eagle",
        "Ferrari",
        "Fiat",
        "Fisker",
        "Ford",
        "Freightliner",
        "GMC",
        "Genesis",
        "Geo",
        "Honda",
        "Hummer",
        "Hyundai",
        "Infiniti",
        "Isuzu",
        "Jaguar",
        "Jeep",
        "Kia",
        "Lamborghini",
        "Land Rover",
        "Lexus",
        "Lincoln",
        "Lotus",
        "Lucid",
        "MINI",
        "Maserati",
        "Maybach",
        "Mazda",
        "Mclaren",
        "Mercedes-Benz",
        "Mercury",
        "Mitsubishi",
        "Nissan",
        "Oldsmobile",
        "Panoz",
        "Plymouth",
        "Polestar",
        "Pontiac",
        "Porsche",
        "Ram",
        "Rivian",
        "Rolls-Royce",
        "SRT",
        "Saab",
        "Saturn",
        "Scion",
        "Smart",
        "Subaru",
        "Suzuki",
        "Tesla",
        "Toyota",
        "Volkswagen",
        "Volvo",
    }
    assert set(_CAR_SCHEMA["make"]["options"]) == catalog_brands


def test_car_schema_body_type_options_match_facebook_canonical():
    expected = {
        "Coupé",
        "Camioneta",
        "Sedán",
        "Hatchback",
        "SUV",
        "Convertible",
        "Familiar",
        "Miniván",
        "Auto pequeño",
        "Otro",
    }
    assert set(_CAR_SCHEMA["body_type"]["options"]) == expected


def test_car_schema_fuel_type_options_use_spanish_labels():
    expected = {
        "Gasolina",
        "Diésel",
        "Eléctrico",
        "Híbrido",
        "Híbrido eléctrico enchufable",
        "Flexible",
        "Otro",
    }
    assert set(_CAR_SCHEMA["fuel_type"]["options"]) == expected


def test_car_schema_transmission_options_use_spanish_labels():
    expected = {"Transmisión automática", "Transmisión manual"}
    assert set(_CAR_SCHEMA["transmission"]["options"]) == expected


def test_car_schema_color_options_match_facebook_canonical():
    expected = {
        "Negro",
        "Azul",
        "Marrón",
        "Dorado",
        "Verde",
        "Gris",
        "Rosa",
        "Violeta",
        "Rojo",
        "Plateado",
        "Naranja",
        "Blanco",
        "Amarillo",
        "Carbón",
        "Blanco grisáceo",
        "Tostado",
        "Beige",
        "Bordó",
        "Turquesa",
    }
    assert set(_CAR_SCHEMA["exterior_color"]["options"]) == expected
    assert set(_CAR_SCHEMA["interior_color"]["options"]) == expected
