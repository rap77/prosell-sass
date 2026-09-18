## Sources

- [desc] Initial description: "Implement canonical Facebook vehicle catalog references across category schemas, dynamic selects, VIN decode normalization, vehicle import/create/update validation, organization-location defaults editable per product, legacy migration, and publisher adapter contracts; keep live Facebook automation out of scope."
- [scope] Workflow-selected scope: `feature`.
- [consumes:intent-statement] `aidlc/spaces/default/intents/260915-vehicle-catalog/ideation/intent-capture/intent-statement.md`

## Q1. ¿Con qué sistemas existentes tiene que integrarse este trabajo? (elegí todas las que apliquen)

A. Schemas de categoría y el editor de schema (CategoryRepository, tabla de traducción de categorías) que ya existe para Facebook.
B. El pipeline de export/import de CSV (csv_export.py, csv_field_mapper.py, bulk_upload_vehicles.py) que ya mapea valores al formato de Facebook.
C. La decodificación de VIN existente y los formularios de creación/edición de vehículos (selects dinámicos).
D. No identificado — falta confirmar el inventario completo de sistemas a integrar.
X. Otro (especificar)

[Answer]: A, B, C

## Q2. ¿Hay requisitos regulatorios o de compliance relevantes para este trabajo (PCI, HIPAA, SOC2, residencia de datos)? (elegí todas las que apliquen)

A. Ninguno identificado — no se procesan datos de tarjetas de pago ni de salud; los datos son de catálogo de vehículos (marca, modelo, VIN, ubicación).
B. Datos personales de organizaciones/usuarios (contacto, ubicación) ya están cubiertos por las políticas de privacidad y controles existentes de la plataforma, sin requisito nuevo introducido por este trabajo.
C. Sí hay un requisito nuevo de compliance vinculado a este trabajo (especificar en "Otro").
D. No identificado — falta confirmar.
X. Otro (especificar)

[Answer]: A

## Q3. ¿El stack tecnológico y el perfil de skills del equipo actual (FastAPI + SQLAlchemy + Postgres backend, Next.js + React + TypeScript frontend) alcanza para este trabajo, o hace falta algo nuevo?

A. Alcanza — es una extensión del mismo stack y los mismos patrones ya usados en el catálogo de Facebook existente.
B. Hace falta una herramienta o librería nueva (especificar en "Otro").
C. No identificado — falta confirmar.
X. Otro (especificar)

[Answer]: A

## Q4. ¿Hay restricciones de presupuesto o timeline para este trabajo? (elegí todas las que apliquen)

A. Ninguna restricción de timeline específica — se trabaja al ritmo normal de este workflow.
B. Hay una fecha límite concreta (especificar en "Otro").
C. Hay una restricción de presupuesto (ej. horas de ingeniería disponibles) que condiciona el alcance.
D. No identificado — falta confirmar.
X. Otro (especificar)

[Answer]: A

## Q5. ¿Hay bloqueadores organizacionales (freeze de cambios, prioridades en competencia) que afecten este trabajo?

A. Ninguno — no hay freeze de cambios activo ni prioridades en competencia conocidas.
B. Sí hay un bloqueador activo (especificar en "Otro").
C. No identificado — falta confirmar.
X. Otro (especificar)

[Answer]: A

## Q6. La infraestructura de este proyecto corre en un droplet self-hosted (Docker + GitHub Actions), no en AWS. ¿Aplica alguna consideración de infraestructura/nube nueva para este trabajo, o es puramente una extensión de la lógica de aplicación ya desplegada?

A. Es puramente lógica de aplicación (backend/frontend/DB ya provisionados) — sin cambio de infraestructura ni de topología de despliegue.
B. Sí hay una consideración de infraestructura nueva (ej. almacenamiento adicional, servicio externo) — especificar en "Otro".
C. No identificado — falta confirmar.
X. Otro (especificar)

[Answer]: A

## Consolidated Summary Confirmation

- Q1 (Integración): A, B, C — schemas de categoría, pipeline CSV export/import, VIN decode + formularios.
- Q2 (Compliance): A — ninguno identificado; los datos son de catálogo de vehículos, no de tarjetas ni de salud.
- Q3 (Stack): A — el stack actual alcanza, es extensión de patrones ya usados.
- Q4 (Restricciones): A — ninguna restricción de timeline/presupuesto específica.
- Q5 (Bloqueadores): A — ninguno.
- Q6 (Infraestructura): A — puramente lógica de aplicación, sin cambio de infraestructura ni topología de despliegue.

- Looks correct
- Request changes

[Answer]: Looks correct
