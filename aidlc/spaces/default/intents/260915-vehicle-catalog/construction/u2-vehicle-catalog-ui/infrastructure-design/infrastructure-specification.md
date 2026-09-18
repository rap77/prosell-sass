# Infrastructure Specification — U2 (`u2-vehicle-catalog-ui`)

Basado en `nfr-design/logical-components.md`.

## Deployment

| Facet               | Choice                                                                                              | Rationale                                               |
| ------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Compute model       | Sin cambio — mismo build Next.js/Docker del frontend (`apps/web`) ya desplegado                     | `unit-of-work.md`: U2 no gana ciclo de despliegue nuevo |
| Networking topology | Sin cambio — mismo droplet self-hosted, mismo dominio                                               | Sin componente que requiera networking nuevo            |
| Storage strategy    | No aplica — U2 no persiste datos propios (consume contratos de U1)                                  | Sin persistencia propia                                 |
| Environments        | Sin cambio — dev/staging/prod ya definidos                                                          | Sin ambiente nuevo                                      |
| IaC approach        | Sin cambio — Docker Compose + GitHub Actions ya vigente                                             | Sin recurso nuevo                                       |
| Resource sizing     | Sin cambio — mismo bundle, footprint despreciable (3 componentes extendidos/nuevos de tamaño chico) | Footprint despreciable                                  |

## Infrastructure Services

Ninguno — U2 no introduce base de datos, caché, cola, search, CDN, DNS ni load balancer nuevo.

## Shared Infrastructure

Ver `infrastructure-specification.md` de U1 (`u1-vehicle-catalog-api`) — mismo droplet/reverse proxy preexistente compartido, sin recurso NUEVO compartido entre U1 y U2. No interpretar "sin recurso nuevo" como "sin relación de infraestructura en absoluto" — ambos Units ya comparten esa infraestructura preexistente, solo no se agrega nada nuevo.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-18T00:17:48Z
**Iteration:** 1

### Sensor de trazabilidad

```
bun .claude/tools/aidlc-sensor-traceability.ts --output-path aidlc/spaces/default/intents/260915-vehicle-catalog/construction/u2-vehicle-catalog-ui/infrastructure-design/traceability.json --stage-slug infrastructure-design
```

Resultado exacto: `{"pass":true,"gaps":[],"orphans":[],"missing_from_table":[],"missing_from_upstream_ids":[],"invalid_entries":[],"invalid_targets":[],"findings_count":0}` — pasa sin gaps.

### Findings

| #   | Severity | Location                                                  | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Recommendation                                                                                                                                                          |
| --- | -------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | `cicd-pipeline.md` § Build & Test                         | El claim "los tests nuevos de este Unit se agregan a la suite existente, sin infraestructura de test nueva" está correcto pero sin cita del job/comando exacto — verificado contra `.github/workflows/ci.yml` job `test-node` (línea 117-134, `pnpm --filter @prosell/web test:coverage`) y `apps/web/package.json` (`"test:coverage": "vitest --coverage"`, línea 17): el job ya vigente corre Vitest sin necesitar un stage/servicio nuevo. No es un gap real — solo falta la cita concreta que otros artefactos del mismo intent (ej. U1 Infrastructure Design) sí incluyen. | Agregar la cita del job (`ci.yml` `test-node`) y del script (`package.json` `test:coverage`) para que la afirmación sea auto-verificable, como ya hace el patrón de U1. |
| 2   | Minor    | `infrastructure-specification.md` § Shared Infrastructure | La sección remite a U1 pero no repite la aclaración explícita que U1 sí tiene ("no es un gap real, el criterio correcto es sin recurso NUEVO compartido") — un lector que solo abra el artefacto de U2 podría malinterpretar la remisión sin ese matiz. No contradice a U1 (ambos afirman lo mismo: mismo droplet/reverse proxy preexistente, sin recurso nuevo), solo es asimetría de detalle entre los dos archivos.                                                                                                                                                          | Opcional: replicar la aclaración de una línea que ya tiene U1 ("no interpretar como sin relación de infraestructura en absoluto").                                      |

Sin hallazgos Critical ni Major.

### Verificaciones realizadas

| Verificación                                                                              | Resultado                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sensor de trazabilidad                                                                    | PASS, 0 gaps                                                                                                                                                                                                                                                                             |
| `ci.yml` job `test-node` corre Vitest sobre la suite ya vigente, sin stage/servicio nuevo | Confirmado (línea 117-134)                                                                                                                                                                                                                                                               |
| `apps/web/package.json` `test:coverage` = `vitest --coverage`                             | Confirmado (línea 17)                                                                                                                                                                                                                                                                    |
| Consistencia "Shared Infrastructure" U1 ↔ U2                                              | Sin contradicción — ambos afirman mismo droplet self-hosted + mismo reverse proxy/dominio preexistente, sin recurso NUEVO compartido; U1 aclara además que la única relación NUEVA es el contrato de API (`contract-summary.md`), no infraestructura — consistente con lo que U2 remite. |
| Constraint de la etapa (sin IaC completo/políticas, solo tablas/prosa)                    | Cumplido — los 3 artefactos (`infrastructure-specification.md`, `monitoring-design.md`, `cicd-pipeline.md`) son íntegramente tablas y prosa.                                                                                                                                             |
| `monitoring-design.md` § Logs & Tracing cita `extractErrorMessage()`/NFR4.2/NFR4.3        | Verificado contra `nfr-design/security-design.md` de U2 (ya READY) — mismo mecanismo, sin invención.                                                                                                                                                                                     |

### Summary

La afirmación central ("sin infraestructura nueva para U2") se sostiene: el sensor de trazabilidad pasa sin gaps, el pipeline real (`ci.yml` job `test-node`) confirma que los tests nuevos de los 3 flujos corren dentro de la suite Vitest ya vigente sin stage nuevo, y la sección "Shared Infrastructure" no contradice a U1 — ambas describen el mismo droplet/reverse proxy preexistente sin recurso nuevo compartido. Solo hay 2 hallazgos Minor (cita faltante del job real, asimetría cosmética de una aclaración entre U1 y U2), ninguno bloqueante. Veredicto: READY.
