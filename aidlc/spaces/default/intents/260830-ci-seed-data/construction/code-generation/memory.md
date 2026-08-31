<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-30T15:10:00Z — FR4 creció de 1 fix de FK a 2: arreglar `category_id=uuid4()` destapó una segunda violación (`submitted_by`/`approved_by`, antes enmascarada por la primera). Surfaceado al usuario mid-implementación vía structured question en vez de expandir en silencio; aprobado usar el mismo patrón (`test_user` fixture, ya existente y tenant-scoped).
- 2026-08-30T15:10:00Z — Nesting `session.begin_nested()` directamente sobre una sesión ya envuelta en `async with session.begin():` NO funciona — SQLAlchemy's `TransactionalContext._trans_ctx_check` rechaza la siguiente query con el mismo error "closed transaction" que el bug original, porque `session.begin()` pierde el tracking de su propia transacción cuando una nested transaction toma el rol de "current". El patrón correcto (documentado por SQLAlchemy como "Joining a Session into an External Transaction") es `connection = await engine.connect(); await connection.begin(); session = AsyncSession(bind=connection); await session.begin_nested()` + un listener `after_transaction_end` que reinicia el savepoint. Cuando la sesión "base" es compartida y no se puede tocar (como `db_session` en `tests/integration/conftest.py`), se puede lograr el mismo efecto dándole a la app una sesión NUEVA bindeada a `await base_session.connection()` (la misma conexión/transacción), sin modificar la sesión compartida.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
