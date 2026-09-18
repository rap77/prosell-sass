# Reliability Requirements — U1 (`u1-vehicle-catalog-api`)

Basado en `requirements.md` (NFR1) y `rules.md` (BR1.1, BR1.4, BR3.1).

## NFR1.1: Integridad de dato del catálogo canónico — 0% de vehículos sin reconciliar, sin margen

- **Target**: heredado directamente de NFR1 de `requirements.md` — 0% de vehículos con un valor de atributo select-backed sin reconciliar contra el catálogo canónico de Facebook, sin margen de tolerancia.
- **Medición**: test de reconciliación cruzada valor-por-valor (piso de test #1 de `team-practices.md`), cubriendo el 100% de los 9 campos select-backed de la taxonomía de vehículos — no una muestra parcial. Complementado por revisión manual de QA sobre los mismos campos antes de mergear (no por observar rechazos reales de Facebook, fuera de alcance).
- **Consecuencia de incumplimiento**: un hueco de cobertura del catálogo se detecta como falla de test explícita (no como bug silencioso en producción) — mismo objetivo que motivó el hallazgo #87 de este intent.

## NFR1.2: Migración legacy idempotente y segura ante re-ejecución

- **Target**: el script de migración (BR3.1) no debe corromper datos si se corre dos veces, ni si el conjunto de candidatos queda desactualizado entre el armado del batch y su aplicación (guarda anti-drift).
- **Medición**: test de regresión de idempotencia (condicional, piso de test #5 de `team-practices.md`) — correr el script dos veces sobre el mismo dataset y verificar que la segunda corrida no modifica registros ya migrados.
- **Recuperación ante fallo parcial**: un registro que falla una guarda se excluye del batch y se reporta — la migración completa no aborta por un registro puntual (BR3.1).

## NFR1.3: Disponibilidad — sin cambio del target ya vigente de la plataforma

- **Target**: los endpoints extendidos/nuevos de este Unit (`POST /vehicles/decode-vin`, `GET /categories/facebook-values/{field_key}`) heredan el mismo SLA de disponibilidad ya vigente del backend — este intent no introduce un nuevo punto único de falla (el catálogo es en-memoria, sin dependencia externa nueva).

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-17T11:45:13Z
**Iteration:** 1

### Verificación de fidelidad de NFR1 (`reliability-requirements.md` vs `requirements.md`)

NFR1.1 no debilita ni reformula el compromiso original de `requirements.md`: mantiene "0%... sin margen", el mismo mecanismo de medición (test de reconciliación cruzada valor-por-valor, piso de test #1 de `team-practices.md`), y la revisión manual de QA como complemento — no como sustituto — del test automatizado. Agrega el número concreto "9 campos", que coincide carácter a carácter con `allowed_values` de `entities.md` (`make, fuel_type, transmission, body_type, drivetrain, wheelbase_type, bed_type, cab_type, electrification_level`) — verificado también contra `scalability-requirements.md`, que cita exactamente la misma lista de 9. No hay debilitamiento del compromiso.

### NFR2 marcado N/A

Correcto y consistente con el precedente ya establecido en este proyecto (Domain Design/Units Generation de intents previos) de usar `N/A` cuando el ítem no tiene un target de runtime que mapear, en vez de forzar un `NFRx.y` artificial. NFR2 es un piso de test metodológico (Testing, no una cualidad de sistema medible en runtime como performance/reliability/security/scalability/observability) — no encaja en el alcance de esta etapa. `traceability.json` cita explícitamente `team-practices.md` como la cobertura real, análogo a como Domain Design cita `functional-spec.md` para ítems sin `BRx.y`. La decisión ya fue confirmada por el humano en el gate de esta misma etapa (`nfr-requirements-questions.md`, "Looks correct") — no hay elemento nuevo que la contradiga.

### NFR-SEC-2 (sanitización CSV) — hallazgo de terminología

**Hallazgo (Minor, mecánico/objetivo):** `security-requirements.md` § NFR-SEC-2 describe la motivación como "la reconciliación de FR1 puede introducir, vía el fallback de 'campo sin match' (BR1.2), valores que llegan sin la curación". Verificado carácter a carácter contra `rules.md` BR1.2: la propia regla distingue explícitamente DOS fallbacks distintos — CASE 2 ("sin match", cuando SÍ hay catálogo aplicable) devuelve `null` y agrega el campo a `unmatched_fields` (ningún valor llega a `vehicle`, por lo tanto ningún valor sin curar puede llegar al CSV por esta vía), y CASE 3 ("sin catálogo aplicable", 0 entradas para ese `field_key`) es el que efectivamente deja pasar "el valor normalizado tal cual (sin reconciliar)" — este es el fallback real que puede introducir un valor sin curar en el flujo. El texto de NFR-SEC-2 usa la etiqueta de CASE 2 ("sin match") para describir el riesgo que en realidad corresponde a CASE 3 ("sin catálogo aplicable") de la propia `rules.md`. No es bloqueante porque BR5.1 sanitiza CUALQUIER valor de celda que empiece con `=+-@` incondicionalmente, sin importar su origen (VIN-decode, entrada manual, o cualquier otro) — el comportamiento implementable de BR5.1 no depende de esta distinción, así que un developer no puede implementar mal la sanitización por este motivo. Es una imprecisión de justificación/documentación, no una falla del requisito en sí.
**Recomendación:** corregir la cita para decir "campo sin catálogo aplicable (CASE 3 de BR1.2)" en vez de "campo sin match" — evita que un futuro lector confunda cuál de los dos fallbacks de BR1.2 es el que motiva la sanitización.

### NFR-PERF-1/2 — verificabilidad en Build and Test

Ambos son targets de bajo riesgo y verificables, aunque con distinto grado de precisión:

- **NFR-PERF-1** es concreto: benchmark de comparación p50/p95 antes/después del intent sobre `POST /vehicles/decode-vin` — mecanismo de medición explícito y ejecutable en Build and Test.
- **NFR-PERF-2** ("sub-10ms de trabajo propio, sin contar overhead de red/framework") es la formulación más débil de las dos — no especifica CÓMO aislar "trabajo propio" del overhead de FastAPI/red en una medición end-to-end. No lo considero bloqueante (Minor) porque `get_options()`/`reconcile()` son lookups en un dict Python estático — un test unitario de nivel de función (timing directo sobre la llamada, sin pasar por HTTP) resuelve la ambigüedad de forma trivial y es el mecanismo obvio dado lo simple del componente — pero `performance-requirements.md` no lo deja explícito.
  **Recomendación:** aclarar en `performance-requirements.md` (o dejarlo para `unit-test-instructions.md` de Code Generation) que el benchmark de NFR-PERF-2 se mide con un test unitario de nivel de función sobre `get_options()`, no con una medición end-to-end vía HTTP.

### Consistencia interna de los 9 campos

Verificado: `scalability-requirements.md`, `entities.md` (`allowed_values`) y `reliability-requirements.md` (NFR1.1) citan exactamente los mismos 9 nombres (`make, fuel_type, transmission, body_type, drivetrain, wheelbase_type, bed_type, cab_type, electrification_level`), en el mismo orden. Sin discrepancia.

### `tech-stack-decisions.md`

"Sin librería nueva" es consistente con lo que Code Generation necesita: `FacebookVehicleValueCatalog` es un dict Python estático (mismo patrón que `category_translation.py`, ya en `domain/services/`, confirmado vía `graphify`), la sanitización de BR5.1 es manipulación de string pura (sin librería de CSV adicional — `csv_export.py` ya usa `csv.writer` estándar), y la migración legacy reutiliza Alembic ya vigente. No hay necesidad real de una dependencia nueva para lo que este Unit especifica.

### Verificación contra código real (`csv_export.py`)

Confirmado con `rg` que `build_client_format_row()` (`apps/api/src/prosell/domain/services/csv_export.py`) hoy NO tiene ninguna lógica de sanitización contra fórmulas — NFR-SEC-2/BR5.1 son trabajo genuinamente nuevo de este intent, no una descripción de comportamiento preexistente. La ubicación citada (`build_client_format_row`, `csv_export.py`) es exacta.

### Hallazgos

| #   | Severidad | Ubicación                                | Hallazgo                                                                                                                                                                                                                                                                            | Mecánico/objetivo                                             |
| --- | --------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Minor     | `security-requirements.md` NFR-SEC-2     | La motivación cita "fallback de 'campo sin match' (BR1.2)" cuando el fallback real que deja pasar un valor sin curar es CASE 3 ("sin catálogo aplicable"), no CASE 2 ("sin match") — BR5.1 sanitiza incondicionalmente, así que no afecta la implementabilidad del requisito en sí. | Sí — verificable carácter a carácter contra `rules.md` BR1.2. |
| 2   | Minor     | `performance-requirements.md` NFR-PERF-2 | "sub-10ms de trabajo propio, sin contar overhead de red/framework" no especifica el mecanismo de aislamiento de esa medición (test unitario de función vs. medición end-to-end).                                                                                                    | Sí — ausencia objetiva de un mecanismo de medición explícito. |

### Summary

No hay hallazgos Critical ni Major. NFR1 mantiene fidelidad completa (incluso mejora la precisión) respecto al compromiso de `requirements.md`; NFR2 está correctamente marcado N/A siguiendo un precedente ya establecido en el proyecto y confirmado por el humano en esta misma etapa; la lista de 9 campos es consistente entre `scalability-requirements.md`, `entities.md` y `reliability-requirements.md`; y `tech-stack-decisions.md` es coherente con lo que Code Generation necesitará. Los dos hallazgos Minor (imprecisión de terminología en la motivación de NFR-SEC-2, y mecanismo de medición no explícito en NFR-PERF-2) no bloquean — ninguno impide que un developer implemente sin volver a preguntar al arquitecto. READY.
