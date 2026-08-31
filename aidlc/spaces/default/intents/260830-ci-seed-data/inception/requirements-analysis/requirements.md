# Requirements — fix-prosell-ci-seed-data

**Scope**: bugfix · **Depth**: Minimal · **Project Type**: Brownfield

## Intent Analysis

El objetivo no es "arreglar el seed data" en abstracto, sino restaurar CI en verde en `main`, que hoy bloquea trabajo de observabilidad/deployment. La Reverse Engineering enfocada (`aidlc/spaces/default/codekb/prosell-sass/code-quality-assessment.md` § "CI en rojo") identificó que el run rojo de CI (`21 failed, 1931 passed, 12 errors`) agrupa varias causas independientes, no una sola. Requirements Analysis (Q1) acotó el alcance a las 3 causas más directamente relacionadas con datos de test/seed que un desarrollador puede arreglar sin tocar la arquitectura de migraciones: el slug de categoría obsoleto (#19), el patrón de fixture incompatible con `db.commit()` explícito (#21), y la violación de FK en tests de batch (#22). La reparación de la cadena real de Alembic (#20) queda explícitamente fuera de este intent — es un cambio de mayor riesgo/esfuerzo que merece su propio intent.

## Functional Requirements

### FR1 — Corregir tests de seed de categorías con slug obsoleto

El commit `2166f142` aplanó la jerarquía de categorías de vehículos, eliminando los nodos-hoja nivel-3 (`sedan`, `hatchback`, `suvs`, `pick-ups`, `coupe`) y convirtiendo `carros-y-camionetas` en la hoja (nivel 2). Los tests de integración de seed nunca se actualizaron y siguen referenciando el slug eliminado `suvs`.

- **FR1.1**: `apps/api/tests/integration/database/test_seed_categories.py::test_seed_creates_level_3_leaf_with_correct_hierarchy` debe apuntar a `carros-y-camionetas` (nivel 2) como la hoja de la jerarquía, no a `suvs`.
- **FR1.2**: `apps/api/tests/integration/database/test_seed_car_attributes.py::test_car_leaf_has_attribute_schema_and_presentation` debe apuntar al mismo slug corregido.
- **FR1.3**: `apps/api/tests/integration/database/test_seed_car_attributes.py::test_create_product_under_car_leaf_validates_and_composes_title` ídem.
- **FR1.4**: `apps/api/tests/integration/database/test_seed_car_attributes.py::test_create_product_under_car_leaf_rejects_missing_required` ídem.
- **FR1.5**: Sin cambios de código de producción — `apps/api/src/prosell/infrastructure/database/seed_categories.py` ya refleja la jerarquía aplanada intencional; el fix es exclusivamente en los 4 tests.

### FR2 — Agregar test de regresión para la jerarquía aplanada

Para que una futura re-jerarquización de categorías rompa un test a propósito (documentando la decisión de dominio), en vez de fallar en silencio o de forma confusa como ocurrió esta vez.

- **FR2.1**: Agregar un test explícito en `apps/api/tests/integration/database/test_seed_categories.py` que verifique que `carros-y-camionetas` es un nodo hoja (sin hijos) y que los slugs de nivel-3 eliminados (`sedan`, `hatchback`, `suvs`, `pick-ups`, `coupe`) NO existen en el árbol de seed.

### FR3 — Corregir el fixture `shared_session` incompatible con `db.commit()` explícito

En `test_fb_sync_router.py` y `apps/api/tests/integration/bulk_upload/conftest.py`, el fixture abre una única sesión de DB (`session.begin()`) y la mapea como el override de `get_async_session` para toda la duración del test. Cuando el endpoint bajo test llama `await db.commit()` explícitamente (patrón válido en producción, donde cada request obtiene una sesión nueva — ver `apps/api/src/prosell/infrastructure/database/session.py`), commitea la transacción externa que el fixture había abierto, y toda query posterior en el mismo test revienta con `sqlalchemy.exc.InvalidRequestError: Can't operate on closed transaction inside context manager`.

- **FR3.1**: Corregir el fixture `shared_session`/`_setup_override` en `test_fb_sync_router.py` para que sobreviva a un `db.commit()` explícito del handler bajo test (por ejemplo, abriendo una sesión nueva por request en el override, en vez de reusar una única sesión con transacción externa abierta).
- **FR3.2**: Corregir el mismo patrón en el fixture `async_client`/`db_session` de `apps/api/tests/integration/bulk_upload/conftest.py`.
- **FR3.3**: Alcance acotado a estos 2 archivos (decisión Q3) — no se audita el resto de `apps/api/tests/` en busca de otros usos del mismo patrón en este intent.
- **FR3.4**: El test previamente roto por este bug (`test_fb_sync_router.py::TestUnpublishEndpoints::test_completed_callback_updates_all_publication_records_idempotently`) debe pasar en verde tras el fix, validando la idempotencia real que pretendía verificar.

### FR4 — Corregir la violación de FK en tests de batch approve/submit

`apps/api/tests/integration/use_cases/test_batch_approve_products.py` y `test_batch_submit_products.py` construyen filas `Product` con `category_id=uuid4()` — un UUID aleatorio que nunca fue insertado como `Category` real, violando la FK `ForeignKey("categories.id", ondelete="RESTRICT")` que es `nullable=False`.

- **FR4.1**: Corregir ambos archivos de test para insertar (o reusar un fixture existente que inserte) una `Category` real antes de crear los `Product` de prueba, y usar el `id` de esa categoría real en vez de un UUID aleatorio.
- **FR4.2**: No es necesario confirmar la hipótesis de por qué esta violación empezó a manifestarse recién ahora (posible relación con el bootstrap de schema vía `Base.metadata.create_all()`, hallazgo #20) — alcanza con que el fix haga pasar los tests sin violar la FK.

## Non-Functional Requirements

### NFR1 — Verificación de cierre

- **NFR1.1**: Durante Code Generation, correr localmente los módulos de test afectados por FR1–FR4 (`pytest apps/api/tests/integration/database/test_seed_categories.py apps/api/tests/integration/database/test_seed_car_attributes.py apps/api/tests/integration/api/routers/test_fb_sync_router.py apps/api/tests/integration/bulk_upload/ apps/api/tests/integration/use_cases/test_batch_approve_products.py apps/api/tests/integration/use_cases/test_batch_submit_products.py`, ajustar el comando exacto a la ubicación real) y confirmar que pasan en verde.
- **NFR1.2**: En Build and Test, correr la suite completa de pytest backend (`uv run pytest --cov=prosell --cov-report=xml`, igual que el job `test-python` de CI) antes de dar el intent por cerrado — no alcanza con los módulos tocados (decisión Q4).
- **NFR1.3**: El piso de cobertura backend sigue sin gate enforced (asimetría ya aceptada por el equipo, `project.md` Q3) — este intent no introduce ni exige un nuevo umbral.

## Constraints

- **C1**: Sin cambios de código de producción para FR1/FR2 — el fix es exclusivamente en tests. FR3 y FR4 sí tocan código de test (fixtures), pero ningún archivo bajo `apps/api/src/prosell/` (producción) se modifica.
- **C2**: No incluir en este intent la reparación de la cadena real de Alembic (hallazgo #20) — queda fuera de alcance por decisión explícita (Q1).
- **C3**: No incluir el hallazgo #23 (bug de mapeo de códigos de organización en `bulk_upload`, `Unknown organization codes: DJ, RM`) — no relacionado con seed data/schema, fuera de alcance de este intent.
- **C4**: Conventional Commits + squash-merge a `main`, sin `git commit --no-verify`, sin atribución de coautoría de IA (mandados de `project.md`).

## Assumptions

- **A1**: El fix de FR1 asume que la decisión de dominio de aplanar la jerarquía de categorías (commit `2166f142`) sigue siendo la vigente — no se está pidiendo revertirla ni re-evaluarla.
- **A2**: El fix de FR3 asume que existe (o se puede escribir sin gran esfuerzo) una forma de que el override de `get_async_session` en test abra una sesión nueva por llamada, replicando el comportamiento de producción, sin romper el resto de las aserciones de esos tests que sí dependen de ver el estado dentro de la misma sesión compartida antes del primer `commit()`.
- **A3**: El fix de FR4 asume que existe o se puede crear fácilmente un fixture/helper para insertar una `Category` real de prueba, reusando patrones ya existentes en otros tests de integración del proyecto.

## Out of Scope

- Reparar la cadena real de migraciones Alembic (hallazgo #20) — el bootstrap de schema de test vía `Base.metadata.create_all()` sigue siendo la estrategia deliberada y documentada.
- Auditar `apps/api/tests/` completo en busca de otros usos del patrón de fixture `shared_session` más allá de los 2 archivos ya identificados (hallazgo #21).
- El bug de mapeo de códigos de organización en `bulk_upload` (hallazgo #23).
- Las 13 fallas frontend pre-existentes ya documentadas (`published_to_marketplace` faltante en mocks) — no relacionadas con seed data, ya conocidas en `project.md`.
- Cualquier trabajo de deployment/observabilidad — el alcance de este intent (`Stages to Execute: 0.1, 0.2, 0.3, 2.1, 2.3, 3.5, 3.6`) termina en Build and Test; no incluye CI Pipeline ni Deployment Execution. Una vez mergeado, el pipeline existente (`deploy.yml`, `workflow_run` post-CI) se encarga del resto sin necesidad de un stage adicional en este intent.

## Open Questions

Ninguna — las 4 preguntas de esta etapa resolvieron el alcance sin ambigüedad remanente.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-08-30T14:08:30Z
**Iteration:** 1

### Findings

| #   | Severity   | Location | Finding                                                                                                                                                                                                                                                                                                                                                                      | Recommendation                                                                                                                                                                                                                                                                                  |
| --- | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Low        | FR3.1    | El path completo de `test_fb_sync_router.py` no aparece en FR3.1 (solo el nombre de archivo); el path real (`apps/api/tests/integration/api/routers/test_fb_sync_router.py`) solo es recuperable indirectamente vía NFR1.1. FR3.2, en cambio, sí lleva el path completo del `conftest.py`.                                                                                   | Agregar el path completo directamente en FR3.1 para no depender de cruzar con NFR1.1.                                                                                                                                                                                                           |
| 2   | Suggestion | FR4 / C2 | El hallazgo #22 en `code-quality-assessment.md` trae una recomendación explícita del scan ("no arreglar en este intent salvo pedido explícito — es una familia de falla separada de seed data propiamente dicho"), y Q1 la anula deliberadamente incluyendo #22 en el alcance (opción C). `requirements.md` no menciona que se está apartando de esa recomendación del scan. | No bloquea — la decisión humana en Q1 es clara y suficiente. Opcionalmente, una línea en FR4 o Intent Analysis podría dejar constancia explícita de que el equipo optó por incluir #22 pese a la recomendación de no-fix del scan, para que quede auditable sin tener que cruzar con el codekb. |

### Summary

Trazabilidad verificada punto a punto: FR1/FR2 ↔ hallazgo #19, FR3 ↔ hallazgo #21, FR4 ↔ hallazgo #22, C2 excluye #20 y C3 excluye #23 — exactamente lo que Q1 (opción C) confirmó, sin fugas de alcance ni omisiones. Q2 (regresión explícita), Q3 (acotado a 2 archivos, sin auditoría del resto) y Q4 (suite completa en Build and Test) están reflejados con precisión en FR2, FR3.3/Out of Scope y NFR1.1/1.2 respectivamente. Los IDs FR{n}/FR{n}.{m}/NFR{n} son estables, sin duplicados ni saltos. Cada FR/NFR tiene un criterio de pass/fail verificable (test específico que debe pasar en verde, o ausencia de cambio en código de producción verificable por diff) — un desarrollador podría implementar y QA podría verificar sin volver a preguntar. Los dos hallazgos de esta revisión son de severidad baja/sugerencia y no bloquean el gate.
