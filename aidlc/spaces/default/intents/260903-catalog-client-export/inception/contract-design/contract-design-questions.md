# Contract Design — Questions

## Nota: bloque interactivo de Step 3-4 omitido

Los puntos que normalmente cubre el bloque de Step 3 (mecanismo de
integración, ownership, versionado, comportamiento de error) ya están
resueltos por artefactos upstream, sin ambigüedad genuina que requiera
juicio humano adicional en esta etapa:

- **Mecanismo de integración**: HTTP síncrono — ya establecido por
  `stories.md` AC1.1.1/AC1.1.9 (un único request, una única respuesta
  binaria) y por el patrón ya vigente del resto del sistema (BFF proxy →
  FastAPI, sin mensajería async para este flujo).
- **Ownership**: U1 (`u1-catalog-export-api`) dueño del spec — único
  proveedor del boundary; U2 (`u2-catalog-export-ui`) único consumidor, sin
  consumidores externos al sistema (no es una API pública/partner — la
  única frontera inter-unit de este intent, confirmado en
  `unit-of-work-dependency.md`).
- **Comportamiento de error**: ya fijado por `stories.md` — 404 tipado
  para catálogo vacío (AC1.1.5), error específico (no timeout/ZIP
  corrupto) para catálogo sobredimensionado (AC1.3.1), log `warning` no
  abortante para imagen individual faltante (AC1.1.6) — todos vía la
  subclase de `ProductError` ya decidida (`requirements.md` FR4.1).
- **Versionado/breaking changes**: sigue la convención ya vigente del
  resto de la API (`/api/v1/...`, aditivo — consumidores ignoran campos
  desconocidos) — sin especialización nueva para este endpoint.

Único punto genuinamente abierto: el **nombre final del path** del
endpoint (`requirements.md` § Open Questions ya lo marca como no
confirmado, diferido explícitamente a Functional Design). Esta etapa
pinea un nombre PROVISIONAL para que U1/U2 puedan construir en paralelo
contra un contrato concreto — Functional Design puede ajustarlo sin
romper el resto del contrato (mismo shape de request/response).

## Plan propuesto — contrato único (U1 → U2)

**1 boundary inter-unit**, HTTP síncrono, `GET
/api/v1/products/export-client-format.zip` (nombre provisional):

- **Request**: sin query params ni body — `organization_id` resuelto
  SIEMPRE del JWT de sesión (cookie httpOnly), igual que `export.csv`
  (NFR1). Sin parámetro de la petición que pueda alterar qué organización
  se exporta.
- **Response 200**: `application/zip` binario + `Content-Disposition:
attachment` con nombre de archivo sugerido — el ZIP contiene un CSV en
  la raíz (24 columnas exactas, `;`, header de FR1.3) más una carpeta por
  vehículo publicado con sus imágenes (FR2.1-FR2.4).
- **Response 404**: catálogo vacío — body tipado vía `ProductError`
  (AC1.1.5).
- **Response 4xx** (código exacto diferido a NFR Design — ver Open
  Questions de `contract-summary.md`): catálogo excede el cap de recursos
  — body tipado vía `ProductError` con mensaje específico (US1.3,
  AC1.3.1).
- **Response 5xx**: error inesperado, formato estándar del resto de la API.

Spec completo en formato OpenAPI dentro de `contract-summary.md`.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
