## Sources

- [desc] Initial description: "Implement canonical Facebook vehicle catalog references across category schemas, dynamic selects, VIN decode normalization, vehicle import/create/update validation, organization-location defaults editable per product, legacy migration, and publisher adapter contracts; keep live Facebook automation out of scope."
- [scope] Workflow-selected scope: `feature`.

## Q1. ¿Qué problema de negocio estamos resolviendo? (elegí todas las que apliquen)

A. Las publicaciones y exports de vehículos no calzan de forma confiable con los valores canónicos de categoría/atributo de Facebook Marketplace, causando publicaciones rechazadas, mal categorizadas o de baja calidad.
B. El mapeo al catálogo canónico de Facebook está implementado de forma inconsistente en distintas partes del sistema (schemas de categoría, selects dinámicos de formularios, decodificación de VIN, import/validación, registros legacy), generando riesgo de mantenimiento y drift.
C. Estamos sentando las bases (referencias canónicas + contratos de adapter de publisher) para una futura integración de publicación directa con Facebook, sin activar automatización en vivo todavía.
D. Todavía no está definido — hace falta confirmar el problema de negocio preciso.
X. Otro (especificar)

[Answer]: A, B, C

## Q2. ¿Quién es el cliente de este trabajo, y qué dolor está experimentando? (elegí todas las que apliquen)

A. Interno: administradores de dealership/organización que crean o importan publicaciones de vehículos y hoy reciben categorías/atributos incorrectos o rechazados al publicar en Facebook Marketplace.
B. Interno: el equipo de ingeniería/producto que mantiene el mapeo del catálogo de Facebook, hoy duplicando o sincronizando a mano valores entre schemas de categoría, formularios, decodificación de VIN y validación.
C. Externo: compradores finales en Facebook Marketplace que ven publicaciones incompletas o mal categorizadas.
D. Todavía no está definido — hace falta confirmar quién es el cliente y su dolor.
X. Otro (especificar)

[Answer]: A, B, C

## Q3. ¿Cómo se ve el éxito de esta iniciativa? ¿Qué métricas importan? (elegí todas las que apliquen)

A. Cero (o casi cero) publicaciones de vehículos rechazadas o mal categorizadas por desajuste de valores del catálogo, después de publicar/exportar.
B. Una única fuente canónica de verdad para los valores de vehículos de Facebook, consumida de forma consistente por schemas de categoría, selects dinámicos, decodificación de VIN y validación (medido por eliminación de listas de valores duplicadas/hardcodeadas).
C. Registros legacy de vehículos migrados exitosamente al catálogo canónico sin pérdida de datos (medido por tasa de finalización de migración / cantidad de registros reconciliados).
D. Todavía no está definido — las métricas de éxito no están identificadas todavía.
X. Otro (especificar)

[Answer]: A, B, C

## Q4. ¿Cuál es el disparador de esta iniciativa ahora mismo (presión de mercado, deuda técnica, regulación, oportunidad)? (elegí todas las que apliquen)

A. Deuda técnica / inconsistencia: un trabajo anterior ya introdujo un catálogo de valores de Facebook y un editor de schema, y esta iniciativa extiende esa referencia canónica de forma consistente a los puntos de contacto restantes que nombra la descripción.
B. Un defecto de producción o incidente de calidad de datos vinculado a valores del catálogo de vehículos (ej. mapeo incorrecto de categoría/atributo de Facebook) que necesita un fix durable, no solo un parche puntual.
C. Una oportunidad próxima: preparar contratos de adapter de publisher de cara a una futura integración de publicación directa con Facebook (todavía sin alcance definido).
D. No identificado — el disparador todavía no está confirmado.
X. Otro (especificar)

[Answer]: A, B, C

## Q5. ¿Quiénes son los stakeholders clave de esta iniciativa, y qué le importa a cada uno? (elegí todas las que apliquen)

A. Usuarios de dealership/organización que crean y gestionan publicaciones de vehículos — les importa que las publicaciones se publiquen correctamente y que los defaults de ubicación/organización tengan sentido por producto.
B. Equipo de ingeniería que mantiene schemas de categoría, import/validación y decodificación de VIN — les importa tener una referencia canónica consistente en vez de mapeos dispersos.
C. Stakeholders de producto/negocio que supervisan el canal de Facebook Marketplace — les importa la calidad de las publicaciones y estar listos para una futura automatización en vivo.
D. No identificado — los stakeholders todavía no están confirmados.
X. Otro (especificar)

[Answer]: A, B, C

## Q6. ¿Quién decide el alcance o la prioridad de esta iniciativa, y quién influye en esas decisiones? (elegí todas las que apliquen)

A. La persona que conduce este workflow decide alcance y prioridad directamente.
B. Las decisiones se toman de forma colaborativa con stakeholders de dealership/organización que opinan sobre qué atributos de vehículo y ubicaciones importan más.
C. Las decisiones dependen de quien sea dueño del roadmap de integración con Facebook Marketplace, aunque no esté directamente involucrado en este workflow.
D. No identificado — los tomadores de decisión todavía no están confirmados.
X. Otro (especificar)

[Answer]: A

## Q7. ¿Hay requisitos de comunicación o una cadencia de reporte para esta iniciativa? (elegí todas las que apliquen)

A. Ninguno — esto se trabaja y se revisa directamente a través de los gates de aprobación de este workflow.
B. Se esperan actualizaciones periódicas de estado a un equipo o grupo de stakeholders más amplio (especificar cadencia/audiencia en "Otro").
C. Se requiere aprobación formal de un rol/persona específica antes de que esto salga a producción.
D. No aplica.
X. Otro (especificar)

[Answer]: A

## Q8. El workflow arrancó con el scope `feature`. ¿Eso coincide con el límite de producto que tenés en mente para esta iniciativa?

A. Sí — el scope `feature` (profundidad Standard, etapas completas de inception + construction + operation) coincide; dejarlo así.
B. No — esto es más chico que un feature completo; un scope más liviano (ej. bugfix/refactor/express) encajaría mejor.
C. No — esto es más grande que un solo feature; abarca varias piezas de trabajo independientes que quizás haya que separar en intents/Bolts distintos.
D. Todavía no está definido — hace falta discutirlo antes de confirmar el scope.
X. Otro (especificar)

[Answer]: A

## Consolidated Summary Confirmation

- Q1 (Problema de negocio): A, B, C — Las publicaciones no calzan con los valores canónicos de Facebook; el mapeo está implementado de forma inconsistente en todo el sistema; y esto sienta las bases para una futura integración de publicación directa.
- Q2 (Cliente): A, B, C — Admins de dealership/organización, el equipo de ingeniería/producto, y compradores finales en Facebook Marketplace.
- Q3 (Éxito): A, B, C — Cero publicaciones mal categorizadas, una única fuente canónica de verdad, y migración legacy exitosa sin pérdida de datos.
- Q4 (Disparador): A, B, C — Continuación de trabajo previo (catálogo de valores de Facebook + editor de schema), un defecto de producción / incidente de calidad de datos, y preparación para una oportunidad futura (contratos de adapter de publisher).
- Q5 (Stakeholders): A, B, C — Usuarios de dealership/organización, el equipo de ingeniería, y stakeholders de producto/negocio.
- Q6 (Decisión de alcance/prioridad): A — Vos decidís directamente.
- Q7 (Comunicación): A — Ninguno; se trabaja a través de los gates de aprobación del workflow.
- Q8 (Scope): A — El scope `feature` coincide, se mantiene así.

- Looks correct
- Request changes

[Answer]: Looks correct
