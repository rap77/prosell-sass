# Build and Test Summary — Catálogo Canónico de Vehículos para Facebook

## Estado general

- **Build**: OK en ambos Units — sin dependencia nueva, sin variable de entorno nueva.
- **Tests**: OK en ambos Units — 2093/2093 backend, 1355/1355 frontend, 0 fallas.
- **Cobertura de boundary inter-Unit**: OK — los 2 contratos declarados en `contract-summary.md` verificados carácter a carácter entre backend y frontend (ver `integration-test-instructions.md`).
- **Cross-Unit Final Coverage Gate (Step 11)**: **NOT-READY parcial** — ver `cross-unit-traceability.md`. FR1, FR3, FR4, FR5, NFR2 (piso de 6 tests) cubiertos. FR2 (US2.1, override de ubicación por producto) tiene 4 de sus 5 AC en estado `Deferred`: el componente `ProductLocationFields` está construido y probado, pero no está wireado a ninguna vista real de producto — el flujo que describe la historia de usuario no es ejecutable hoy por un usuario real. NFR1 tiene su parte automatizada verificada (test de reconciliación cruzada 100%) pero su parte de "revisión manual de QA antes de mergear" (`requirements.md`) es una acción humana pendiente, no algo que esta etapa pueda ejecutar por sí sola.

## Inventario de tipos de test generados

| Tipo                               | Generado | Motivo                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `build-instructions.md`            | Sí       | Siempre requerido.                                                                                                                                                                                                                                                                                                                                                                   |
| `integration-test-instructions.md` | Sí       | Test Strategy Standard exige boundary tests entre Units — los 2 contratos de `contract-summary.md`.                                                                                                                                                                                                                                                                                  |
| `performance-test-instructions.md` | No       | Los NFR de performance del intent (`NFR-PERF-1/2` en u1) ya tienen verificación dedicada en Code Generation (sin I/O en la ruta de `reconcile()`/`get_options()`, migración fuera del request path) — generar instrucciones de load-testing genéricas sería ceremonia redundante sobre un NFR ya cerrado, mismo criterio ya confirmado varias veces en este proyecto (`project.md`). |
| `security-test-instructions.md`    | No       | Los NFR de seguridad del intent (`NFR-SEC-1..4` en u1) ya tienen tests unitarios dedicados y verificados en Code Generation (auth del endpoint, sanitización de fórmulas CSV, no-logueo de valores en la migración) — mismo criterio.                                                                                                                                                |

## Cobertura por Unit

| Unit                   | Tests                                      | Resultado             |
| ---------------------- | ------------------------------------------ | --------------------- |
| u1-vehicle-catalog-api | 2093 (pytest, suite completa del backend)  | 2093 passed, 0 failed |
| u2-vehicle-catalog-ui  | 1355 (vitest, suite completa del frontend) | 1355 passed, 0 failed |

## Evaluación de disponibilidad (readiness)

- **Build-ready**: Sí.
- **Test-ready**: Sí — suites completas en verde, lint/format/types limpios en ambos stacks.
- **Deployment-ready**: **Condicional** — el código es seguro de desplegar (no rompe nada existente, la migración legacy es un no-op seguro con los datos actuales), pero la funcionalidad de US2.1 (override de ubicación por producto vía UI) no está disponible para el usuario final hasta que un dispatch de seguimiento wiree `ProductLocationFields` a una vista real de producto. El resto del intent (US1.1, US1.2) SÍ es funcional de punta a punta.

## Limitaciones conocidas / pendientes

1. `ProductLocationFields` sin wiring a ninguna vista de producto real (ver `cross-unit-traceability.md` para el detalle AC por AC) — necesita un Unit/dispatch de seguimiento.
2. NFR1 (`requirements.md`): el "muestreo manual de QA antes de mergear" sobre los registros migrados por BR3.1 es una acción humana pendiente — no automatizable dentro de esta etapa. Nota: el propio `code-summary.md` de u1 documenta que, con los datos actuales, la migración es un no-op seguro (ningún candidato real calza con el catálogo), por lo que el universo a muestrear puede ser efectivamente vacío hoy — confirmar contra el resultado real de `alembic upgrade head` en el entorno de destino antes de considerar el muestreo completo.
3. `docs/canonical/publisher-adapter-contract.md` (FR4.1) es documentación nueva — no requiere test, ya verificado por lectura en el review de Code Generation.
