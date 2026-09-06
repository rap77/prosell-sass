# Contract Summary — Export de catálogo (formato cliente + ZIP)

Un único boundary inter-unit para este intent, entre `u1-catalog-export-api`
(proveedor) y `u2-catalog-export-ui` (consumidor) — las dos Units definidas
en `unit-of-work.md` y el único edge de `unit-of-work-dependency.md`. Sin
fronteras públicas/externas: no hay consumidor fuera del sistema
(`facebook-auto-post` no se integra directamente en este intent, per
`requirements.md` § Out of Scope).

## Contracts Table

| #   | Provider Unit           | Consumer               | Mechanism                 | Owner                   |
| --- | ----------------------- | ---------------------- | ------------------------- | ----------------------- |
| 1   | `u1-catalog-export-api` | `u2-catalog-export-ui` | HTTP síncrono (REST, GET) | `u1-catalog-export-api` |

## Contract 1 — Export de catálogo formato cliente

**Boundary**: `u2-catalog-export-ui` → `u1-catalog-export-api`, vía el
proxy BFF de `products` (`apps/web/src/app/api/v1/products/[...path]/route.ts`,
ya confirmado sin el defecto de `response.json()` ciego —
`architecture.md`).

```yaml
openapi: 3.0.3
info:
  title: ProSell Catalog Client-Format Export
  version: "1.0-provisional"
  description: >
    Contrato pineado por Contract Design. El path exacto es PROVISIONAL —
    requirements.md (§ Open Questions) difiere el nombre final a Functional
    Design; el shape de request/response (auth, respuesta ZIP combinada,
    contrato de error) queda fijo desde acá.
paths:
  /api/v1/products/export-client-format.zip:
    get:
      summary: Exportar catálogo publicado en formato cliente (CSV 24 columnas) + ZIP de imágenes
      description: >
        Filtra productos status=published de la organización resuelta
        SIEMPRE del JWT de sesión (nunca de un parámetro de la petición —
        requirements.md NFR1). Devuelve un único ZIP combinado (stories.md
        AC1.1.1) — no dos descargas separadas.
      security:
        - sessionCookie: []
      parameters: []
      responses:
        "200":
          description: ZIP generado correctamente
          headers:
            Content-Type:
              schema:
                type: string
                enum: ["application/zip"]
            Content-Disposition:
              schema:
                type: string
                description: >
                  attachment; filename="<nombre sugerido>.zip" — nombre de
                  archivo real por defecto pendiente de fijar en Functional
                  Design (requirements.md, hallazgo Minor #6 del reviewer de
                  Requirements Analysis).
          content:
            application/zip:
              schema:
                type: string
                format: binary
                description: >
                  Archivo ZIP conteniendo: (a) un CSV en la raíz con
                  exactamente 24 columnas, mismo orden y separador `;` que
                  docs/data39.csv, incluyendo la columna `id`
                  (requirements.md FR1.3, stories.md AC1.1.2); (b) una
                  carpeta por vehículo publicado, nombrada
                  `<código_organización>/<año>-<marca>-<modelo>-<millas_en_K>-<color>-<código_organización>/`,
                  con cada segmento sanitizado (stories.md AC1.1.3,
                  AC1.1.4, AC1.1.8). Los atributos interpolados
                  (`year`, `make`, `model`, `mileage`, `exterior_color`)
                  son los mismos que `components.md` (Domain Design) ya
                  declaró bajo la entidad `Product` del componente
                  `Product` — este contrato no introduce ningún atributo
                  nuevo.
        "404":
          description: Catálogo vacío — la organización no tiene productos published
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ProductErrorResponse"
              example:
                detail:
                  error: "EMPTY_CATALOG"
                  message: "No hay productos publicados para exportar."
        "4XX":
          description: >
            Catálogo excede el cap de recursos del export (NFR3,
            stories.md US1.3/AC1.3.1). Código exacto (413 vs. 422 vs. otro)
            y número exacto del cap quedan diferidos a NFR Design —
            ver Open Questions abajo. El contrato SÍ fija que la respuesta
            es un error tipado explícito, nunca un timeout ni un ZIP
            corrupto/incompleto.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ProductErrorResponse"
              example:
                detail:
                  error: "EXPORT_LIMIT_EXCEEDED"
                  message: "El catálogo supera el límite soportado por request."
        "5XX":
          description: Error inesperado — formato estándar del resto de la API.
components:
  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: access_token
      description: Cookie httpOnly de sesión — mismo patrón de auth que el resto de `/api/v1/products/*`.
  schemas:
    ProductErrorResponse:
      type: object
      properties:
        detail:
          type: object
          properties:
            error:
              type: string
              description: Código de error estable, mapeado desde la subclase de ProductError correspondiente (requirements.md FR4.1).
            message:
              type: string
              description: Mensaje legible por humanos, mostrado directo en la UI de U2.
```

**Comportamiento de errores no cubierto por response codes formales**:

- **Imagen individual no legible** (`image_urls` con referencia rota):
  NO produce un código de error HTTP distinto — el export sigue 200 con
  el vehículo incluido igual (sin esa imagen), y U1 emite un log de
  aplicación `warning` con `product_id` + referencia de imagen fallida
  (stories.md AC1.1.6). U2 no necesita manejar ningún estado especial
  para este caso — es transparente en el contrato HTTP.
- **Zip-slip (NFR2)**: todo segmento del nombre de carpeta/archivo dentro
  del ZIP pasa por el sanitizador ya existente del dominio antes de
  concatenarse a una ruta interna del ZIP — cerrado a nivel de contrato
  como una garantía del proveedor (`u1-catalog-export-api`), no algo que
  `u2-catalog-export-ui` deba validar del lado consumidor.

## Contract Ownership Rules

- **`u1-catalog-export-api` es dueño único del spec** — cualquier cambio
  al contrato (shape de respuesta, códigos de error, path final) se
  decide del lado backend y se propaga a `u2-catalog-export-ui`, nunca al
  revés.
- **Breaking changes**: requieren coordinación explícita entre ambas
  Units antes de mergear — mismo patrón de versionado ya vigente en el
  resto de la API (`/api/v1/...`, sin ningún mecanismo de negociación de
  versión adicional para este endpoint puntual).
- **Cambios aditivos son seguros sin coordinación**: nuevos campos en el
  body de error (`detail.*`), nuevos headers informativos — `u2-catalog-export-ui`
  debe ignorar campos desconocidos, consistente con el patrón Zod-mirror
  `.passthrough()` ya vigente en el resto del frontend (`architecture.md`).
- El **path final** (`export-client-format.zip` es provisional) y el
  **código exacto de la respuesta de cap excedido** son las dos piezas de
  este contrato sujetas a ajuste en Functional Design/NFR Design — ver
  Open Questions.

## Open Questions

| Contract | Question                                                                                                                                                          | Blocks                                                                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Nombre final del path (`export-client-format.zip` es provisional — `requirements.md` § Open Questions no lo confirma)                                             | Functional Design debe fijarlo antes de Code Generation; no bloquea la construcción en paralelo de U1/U2 mientras ambas Units usen el mismo path acordado acá                                      |
| 1        | Código HTTP exacto para "catálogo excede el cap" (413 Payload Too Large vs. 422 Unprocessable Entity vs. otro) y el número exacto del cap (filas/imágenes/tamaño) | NFR Design — U1 no puede implementar el enforcement real sin este número; U2 puede construir el manejo de error genérico contra el contrato de `ProductErrorResponse` sin esperar el número exacto |
| 1        | `get_object()` en `IDOSpacesService` vs. `httpx` contra `image_urls` públicas para que U1 lea bytes de imágenes ya subidas                                        | Functional Design — decisión interna de U1, no afecta el contrato HTTP con U2 (transparente para el consumidor)                                                                                    |
| 1        | Nombre de archivo real por defecto en `Content-Disposition` (ej. `catalogo_<org>_<fecha>.zip`) — hoy solo mencionado en la prosa del spec, no fijado              | Functional Design — U2 no necesita el valor exacto para construir (usa el header tal cual venga), pero U1 debe fijarlo antes de Code Generation                                                    |

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-05T13:36:30Z
**Iteration:** 1

### Findings

| #   | Severity          | Location                                                                 | Finding                                                                                                                                                                                                                                                                                         | Recommendation                                                                                                                                                                                                                                                                                                       |
| --- | ----------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major (corregido) | `contract-summary.md` (prosa completa)                                   | El sensor `upstream-coverage` fallaba mecánicamente: `unit-of-work` nunca se citaba por nombre de archivo en la prosa, y la cita a `components.md` era una coincidencia mecánica (la palabra `components` como clave YAML de OpenAPI), no una cita real de las entidades que esa etapa definió. | **Corregido antes de abrir el gate**: se agregó una cita explícita a `unit-of-work.md` en la intro, y una cita real a `components.md` señalando que los atributos interpolados en el nombre de carpeta (`year/make/model/mileage/exterior_color`) son los mismos que esa etapa ya declaró bajo la entidad `Product`. |
| 2   | Major (corregido) | Contract 1 → response 200 → `content.application/zip.schema.description` | El patrón de nombre de carpeta del ZIP tenía una **K literal extra** (`<millas_en_K>K-<color>`) que no coincidía con `requirements.md` FR2.2/`stories.md`/`unit-of-work.md` (`<millas_en_K>-<color>`, sin K adicional — el valor interpolado ya incluye la K).                                  | **Corregido**: descripción ajustada a `<millas_en_K>-<color>`, consistente con el resto de los artefactos.                                                                                                                                                                                                           |
| 3   | Minor (corregido) | Contract 1 → descripción del endpoint                                    | NFR2 (zip-slip) no se citaba por ID en ningún punto del contrato, a diferencia de NFR1.                                                                                                                                                                                                         | **Corregido**: se agregó un párrafo explícito citando `requirements.md NFR2` junto a la garantía de sanitización que provee U1.                                                                                                                                                                                      |
| 4   | Minor (corregido) | `## Open Questions` (tabla final)                                        | El nombre de archivo por defecto de `Content-Disposition` quedaba mencionado en la prosa pero sin fila propia en la tabla de Open Questions.                                                                                                                                                    | **Corregido**: se agregó una cuarta fila a la tabla, `Blocks: Functional Design`.                                                                                                                                                                                                                                    |

### Summary

El contrato es sólido en su núcleo: el mecanismo (HTTP síncrono), el boundary (Provider=U1/Consumer=U2, sin invertir respecto al edge de `unit-of-work-dependency.md`), el shape de request/response, y los tres códigos de error (200 con log warning para imagen faltante, 404 catálogo vacío, 4XX cap excedido) están correctamente derivados de `stories.md`/`requirements.md`, con NFR1 (tenant_id solo del JWT) cerrado explícitamente vía `parameters: []` y el spec de auth. El YAML OpenAPI es válido, sin `$ref` colgantes, y la Contracts Table no invierte Provider/Consumer. Los 4 hallazgos (2 Major, 2 Minor) eran todos mecánicos/objetivos — citas de cobertura ausentes y un defecto de transcripción (una `K` de más) — corregidos antes de abrir el gate, sin tocar la arquitectura del contrato ni bloquear que U1/U2 empiecen a construir en paralelo contra él.
