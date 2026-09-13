<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-12T00:00:00Z — modelé la tabla de traducción de categorías como una entidad (CategoryTranslationEntry) en vez de solo una nota de implementación, porque entities.md exige forma de datos para cualquier concepto con identidad/atributos, aunque sea configuración estática sin ciclo de vida de negocio.

<!-- aidlc-wave-memory:u1-cross-org-export-api:7f69aeb61c8d9f848cd8bed8202cada909095e469d364744235c874ddea6ebcd -->

- 2026-09-12T00:00:00Z — el reviewer §12a encontró (y verifiqué contra csv_field_mapper.py/csv_export.py) que unit-of-work.md ya nombraba "8 columnas" (VIN, body_style, clean_title, groups, category, type, location, state), pero requirements.md FR7 solo cubrió 7 — state quedó fuera por un gap de redacción en Requirements Analysis, no una decisión deliberada. Presenté la disyuntiva al humano (agregar a scope ahora vs. dejar para otro intent); eligió agregarlo ahora. Agregué BR1.8 (state = attributes.get("title_state")) a rules.md, actualicé functional-spec.md y traceability.json (reverse[], sin AC dedicado en stories.md — mismo tratamiento que BR1.7/BR2.8). No edité requirements.md/stories.md directamente (ya aprobados en Inception) — la corrección vive en el artefacto de Functional Design, con la justificación completa acá y en traceability.json.

<!-- aidlc-wave-memory:u1-cross-org-export-api:aa25345347d0bc0e7eea117c2d26711e92ca8093fcb17733c74e0044e5c158a8 -->

- 2026-09-12T00:00:00Z — usé status "N/A" (no "OK") para todas las ACs de traceability.json porque este Unit es kind:ui, sin rules.md/BRx.y — mismo patrón ya confirmado en 260829-auth-navigation-refactor y 260911-export-org-selector.

<!-- aidlc-wave-memory:u2-cross-org-export-ui:74e7b142552edb4d96be6f28efb7d50ecb8d0423e11bd4a981486b8852669207 -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-12T00:00:00Z — ninguna desviación respecto al stage file.

<!-- aidlc-wave-memory:u1-cross-org-export-api:4c588ea316257678fa1e08d7d0cc83b77259ac8f28b7029c9da175d0d35e4bb8 -->

- 2026-09-12T00:00:00Z — esta vez SÍ registré la confirmación de resumen (decision+answer vía CLI) ANTES de dispatchear el reviewer §12a, corrigiendo el error de orden que causó un deadlock de tooling en u1-cross-org-export-api (ver memory.md de esa unit).

<!-- aidlc-wave-memory:u2-cross-org-export-ui:52b79c072304deb1de950806838f66097abe0b4402d440ce2eacabcf8c6c7aa5 -->

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-12T00:00:00Z — pregunté explícitamente qué hacer con productos fuera de la vertical vehículos (Q1) en vez de asumir inclusión con columnas vacías — el formato cliente es genuinamente específico de vehículos, y era una ambigüedad real no resuelta en etapas previas.

<!-- aidlc-wave-memory:u1-cross-org-export-api:aba607d7a9f86933fd1a1414ca9f3e34775fc874eed966e54dcd08bac98c1da7 -->

- 2026-09-12T00:00:00Z — functional-spec.md incluye pseudocódigo TypeScript ilustrativo (derivación de organizationId, firma de exportCatalogClientFormat) en vez de solo prosa, porque el contrato exacto de contract-summary.md tiene detalles de tipos que la prosa sola podría transmitir ambiguamente — dentro del límite de ≤15 líneas por snippet del stage file.

<!-- aidlc-wave-memory:u2-cross-org-export-ui:728562b0c569979c99fbbd3ff621009e434155e8db45b6b9e22d4d15bbacdb88 -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-12T00:00:00Z — ninguna. Las 2 Open Questions de contract-summary.md (nombre de archivo, campo de auditoría) quedaron resueltas acá (Q2, Q3).

<!-- aidlc-wave-memory:u1-cross-org-export-api:d03338eaaccebf6a3409bef69e8a3478c7eaf4cc46c731db3118158a4fb9c5c9 -->

- 2026-09-12T00:00:00Z — ninguna. El ícono (Q1) quedó resuelto (Layers).

<!-- aidlc-wave-memory:u2-cross-org-export-ui:e70de9eecbc80587d1aff74ccb768632f775433df1659d0040b1ff54d942aa4a -->
