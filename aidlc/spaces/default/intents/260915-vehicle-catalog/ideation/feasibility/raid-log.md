# RAID Log — Catálogo Canónico de Vehículos para Facebook

RAID (Risks, Assumptions, Issues, Dependencies) para la iniciativa descrita en `intent-statement.md` (Ideation → Intent Capture).

## Risks

| ID  | Riesgo                                                                                                                                                                                                                                                                     | Impacto                                                                  | Mitigación propuesta                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | La descripción inicial abarca 7 puntos de contacto técnicos bajo un único scope `feature`; solo 3 fueron confirmados como integraciones concretas en esta etapa (feasibility). Riesgo de subestimar el trabajo real o de necesitar más de un Bolt dentro del mismo intent. | Medio — afecta secuenciación/estimación, no viabilidad técnica.          | Evaluar temprano en Units Generation / Delivery Planning si conviene descomponer el trabajo en más de un Bolt (patrón ya usado en el proyecto). |
| R2  | Migración de registros legacy de vehículos al catálogo canónico sin pérdida de datos.                                                                                                                                                                                      | Alto si se materializa — datos de catálogo inconsistentes en producción. | Reconciliar registros migrados contra el total original antes de dar la migración por completa (a definir en Functional Design).                |
| R3  | La normalización de decodificación de VIN debe mantenerse coherente con los valores canónicos nuevos sin romper el comportamiento actual de creación/edición de vehículos.                                                                                                 | Medio — regresión funcional visible al usuario.                          | Cobertura de test de regresión sobre el flujo de creación/edición existente (a definir en Build and Test).                                      |

## Assumptions

| ID  | Supuesto                                                                                                                              | Owner                | Estado                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------- |
| A1  | El stack tecnológico actual (FastAPI + SQLAlchemy + Postgres, Next.js + React + TypeScript) alcanza sin herramienta o librería nueva. | Equipo de ingeniería | Confirmado (feasibility Q3) |
| A2  | No hay requisito de compliance nuevo introducido por este trabajo.                                                                    | Equipo de ingeniería | Confirmado (feasibility Q2) |
| A3  | No hay cambio de topología de infraestructura requerido.                                                                              | Equipo de ingeniería | Confirmado (feasibility Q6) |

## Issues

Ninguno identificado en esta etapa (feasibility Q5 — sin bloqueadores organizacionales activos).

## Dependencies

| ID  | Dependencia                                                                                           | Tipo              |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------- |
| D1  | Schemas de categoría / tabla de traducción de categorías ya existente para Facebook.                  | Sistema existente |
| D2  | Pipeline de export/import de CSV (`csv_export.py`, `csv_field_mapper.py`, `bulk_upload_vehicles.py`). | Sistema existente |
| D3  | Decodificación de VIN existente y formularios de creación/edición de vehículos.                       | Sistema existente |

## Assumptions & Open Questions

None.
