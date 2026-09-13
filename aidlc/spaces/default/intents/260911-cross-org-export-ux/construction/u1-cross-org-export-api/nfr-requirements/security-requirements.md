# Security Requirements — u1-cross-org-export-api

Deriva de `requirements.md` NFR1 (auditoría) y NFR2 (autorización), y de
las reglas de negocio ya fijadas en `rules.md` (BR2.1 permiso, BR2.5
auditoría) del mismo Unit — esta sección las formaliza como NFRs con
targets verificables, sin introducir mecanismos nuevos. Las NFR de
seguridad ya establecidas en el intent hermano `260903-catalog-client-export`
(NFR1.1/NFR1.2/NFR2.1/NFR2.2/NFR2.3, ambas mitigaciones zip-slip y
JWT-only tenant scoping) se mantienen sin cambio — este archivo las
reproduce y agrega las NFR nuevas de este intent (BR2.1, BR2.5).

## Autenticación y autorización

```
NFR1.1: Autenticación del endpoint de export (sin cambio respecto a 260903)
Method: cookie de sesión httpOnly (access_token) — mismo patrón que el
  resto de /api/v1/products/*, sin mecanismo nuevo.
Token lifetime: hereda el TTL ya vigente del sistema de auth.
MFA requirement: hereda la política ya vigente.

NFR1.2: Autorización — resolución de tenant, caso puntual (sin cambio)
Model: tenant_id/organization_id resuelto SIEMPRE del JWT de sesión.
  Ningún parámetro de la petición puede alterarlo — mitigación IDOR.

NFR2.4: Autorización — modo "todas las organizaciones" (NUEVO, BR2.1)
Model: all_organizations=true requiere el permiso
  ORG_ADMIN_VIEW_ALL/super_admin — MISMO mecanismo ya usado
  (_check_org_scope_permission()) para organization_id ajeno puntual, no
  un chequeo nuevo (FR4.4, NFR2 de requirements.md). Defensa en
  profundidad: el chequeo se aplica tanto si la request viene de la UI
  (selector oculta la opción sin el permiso) como si se invoca el
  endpoint directamente sin pasar por la UI.
Resource granularity: plataforma completa (todas las organizaciones con
  al menos un producto published), sin filtro adicional dentro de ese
  alcance.
Audit: ver observability-requirements.md — evento distinguible
  scope=ALL_ORGS.
```

## Radio de explosión — consideración explícita (NUEVO, guía de team.md)

El MECANISMO de autorización (BR2.1/NFR2.4) es idéntico al ya usado
para el caso puntual — no hay superficie de ataque nueva. Lo que SÍ
cambia es el RADIO DE EXPLOSIÓN de un fallo de ese mismo control: hoy un
fallo de `_check_org_scope_permission()` expone el catálogo de UNA
organización ajena por request; con `all_organizations=true` el mismo
fallo expondría las organizaciones completas de la plataforma en una
sola descarga. Dos medidas YA DECIDIDAS (Practices Discovery/Requirements
Analysis, no nuevas de esta etapa) mitigan este radio de explosión sin
agregar un mecanismo de autorización nuevo:

1. **Auditoría distinguible** (BR2.5/FR6.1, NFR1 de `requirements.md`) —
   ver `observability-requirements.md`.
2. **Confirmación de UI reforzada** (FR5.1) — el banner de confirmación
   muestra explícitamente la cantidad de organizaciones a exportar
   cuando el modo es "todas", dando al usuario una oportunidad
   adicional de cancelar antes de disparar la descarga de mayor
   impacto.

No se agrega rate-limiting nuevo para este endpoint (ya evaluado y
descartado en Practices Discovery — infraestructura genérica existente
acota frecuencia, no costo por-request; riesgo residual aceptado, ver
`reliability-requirements.md` NFR3).

## Protección de datos (STRIDE — Information Disclosure, Tampering)

```
NFR2.1: Prevención de zip-slip (sin cambio respecto a 260903)
Todo segmento de nombre de carpeta/archivo dentro del ZIP pasa por el
sanitizador ya existente del dominio antes de concatenarse a una ruta
interna del ZIP. Aplica igual en ambos modos (puntual y "todas") — el
código de organización (BR2.6, resuelto en batch por BR2.3) y el nombre
de carpeta del producto siguen el mismo camino de sanitización ya
vigente, sin excepción por modo.

NFR2.2: Datos en tránsito (sin cambio)
TLS ya vigente en todo el tráfico HTTP del sistema.

NFR2.3: Datos expuestos en la respuesta (sin cambio de mecanismo,
cambio de alcance en modo "todas")
En el caso puntual, el ZIP solo contiene datos ya visibles al usuario
autenticado dentro del catálogo autorizado (propio o ajeno puntual con
permiso). En modo "todas", el ZIP contiene el catálogo completo de la
plataforma — alcance mayor, pero gateado por el MISMO permiso
(ORG_ADMIN_VIEW_ALL/super_admin, NFR2.4) que ya autoriza ver cualquier
organización ajena. Sin campos sensibles adicionales (passwords,
tokens) en el CSV ni en los metadatos de imagen, en ningún modo.
```

## Amenazas STRIDE consideradas

| Categoría              | Amenaza                                                                               | Mitigación                                                                                                               | Estado                                                             |
| ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Spoofing               | Suplantación de sesión para exportar el catálogo de otra organización o de todas      | Cookie httpOnly + JWT firmado, ya vigente                                                                                | Mitigado (sin cambio)                                              |
| Tampering              | Modificación del path interno del ZIP vía atributos de producto maliciosos (zip-slip) | Sanitización obligatoria (NFR2.1), aplica igual en ambos modos                                                           | Mitigado por diseño (BR2.6/2.4 sanitización ya vigente)            |
| Repudiation            | Negación de haber exportado el catálogo completo de la plataforma                     | Logging de evento distinguible `scope=ALL_ORGS` (`observability-requirements.md`)                                        | Mitigado (NUEVO en este intent)                                    |
| Information Disclosure | Exposición del catálogo COMPLETO de la plataforma por un fallo del chequeo de permiso | Permiso `ORG_ADMIN_VIEW_ALL` (NFR2.4) + confirmación de UI reforzada (FR5.1) — radio de explosión mayor, mismo mecanismo | Mitigado por diseño, radio de explosión documentado explícitamente |
| Denial of Service      | Agotamiento de memoria armando un ZIP con productos de toda la plataforma             | Cap GLOBAL de recursos (`scalability-requirements.md` NFR3.1), riesgo residual aceptado (NFR3)                           | Mitigado parcialmente, riesgo residual aceptado                    |
| Elevation of Privilege | N/A — no hay jerarquía de roles distinta involucrada en este endpoint                 | —                                                                                                                        | No aplica                                                          |

## Compliance

Sin framework regulatorio nuevo aplicable — sin cambio respecto a
`260903-catalog-client-export`. Postura de pipeline de seguridad
(SAST/DAST/dependency scanning) hereda los gaps ya aceptados del
proyecto, sin objeción nueva de devsecops para este intent.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-12T19:11:54Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                              | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Recommendation                                                                                                                                                                                                    |
| --- | -------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | `performance-requirements.md` § Targets, NFR-PERF-4/5 | El presupuesto +20% (15s→18s) está justificado en prosa como "no proporcional al volumen de productos" pero ningún target acota el costo del walk-up de categoría cacheado con un número propio (solo `org_code` tiene NFR-PERF-5 dedicado) — el archivo mismo reconoce esto ("overhead... acotado", sin cifra), dejando la mitad del presupuesto extra sin ancla medible.                                                                                          | Agregar un NFR-PERF-6 (o extender NFR-PERF-5) con un target explícito para el walk-up de categoría cacheado, aunque sea un límite generoso, para que el +20% completo tenga respaldo medible en `build-and-test`. |
| 2   | Minor    | `observability-requirements.md` § Métricas            | Se afirma "sin desagregar por modo... ya que el volumen de uso esperado del modo 'todas' es bajo (uso administrativo ocasional)" — es una estimación de volumen sin cita a ninguna fuente (Requirements/Practices Discovery no fijan una expectativa de frecuencia de uso). No bloquea porque la decisión en sí (no crear dashboard nuevo) es de bajo riesgo y consistente con el resto del NFR set, pero la justificación puntual es una suposición no verificada. | Marcar explícitamente como "Assumption" en vez de presentarlo como hecho, o eliminar la cláusula causal y dejar solo la decisión (sin dashboard nuevo, consistente con Practices Discovery).                      |

### Verificación específica (puntos 1-7 del brief)

1. **Targets nuevos vs. heredados (NFR-PERF-4/5)**: el salto de 15s→18s está sustentado en BR2.3 (batch org_code, con su propio NFR-PERF-5 <200ms) y en el walk-up de categoría cacheado — la justificación es razonable en dirección (ambos son O(organizaciones/categorías distintas), no O(productos)), pero ver hallazgo Minor #1 sobre la falta de cifra propia para el segundo componente.
2. **BR2.4 (cap global 500) — consistencia**: verificado. `rules.md` BR2.4 ("EXPORT_MAX_PRODUCTS (500) aplica como límite GLOBAL... 413"), `scalability-requirements.md` NFR3.2 (mismo número, mismo 413), `reliability-requirements.md` NFR-REL-3 (mismo mecanismo, riesgo residual), y `traceability.json` NFR3 (cita ambos archivos) — sin contradicción entre ninguno.
3. **Radio de explosión de seguridad**: verificado contra `requirements.md` NFR1/NFR2/NFR3 y FR5.1/FR6.1 — ambas mitigaciones citadas (auditoría distinguible `scope=ALL_ORGS`, confirmación de UI reforzada) existen textualmente en `requirements.md` (FR6.1 línea 95, FR5.1 línea 85) y en `rules.md` BR2.5. No se inventa rate-limiting ni autenticación nueva — el archivo explícitamente los descarta citando la decisión ya tomada en Practices Discovery.
4. **`CategoryTranslationEntry` como diccionario estático**: verificado contra `entities.md` (línea 74: "es la única estructura nueva... configuración estática") — `tech-stack-decisions.md` es coherente, no introduce persistencia nueva.
5. **`traceability.json`**: NFR1/NFR2/NFR3 "OK" citan targets que existen literalmente en los archivos declarados. NFR4 "N/A" con justificación de postura de test (no atributo arquitectónico) — mismo criterio ya usado en `260903-catalog-client-export`, coherente y no es un placeholder vacío.
6. **`nfr-requirements-questions.md` — las 3 decisiones unilaterales**: las tres (cache de vertical por-request, diccionario estático para `CategoryTranslationEntry`, nivel `info` para `scope=ALL_ORGS`) son razonablemente de bajo riesgo — ninguna tiene un trade-off de seguridad/negocio genuino oculto: las dos primeras son optimizaciones internas sin efecto observable en el contrato, y la tercera ya estaba fijada por precedente de `project.md` (auditoría liviana) y por la decisión ya afirmada en `team.md` de no agregar alerting nuevo. Clasificación razonable.
7. **`upstream-coverage`/`required-sections`**: los 6 archivos Markdown tienen ≥2 H2 cada uno y referencian en prosa `functional-spec.md`, `rules.md`, `requirements.md` y (en `tech-stack-decisions.md`) `technology-stack.md` del codekb — `contract-summary.md` no se cita explícitamente por nombre en ningún archivo de NFR Requirements, aunque su contenido (códigos de error 403/413/404) sí se referencia indirectamente vía los mismos códigos ya usados en `rules.md`/`security-requirements.md`. No es un gap bloqueante (el contrato no fija ningún NFR propio distinto de lo ya cubierto), pero es una ausencia de cita nombrada.

### Validation Tool Results

No se declaran validation tools para esta etapa en `.claude/aidlc-common/stages/construction/nfr-requirements.md` más allá de los sensors estándar (`required-sections`, `upstream-coverage`) verificados manualmente arriba.

### Summary

Los 6 artefactos extienden coherentemente el precedente de NFR Requirements de `260903-catalog-client-export` sin introducir mecanismos nuevos no autorizados (sin rate-limiting, sin autenticación nueva, sin tabla de BD para la traducción de categorías) y con trazabilidad cruzada consistente entre `performance/scalability/reliability/observability/security-requirements.md` y `traceability.json`. Los dos hallazgos son Minor (una cifra de performance sin ancla propia, una suposición de volumen de uso sin cita) — no bloquean.
