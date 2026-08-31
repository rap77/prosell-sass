# AI-DLC State Tracking

## Project Information

- **Project**: Scope: express
  Intent: Production bugfixes batch — 7 issues reportados por usuarios activos

## Bugs a corregir (en orden de prioridad)

### BUG-1: Cola de revisión — imágenes no se muestran

La pestaña de "Cola de revisión" no muestra las imágenes de los productos en los registros.
Comportamiento esperado: cada registro debe mostrar el thumbnail del producto.

### BUG-2: Lista de publicaciones — falta imagen

En la vista de lista de publicaciones, no aparece la imagen del producto.
Comportamiento esperado: columna con thumbnail visible.

### BUG-3: Schema de categorías — selects no muestran valor seleccionado

En el editor de schema de categorías (donde se definen grupos y campos), los dropdowns de "Type" y "Group" aparecen vacíos aunque tienen un valor seleccionado. Es un bug de renderizado frecuente — buscar la solución permanente, no un parche.
EVIDENCIA: los <select> tienen valor en el state pero no lo reflejan visualmente.

### BUG-4: Compartir contacto de organización — ocultar teléfono

Al compartir la información de contacto por WhatsApp, se envía el teléfono. Debe ocultarse — solo interesa la dirección completa.
Comportamiento esperado: el mensaje de WhatsApp incluye nombre + dirección, sin teléfono.

### BUG-5: Capitalización al crear/editar producto

Los valores del formulario de vehículos deben forzar Title Case (mayúscula al inicio de cada palabra), incluso si el VIN decoder trae datos en minúsculas o mayúsculas random.
Comportamiento esperado: "spark" → "Spark", "HONDA CIVIC" → "Honda Civic"

### BUG-6: Campos select se renderizan como inputs normales

En el formulario de vehículos, campos como "Bed Type", "Body Type", "Drivetrain", "Cab Type", "Wheelbase Type" se muestran como inputs de texto cuando deberían ser selects/combobox.
CAUSA PROBABLE: el schema de categoría define el campo pero no especifica field_type: "select" o no tiene opciones asociadas.
PREGUNTA ARQUITECTURAL: ¿dónde y cómo se definen las opciones para un campo de tipo select en el schema? Documentar la solución.

### BUG-7: Mezcla de idiomas — español e inglés

Los formularios tienen mezcla de idiomas (labels en inglés como "make", "trim", "mileage" junto a secciones en español como "Información Básica", "Colores", "Dimensiones").
CONTEXTO: ya existe infraestructura de i18n parcialmente implementada (apps/web/src/i18n/, LocaleSwitcher.tsx, vehicle-values.ts, backend translator.py). Hay un audit en docs/AUDIT-UI-UX-I18N-2026-07-21.md.
ACCIÓN PARA ESTE SPRINT: Normalizar a español los labels que están en inglés en los formularios de vehículos (solo UI, sin implementar multi-idioma completo). Cambiar "make" → "Marca", "trim" → "Versión", "mileage" → "Millaje", "clean_title" → "Título limpio", etc. También las secciones como "Dimensiones" que tienen campos en inglés ("Doors", "Windows", "Bed Type", etc.) → traducir a español.
NOTA: i18n bilingüe completo (locale de operador vs locale de publicación) se implementará como feature separada después de este batch de fixes.

## Feature adicional (no es bug)

### FEAT-1: Exportación de catálogo a CSV

Implementar exportación de catálogo usando los MISMOS campos y orden que el importador CSV actual.

- Generar un .csv con todos los campos del archivo que se importa
- Al usuario solo se le pide: path de carpeta destino para imágenes
- Nombre de carpeta de imágenes sigue el patrón (en mayúsculas, separado por guiones): {AÑO}-{MARCA}-{MODELO}-{MILLAS_EN_K}K-{COLOR}-{CÓDIGO_ORG}
  Ejemplo: 2017-SPARK-128K-BLANCO-DK
- El CSV debe tener una columna con la ruta relativa a la carpeta de imágenes

## Contexto técnico

- Stack: Next.js 16 + FastAPI + PostgreSQL 17
- Frontend en apps/web/, Backend en apps/api/
- Schema de categorías: probablemente en apps/api/src/prosell/domain/ o una tabla category_field_schema
- Formulario de vehículos: buscar en apps/web/src/ los componentes de producto/vehicle
- CSV import existente: buscar en apps/api/ el endpoint de bulk_upload o import
- Cola de revisión: buscar "review" o "revisión" en el frontend
- Publicaciones: buscar "publication" en el frontend

## Instrucciones

1. Empezar por reverse-engineering de los archivos involucrados (RE stage)
2. Agrupar los fixes por área (frontend UI, backend API, schema)
3. Implementar en orden BUG-3 y BUG-6 primero (afectan usabilidad del editor de schema)
4. Luego BUG-1 y BUG-2 (imágenes)
5. Luego BUG-4 y BUG-5 (lógica de negocio)
6. BUG-7 último (normalización de idiomas)
7. FEAT-1 al final (exportación CSV)
8. Correr tests después de cada grupo de fixes

- **Project Type**: Brownfield
- **Scope**: express
- **Start Date**: 2026-08-26T01:57:39Z
- **State Version**: 8
- **Active Agent**: aidlc-operations-agent
- **Worktree Path**:
- **Bolt Refs**:
- **Practices Affirmed Timestamp**:

## Scope Configuration

- **Stages to Execute**: 0.1, 0.2, 0.3, 2.1, 2.3, 3.5, 3.6, 4.1, 4.3, 4.4
- **Stages to Skip**: 1.1 (intent-capture), 1.2 (market-research), 1.3 (feasibility), 1.4 (scope-definition), 1.5 (team-formation), 1.6 (rough-mockups), 1.7 (approval-handoff), 2.2 (practices-discovery), 2.4 (user-stories), 2.5 (refined-mockups), 2.6 (domain-design), 2.7 (units-generation), 2.8 (contract-design), 2.9 (delivery-planning), 3.1 (functional-design), 3.2 (nfr-requirements), 3.3 (nfr-design), 3.4 (infrastructure-design), 3.7 (ci-pipeline), 4.2 (environment-provisioning), 4.5 (incident-response), 4.6 (performance-validation), 4.7 (feedback-optimization)
- **Depth**: Minimal
- **Test Strategy**: Minimal
- **Review Override**:

## Workspace State

- **Project Root**: /home/rpadron/proy/prosell-sass
- **Languages**: TypeScript
- **Frameworks**: Unknown
- **Build System**: pnpm (package.json)

## Execution Plan Summary

- **Total Stages**: 10
- **Completed**: 8
- **In Progress**: none

## Runtime State

- **Revision Count**: 1

## Phase Progress

<!-- Status values: Pending, Active, Verified, Skipped -->

- **Initialization**: Verified
- **Ideation**: Skipped
- **Inception**: Verified
- **Construction**: Verified
- **Operation**: Verified

## Stage Progress

<!-- Checkbox states: [ ] not started, [-] in progress, [?] awaiting approval (gate open), [R] revising (user rejected gate), [x] completed, [S] skipped via --stage/--phase jump -->

### INITIALIZATION PHASE

- [x] workspace-scaffold — EXECUTE
- [x] workspace-detection — EXECUTE
- [x] state-init — EXECUTE

### IDEATION PHASE

- [ ] intent-capture — SKIP
- [ ] market-research — SKIP
- [ ] feasibility — SKIP
- [ ] scope-definition — SKIP
- [ ] team-formation — SKIP
- [ ] rough-mockups — SKIP
- [ ] approval-handoff — SKIP

### INCEPTION PHASE

- [x] reverse-engineering — EXECUTE
- [ ] practices-discovery — SKIP
- [x] requirements-analysis — EXECUTE
- [ ] user-stories — SKIP
- [ ] refined-mockups — SKIP
- [ ] domain-design — SKIP
- [ ] units-generation — SKIP
- [ ] contract-design — SKIP
- [ ] delivery-planning — SKIP

### CONSTRUCTION PHASE

Per unit: [TBD]

- [ ] functional-design — SKIP
- [ ] nfr-requirements — SKIP
- [ ] nfr-design — SKIP
- [ ] infrastructure-design — SKIP
- [x] code-generation — EXECUTE
- [x] build-and-test — EXECUTE
- [ ] ci-pipeline — SKIP

### OPERATION PHASE

- [S] deployment-pipeline — EXECUTE
- [ ] environment-provisioning — SKIP
- [x] deployment-execution — EXECUTE
- [S] observability-setup — EXECUTE
- [ ] incident-response — SKIP
- [ ] performance-validation — SKIP
- [ ] feedback-optimization — SKIP

## Current Status

- **Lifecycle Phase**: OPERATION
- **Current Stage**: observability-setup
- **Next Stage**: none
- **Status**: Completed
- **Last Updated**: 2026-08-30T16:36:10Z

## Session Resume Point

- **Last Completed Stage**: deployment-execution
- **Next Action**: Workflow complete
- **Pending Artifacts**: none
