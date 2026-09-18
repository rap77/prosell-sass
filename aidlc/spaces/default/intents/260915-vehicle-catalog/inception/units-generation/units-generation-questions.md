## Sources

- [consumes:components] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/domain-design/components.md`
- [consumes:decisions] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/domain-design/decisions.md`
- [consumes:requirements] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/requirements-analysis/requirements.md`
- [consumes:stories] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/user-stories/stories.md`

La frontera de Units ya la da la estructura de deployables existente del monorepo (`apps/api` vs `apps/web`), sin ambigüedad genuina que justifique el bloque interactivo de estrategia de descomposición (mismo criterio ya aplicado en `260829-auth-navigation-refactor` y `260903-catalog-client-export`). `components.md` no declara ningún componente que necesite un ciclo de despliegue propio distinto de esos dos: `FacebookVehicleValueCatalog`, `VehicleVinDecodeService`, `CategorySchemaService` y `Category` viven en `apps/api`; la UI de los 3 flujos de usuario (US1.1, US1.2, US2.1) vive en `apps/web`. Se salta el bloque de Step 3 y se va directo al plan.

## Plan Propuesto

| Unit ID | Directory                | Kind    | Complejidad | Responsabilidad                                                                                                                                                                                                                                                                                                 |
| ------- | ------------------------ | ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1      | `u1-vehicle-catalog-api` | service | M           | Backend (`apps/api`): `FacebookVehicleValueCatalog` (nuevo), extensión de `VehicleVinDecodeService` y `CategorySchemaService` para reconciliar/servir el catálogo canónico (FR1), migración legacy ad-hoc (FR3), documentación del contrato de `IPublisherService` (FR4), sanitización del CSV de export (FR5). |
| U2      | `u2-vehicle-catalog-ui`  | ui      | M           | Frontend (`apps/web`): indicador de autocompletado fallido en `VinDecodeField` (US1.1), consumo del catálogo canónico en `category-schema-editor.tsx` (US1.2), campos de ubicación por producto con badge de herencia (US2.1) — mockups y specs ya aprobados en Refined Mockups.                                |

**Dependencia**: U2 depende de U1 (para US1.1/US1.2, U2 consume el catálogo canónico y los valores reconciliados que expone U1; para US2.1, U2 usa contratos de `Product` ya existentes, sin dependencia nueva de este intent). U1 no depende de U2. Un solo par de units, sin oportunidad de paralelismo entre sí — U2 puede empezar su parte de US2.1 en paralelo mientras U1 termina FR1, pero eso es una decisión de secuenciación económica de Delivery Planning (2.9), no de esta etapa.

**Contrato de integración**: U2 consume de U1 (a) el valor reconciliado que devuelve el decode de VIN, y (b) el conjunto de opciones canónicas por campo para `category-schema-editor.tsx` — el mecanismo exacto (forma de la API) lo fija Contract Design (2.8), no esta etapa.

## Plan Approval

**Resumen**: 2 Units siguiendo la frontera de deployables ya existente (`apps/api`/`apps/web`), sin bloque interactivo de estrategia (frontera obvia). U2 depende de U1. Ningún unit necesita un ciclo de despliegue propio adicional al ya existente.

- Approve Plan
- Revise Plan

[Answer]: Approve Plan

## Consolidated Summary Confirmation

- U1 (`u1-vehicle-catalog-api`, service, backend) y U2 (`u2-vehicle-catalog-ui`, ui, frontend) — frontera por deployable existente, sin bloque interactivo.
- U2 depende de U1.

- Looks correct
- Request changes

[Answer]: Looks correct
