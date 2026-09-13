<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-12T19:50:00Z — reusé sin cambio las dos decisiones de diseño ya aprobadas en 260903-catalog-client-export (semáforo de 20, retry 1x200ms) en vez de reabrirlas — el volumen techo (500) no cambia en este intent.

<!-- aidlc-wave-memory:u1-cross-org-export-api:2bbc0be8d69dcdeccf541ea82de12710e179da861a615105e237a347c6674984 -->

- 2026-09-12T20:20:00Z — extendí sin cambio de técnica el diseño de 260903-catalog-client-export (React Compiler, estado local, Toast on-demand) — el nuevo target NFR-PERF-UI-4 usa la misma familia de técnica (operación síncrona en memoria).

<!-- aidlc-wave-memory:u2-cross-org-export-ui:c18ffddd7621a5486b4d9507c8b4d56740fe404d64936b7a47115dd829f6d6a2 -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-12T19:50:00Z — ninguna respecto al stage file; se omitió el bloque interactivo de preguntas por no haber ambigüedad genuina.

<!-- aidlc-wave-memory:u1-cross-org-export-api:6a3837569a8813b96a0f2fce359c253cbd543008203a0c96d561682515e6b22f -->

- 2026-09-12T20:20:00Z — ninguna respecto al stage file; bloque interactivo omitido por no haber ambigüedad genuina.

<!-- aidlc-wave-memory:u2-cross-org-export-ui:af022d87f3bcd59b2d45865a47e7570cbe3df38fc54c6f415261f65cb0c4cc91 -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-12T19:50:00Z — elegí memoización lazy (dict poblado durante el loop) para el walk-up de vertical de categoría, en vez de un batch upfront de category_id distintos como el patrón de org_code — más simple, mismo efecto práctico, sin necesitar conocer el conjunto completo de categorías antes del loop.

<!-- aidlc-wave-memory:u1-cross-org-export-api:39c9ab765b3d9e9d24bad2820cf999cec80fed8441f8f4aa08ef494a396e285c -->

- 2026-09-12T19:50:00Z — agregué NFR-PERF-6 (target de resolución de vertical cacheada) como budget de diseño local, sin promoverlo a un NFR de nfr-requirements — atiende la observación Minor del reviewer de esa etapa sin reabrir el artefacto ya READY de nfr-requirements.

<!-- aidlc-wave-memory:u1-cross-org-export-api:a2645b225e8e19133ca13be8b93a76f9135d5f94ae4cb3c95f161edd99ecf103 -->

- 2026-09-12T19:50:00Z — diseñé un único método de conteo parametrizado (organization_id opcional) para el cap, en vez de dos variantes separadas por-org/global — evita duplicación de query casi idéntica.

<!-- aidlc-wave-memory:u1-cross-org-export-api:9b979cb8dd2188e6ed36faa955e6793839774aeeae6e84cbbe169e31c51c184d -->

- 2026-09-12T20:20:00Z — ninguno nuevo — todas las decisiones son extensiones directas de patrones ya vigentes.

<!-- aidlc-wave-memory:u2-cross-org-export-ui:3cc6edc7abaffb6cdbcfc4aa9649b04508fd3097cfc59efd57dfb4ac64c58313 -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-12T19:50:00Z — ninguna.

<!-- aidlc-wave-memory:u1-cross-org-export-api:c372e5a5ccb44f846b92071ee0f3cf89d5360904029b4981cbae708969bedfe8 -->

- 2026-09-12T20:20:00Z — ninguna.

<!-- aidlc-wave-memory:u2-cross-org-export-ui:a817f0098fa68a7b3fae87a75818edfbe83adb08f7334029db60844b9b413038 -->
