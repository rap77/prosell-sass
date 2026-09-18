# Reliability Design — U1 (`u1-vehicle-catalog-api`)

Basado en `nfr-requirements/reliability-requirements.md` (NFR1.1, NFR1.2, NFR1.3).

## Integridad de dato del catálogo (NFR1.1)

Sin patrón de resiliencia en runtime — la integridad se garantiza en tiempo de desarrollo/test (test de reconciliación cruzada, piso de test #1) y en tiempo de carga del módulo (el catálogo es código, no un dato externo que pueda corromperse en runtime).

## Migración legacy idempotente (NFR1.2)

**Guarda anti-drift** (mecanismo elegido, corrección post-revisión): antes de aplicar el cambio a cada registro candidato, releer el valor actual del atributo específico y confirmar que SIGUE sin match contra el catálogo canónico — no comparar `updated_at`. Se descarta comparar timestamp porque `Product`/`ProductModel` actualizan `updated_at` en escrituras no relacionadas con el atributo migrado (ej. contadores como `view_count`/`favorite_count` son la excepción documentada que NO lo tocan, pero la mayoría de los demás setters sí) — un compare-por-timestamp excluiría de más (falso positivo de drift) ante cualquier cambio no relacionado. Releer el valor específico verifica directamente el invariante que le importa a BR3.1: si el registro cambió, excluirlo del batch y reportarlo — mismo espíritu de "validar antes de mutar" que el precedente de referencia, aplicado con precisión al atributo real en vez de a un proxy (timestamp) que puede dar falso positivo.

**Idempotencia**: correr el script dos veces no debe re-modificar un registro ya migrado — la condición de selección ("valor no calza con el catálogo canónico") deja de cumplirse una vez migrado, así que una segunda corrida naturalmente no vuelve a seleccionarlo.

## Disponibilidad (NFR1.3)

Sin failover ni replicación nueva — mismo target de disponibilidad ya vigente del backend. Sin circuit breaker (sin dependencia externa nueva que pueda fallar de forma aislada).

## Health checks

Sin health check nuevo — este Unit no introduce un servicio/proceso separado que monitorear; vive dentro del mismo proceso backend ya monitoreado.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-17T11:55:06Z
**Iteration:** 1

### Metodología

Antes de leer código crudo corrí `graphify query "Product model updated_at timestamp field"` (7 nodos, confirmó `models/__init__.py` y `ProductModel`), y usé `rg` para confirmar `updated_at` en `Product` (dominio, `product.py:91`) y en `ProductModel` (`product_model.py:135`) — soporte real para la primera alternativa mecánica que propone la guarda anti-drift de NFR1.2.

### Cobertura de `traceability.json`

Los 12 IDs de `nfr-requirements` (NFR1.1-1.3, NFR-PERF-1/2, NFR-SEC-1/2/3/4, NFR-SCALE-1, NFR-OBS-1/2) están los 12 en `upstream_ids` y los 12 en `coverage`, sin huérfanos ni faltantes. Verifiqué cada `target` contra el heading real del archivo citado:

| ID           | Target citado                                                              | Heading real                                                   | Match                                                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR1.1       | `reliability-design.md § Integridad de dato del catálogo`                  | `## Integridad de dato del catálogo (NFR1.1)`                  | ✓                                                                                                                                                                                  |
| NFR1.2       | `reliability-design.md § Migración legacy idempotente (guarda anti-drift)` | `## Migración legacy idempotente (NFR1.2)`                     | Parcial — el heading real dice `(NFR1.2)`, no `(guarda anti-drift)`; la frase citada describe el contenido de la sección, no el heading literal (Minor, cosmético, no bloqueante). |
| NFR1.3       | `reliability-design.md § Disponibilidad`                                   | `## Disponibilidad (NFR1.3)`                                   | ✓                                                                                                                                                                                  |
| NFR-PERF-1/2 | `performance-design.md § Presupuesto de latencia`                          | `## Presupuesto de latencia`                                   | ✓ (ambos IDs mapean a la misma sección, que trae un bullet propio por cada uno)                                                                                                    |
| NFR-SEC-1    | `security-design.md § Autenticación/autorización del endpoint nuevo`       | `## Autenticación/autorización del endpoint nuevo (NFR-SEC-1)` | ✓                                                                                                                                                                                  |
| NFR-SEC-2    | `security-design.md § Sanitización de fórmulas en CSV`                     | `## Sanitización de fórmulas en CSV (NFR-SEC-2)`               | ✓                                                                                                                                                                                  |
| NFR-SEC-3    | `security-design.md § Manejo de credenciales del publisher`                | `## Manejo de credenciales del publisher (NFR-SEC-3)`          | ✓                                                                                                                                                                                  |
| NFR-SEC-4    | `security-design.md § Migración legacy sin exposición de datos`            | `## Migración legacy sin exposición de datos (NFR-SEC-4)`      | ✓                                                                                                                                                                                  |
| NFR-SCALE-1  | `scalability-design.md § Diseño: stateless, sin partición de datos`        | `## Diseño: stateless, sin partición de datos`                 | ✓                                                                                                                                                                                  |
| NFR-OBS-1    | `observability-design.md § Warning de field_key sin catálogo`              | `## Warning de \`field_key\` sin catálogo (NFR-OBS-1)`         | ✓                                                                                                                                                                                  |
| NFR-OBS-2    | `observability-design.md § Log de resumen de migración`                    | `## Log de resumen de migración (NFR-OBS-2)`                   | ✓                                                                                                                                                                                  |

11 de 12 targets calzan exactamente contra el heading real; 1 (NFR1.2) es una imprecisión de cita cosmética, no un target inexistente — el contenido correcto SÍ está en esa sección.

### NFR1.2 — guarda anti-drift: mecanismo no resuelto (hallazgo principal)

`reliability-design.md` describe la guarda anti-drift como: _"comparar timestamp de última modificación, **o** releer el valor actual y confirmar que sigue sin match"_. Verifiqué que **ambas alternativas son técnicamente viables** — `Product` (dominio, `product.py:91`) y `ProductModel` (`product_model.py:135`) tienen `updated_at`, así que un compare-por-timestamp es implementable — pero el diseño no elige una: deja un "o" entre dos mecanismos que **no son equivalentes**:

- **Comparar `updated_at`** detecta CUALQUIER modificación del registro desde que se armó el batch, incluida una que no toque el atributo relevante — puede excluir de más (falso positivo de drift) si otro proceso tocó un campo no relacionado (ej. `view_count`, `favorite_count` — ver `product.py:553/558/563`, que explícitamente NO tocan `updated_at` para esos casos, pero SÍ lo hacen la mayoría de los demás setters).
- **Releer el valor actual y confirmar que sigue sin match** verifica directamente el invariante que le importa a BR3.1 (2) — es más preciso, pero requiere una lectura adicional del atributo específico por registro, no solo del timestamp.

`rules.md` BR3.1 (ya READY) tampoco fija el mecanismo — solo dice "verificar que el registro no fue modificado... (guarda anti-drift/re-ejecución)", dejando la decisión explícitamente para una etapa posterior. Esta etapa (NFR Design) es la que debería cerrarla, dado que su rol es agregar el "cómo" técnico sobre el "qué" ya fijado en Functional Design — y en cambio reproduce la misma ambigüedad de dos alternativas sin decidir cuál implementar. Un developer en Code Generation tiene que elegir por su cuenta entre dos mecanismos con comportamiento de exclusión distinto, sin que ninguna etapa de diseño haya tomado esa decisión.

**Severidad:** Major (no Critical: cualquiera de las dos alternativas produce una migración funcionalmente segura — ninguna corrompe datos — la ambigüedad es sobre precisión/tasa de falsos positivos de exclusión, no sobre corrección básica del script; y el propio BR3.1 ya venía sin resolverlo, por lo que no es una regresión introducida por esta etapa sino una oportunidad no aprovechada de cerrarla acá).

**Recomendación:** Elegir explícitamente el mecanismo de "releer el valor actual y confirmar que sigue sin match" (verifica el invariante real que le importa a la migración, sin el riesgo de falsos positivos de un timestamp que cambia por motivos no relacionados) y quitar la alternativa de "comparar timestamp" del texto, o — si se prefiere el timestamp por ser más barato de verificar — documentar explícitamente que acepta ese trade-off de exclusión conservadora.

### Consistencia con `components.md` (Domain Design)

`logical-components.md` no introduce ningún componente que `components.md` no haya declarado: `FacebookVehicleValueCatalog`, `VehicleVinDecodeService`, `CategorySchemaService` aparecen en ambos con la misma frontera. La fila "Migración legacy (script ad-hoc)" no es un componente nuevo no declarado — `components.md`/ADR-004 ya establecieron explícitamente que FR3 no gana un componente propio (es un script, no un building block persistente), y `logical-components.md` lo trata coherentemente como una fila de infraestructura/deploy, no como un componente de dominio nuevo. Sin contradicción.

### Honestidad de "sin X nuevo"

- **Sin caché** (`performance-design.md`): correcto — el catálogo es un dict en memoria, ya O(1), sin I/O que cachear.
- **Sin circuit breaker** (`reliability-design.md` NFR1.3): correcto en el alcance de este Unit — la única dependencia externa (NHTSA API) es preexistente y no se modifica (`components.md`: "sin cambios en los tres" para `vehicle_router.py::decode_vin()`, `NHTSAVinService`, `nhtsa_normalizer.py"). No hay una dependencia externa NUEVA que este Unit agregue y que debiera envolverse con un patrón de resiliencia nuevo.
- **Sin health check nuevo**: correcto — mismo proceso backend ya monitoreado, sin deployable nuevo (confirmado contra `unit-of-work.md`, U1 = mismo deployable existente).

### Constraint de pseudocódigo

El único fragmento de código en los 5 archivos de diseño es la línea de `security-design.md` (`if value.startswith(("=", "+", "-", "@")): value = "'" + value`) — una línea, ilustrativa, no una implementación completa (falta manejo de `value` no-string, iteración sobre la fila, etc. — correctamente delegado a Code Generation). Sin violación del constraint de la fase de Construction sobre código ilustrativo.

### Summary

Cobertura de `traceability.json` completa y casi toda verificada carácter a carácter contra headings reales (11/12 exactos, 1 imprecisión cosmética de cita). `logical-components.md` es consistente con `components.md`/ADR-004 de Domain Design, sin componentes fantasma. Las afirmaciones de "sin X nuevo" (caché, circuit breaker, health check) son honestas dado el alcance real de este Unit. El único hallazgo de fondo es que la guarda anti-drift de NFR1.2 deja sin resolver la elección entre dos mecanismos técnicamente viables pero no equivalentes (confirmé que `Product`/`ProductModel` sí tienen `updated_at`, así que la opción de timestamp es real, no hipotética) — Major, no bloqueante por sí solo dado que ambas alternativas producen una migración segura y la ambigüedad ya venía de `rules.md`/BR3.1 sin resolverse. Con un solo Major y un Minor cosmético, un developer puede implementar el resto del Unit sin volver a preguntar al arquitecto; solo necesita que Code Generation fije el mecanismo exacto de la guarda anti-drift antes de escribir el script. READY.
