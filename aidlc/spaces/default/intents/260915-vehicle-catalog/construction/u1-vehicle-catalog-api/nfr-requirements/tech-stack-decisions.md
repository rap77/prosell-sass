# Tech Stack Decisions — U1 (`u1-vehicle-catalog-api`)

Basado en `technology-stack.md` (codekb) y `requirements.md` § Constraints ("stack tecnológico existente... sin herramienta o librería nueva").

## Decisión: sin tech stack nuevo

`FacebookVehicleValueCatalog` se implementa como domain service Python puro (mismo patrón que `category_translation.py`) — sin ORM, sin base de datos, sin librería de terceros nueva. Los 2 contratos de `contract-summary.md` se implementan sobre FastAPI/Pydantic, ya vigentes. La migración legacy (BR3.1) usa el mismo patrón de script ad-hoc + Alembic ya establecido (`20260812_0002_migrate_legacy_sedan_products.py`), sin herramienta nueva.

## Rationale

Este intent es correctivo/estructural sobre superficie ya en producción (per `team-practices.md` § Way of Working) — no hay justificación para introducir una dependencia nueva cuando el patrón arquitectónico ya existente (`category_translation.py`, migraciones Alembic ad-hoc, FastAPI/Pydantic) cubre exactamente lo que este Unit necesita.
