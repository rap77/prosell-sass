# Bolt Plan — Catálogo Canónico de Vehículos para Facebook

Un **Bolt** es una pasada completa de build a través de Construction (una tanda de trabajo que termina en algo que corre). Este intent tiene un solo Bolt candidato — ninguna de las 2 Units (U1 backend, U2 frontend) entrega valor de usuario demostrable de forma completamente independiente, y el proyecto no corre la ceremonia de walking skeleton (`project.md` § Forbidden).

## Bolt 1 — Catálogo canónico de vehículos (completo)

**Units incluidas**: U1 (`u1-vehicle-catalog-api`) + U2 (`u2-vehicle-catalog-ui`)

**Marca de walking skeleton**: No aplica — este proyecto no corre esa ceremonia.

**Orden interno** (riesgo principal, confirmado en la entrevista): reconciliación backend de U1 (`FacebookVehicleValueCatalog` + su piso de test de reconciliación cruzada, FR1.1/FR1.4) se construye y testea ANTES que la UI de U2 — si el catálogo canónico tiene huecos de cobertura, aparecen en el test, no recién al ver un campo vacío en la UI.

**Definition of Done**:

- Los 6 puntos del piso de test afirmado en `team-practices.md` § Testing Posture pasan (reconciliación cruzada valor-por-valor, `validate_attributes()` con caso concreto, sincronización `FACEBOOK_FIELD_KEY_MAP`, tabla de traducción de categorías, migración legacy, wiring de `IPublisherService`).
- Los 2 contratos de `contract-summary.md` implementados y consumidos (decode de VIN reconciliado, catálogo de opciones canónicas).
- Las 3 historias (US1.1, US1.2, US2.1) con sus AC verificados manualmente contra los mockups aprobados en Refined Mockups.
- NFR1 (0% de vehículos sin reconciliar, sin margen) medido y en verde.
- Registros legacy migrados al catálogo canónico (FR3.1).
- Contrato de `IPublisherService` documentado (FR4.1), incluyendo la distinción de credenciales del adapter de Playwright.
- Sanitización contra inyección de fórmulas aplicada al export CSV (FR5.1).

**Hipótesis de confianza** (qué prueba este Bolt al enviarse): que un admin de dealership puede decodificar un VIN y ver campos ya listos para Facebook Marketplace (o marcados explícitamente para completar a mano cuando no hay match), que el editor de schema de categorías deja de depender de una lista mantenida a mano, y que puede fijar una ubicación distinta a la de su organización para un producto puntual — sin que ninguno de los tres flujos rompa lo que ya funciona hoy.

**Demo esperada**: decodificar un VIN real en el formulario de creación de vehículo y mostrar los campos reconciliados (incluyendo al menos un caso de campo sin match, con su indicador visual); mostrar el editor de schema de categorías cargando opciones desde el catálogo canónico; editar y guardar un override de ubicación en un producto existente, mostrando el badge "Heredado de organización" antes y su desaparición después de guardar.
