# Unit of Work — Catálogo Canónico de Vehículos para Facebook

2 Units siguiendo la frontera de deployables ya existente del monorepo (`apps/api`/`apps/web`), basadas en `components.md` (Domain Design), `decisions.md`, `requirements.md` y `stories.md`.

| Unit ID | Directory                | Kind    | Complejidad |
| ------- | ------------------------ | ------- | ----------- |
| U1      | `u1-vehicle-catalog-api` | service | M           |
| U2      | `u2-vehicle-catalog-ui`  | ui      | M           |

## U1 — `u1-vehicle-catalog-api`

**Kind**: service (deployado como parte del backend FastAPI ya existente, `apps/api`)

**Responsabilidades**:

- `FacebookVehicleValueCatalog` (componente nuevo, `domain/services/`): catálogo canónico de valores de Facebook Marketplace por campo de vehículo + lógica de reconciliación.
- Extensión de `VehicleVinDecodeService` (`vehicle_router.py::decode_vin()`) para reconciliar cada valor decodificado antes de devolverlo (FR1.1, FR1.2).
- Extensión de `CategorySchemaService` (`category_router.py`) para servir las opciones canónicas de un campo mapeado a Facebook (FR1.4, US1.2/AC1.2.1).
- Migración de registros legacy al catálogo canónico, ad-hoc con guardas triples (FR3.1).
- Documentación del contrato de `IPublisherService` y sus 3 adapters, incluyendo la distinción de credenciales del adapter de Playwright (FR4.1).
- Sanitización contra inyección de fórmulas en el export CSV cliente (FR5.1).

**Modelo de despliegue**: standalone — mismo servicio backend ya desplegado (`apps/api`), sin ciclo de despliegue nuevo.

**Complejidad relativa**: M — un componente nuevo acotado (mismo molde que un precedente ya existente) más 4 extensiones puntuales a componentes ya en producción; sin cambio de infraestructura ni de topología.

**Notas de implementación y restricciones**:

- `nhtsa_normalizer.py` y `NHTSAVinService` no se modifican (ADR-002 de Domain Design) — la reconciliación se inserta aguas abajo.
- `Category.validate_attributes()` no cambia de comportamiento (FR1.3) — solo valida valores que ahora llegan pre-reconciliados.
- FR3/FR4/FR5 no introducen componentes nuevos (ADR-004 de Domain Design) — son ajustes puntuales dentro de código ya existente.
- El mecanismo exacto de sincronización entre el catálogo backend y `category-schema-editor.tsx` (FR1.4) queda para Contract Design/Functional Design.

## U2 — `u2-vehicle-catalog-ui`

**Kind**: ui (frontend, `apps/web`)

**Responsabilidades**:

- Indicador de autocompletado fallido en el formulario de vehículo (US1.1/AC1.1.2), sobre `VinDecodeField.tsx`/`GenericFormFields` — mockups e interaction-spec ya aprobados en Refined Mockups.
- Consumo del catálogo canónico en `category-schema-editor.tsx` para poblar `options` de campos mapeados a Facebook (US1.2/AC1.2.1) — reemplaza la lista estática mantenida a mano.
- Campos de ubicación por producto (Ciudad/Provincia) con badge "Heredado de organización", mismo patrón que `OrganizationFormFields.tsx` (US2.1) — mockups e interaction-spec ya aprobados en Refined Mockups.

**Modelo de despliegue**: standalone — mismo frontend ya desplegado (`apps/web`), sin ciclo de despliegue nuevo.

**Complejidad relativa**: M — tres superficies de UI, todas extensiones de patrones/componentes ya existentes (`GenericFormFields`, `OrganizationFormFields.tsx`), sin patrón visual nuevo (confirmado en Refined Mockups).

**Notas de implementación y restricciones**:

- El backend ya persiste y prioriza `location_city`/`location_state` por producto en creación, edición y export (confirmado por developer en `stories.md`) — la parte de US2.1 de este Unit es únicamente UI, sin dependencia de trabajo nuevo de U1.
- La parte de US1.1/US1.2 de este Unit SÍ depende de que U1 exponga el valor reconciliado y el catálogo de opciones — ver `unit-of-work-dependency.md`.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-16T17:15:37Z
**Iteration:** 1

### Verificación mecánica del bloque yaml de edges (`unit-of-work-dependency.md`)

- **Nombres válidos (lowercase-con-guiones)**: `u1-vehicle-catalog-api`, `u2-vehicle-catalog-ui` — ambos calzan con el patrón, coinciden byte a byte con los `Directory` de `unit-of-work.md` y con las filas de `unit-of-work-story-map.md`. OK.
- **Sin auto-dependencia**: ningún unit se lista a sí mismo en `depends_on`. OK.
- **`depends_on` apunta a un unit declarado**: `u2-vehicle-catalog-ui.depends_on: [u1-vehicle-catalog-api]` — `u1-vehicle-catalog-api` está declarado en el mismo bloque `units:`. OK.
- **Acíclico**: `u1-vehicle-catalog-api.depends_on: []` (raíz); `u2-vehicle-catalog-ui` depende solo de esa raíz. Un solo edge, sin ciclo posible con 2 nodos y un edge dirigido. OK.
- **`kind` con valor válido**: `service` y `ui` — ambos pertenecen al enum permitido (`service | spec | ui | packaging | library`). OK.

### Cobertura de traceability.json vs. `unit-of-work-story-map.md`

- Las 3 historias (`US1.1`, `US1.2`, `US2.1`) están en `upstream_ids` y en `coverage`, con `status: "OK"` y `target` coincidente exactamente con la tabla de `unit-of-work-story-map.md` (US1.1→"U1, U2", US1.2→"U1, U2", US2.1→"U2"). Sin discrepancia entre ambos archivos.
- Ningún Unit vacío: U1 tiene FR1 (vía US1.1/US1.2) + FR3/FR4/FR5 (`reverse`); U2 tiene las 3 historias con al menos una responsabilidad cada una.
- Sin huérfanos: los 3 `upstream_ids` cubiertos; FR3/FR4/FR5 (sin historia propia, ya establecido así en `stories.md`/su propio `traceability.json` con `status: "N/A"`) se re-traza acá en la sección `reverse` con `status: "OK"` apuntando a U1 — uso correcto de la distinción `OK` vs `N/A` ya aprendida en este proyecto: acá `OK` es apropiado porque el FR va a ser cubierto por trabajo NUEVO dentro de un Unit real (no por código preexistente sin tocar, que sería el caso de `N/A`/ya-cubierto, ni por ausencia estructural de `rules.md`, que es el otro uso de `N/A`).
- Verificado contra `requirements.md`: FR1-FR5 existen tal como se citan (FR1 Reconciliación, FR2 Ubicación, FR3 Migración legacy, FR4 Contrato de publisher, FR5 Sanitización CSV) — ninguna cita de FR/US inventada.

### Consistencia con `components.md`/`decisions.md` (Domain Design)

- Los 5 componentes de `components.md` (`FacebookVehicleValueCatalog`, `VehicleVinDecodeService`, `CategorySchemaService`, `Category`, `Product`) son todos backend (`apps/api`) — todos asignados a U1, sin ninguno fraccionado entre Units. Coincide con ADR-001 (componente único FVC, no separado en dato+lógica) — `unit-of-work.md` no reintroduce esa separación rechazada.
- ADR-002 (FVC aguas abajo de `nhtsa_normalizer.py`, sin modificarlo) — respetado: la nota de restricciones de U1 dice explícitamente "`nhtsa_normalizer.py` y `NHTSAVinService` no se modifican (ADR-002)".
- ADR-003 (`Category`/`Product` sin cambio de dominio) — respetado: U1 solo menciona que `Category.validate_attributes()` "no cambia de comportamiento", y U2 declara que el backend de `Product`/ubicación no gana trabajo nuevo.
- ADR-004 (FR3/FR4/FR5 sin componente nuevo) — respetado: `unit-of-work.md` los describe como "ajustes puntuales dentro de código ya existente" en U1, sin declarar un componente nuevo para ninguno.
- No hay contradicción de ninguna ADR: Domain Design nunca dijo que algo debía separarse en Units distintas, y Units Generation no separó nada que Domain Design haya dicho que debía ir junto.

### Verificación de que esta etapa NO recomendó orden económico de implementación

- `unit-of-work-dependency.md` § "Oportunidades de paralelismo" declara explícitamente: "Esta nota describe topología y oportunidad, no una recomendación de orden de implementación — la secuencia económica real... es decisión de Delivery Planning (2.9), no de esta etapa." — disclaimer correcto y explícito.
- `unit-of-work-story-map.md` § "Orden de implementación dentro de cada Unit" es igual de disciplinado: dice que no hay orden estricto entre FR1/FR3/FR4/FR5 dentro de U1, y que "la secuencia real dentro de Construction es decisión del propio Unit al ejecutar (no de esta etapa)" — no prescribe qué construir primero, solo señala una dependencia estructural real (U2/US1.1-US1.2 necesita el contrato de U1).
- No se encontró ningún lenguaje de tipo "construir primero X porque es más barato/rápido" en ninguno de los 3 artefactos — la única secuencia mencionada (U2 parcial depende de U1) es una dependencia de contrato real, no una preferencia económica.

### Frontera de deployables (verificado con Bash)

- `apps/api/pyproject.toml` y `apps/web/package.json` existen como raíces de proyecto separadas — confirma que `apps/api`/`apps/web` son deployables reales y distintos en este monorepo, consistente con `CLAUDE.md` (estructura de monorepo) y con el criterio ya usado en intents previos (`260829-auth-navigation-refactor`, `260903-catalog-client-export`, `260911-export-org-selector`) para saltar el bloque interactivo de Step 3 cuando la frontera de deployable ya es obvia.

### Hallazgos

Ninguno de severidad Critical, Major o Minor. Se verificó puntualmente contra `requirements.md` que `FR3.1`, `FR4.1` y `FR5.1` (citados en `unit-of-work.md` línea 18-20) son IDs reales y no inventados — cada FR3/FR4/FR5 tiene exactamente un sub-ítem `.1` con ese contenido exacto.

### Summary

El bloque yaml de edges es well-formed (nombres válidos, sin auto-dependencia, acíclico, `depends_on` resuelve, `kind` válido). Las 3 historias están cubiertas sin huérfanos ni Units vacíos, con `traceability.json` coherente byte a byte con `unit-of-work-story-map.md`. La asignación de componentes de Domain Design a Units no contradice ninguna de las 4 ADRs de `decisions.md` — todo el backend queda en U1, sin fraccionar `FacebookVehicleValueCatalog` ni ningún otro componente. Los 3 artefactos de esta etapa describen topología y paralelismo, no una secuencia económica de implementación, respetando correctamente el límite de alcance con Delivery Planning (2.9). La frontera `apps/api`/`apps/web` es real y verificable. Un desarrollador puede pasar a Contract Design sin necesitar volver a preguntarle al arquitecto sobre la partición de Units.
