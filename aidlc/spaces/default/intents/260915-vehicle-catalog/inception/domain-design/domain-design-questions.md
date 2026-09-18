## Sources

- [consumes:requirements] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/requirements-analysis/requirements.md`
- [consumes:stories] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/user-stories/stories.md`
- [consumes:architecture] `aidlc/spaces/default/codekb/prosell-sass/architecture.md`
- [consumes:component-inventory] `aidlc/spaces/default/codekb/prosell-sass/component-inventory.md`
- [consumes:team-practices] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/practices-discovery/team-practices.md`

FR1.1 ya fijó en Requirements Analysis (Q1) que la reconciliación de catálogos vive como **domain service en el backend**, no como tabla duplicada en el frontend — esa decisión de fondo no se vuelve a preguntar acá. Domain Design solo necesita fijar los límites de componente concretos: qué building block nuevo se crea, y qué componentes existentes ganan una dependencia nueva hacia él.

## Componentes propuestos

**Nuevo:**

- **`FacebookVehicleValueCatalog`** (domain service) — dueño del catálogo canónico de valores de Facebook Marketplace por campo de vehículo (marca, tipo, combustible, tracción, etc.) y de la lógica de reconciliación (dado un valor normalizado y un campo, devuelve la opción canónica exacta o `None`). Mismo molde arquitectónico que `category_translation.py` (domain service puro, sin dependencias externas, dato + lógica en un solo componente cohesivo) — resuelve de fondo el hallazgo #87 (dos catálogos sin reconciliación runtime): a partir de ahora hay un solo dueño backend de los valores canónicos.

**Existentes, con una dependencia nueva hacia `FacebookVehicleValueCatalog`:**

- **`VehicleVinDecodeService`** (hoy `vehicle_router.py::decode_vin()` + `NHTSAVinService` + `nhtsa_normalizer.py`, sin cambios en esos tres) — después de normalizar el valor crudo de NHTSA (paso ya existente, sin tocar), pasa el resultado por `FacebookVehicleValueCatalog` antes de devolverlo al formulario (FR1.1); si no hay match, el campo vuelve vacío (FR1.2).
- **`CategorySchemaService`** (hoy `category_router.py` + `FACEBOOK_FIELD_KEY_MAP` en `category-schema-editor.tsx`) — para un campo mapeado a una clave conocida del catálogo, carga sus `options` desde `FacebookVehicleValueCatalog` en vez de la lista estática mantenida a mano (US1.2/AC1.2.1). El mecanismo exacto de sincronización (FR1.4) lo define Functional Design; acá solo se fija QUIÉN es la fuente de verdad.

**Existentes, sin cambios (declarados por trazabilidad):**

- **`Category`** — `validate_attributes()` sigue igual (FR1.3); ahora valida implícitamente valores que llegan ya reconciliados.
- **`Product`** — ya persiste y prioriza `location_city`/`location_state` por producto en creación, edición y export (FR2/US2.1 confirmado por developer en `stories.md` — sin trabajo de dominio nuevo, solo falta la UI, ya cubierta en Refined Mockups).

**Sin componente nuevo ni existente modificado (FR3/FR4/FR5):** migración legacy ad-hoc (opera sobre `Product`/`Category` ya existentes, sin building block propio), documentación del contrato de `IPublisherService` (sin cambio de comportamiento), sanitización del CSV de export (ajuste puntual dentro del componente de export ya existente) — mismo criterio ya usado en `stories.md`, sin historia de usuario propia.

## Límite del componente nuevo: un solo componente, sin bloque de opciones

`FacebookVehicleValueCatalog` combina los datos del catálogo canónico y la lógica de reconciliación en una sola pieza cohesiva — mismo molde que `category_translation.py` (que tampoco separa dato de lógica en dos componentes). Separarlos en dos componentes hoy sería sobre-ingeniería: el catálogo es del mismo orden de magnitud que `category_translation.py`, sin ciclo de vida ni cadencia de cambio distinta entre el dato y la lógica que lo consulta — no hay más de una descomposición viable que valga la pena, así que se salta el bloque de opciones (Step 5).

## Consolidated Summary Confirmation

- Componente nuevo: `FacebookVehicleValueCatalog` (dato + lógica de reconciliación en una sola pieza).
- `VehicleVinDecodeService` y `CategorySchemaService` (existentes) ganan una dependencia nueva hacia él.
- `Category` y `Product` quedan sin cambios de dominio, declarados solo por trazabilidad.
- FR3/FR4/FR5 sin componente nuevo ni modificado.

- Looks correct
- Request changes

[Answer]: Looks correct
