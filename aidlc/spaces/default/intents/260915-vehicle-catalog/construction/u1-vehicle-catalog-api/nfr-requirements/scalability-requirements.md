# Scalability Requirements — U1 (`u1-vehicle-catalog-api`)

Basado en `entities.md` (`CanonicalFieldOption`) y `rules.md` (BR1.1, BR1.4).

## NFR-SCALE-1: Tamaño del catálogo no requiere estrategia de escala nueva

- **Proyección de crecimiento**: `FacebookVehicleValueCatalog` cubre 9 campos de vehículo (`make`, `fuel_type`, `transmission`, `body_type`, `drivetrain`, `wheelbase_type`, `bed_type`, `cab_type`, `electrification_level`), cada uno con decenas de valores canónicos como máximo (mismo orden de magnitud que `CATEGORY_TRANSLATION_TABLE`). No hay proyección de crecimiento hacia miles de entradas.
- **Estrategia**: dato estático en memoria (dict Python), sin necesidad de paginación, caché externo, ni particionamiento — mismo patrón ya usado por `category_translation.py`.
- **Concurrencia**: sin estado mutable — múltiples requests concurrentes leen la misma estructura sin contención.

Sin otros ítems de escalabilidad aplicables a este Unit (FR3/FR4/FR5 no introducen carga nueva de tráfico).
