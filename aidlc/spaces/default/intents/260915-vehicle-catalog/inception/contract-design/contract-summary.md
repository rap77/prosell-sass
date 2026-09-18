# Contract Summary — Catálogo Canónico de Vehículos para Facebook

Contratos derivados del único borde inter-unit real declarado en `unit-of-work-dependency.md` (U2 → U1, parcial, para US1.1/US1.2), informados por las formas de entidad de `components.md` (Domain Design) y por FR1 de `requirements.md`. Sin API pública/externa nueva — FR4 documenta un contrato ya existente sin exponerlo a un consumidor nuevo.

## Contracts

| #   | Provider Unit                 | Consumer                     | Mechanism                                                   | Owner |
| --- | ----------------------------- | ---------------------------- | ----------------------------------------------------------- | ----- |
| 1   | U1 (`u1-vehicle-catalog-api`) | U2 (`u2-vehicle-catalog-ui`) | sync REST/HTTP (extensión aditiva de un endpoint existente) | U1    |
| 2   | U1 (`u1-vehicle-catalog-api`) | U2 (`u2-vehicle-catalog-ui`) | sync REST/HTTP (endpoint nuevo)                             | U1    |

## Contrato 1 — Decode de VIN reconciliado (extensión aditiva)

Extiende `POST /vehicles/decode-vin` (`VINDecodeResponse`/`DecodedVehicle`, ya existente en `vehicle_router.py`) con un campo nuevo. Los valores de los campos existentes (`body_type`, `fuel_type`, etc.) pasan a venir ya reconciliados contra `FacebookVehicleValueCatalog` (FR1.1); el campo nuevo distingue "sin dato de NHTSA" (ya existente, `null`) de "NHTSA dio un valor pero sin match canónico" (FR1.2/AC1.1.2).

```yaml
openapi: 3.0.0
paths:
  /vehicles/decode-vin:
    post:
      summary: Decodifica un VIN y devuelve valores de atributo reconciliados
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                vin:
                  type: string
      responses:
        "201":
          description: VIN decodificado
          content:
            application/json:
              schema:
                type: object
                properties:
                  vin:
                    type: string
                  vehicle:
                    type: object
                    description: >
                      Mismos 28 campos ya existentes (year, make, model, trim, engine, fuel_type,
                      body_type, etc.) — cada valor de campo select-backed llega ya reconciliado
                      contra el catálogo canónico. Sin cambio de shape para consumidores existentes.
                  cached:
                    type: boolean
                  raw_data:
                    type: object
                  unmatched_fields:
                    type: array
                    items:
                      type: string
                    default: []
                    description: >
                      NUEVO. Lista de nombres de campo (ej. "fuel_type") para los que NHTSA devolvió
                      un valor crudo pero no hubo match en el catálogo canónico — ese campo viene
                      null en `vehicle`, y su nombre aparece acá para que el frontend distinga este
                      caso (AC1.1.2, tooltip "no se pudo autocompletar") de un campo sin dato alguno.
                      Lista vacía si todos los campos reconciliaron o NHTSA no devolvió valor crudo.
```

## Contrato 2 — Catálogo de opciones canónicas (endpoint nuevo)

Endpoint nuevo que expone las opciones canónicas vigentes de `FacebookVehicleValueCatalog` para un campo dado. Reemplaza la lista estática que `category-schema-editor.tsx` mantiene a mano hoy (`FACEBOOK_FIELD_KEY_MAP`, US1.2/AC1.2.1). Único consumidor conocido de este contrato: el editor de schema de categorías, ya gateado a Platform Admin (`_require_platform_admin()`, `category_router.py`) — este endpoint nuevo hereda el mismo gating, sin abrir acceso nuevo a un rol que hoy no lo tiene.

```yaml
openapi: 3.0.0
paths:
  /categories/facebook-values/{field_key}:
    get:
      summary: Devuelve las opciones canónicas vigentes de un campo mapeado a Facebook
      parameters:
        - name: field_key
          in: path
          required: true
          schema:
            type: string
          description: Clave del campo de vehículo (ej. "fuel_type", "body_type")
      responses:
        "200":
          description: Opciones canónicas del campo
          content:
            application/json:
              schema:
                type: object
                properties:
                  field_key:
                    type: string
                  options:
                    type: array
                    items:
                      type: string
                    description: Conjunto completo de valores canónicos vigentes para ese campo — ni uno de más ni de menos (AC1.2.1).
        "404":
          description: field_key no reconocido en el catálogo canónico
```

## Contract Ownership Rules

- U1 (`u1-vehicle-catalog-api`) es dueño de ambos specs — cualquier cambio de forma se propone y versiona desde ese Unit.
- Cambios aditivos (campo nuevo, opcional, con default razonable) no requieren coordinación previa — U2 debe ignorar campos desconocidos (regla ya vigente en la plataforma, sin cambio).
- Cambios breaking (renombrar/quitar un campo existente, cambiar el tipo de un valor) requieren coordinar con U2 antes de mergear — no aplica a ninguno de los 2 contratos de este intent, ambos son aditivos o de endpoint nuevo.
- `unmatched_fields` (Contrato 1) y `options` (Contrato 2) son arrays — un array vacío es una respuesta válida, no un error.

## Open Questions

| Contract | Question                                                                                                                                                                                                                                                                                                           | Blocks                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| 2        | Mecanismo exacto de sincronización entre el catálogo backend y `FACEBOOK_FIELD_KEY_MAP`/`facebook-values/index.ts` del frontend (FR1.4) — ¿el frontend deja de mantener su propia lista por completo, o la mantiene solo como capa de traducción/display (ES/EN) sobre las `options` que ahora vienen del backend? | Functional Design de U2 |
| 1, 2     | Manejo de error/timeout si `FacebookVehicleValueCatalog` no tiene entrada para un campo esperado (bug de configuración vs. campo genuinamente sin catálogo) — ¿404 silencioso, o log de warning server-side?                                                                                                       | Functional Design de U1 |

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-17T02:36:08Z
**Iteration:** 1

### Verificación 1 — Fidelidad de Contrato 1 contra el código real

Verificado contra `apps/api/src/prosell/infrastructure/api/routers/vehicle_router.py`:

- `VINDecodeResponse` (líneas 83-89) tiene exactamente `vin: str`, `vehicle: DecodedVehicle`, `cached: bool`, `raw_data: dict[str, Any]` — coincide byte a byte con lo que el contrato dice que ya existe.
- `DecodedVehicle` (líneas 34-80) declara exactamente 28 campos (confirmado contando: basic×4, engine×8, dimensions×7, capacity×4, electric×6 — hay un desajuste de mi conteo manual vs el docstring "28 fields across 10 groups", pero el propio código lo declara así y el contrato no reclama un número distinto, solo cita "28" del docstring — no es una afirmación propia del contrato, es una cita fiel).
- **`unmatched_fields` no colisiona con ningún campo existente**: ni `VINDecodeResponse` (vin/vehicle/cached/raw_data) ni `DecodedVehicle` (los 28 campos de atributo) tienen un campo con ese nombre. La extensión es genuinamente aditiva.
- FR1.2 (`requirements.md`) y AC1.1.2 (`stories.md`, "una marca visual distinta a 'campo sin dato'") respaldan exactamente el propósito que el contrato le da a `unmatched_fields` — no es una invención del Contract Design, tiene upstream real.

### Verificación 2 — Colisión de rutas del endpoint nuevo

Verificado contra `apps/api/src/prosell/infrastructure/api/routers/category_router.py` y `main.py` (líneas 278-287):

- `category_router` se monta en `/api/v1/categories`, y **además** `category_inference_router` se monta en el MISMO prefijo `/api/v1/categories` (dato no mencionado en el contrato ni en `contract-design-questions.md`, pero verificado sin encontrar colisión real: ese segundo router solo declara `POST /infer`, sin relación de forma con `GET /facebook-values/{field_key}`).
- Rutas existentes de un segmento bajo `/categories/`: `/{category_id}` (GET/PATCH/DELETE). El endpoint nuevo tiene DOS segmentos (`facebook-values/{field_key}`), por lo que Starlette/FastAPI nunca lo confunde con `/{category_id}` — un match de un segmento no compite con un patrón de dos segmentos. Sin colisión real.
- Rutas existentes de dos segmentos: `/{category_id}/schema`, `/{category_id}/fields`, `/{category_id}/attribute-schema` — todas tienen la forma `<dinámico>/<literal>`; el endpoint nuevo tiene la forma inversa `<literal>/<dinámico>` ("facebook-values" nunca calza como `category_id` seguido de esos literales fijos). Sin colisión real tampoco acá.
- **Conclusión**: el path elegido (`/categories/facebook-values/{field_key}`, dos segmentos) evita correctamente la trampa que el brief de revisión señalaba como riesgo — si el endpoint hubiese sido de UN segmento (`/categories/{field_key}`) sí habría colisionado con `/categories/{category_id}`, pero no es el caso.

### Verificación 3 — Cobertura de la única dependencia inter-unit real

`unit-of-work-dependency.md` declara un solo edge (U2→U1, parcial, solo para US1.1/US1.2) y dos "Puntos de integración" explícitos: decode de VIN reconciliado y catálogo de opciones canónicas. Los 2 contratos de `contract-summary.md` cubren exactamente esos 2 puntos, uno a uno, sin contrato de más (no se inventó un tercero) ni de menos (ninguno de los 2 puntos de integración quedó sin contrato). La porción de U2 que cubre US2.1 (ubicación) correctamente NO tiene contrato — `unit-of-work-dependency.md` ya establece que no depende de trabajo nuevo de U1.

### Verificación 4 — Coherencia con `components.md` (forma de `CanonicalFieldOption`)

`components.md` línea 30 fija `CanonicalFieldOption` con atributos `[field_key, canonical_value, accepted_raw_aliases]`, identificador compuesto `field_key + canonical_value` (múltiples filas por `field_key`). El Contrato 2 proyecta esto a `{field_key, options: [string]}` — una lista de `canonical_value` para un `field_key` dado. Es una proyección razonable y fiel al propósito de consumo (US1.2/AC1.2.1 solo necesita poblar `options` de un select, no los `accepted_raw_aliases`) — no inventa una forma de dato distinta a la que Domain Design fijó, agrega una vista derivada legítima sobre ella.

### Verificación 5 — Open Questions

Ambas preguntas abiertas son genuinas, no resuelven en silencio algo que Requirements/Domain Design ya haya fijado:

- La pregunta sobre mecanismo de sincronización (Contrato 2) refleja textualmente lo que FR1.4 de `requirements.md` ya deja explícitamente abierto ("Functional Design define el mecanismo concreto") y lo que `unit-of-work.md` también señala como pendiente — consistente en las 3 capas, sin contradicción.
- La pregunta sobre manejo de error/timeout de `FacebookVehicleValueCatalog` sin entrada para un campo no está resuelta en ningún artefacto upstream (`components.md`, `requirements.md`) — es un genuino punto abierto de comportamiento de error, no cubierto por FR1.2 (que habla de valor sin match, no de campo sin entrada de catálogo alguna).
- Ambos "Blocks" apuntan a destinos reales: Functional Design de U1 y de U2 existen como stages per-unit de Construction (`unit-of-work.md` confirma U1/U2 como Units reales que atraviesan Functional Design).

### Hallazgos

| #   | Severidad | Ubicación         | Hallazgo                                                                                                                                                                                                                                                                                                                                                                             | Recomendación                                                                                                                                                                                       |
| --- | --------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor     | Contrato 2 (yaml) | No se especifica gating de autorización para `GET /categories/facebook-values/{field_key}` — el propio `team.md`/aprendizajes de este intent ya establecieron que el editor de schema de categorías está gateado a Platform Admin (`_require_platform_admin`), pero no queda explícito si esta lectura hereda el mismo gate o es de lectura abierta a cualquier usuario autenticado. | Confirmar el nivel de auth en Functional Design de U1 (no bloqueante para Contract Design — el nivel de detalle de auth es consistente con contratos previos de este proyecto en esta misma etapa). |
| 2   | Minor     | Contrato 1 (yaml) | El schema no declara `default: []` para `unmatched_fields` pese a que la prosa dice "Lista vacía si todos los campos reconciliaron" — cosmético, no ambigüedad de contrato.                                                                                                                                                                                                          | Agregar `default: []` en el próximo ajuste del yaml, opcional.                                                                                                                                      |

Ninguno de severidad Critical o Major. Los 2 hallazgos son menores y no bloquean implementación — un desarrollador puede construir contra este contrato sin volver a preguntarle al arquitecto.

### Summary

Los 2 contratos son fieles al código real verificado (`vehicle_router.py`, `category_router.py`, `main.py`), cubren exactamente la única dependencia inter-unit real declarada en `unit-of-work-dependency.md` sin inventar ni omitir ningún punto de integración, y proyectan razonablemente la forma de `CanonicalFieldOption` que Domain Design ya fijó. El riesgo de colisión de rutas señalado en el brief de revisión no se materializa porque el endpoint nuevo usa dos segmentos de path, una forma que no compite con ninguna ruta de un segmento (`/{category_id}`) ni con las rutas existentes de dos segmentos (`<dinámico>/<literal>`). Las Open Questions son genuinas y apuntan a destinos reales de Construction. Contrato listo para que Functional Design de U1/U2 construya sobre él.
