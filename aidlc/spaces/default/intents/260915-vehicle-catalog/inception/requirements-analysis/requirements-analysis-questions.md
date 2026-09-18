## Sources

- [desc] Initial description: "Implement canonical Facebook vehicle catalog references across category schemas, dynamic selects, VIN decode normalization, vehicle import/create/update validation, organization-location defaults editable per product, legacy migration, and publisher adapter contracts; keep live Facebook automation out of scope."
- [consumes:intent-statement] `aidlc/spaces/default/intents/260915-vehicle-catalog/ideation/intent-capture/intent-statement.md`
- [consumes:scope-document] `aidlc/spaces/default/intents/260915-vehicle-catalog/ideation/scope-definition/scope-document.md`
- [consumes:team-practices] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/practices-discovery/team-practices.md`
- [codekb] `aidlc/spaces/default/codekb/prosell-sass/code-quality-assessment.md` (hallazgos #87-93)

Reverse Engineering y Practices Discovery ya resolvieron la mayoría de las ambigüedades técnicas (evidencia de código, piso de test, riesgo de seguridad del CSV). Estas 7 preguntas cubren solo las decisiones de comportamiento/alcance que quedaron explícitamente abiertas.

## Q1. La reconciliación entre el catálogo de decode de VIN (inglés) y el catálogo de opciones del schema (español) — ¿dónde vive y qué expone al usuario?

A. Domain service en el backend — el endpoint de decode de VIN ya devuelve el valor reconciliado en el catálogo canónico; el frontend no necesita lógica de mapeo propia.
B. Tabla TS compartida en el frontend — el backend sigue devolviendo el valor tal cual lo decodifica NHTSA, y el frontend mapea antes de autocompletar el formulario.
C. Todavía no definido — hace falta discutirlo antes de decidir.
X. Otro (especificar)

[Answer]: A

## Q2. Cuando el valor decodificado del VIN NO tiene una opción correspondiente en el schema (después de la reconciliación), ¿qué debería pasar?

A. Dejar ese campo específico vacío para que el usuario lo complete a mano, sin bloquear el resto del formulario.
B. Completar igual con el valor crudo decodificado, aunque no calce con ninguna opción configurada, y marcarlo visualmente (ej. advertencia) sin bloquear.
C. Bloquear el guardado del vehículo hasta que el usuario corrija ese campo manualmente.
D. Todavía no definido.
X. Otro (especificar)

[Answer]: A

## Q3. Las migraciones legacy de vehículos hoy son ad-hoc por caso (con guardas de seguridad triples). ¿Este intent las generaliza en una herramienta reutilizable?

A. Sí, generalizar en una herramienta reutilizable, manteniendo las mismas guardas de seguridad ya usadas.
B. No — este intent no migra datos legacy adicionales; si hiciera falta una migración puntual nueva, se escribe ad-hoc igual que las anteriores.
C. Depende de si aparece un caso concreto de datos legacy a migrar — no decidir todavía, evaluarlo en Functional Design.
D. Todavía no definido.
X. Otro (especificar)

[Answer]: B

## Q4. El puerto de adapter de publisher (`IPublisherService`) ya existe en producción. ¿Qué alcance real tiene esta área del intent?

A. Solo confirmar/documentar el contrato existente sin cambiarlo — este intent no necesita extenderlo.
B. Extender el contrato para absorber la reconciliación de catálogos de valores (pasarle al publisher valores ya canónicos).
C. Extenderlo por otro motivo (especificar en "Otro").
D. Todavía no definido.
X. Otro (especificar)

[Answer]: A

## Q5. Defaults de ubicación/organización editables por producto — ¿qué falta exactamente respecto de lo que ya existe (hoy solo hay un fallback de ubicación a nivel de organización, aplicado en el momento del export)?

A. Persistir un override de ubicación a nivel de producto individual — el usuario edita la ubicación de un producto específico y esa queda guardada, no solo calculada al exportar.
B. Solo extender el fallback ya existente en el export a otros flujos (ej. creación/edición de producto), sin agregar un campo nuevo persistido.
C. Ambos — persistir el override Y aplicarlo también en creación/edición.
D. Todavía no definido.
X. Otro (especificar)

[Answer]: C

## Q6. Sanitización de fórmulas en el export CSV (ya afirmada en Practices Discovery) — ¿qué mecanismo preferís?

A. Prefijar con comilla simple (`'`) cualquier valor que empiece con `=`, `+`, `-` o `@` — mismo enfoque que usan Excel/Google Sheets para neutralizar fórmulas sin cambiar el valor visible al cliente.
B. Rechazar/loguear como error cualquier valor de catálogo que empiece con esos caracteres, en vez de sanitizarlo silenciosamente.
C. Otro mecanismo (especificar en "Otro").
D. Todavía no definido — dejar la decisión de mecanismo para Functional Design.
X. Otro (especificar)

[Answer]: A

## Q7. La primera métrica de éxito de Intent Capture ("cero, o casi cero, publicaciones mal categorizadas") quedó sin umbral numérico. ¿Qué umbral concreto querés fijar?

A. 0% — cero publicaciones mal categorizadas por desajuste de catálogo, sin margen.
B. Un umbral con margen (ej. ≤1% en un período de 30 días) — especificar en "Otro".
C. No fijar un número — mantenerlo como objetivo cualitativo sin métrica dura.
D. Todavía no definido.
X. Otro (especificar)

[Answer]: A

## Q8 (follow-up, surgida de la revisión advisory). Cuando `Category.validate_attributes()` rechaza un valor de atributo (típicamente tipeado a mano, no del decode de VIN) que no calza con ninguna opción configurada del schema, ¿qué debería pasar hoy en creación/edición de vehículo?

A. Rechazar con error — no permitir guardar el vehículo hasta que el valor calce con una opción válida (comportamiento actual, sin cambios).
B. Permitir y loguear — guardar igual pero registrar el valor fuera de catálogo para revisión posterior.
C. Ya está definido, no hace falta un FR nuevo — el comportamiento actual (rechazar) ya es el requisito, solo aclarar que no cambia.
X. Otro (especificar)

[Answer]: A

## Consolidated Summary Confirmation

- Q1 (Reconciliación): A — domain service en backend; el endpoint de decode de VIN devuelve el valor ya reconciliado.
- Q2 (Sin match): A — dejar el campo vacío para que el usuario lo complete a mano, sin bloquear el formulario.
- Q3 (Migraciones legacy): B — no generalizar, seguir con el patrón ad-hoc por caso.
- Q4 (Publisher): A — solo documentar el contrato existente, sin extenderlo.
- Q5 (Ubicación por producto): C — persistir el override por producto Y aplicarlo también en creación/edición.
- Q6 (Sanitización CSV): A — prefijar con comilla simple los valores que empiecen con `=+-@`.
- Q7 (Métrica de éxito): A — 0% sin margen, cero publicaciones mal categorizadas por desajuste de catálogo.
- Q8 (follow-up, validación de atributo sin match): A — rechazar con error, comportamiento actual sin cambios.

- Looks correct
- Request changes

[Answer]: Looks correct
