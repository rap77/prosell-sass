# Security Requirements — u1-catalog-export-api

Deriva de `requirements.md` NFR1 (aislamiento multi-tenant) y NFR2
(zip-slip), ya detallados como reglas de negocio en `rules.md` (BR1.1,
BR1.2, BR2.4) del mismo Unit — esta sección los formaliza como NFRs con
targets verificables, sin introducir requisitos nuevos.

## Autenticación y autorización

```
NFR1.1: Autenticación del endpoint de export
Method: cookie de sesión httpOnly (access_token) — mismo patrón que el
  resto de /api/v1/products/*, sin mecanismo nuevo.
Token lifetime: hereda el TTL ya vigente del sistema de auth (sin cambio).
MFA requirement: hereda la política ya vigente (sin requisito nuevo para
  este endpoint específico).

NFR1.2: Autorización — resolución de tenant
Model: tenant_id/organization_id resuelto SIEMPRE del JWT de sesión —
  BR1.2 de rules.md. Ningún parámetro de la petición (query, body) puede
  alterarlo — mitigación IDOR, mismo patrón ya vigente en export.csv.
Resource granularity: nivel de organización (todos los productos
  published de esa organización, sin filtro adicional por usuario dentro
  de la org).
Audit: ver observability-requirements.md — logging de quién exportó.
```

## Protección de datos (STRIDE — Information Disclosure, Tampering)

```
NFR2.1: Prevención de zip-slip
Todo segmento de nombre de carpeta/archivo dentro del ZIP pasa por el
sanitizador ya existente del dominio (_slug_part()/equivalente) antes de
concatenarse a una ruta interna del ZIP — BR2.4 de rules.md. Sin
excepciones: ningún atributo de producto se concatena sin sanitizar.

NFR2.2: Datos en tránsito
TLS ya vigente en todo el tráfico HTTP del sistema (sin cambio específico
para este endpoint).

NFR2.3: Datos expuestos en la respuesta
El ZIP solo contiene datos ya visibles al vendedor autenticado dentro de
su propio catálogo (sin exposición de datos de otras organizaciones,
NFR1.2) — sin campos sensibles adicionales (passwords, tokens) en el CSV
ni en los metadatos de imagen.
```

## Amenazas STRIDE consideradas

| Categoría              | Amenaza                                                                               | Mitigación                                                    | Estado                      |
| ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------- |
| Spoofing               | Suplantación de sesión para exportar el catálogo de otra organización                 | Cookie httpOnly + JWT firmado, ya vigente                     | Mitigado (sin cambio)       |
| Tampering              | Modificación del path interno del ZIP vía atributos de producto maliciosos (zip-slip) | Sanitización obligatoria (NFR2.1)                             | Mitigado por diseño (BR2.4) |
| Repudiation            | Negación de haber exportado el catálogo                                               | Logging de evento de export (`observability-requirements.md`) | Mitigado                    |
| Information Disclosure | Exposición de productos de otra organización vía IDOR                                 | tenant_id SIEMPRE del JWT (NFR1.2)                            | Mitigado por diseño (BR1.2) |
| Denial of Service      | Agotamiento de memoria armando un ZIP sin cota                                        | Cap de recursos (`scalability-requirements.md` NFR3.1)        | Mitigado por diseño (BR3.1) |
| Elevation of Privilege | N/A — no hay jerarquía de roles distinta involucrada en este endpoint                 | —                                                             | No aplica                   |

## Compliance

Sin framework regulatorio nuevo aplicable a este intent — `requirements.md`
no identifica PII sensible más allá de la ya manejada por el resto del
sistema de catálogo (datos de vehículo, no datos personales de terceros).
Postura de seguridad de pipeline (SAST/DAST/dependency scanning) hereda
los gaps ya aceptados del proyecto (`team-practices.md` § Deployment,
Q7 en 260829) — devsecops ya confirmó sin objeción que ninguno de los
riesgos de este intent justifica abrir el intent de seguridad dedicado ya
diferido.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-05T15:55:25Z
**Iteration:** 1

### Findings

| #   | Severity          | Location                                                     | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Recommendation                                                                                                                                                                                                                                                                  |
| --- | ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor             | `performance-requirements.md`, `reliability-requirements.md` | El stage file (`nfr-requirements.md` § Step 6) manda que "every detailed requirement inherits its inception NFR ID and appends a sub-number" (`NFRx.y`). Los targets originados en esta etapa (sin NFR de inception que heredar) usan en cambio prefijos ad-hoc (`NFR-PERF-1/2/3`, `NFR-REL-1/2`) fuera del formato `NFRx.y`. Es una adaptación razonable dado que no hay `NFR{n}` del que derivar un sub-número, y ambos archivos declaran (uno explícito, el otro implícito) que no tienen NFR de origen — pero el formato de ID queda inconsistente con el resto de los artefactos (`NFR1.1`, `NFR2.1`, `NFR3.1`) y con lo que `traceability.json` normalmente targetea. No bloquea NFR Design: ningún ID de este tipo se referencia desde `traceability.json` ni desde otro artefacto que dependa del formato exacto. | Si el patrón `NFR-PERF-*`/`NFR-REL-*` para targets self-originados sin NFR de inception se vuelve recurrente en otros intents, documentarlo explícitamente como convención afirmada del equipo (p.ej. en `team.md`) en vez de dejarlo como una decisión ad-hoc de esta corrida. |
| 2   | Minor (corregido) | `reliability-requirements.md`                                | A diferencia de `performance-requirements.md`, no incluía una declaración explícita de que sus targets no heredan un `NFR{n}` de `requirements.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **Corregido**: se agregó una línea equivalente al inicio del archivo.                                                                                                                                                                                                           |

### Summary

Los 7 artefactos son consistentes entre sí: el cap de 500 productos (NFR3.1) aparece igual en `scalability-requirements.md`, se referencia correctamente desde `traceability.json` y coincide con el código 413 ya fijado en `rules.md` BR3.1/`functional-spec.md`. Los 4 IDs `NFRx.y` citados en `traceability.json` (NFR1.1, NFR1.2, NFR2.1, NFR3.1) existen literalmente en los archivos que se declaran como su fuente, la justificación N/A de NFR4 es razonable (postura de test, no atributo arquitectónico), la tabla STRIDE de `security-requirements.md` cubre las 6 categorías de forma consistente con BR1.1/BR1.2/BR2.4/BR4.3 de Functional Design sin amenaza real faltante (incluyendo el puerto nuevo `get_object()`, cuyo `image_key` no es controlable por el atacante en el request), y los 5 artefactos de `consumes:` están todos citados por nombre de archivo en la prosa. Los dos hallazgos son cosméticos/de convención de formato, no bloquean a NFR Design.
