<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-18T12:05:00Z — Ningún traceability.json de Code Generation cita FR{n}/NFR{n} (nivel inception) directamente, solo AC/BR/IDs derivados de Unit. Cobertura verificada transitivamente vía FR{n} → US{n}.{m} → AC{n}.{m}.{seq} de stories.md, más FR3/FR4/FR5 (sin historia propia) trazados directo a BR/FR de Unit — mismo patrón ya usado en el intent 260911-cross-org-export-ux, reconfirmado acá.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-18T12:05:00Z — No se generaron performance-test-instructions.md ni security-test-instructions.md pese a estar en produces[] del stage — los NFR de performance/seguridad de este intent (NFR-PERF-1/2, NFR-SEC-1..4 en u1) ya tienen verificación/tests dedicados escritos y verificados en Code Generation (sin I/O en la ruta caliente, sanitización de fórmulas con 4 tests, auth del endpoint verificada). Generar instrucciones genéricas de load-testing/SAST sería ceremonia redundante — mismo criterio ya confirmado varias veces en project.md.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; la equipo is unit-first and the domain is well-understood -->

- 2026-09-18T12:05:00Z — Para integration-test-instructions.md (Test Strategy Standard), en vez de escribir instrucciones puramente prospectivas, se verificó y documentó una comparación de forma real (grep) entre los schemas Zod del frontend y los modelos Pydantic del backend para los 2 contratos inter-Unit — evidencia ejecutada, no solo prosa aspiracional. Se decidió NO generar un test E2E nuevo (Playwright) para este boundary — está fuera del piso de test afirmado en team-practices.md y del alcance de Standard strategy; queda anotado como alcance deliberado, no gap silencioso.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-18T12:05:00Z — El Cross-Unit Final Coverage Gate (Step 11) encontró que AC2.1.1/AC2.1.2/AC2.1.4/AC2.1.5 (US2.1, ProductLocationFields) están en status Deferred, no OK — el componente existe y está probado pero no está wireado a ninguna vista real de producto. Se presenta al humano en el gate de esta etapa para que decida si el Bolt se cierra así (con seguimiento explícito) o si hace falta un dispatch adicional antes de avanzar.
- 2026-09-18T12:05:00Z — NFR1 (requirements.md) exige además "revisión manual de QA sobre esos mismos campos antes de mergear" — acción humana pendiente que esta etapa no puede ejecutar por sí sola. Notar que, con los datos actuales del catálogo, code-summary.md de u1 ya documenta que la migración BR3.1 es un no-op seguro (ningún candidato real calza) — el universo a muestrear puede ser efectivamente vacío; confirmar contra el resultado real de alembic upgrade head en el entorno de destino.
