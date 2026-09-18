# Feasibility Assessment — Catálogo Canónico de Vehículos para Facebook

## Overview

Este análisis evalúa la viabilidad técnica de la iniciativa descrita en `intent-statement.md` (Ideation → Intent Capture): implementar referencias canónicas del catálogo de vehículos de Facebook en schemas de categoría, selects dinámicos, decodificación de VIN, validación de import/create/update, defaults de ubicación/organización editables por producto, migración legacy y contratos de adapter de publisher, manteniendo la automatización en vivo de Facebook fuera de alcance.

## Technical Viability

- El trabajo se apoya en tres sistemas ya existentes y en producción, confirmados como puntos de integración: los schemas de categoría / tabla de traducción de categorías ya usados para Facebook; el pipeline de export/import de CSV (`csv_export.py`, `csv_field_mapper.py`, `bulk_upload_vehicles.py`); y la decodificación de VIN + formularios de creación/edición de vehículos con selects dinámicos.
- El stack tecnológico actual (FastAPI + SQLAlchemy + Postgres en el backend, Next.js + React + TypeScript en el frontend) alcanza para esta extensión — no se identificó la necesidad de una herramienta o librería nueva.
- La infraestructura de despliegue (droplet self-hosted con Docker + GitHub Actions) no requiere ningún cambio de topología: esto es puramente una extensión de la lógica de aplicación ya desplegada.
- Técnicamente viable con el equipo y las herramientas actuales, sin dependencias externas nuevas.

## Risk Analysis

- **Superficie de integración amplia**: la descripción inicial nombra siete puntos de contacto técnicos distintos (schemas de categoría, selects dinámicos, decodificación de VIN, import/create/update de vehículos, defaults de ubicación/organización editables por producto, migración legacy, contratos de adapter de publisher), pero solo tres sistemas fueron confirmados como integraciones concretas en esta etapa. El intent-statement de Intent Capture ya quedó dentro de un único scope `feature`, confirmado explícitamente por el usuario — el riesgo real es de secuenciación/descomposición dentro de ese scope, no de viabilidad técnica. Queda como nota para Units Generation / Delivery Planning (ya señalada por el reviewer de Intent Capture).
- **Migración legacy**: los registros de vehículos previos al catálogo canónico necesitan migrarse sin pérdida de datos — riesgo de datos inconsistentes si el mapeo de valores legacy no cubre todos los casos existentes.
- **Normalización de VIN**: la decodificación de VIN normalizada debe mantenerse coherente con los valores canónicos nuevos, sin romper el comportamiento actual de creación/edición de vehículos.
- No se identificaron riesgos regulatorios, de compliance, ni de infraestructura — los datos son de catálogo de vehículos, no de tarjetas de pago ni de salud, y no hay cambio de topología de despliegue.

## Assumptions & Open Questions

None.
