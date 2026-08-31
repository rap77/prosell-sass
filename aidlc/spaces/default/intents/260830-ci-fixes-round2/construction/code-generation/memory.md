<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

## Interpretations

- 2026-08-30T22:40:28Z — El pre-chequeo de "unknown organization codes" en bulk_upload_vehicles.py era fatal SIEMPRE, ignorando que el loop por fila ya respetaba el fallback organization_id — el fix mínimo correcto fue agregar "and organization_id is None" al guard, no "mover el chequeo dentro del loop" como decía el plan original (ambos logran el mismo resultado; el guard es más simple).

## Deviations

- 2026-08-30T22:40:28Z — FR2.3 (fixture test_organization.code) se descartó por completo tras confirmar empíricamente que los 23 tests de bulk_upload/ pasan sin tocar la fixture, una vez arregladas FR2.1+FR2.2 — la hipótesis original de Requirements Analysis no era la causa raíz real.
- 2026-08-30T22:40:28Z — FR5 se reinterpretó completamente: el router org_verticals_router.py ya tenía el chequeo de autorización correcto con un bypass intencional para ORG_ADMIN_VIEW_ALL (ADMIN+SUPER_ADMIN); el test usaba el rol equivocado (SUPER_ADMIN en vez de un rol sin ese permiso). Confirmado con el usuario antes de tocar código.
- 2026-08-30T22:40:28Z — Al arreglar el enum de FR3, se destapó un SEGUNDO defecto enmascarado: monkeypatch.setattr con dotted-string falla cuando routers/**init**.py re-exporta "from .modulo import router as modulo" (pisa el nombre del módulo con la instancia del router). Fix: importlib.import_module() + patch directo del objeto real, en vez de dotted-string. Confirmado con el usuario antes de tocar el test.
- 2026-08-30T22:40:28Z — Dos aserciones de test más resultaron ser consecuencia directa (no ambigua) de FR2.1+FR2.2 ya aprobados: 422→400 en test_endpoint_requires_organization_id, y una regresión unitaria que testeaba el comportamiento viejo a propósito reemplazado (test_use_case_rejects_unknown_csv_organization_codes → renombrado _without_fallback con organization_id=None). Se corrigieron sin re-preguntar, documentando en code-summary.md, siguiendo el patrón ya aprendido en el proyecto para hallazgos mecánicos que se desprenden directamente de un fix ya aprobado.
- 2026-08-30T22:40:28Z — test_preview_summary_counts fallaba por una causa totalmente ajena a organization codes (images_count solo se calcula con ZIP real subido, el test no sube ninguno) — la nota de Requirements Analysis que lo vinculaba a FR2.3 era incorrecta. Confirmado con el usuario antes de corregir la aserción (3→0).

## Tradeoffs

- 2026-08-30T22:40:28Z — Para el fix del segundo defecto de FR3 (shadowing de módulo), se consideró renombrar el alias en routers/**init**.py en vez de tocar el test, pero se descartó por ser más invasivo (podría romper otros call sites que dependen de ese alias, ej. main.py) — el fix quedó acotado 100% al test, cero riesgo de producción.

## Open questions

- Ninguna abierta — todas las ambigüedades encontradas durante Code Generation (FR3 segundo defecto, FR5, images_count) se resolvieron con confirmación explícita del usuario antes de implementar.
