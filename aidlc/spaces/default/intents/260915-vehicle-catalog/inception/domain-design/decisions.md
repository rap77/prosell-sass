# Architecture Decision Records — Catálogo Canónico de Vehículos para Facebook

## ADR-001: Componente único para el catálogo canónico y su reconciliación

**Context**: FR1 exige reconciliar el valor decodificado del VIN contra el catálogo de opciones del schema (hallazgo #87: hoy dos catálogos incompatibles sin reconciliación runtime). Requirements Analysis ya fijó (FR1.1, Q1) que esa reconciliación vive como domain service en el backend, no como tabla duplicada en el frontend. Quedaba abierto si el dato del catálogo (valores canónicos por campo) y la lógica de reconciliación debían vivir en el mismo componente o en dos separados.

**Decision**: Un solo componente, `FacebookVehicleValueCatalog`, dueño tanto del dato (catálogo canónico por campo) como de la lógica de reconciliación — mismo molde que `category_translation.py` (domain service puro, dato + lógica en una sola pieza cohesiva).

**Consequences**:

- Positivas: superficie nueva mínima; consistente con el patrón ya establecido en el proyecto (`category_translation.py`); un solo archivo/componente a mantener y testear.
- Negativas: si el catálogo llegara a crecer mucho o necesitar un ciclo de vida propio (ej. actualizarse desde una fuente externa versionada), habría que refactorizar y separar — riesgo aceptado como bajo dado el tamaño actual del catálogo (mismo orden de magnitud que `category_translation.py`).

**Alternatives Rejected**: Separar en dos componentes — `FacebookValueCatalog` (solo datos) y `FacebookValueReconciliationService` (solo lógica). Rechazada por sobre-ingeniería: no hay evidencia de que dato y lógica tengan cadencias de cambio distintas hoy, y el precedente del proyecto (`category_translation.py`) tampoco separa ambos aspectos para un catálogo de tamaño similar.

## ADR-002: `FacebookVehicleValueCatalog` se inserta aguas abajo de `nhtsa_normalizer.py`, sin reemplazarlo

**Context**: `nhtsa_normalizer.py` (infra, existente) ya normaliza valores crudos de NHTSA a tokens estilo Facebook (inglés/minúscula). El hallazgo #87 muestra que ninguna de las tres representaciones de `facebook-values/index.ts` (key en español, es, en) calza carácter a carácter con esos tokens — la reconciliación nueva tiene que resolver esa brecha final, no repetir el trabajo de normalización que `nhtsa_normalizer.py` ya hace bien.

**Decision**: `VehicleVinDecodeService` sigue llamando a `nhtsa_normalizer.py` sin cambios, y pasa su salida por `FacebookVehicleValueCatalog.reconcile()` como paso adicional antes de devolver el valor al formulario. `nhtsa_normalizer.py` no se modifica ni se fusiona con el componente nuevo.

**Consequences**:

- Positivas: cambio quirúrgico — no se toca código de normalización ya verificado en producción; el nuevo componente tiene una responsabilidad única y acotada (reconciliar, no normalizar).
- Negativas: la inconsistencia de capa ya documentada de `nhtsa_normalizer.py` (vive en `infrastructure/services/` pese a no tener dependencias externas, a diferencia de `category_translation.py` que sí vive en `domain/services/`) queda sin corregir — es deuda preexistente, no introducida por este intent, y su corrección no forma parte del alcance aprobado.

**Alternatives Rejected**: Fusionar la lógica de reconciliación dentro de `nhtsa_normalizer.py` mismo (extenderlo en vez de agregar un componente nuevo). Rechazada porque perpetuaría la inconsistencia de capa (lógica de dominio nueva agregada a un componente ya mal ubicado en infraestructura) y porque FR1.1 exige explícitamente que la reconciliación viva como domain service — un componente de infraestructura no cumple ese requisito.

## ADR-003: `Category` y `Product` no cambian de dominio en este intent

**Context**: US2.1/FR2 (ubicación por producto) y FR1.3 (`validate_attributes()`) tocan comportamiento ya implementado y verificado contra código real (`stories.md`, nota de developer: el backend ya persiste y prioriza `location_city`/`location_state` por producto en creación, edición y export; `Category.validate_attributes()` no cambia su lógica, solo el origen de los valores que valida).

**Decision**: Ni `Category` ni `Product` ganan entidades, atributos o comportamiento nuevo en Domain Design. Se declaran en `components.md` únicamente para que `traceability.json` pueda apuntar US2.1/FR2 y AC1.1.3/AC1.1.4 a un componente real.

**Consequences**:

- Positivas: evita rediseñar componentes que ya funcionan correctamente; el trabajo real de US2.1 queda correctamente acotado a UI (ya cubierta en Refined Mockups), no a lógica de dominio nueva.
- Negativas: ninguna identificada — es la lectura más fiel de la evidencia ya verificada por developer.

**Alternatives Rejected**: Ninguna — no hay una descomposición alternativa viable dado que el comportamiento de dominio ya existe y funciona; forzar un cambio de componente sin necesidad sería contradecir la propia evidencia de `stories.md`.

## ADR-004: FR3, FR4 y FR5 no generan componentes nuevos ni modificados

**Context**: FR3 (migración legacy) es un script ad-hoc que opera sobre `Product`/`Category` ya existentes; FR4 (documentación de `IPublisherService`) no cambia comportamiento; FR5 (sanitización del CSV) es un ajuste puntual dentro del componente de export ya existente.

**Decision**: Ninguno de los tres introduce un componente nuevo en `components.md`. Se documentan como `N/A` en `traceability.json`, mismo criterio ya usado en `stories.md`.

**Consequences**: Mantiene el catálogo de componentes acotado al trabajo que genuinamente cambia límites de building block, sin ruido de entradas para cambios puntuales dentro de componentes ya existentes y sin decisión de frontera pendiente.

**Alternatives Rejected**: Ninguna — no hay ambigüedad de frontera en estos tres casos.
