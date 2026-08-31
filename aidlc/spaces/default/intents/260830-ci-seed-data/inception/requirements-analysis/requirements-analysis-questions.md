# Requirements Analysis — Questions

Intent: `fix-prosell-ci-seed-data` (scope: bugfix, depth: Minimal)

Contexto: la Reverse Engineering enfocada ya identificó 5 hallazgos en el área de CI/seed data (ver `aidlc/spaces/default/codekb/prosell-sass/code-quality-assessment.md`, sección "CI en rojo"). Estas preguntas resuelven qué entra en el alcance de este intent, no si el problema existe.

## Q1: Alcance del fix — ¿qué hallazgos entran en este intent?

El hallazgo #19 (slug `suvs` obsoleto en 4 tests de categorías) es la causa raíz de mayor confianza y el fix es mecánico (solo tests, sin cambio de producción). Los otros 3 son independientes entre sí y de complejidad/riesgo distintos:

A. Solo #19 (4 tests de categorías con slug `suvs` obsoleto) — el fix más acotado y de menor riesgo
B. #19 + #21 (patrón de fixture `shared_session` incompatible con `db.commit()` explícito, en `test_fb_sync_router.py` y `bulk_upload/conftest.py`)
C. #19 + #21 + #22 (además, la violación de FK `category_id=uuid4()` en tests de batch approve/submit)
D. Los tres anteriores + #20 (reparar la cadena real de Alembic para que `create_test_schema.py` deje de bootstrapear vía `Base.metadata.create_all()`) — el más amplio y de mayor riesgo/esfuerzo
X. Other (please specify)

[Answer]: C. #19 + #21 + #22 (además, la violación de FK category_id=uuid4() en tests de batch approve/submit)

## Q2: Fix de #19 — ¿alcanza con corregir las aserciones, o agregamos algo más?

El fix mecánico es actualizar los 4 tests para apuntar a `carros-y-camionetas` como la hoja (nivel 2) en vez de `suvs` (nivel 3), sin tocar código de producción.

A. Solo corregir las 4 aserciones existentes para que apunten al slug correcto — nada más
B. Además, agregar un test de regresión explícito que documente la jerarquía aplanada (para que una futura re-jerarquización rompa un test a propósito, no en silencio)
X. Other (please specify)

[Answer]: B. Además, agregar un test de regresión explícito que documente la jerarquía aplanada

## Q3: Si Q1 incluye #21 (patrón `shared_session`) — ¿alcance del fix?

(Responder solo si elegiste B, C o D en Q1; si elegiste A, responder "N/A".)

A. Arreglar solo los 2 usos ya identificados (`test_fb_sync_router.py`, `bulk_upload/conftest.py`)
B. Arreglar esos 2 y además auditar el resto de `apps/api/tests/` en busca de otros usos del mismo patrón de fixture (sesión compartida + override de `get_async_session` + handler con `db.commit()` explícito)
X. Other (please specify)

[Answer]: A. Arreglar solo los 2 usos ya identificados (test_fb_sync_router.py, bulk_upload/conftest.py)

## Q4: Verificación de cierre

El equipo ya tiene mandado ejecutar la suite completa de pytest backend en pre-push/CI (afirmado en `project.md`). Para este intent específicamente:

A. Alcanza con correr los módulos de test afectados localmente durante Code Generation, y confiar en el pre-push/CI existente para la suite completa
B. Además de lo anterior, correr la suite completa de pytest backend (`uv run pytest`) en Build and Test antes de dar el intent por cerrado, no solo los módulos tocados
X. Other (please specify)

[Answer]: B. Además de lo anterior, correr la suite completa de pytest backend en Build and Test antes de cerrar el intent

## Consolidated Summary Confirmation

- Q1 — Alcance: #19 (slug `suvs` obsoleto) + #21 (fixture `shared_session` incompatible con `db.commit()`) + #22 (violación de FK `category_id=uuid4()` en tests de batch). #20 (reparar Alembic) queda fuera de este intent.
- Q2 — Fix de #19: corregir las 4 aserciones para apuntar a `carros-y-camionetas` (nivel 2) en vez de `suvs`, y agregar un test de regresión explícito que documente la jerarquía aplanada.
- Q3 — Fix de #21: acotado a los 2 usos ya identificados (`test_fb_sync_router.py`, `bulk_upload/conftest.py`), sin auditar el resto de `apps/api/tests/`.
- Q4 — Verificación: además de correr los módulos afectados durante Code Generation, correr la suite completa de pytest backend en Build and Test antes de cerrar el intent.

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
