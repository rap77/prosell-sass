# AI-DLC State Tracking

## Project Information

- **Project**: Corrección de export cross-org + UX del selector de organización + formato CSV cliente. El intent 260911-export-org-selector dejó funcional el wiring de organization_id en el export, pero al probarlo en staging aparecieron varios problemas de UX y un bug de datos preexistente (de 260903-catalog-client-export) que hay que resolver juntos en este intent, full-stack:

1. Export todas las organizaciones: cuando el selector del header tiene elegida la opción de todas, el export debe generar el catálogo de TODAS las organizaciones (no solo la propia), no solo permitir elegir una por vez.
2. Renombrar el selector: Todos los concesionarios -> Todas las organizaciones (label genérico, ya no vehicle-specific).
3. El selector debe filtrar el catálogo visible: hoy, cambiar la organización en el picker del header NO cambia qué productos se ven en /catalog -- la grilla siempre muestra la organización propia del usuario. Al elegir otra organización, el catálogo mostrado debe reflejar esa elección.
4. El selector debe listar solo organizaciones con productos: hoy lista las 29 organizaciones existentes aunque 28 no tengan ningún producto -- debe filtrar a las que sí tienen catálogo.
5. Completar las columnas vacías del CSV cliente y respetar el formato de data39.csv exactamente: build_client_format_row() (csv_export.py) lee attributes.get(VIN), attributes.get(body_style), attributes.get(clean_title), attributes.get(groups) pero el modelo guarda vin, body_type, title_status, facebook_groups -- hay que mapear correctamente. Además category, type, location no se leen de ningún lado (existen como category_id, location_city/state/zip en el modelo) -- hay que resolverlos.
6. Columna path: no existe hoy en la plataforma. Se pide al usuario una carpeta base por popup (igual que ya se pide el nombre del archivo al exportar), con un default sugerido tomado de data39.csv (Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/), editable/confirmable por el usuario. El path final de cada producto se arma como {carpeta_base}{código_org}/{nombre_carpeta_del_producto} (ej.: Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/MF/2020-EXPLORER-XLT-70K-GRIS-MF).
7. Grupos de Facebook (groups): mismo mecanismo de popup que el nombre de archivo y el path -- pedirle al usuario los grupos de Facebook cuando el producto no los tenga cargados, con 1,2,3 como valor por defecto sugerido/editable.
8. UX/UI: aplicar una experiencia prolija en todos los cambios de arriba (selector, popups de path/grupos, mensajes, etc.) -- no es solo un fix de backend.

Alcance: full-stack (backend Python/FastAPI + frontend Next.js), reemplaza/extiende comportamiento ya en producción-candidato del selector y del export cliente.

- **Project Type**: Brownfield
- **Scope**: classic
- **Start Date**: 2026-09-11T22:50:27Z
- **State Version**: 8
- **Active Agent**: aidlc-operations-agent
- **Worktree Path**:
- **Bolt Refs**:
- **Practices Affirmed Timestamp**: 2026-09-12T00:01:10Z

## Scope Configuration

- **Stages to Execute**: 0.1, 0.2, 0.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
- **Stages to Skip**: 1.1 (intent-capture), 1.2 (market-research), 1.3 (feasibility), 1.4 (scope-definition), 1.5 (team-formation), 1.6 (rough-mockups), 1.7 (approval-handoff)
- **Depth**: Standard
- **Test Strategy**: Standard
- **Review Override**:

## Workspace State

- **Project Root**: /home/rpadron/proy/prosell-sass
- **Languages**: TypeScript
- **Frameworks**: Unknown
- **Build System**: pnpm (package.json)

## Execution Plan Summary

- **Total Stages**: 26
- **Completed**: 18
- **In Progress**: none

## Runtime State

- **Revision Count**: 2

- **Skeleton Stance**: off

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
- [x] practices-discovery — EXECUTE
- [x] requirements-analysis — EXECUTE
- [x] user-stories — EXECUTE
- [x] refined-mockups — EXECUTE
- [S] domain-design — EXECUTE
- [x] units-generation — EXECUTE
- [x] contract-design — EXECUTE
- [x] delivery-planning — EXECUTE

### CONSTRUCTION PHASE

Per unit: [TBD]

- [x] functional-design — EXECUTE
- [x] nfr-requirements — EXECUTE
- [x] nfr-design — EXECUTE
- [S] infrastructure-design — EXECUTE
- [x] code-generation — EXECUTE
- [x] build-and-test — EXECUTE
- [S] ci-pipeline — EXECUTE

### OPERATION PHASE

- [S] deployment-pipeline — EXECUTE
- [S] environment-provisioning — EXECUTE
- [x] deployment-execution — EXECUTE
- [S] observability-setup — EXECUTE
- [S] incident-response — EXECUTE
- [x] performance-validation — EXECUTE
- [S] feedback-optimization — EXECUTE

## Current Status

- **Lifecycle Phase**: OPERATION
- **Current Stage**: feedback-optimization
- **Next Stage**: none
- **Status**: Completed
- **Last Updated**: 2026-09-13T21:02:25Z

## Session Resume Point

- **Last Completed Stage**: performance-validation
- **Next Action**: Workflow complete
- **Pending Artifacts**: none
