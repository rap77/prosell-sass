# Logical Components — u1-catalog-export-api

Puente entre las decisiones de NFR Design y la próxima etapa
(Infrastructure Design) — vista a nivel de componente lógico de dónde
aplican los patrones NFR diseñados arriba.

## Inventario de componentes lógicos

| Componente lógico                                     | Ubicación (capa)                                                              | Responsabilidad                                                                                                      | Nuevo/Extendido                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `csv_export.py` (extensión)                           | `domain/services/`                                                            | Armado de filas CSV (24 columnas), nombre de carpeta de imágenes, sanitización                                       | Extendido (ya existe, agrega la responsabilidad de export cliente) |
| Use case de export (nuevo)                            | `application/use_cases/`                                                      | Orquesta: query de productos, chequeo de cap, lectura concurrente de imágenes (semáforo + retry), ensamblado del ZIP | Nuevo                                                              |
| `IDOSpacesService.get_object()`                       | `application/ports/` (interfaz) + `infrastructure/services/` (implementación) | Lectura de bytes de imagen ya subida                                                                                 | Nuevo método en puerto existente                                   |
| Endpoint de export (nuevo)                            | `infrastructure/api/routers/product_router.py`                                | Recibe el request, delega al use case, devuelve la respuesta ZIP con headers correctos                               | Nuevo                                                              |
| `ExportLimitExceededError`, `EmptyCatalogExportError` | `domain/exceptions/product_exceptions.py` (subclases de `ProductError`)       | Errores tipados del flujo                                                                                            | Nuevo (subclases)                                                  |

## Failure domains

Un único failure domain: la request HTTP individual. Un fallo en
cualquier punto del flujo (query, lectura de imagen, armado del ZIP)
afecta solo esa request — sin estado compartido entre requests
concurrentes de export (cada una construye su propio `ExportCatalogResult`
en memoria, sin caché ni recurso compartido mutable).

## Blast radius

- **Fallo de imagen individual**: acotado a esa imagen — el resto del
  export continúa (NFR-REL-1).
- **Fallo del use case completo** (excepción no manejada): acotado a esa
  request — el resto de la API (`apps/api`) no se ve afectado, sin
  estado compartido que corromper.
- **Cap excedido**: acotado a esa organización/request — rechazo
  inmediato, sin efecto en otras organizaciones exportando
  simultáneamente.

## Aislamiento de componentes

Ningún componente nuevo requiere aislamiento de infraestructura
adicional (sin proceso separado, sin cola, sin worker dedicado) — todo
vive dentro del mismo proceso FastAPI ya desplegado, consistente con
`unit-of-work.md` (`deployment: embedded`).

## Recurso compartido identificado

El único recurso compartido es el pool de conexiones HTTP hacia
DigitalOcean Spaces (ya existente, usado por `upload`/`presign`/`delete`/
`exists`) — el semáforo de concurrencia (`performance-design.md`, máximo
20 simultáneas) es la salvaguarda de este Unit para no monopolizar ese
pool compartido con otras operaciones de storage del sistema.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-05T18:44:43Z
**Iteration:** 1

### Findings

| #   | Severity          | Location                                                      | Finding                                                                                                                                                               | Recommendation                                                                                                                                                                                          |
| --- | ----------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major (corregido) | `traceability.json`, `security-design.md`                     | `NFR2.2`/`NFR2.3` (declarados en `security-requirements.md`) quedaban huérfanos — no enumerados en `traceability.json`, sin sección dedicada en `security-design.md`. | **Corregido**: se agregó una sección "Datos en tránsito y exposición de datos en la respuesta" en `security-design.md`, y ambos IDs a `upstream_ids`/`coverage` de `traceability.json` con status `OK`. |
| 2   | Minor (corregido) | `performance-design.md` § Presupuesto de performance por fase | La suma de fases daba exactamente 15s, sin margen para overhead no modelado.                                                                                          | **Corregido**: presupuesto reajustado (~13.55s de fases asignadas + ~1.45s de margen explícito).                                                                                                        |

### Summary

El diseño es implementable sin ambigüedad para Infrastructure Design/Code Generation: las dos decisiones genuinas (semáforo de 20, retry 1×200ms) están documentadas de forma consistente en todos los archivos que las mencionan, el pseudocódigo respeta el límite de ≤15 líneas, la tabla de componentes lógicos calza con `functional-spec.md`/`rules.md`, y los 8 artefactos de `consumes:` están citados en la prosa. Los 2 hallazgos (1 Major, 1 Minor) eran mecánicos — trazabilidad incompleta y falta de margen en un presupuesto — corregidos antes de abrir el gate.
