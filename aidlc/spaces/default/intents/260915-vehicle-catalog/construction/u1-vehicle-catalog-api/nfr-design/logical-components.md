# Logical Components — U1 (`u1-vehicle-catalog-api`)

Vista de componentes lógicos a nivel de infraestructura, puente hacia Infrastructure Design. Basado en `components.md` (Domain Design) y los diseños de NFR de arriba.

## Inventario de componentes lógicos

| Componente                            | Failure Domain                                                         | Blast Radius                                                                                                                     | Recursos compartidos                            |
| ------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `FacebookVehicleValueCatalog`         | Mismo proceso backend (sin aislamiento propio)                         | Un fallo (ej. excepción no manejada) degrada el decode de VIN y el editor de schema de categorías — no el resto de la plataforma | Ninguno (dato en memoria, sin conexión externa) |
| `VehicleVinDecodeService` (extendido) | Mismo proceso backend                                                  | Ya existente — sin cambio de blast radius                                                                                        | NHTSA API (ya existente)                        |
| `CategorySchemaService` (extendido)   | Mismo proceso backend                                                  | Ya existente — sin cambio de blast radius                                                                                        | Base de datos de categorías (ya existente)      |
| Migración legacy (script ad-hoc)      | Proceso separado, ejecución única, fuera del ciclo de request/response | Acotado a los registros candidatos del batch — guarda anti-drift evita mutar registros ya cambiados                              | Base de datos (misma conexión que el backend)   |

## Aislamiento de componentes

Ninguno de los componentes de este Unit justifica un proceso o deployable separado — todos viven dentro del mismo backend FastAPI ya desplegado (`apps/api`), consistente con `unit-of-work.md` (U1 = mismo deployable existente, sin ciclo de despliegue nuevo).

## Puente hacia Infrastructure Design

Sin infraestructura nueva que aprovisionar — Infrastructure Design debe confirmar que no hace falta ningún recurso de infraestructura nuevo (sin base de datos nueva, sin cola, sin servicio externo) para este Unit.
