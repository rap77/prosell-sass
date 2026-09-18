# Constraint Register — Catálogo Canónico de Vehículos para Facebook

Registro de restricciones identificadas para la iniciativa descrita en `intent-statement.md` (Ideation → Intent Capture).

## Technical Constraints

- Debe integrarse con los schemas de categoría / tabla de traducción de categorías ya existente para Facebook, sin romper el comportamiento actual.
- Debe integrarse con el pipeline de export/import de CSV (`csv_export.py`, `csv_field_mapper.py`, `bulk_upload_vehicles.py`) que ya mapea valores al formato de Facebook.
- Debe integrarse con la decodificación de VIN existente y los formularios de creación/edición de vehículos (selects dinámicos), sin cambiar comportamiento observable fuera del alcance de esta iniciativa.
- El stack tecnológico actual (FastAPI + SQLAlchemy + Postgres, Next.js + React + TypeScript) es la restricción tecnológica vigente — no se aprobó ninguna herramienta o librería nueva.

## Organizational Constraints

- Ninguna restricción de presupuesto o timeline identificada — el trabajo avanza al ritmo normal de este workflow.
- Ningún bloqueador organizacional identificado (sin freeze de cambios activo ni prioridades en competencia conocidas).

## Regulatory Constraints

- Ninguna identificada — los datos involucrados son de catálogo de vehículos (marca, modelo, VIN, ubicación), no datos de tarjetas de pago ni de salud. Los datos personales de organizaciones/usuarios ya están cubiertos por las políticas de privacidad y controles existentes de la plataforma; este trabajo no introduce un requisito de compliance nuevo.

## Infrastructure Constraints

- Ninguna — esta iniciativa es puramente una extensión de la lógica de aplicación sobre la infraestructura ya desplegada (droplet self-hosted, Docker + GitHub Actions), sin cambio de topología.

## Assumptions & Open Questions

None.
