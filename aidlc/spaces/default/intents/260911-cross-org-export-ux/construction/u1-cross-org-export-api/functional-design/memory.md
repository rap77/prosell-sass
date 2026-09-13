<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

- 2026-09-12T00:00:00Z — modelé la tabla de traducción de categorías como una entidad (CategoryTranslationEntry) en vez de solo una nota de implementación, porque entities.md exige forma de datos para cualquier concepto con identidad/atributos, aunque sea configuración estática sin ciclo de vida de negocio.

## Deviations

- 2026-09-12T00:00:00Z — ninguna desviación respecto al stage file.

## Tradeoffs

- 2026-09-12T00:00:00Z — pregunté explícitamente qué hacer con productos fuera de la vertical vehículos (Q1) en vez de asumir inclusión con columnas vacías — el formato cliente es genuinamente específico de vehículos, y era una ambigüedad real no resuelta en etapas previas.

## Open questions

- 2026-09-12T00:00:00Z — ninguna. Las 2 Open Questions de contract-summary.md (nombre de archivo, campo de auditoría) quedaron resueltas acá (Q2, Q3).

## Interpretations

- 2026-09-12T00:00:00Z — el reviewer §12a encontró (y verifiqué contra csv_field_mapper.py/csv_export.py) que unit-of-work.md ya nombraba "8 columnas" (VIN, body_style, clean_title, groups, category, type, location, state), pero requirements.md FR7 solo cubrió 7 — state quedó fuera por un gap de redacción en Requirements Analysis, no una decisión deliberada. Presenté la disyuntiva al humano (agregar a scope ahora vs. dejar para otro intent); eligió agregarlo ahora. Agregué BR1.8 (state = attributes.get("title_state")) a rules.md, actualicé functional-spec.md y traceability.json (reverse[], sin AC dedicado en stories.md — mismo tratamiento que BR1.7/BR2.8). No edité requirements.md/stories.md directamente (ya aprobados en Inception) — la corrección vive en el artefacto de Functional Design, con la justificación completa acá y en traceability.json.
- 2026-09-12T00:00:00Z — segundo hallazgo Critical del reviewer §12a (pasada fresca tras el reset de floor): `CategoryTranslationEntry`/BR1.3 diseñaban un lookup DIRECTO por `product.category_id`, pero `Category` (verificado contra `apps/api/src/prosell/domain/entities/category.py`) es jerárquico multi-nivel (`parent_id`/`level`) y `product.category_id` apunta a un nodo hoja, no al vertical raíz — con una sola entrada de traducción confirmada, el diseño original hubiera excluido en producción a la mayoría de los productos reales de la vertical vehículos, no solo a los de otras verticales. Corregido: `CategoryTranslationEntry.identifier` pasó de `source_category_id` a `vertical_category_id`; BR1.3 ahora describe el walk-up explícito vía `CategoryRepository.get_by_id_cross_tenant()` siguiendo `parent_id` hasta `null` (ancestro de nivel 0), consistente con el texto literal de FR7.5 y el precedente ya afirmado en `team.md`. Verificado técnicamente correcto contra el modelo real por el reviewer en la re-verificación.

## Deviations (continuación)

- 2026-09-12T00:00:00Z — encontré un deadlock de tooling entre `checkSummaryConfirmationEvidence` (exige un write nativo a cada produces[] DESPUÉS del evento de confirmación) y el hook `review-freeze` (bloquea cualquier write a un produces[] mientras sostenga un recibo de revisión terminal) — causado por haber registrado la confirmación (`aidlc-log.ts answer --checkpoint summary-confirmation`) DESPUÉS de que el reviewer ya hubiera escrito su veredicto, en vez de antes de despachar el reviewer (orden correcto ya usado sin problemas en las etapas anteriores de este mismo intent). Resuelto con el verbo sancionado `aidlc-orchestrate.ts report --stage functional-design --unit <unit> --result rejected` (requiere un turno humano fresco) — el `GATE_REJECTED` resultante liberó el freeze y reseteó el floor de revisión a iteración 1, permitiendo corregir el hallazgo Critical real (walk-up de categorías) y volver a revisar limpio. Aprendizaje para la próxima vez: SIEMPRE registrar la confirmación de resumen (decision+answer vía CLI) ANTES de despachar el reviewer §12a en una etapa per-unit, nunca después.
