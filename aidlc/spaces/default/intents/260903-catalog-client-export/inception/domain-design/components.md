# Domain Design — Components

Decisión confirmada en la entrevista (Q1, Q2): un único componente,
`Product` (ya existente en el dominio de ProSell, ver `component-inventory.md`
y `architecture.md`), se extiende con la responsabilidad de export en
formato cliente descripta en `requirements.md` (FR1-FR4, NFR1-NFR4) y
`stories.md` (US1.1-US1.3). No se introduce ningún componente nuevo ni
ninguna entidad nueva — ver `decisions.md` ADR-001.

## Part A — Catálogo (machine-readable)

```yaml
components:
  - name: Product
    summary: Dominio de catálogo — ciclo de vida del producto/vehículo, import y export CSV, gestión de imágenes asociadas.
    behaviour: >
      Reglas de transición de estado (ProductStatus: draft/pending/published/paused/
      reserved/sold/rejected/archived), scoping multi-tenant estricto (tenant_id
      resuelto SIEMPRE desde el JWT, nunca de parámetros de la petición), mapeo de
      CSV cliente hacia/desde el modelo de producto (import ya existente, export
      NUEVO en este intent con el mismo formato de 24 columnas), armado de nombre
      de carpeta de imágenes por vehículo (código de organización + año + marca +
      modelo + millas + color, sanitizado), y ahora también: filtrar productos
      `published` de la organización autenticada, serializar sus 24 columnas
      exactas al formato `docs/data39.csv`, y empaquetar sus imágenes en un ZIP
      combinado (mismo archivo que el CSV) organizadas por carpeta de vehículo.
      Acota el volumen de productos/imágenes procesados en un solo export
      (US1.3, NFR3 de `requirements.md` — mitigación obligatoria de DoS por
      agotamiento de memoria) y rechaza con un error específico cuando el
      catálogo excede ese límite, en vez de intentar armar un ZIP sin cota.
    responsibilities:
      - Ciclo de vida y transiciones de estado del producto
      - Import de catálogo desde CSV cliente (24 columnas, `;`)
      - Export de catálogo en formato cliente (24 columnas, `;`) + ZIP de imágenes combinado (NUEVO)
      - Nombrado y sanitización de carpetas de imágenes por vehículo
      - Mapeo de errores del dominio a `ProductError` (subclases tipadas)
      - Enforcement del límite de recursos del export (US1.3/NFR3: rechazo con error específico si el catálogo excede el cap — el número exacto queda diferido a NFR Design)
    depends_on:
      - component: Organization
        interaction: resolver el código de organización (`Organization.code`) para el segmento de carpeta y el tenant_id de scoping
        style: sync
    dependents: []
    external_dependencies:
      - name: PostgreSQL
        kind: database
        purpose: persistencia de productos y sus atributos
      - name: DigitalOcean Spaces (S3-compatible)
        kind: object-store
        purpose: storage de imágenes de producto ya subidas — leídas (no escritas) al armar el ZIP de export
    entities:
      - name: Product
        identifier: id
        attributes:
          [
            organization_id,
            status,
            attributes (incl. year,
            make,
            model,
            mileage,
            exterior_color),
            image_urls,
            cover_image_key,
            description,
          ]
        references:
          - entity: Organization
            owned_by: Organization
            relationship: "cada Product pertenece a una Organization (tenant)"

  - name: Organization
    summary: Dominio de organización/tenant — ya existente, sin cambios de comportamiento en este intent.
    behaviour: >
      Sin cambios funcionales. Se lee (no se modifica) el atributo `code`
      (str | None, 1-5 caracteres) para el segmento de carpeta del ZIP de export.
    responsibilities:
      - Identidad y datos de la organización (tenant)
    depends_on: []
    dependents:
      - component: Product
        interaction: provee `code` para el nombrado de carpetas de export y el tenant_id de scoping
    external_dependencies:
      - name: PostgreSQL
        kind: database
        purpose: persistencia de organizaciones
    entities:
      - name: Organization
        identifier: id
        attributes: [code]
        references: []
```

## Part B — Vista humana

### Component Diagram

```mermaid
graph LR
    Product -->|resuelve code / tenant_id| Organization
```

### Component Summary

| Component    | Purpose                               | Depends On   | Dependents | Entities Owned |
| ------------ | ------------------------------------- | ------------ | ---------- | -------------- |
| Product      | Catálogo, import/export CSV, imágenes | Organization | —          | Product        |
| Organization | Identidad de tenant                   | —            | Product    | Organization   |

### Entity Ownership

| Entity       | Owning Component | Identifier | Attributes                                                                                                                       | References                           |
| ------------ | ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Product      | Product          | id         | organization_id, status, attributes (incl. year, make, model, mileage, exterior_color), image_urls, cover_image_key, description | Organization (owned_by Organization) |
| Organization | Organization     | id         | code                                                                                                                             | —                                    |

### External Dependencies

| Component    | Dependency          | Kind         | Purpose                                              |
| ------------ | ------------------- | ------------ | ---------------------------------------------------- |
| Product      | PostgreSQL          | database     | Persistencia de productos                            |
| Product      | DigitalOcean Spaces | object-store | Lectura de imágenes ya subidas para el ZIP de export |
| Organization | PostgreSQL          | database     | Persistencia de organizaciones                       |

### Rationale

| Component    | Why it's a separate building block                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product      | Lifecycle, reglas de negocio y datos propios (estado, atributos, imágenes) distintos de Organization — ya existía antes de este intent (`component-inventory.md` § "Export de catálogo — formato cliente + ZIP de imágenes"), y el export descripto en `requirements.md`/`stories.md` es una responsabilidad más del mismo dominio (mismo ciclo de vida, mismo tenant scoping, mismo patrón de manejo de errores) — no amerita separarse en un componente nuevo. |
| Organization | Identidad de tenant con su propio ciclo de vida (alta, código, contacto) — sin cambios en este intent, incluido acá solo porque `Product` depende de leer `Organization.code`.                                                                                                                                                                                                                                                                                   |

No hay bloque de opciones de decomposición (Step 5) porque no hay más de una
decomposición viable — ver `decisions.md` ADR-001.

### Nota de trazabilidad — US1.2

US1.2 (`stories.md`: nombre/ruta sugerido antes de exportar, vía
`window.prompt()` nativo — ver Refined Mockups) es puramente una
interacción del lado del cliente (frontend), sin lógica de negocio ni dato
persistido que `Product` u otro componente del backend deba realizar — el
valor sugerido se compone en el cliente a partir de datos ya disponibles
(código de organización, fecha) sin ida y vuelta al servidor. No tiene
target de componente backend en este catálogo; `traceability.json` la marca
`N/A` con esta misma justificación.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-05T12:44:42Z
**Iteration:** 2

### Findings

Las tres correcciones de la pasada anterior fueron verificadas contra el
artefacto y contra las herramientas de validación — ninguna quedó a medio
resolver.

| #   | Severity                           | Location                                                      | Finding                                                                                                                                                                                                                                                                                                                                                                   | Recommendation                   |
| --- | ---------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | Minor (informativo, no bloqueante) | `domain-design-questions.md` línea 41 vs. `traceability.json` | El "Consolidated Summary" pre-generación dice que las 3 historias mapean a `Product`; el artefacto final correctamente reclasificó US1.2 a `N/A` tras el análisis. Es una evolución legítima post-cuestionario (documentada en la propia Nota de trazabilidad de `components.md`), no una inconsistencia oculta — dejar constancia por completitud, sin acción requerida. | Ninguna — solo nota informativa. |

**Sobre el hallazgo Critical previo (US1.2/US1.3 sin target real)**: resuelto.
US1.3 ahora tiene enforcement real e integrado en dos lugares del catálogo —
el párrafo `behaviour` ("Acota el volumen de productos/imágenes procesados
... rechaza con un error específico cuando el catálogo excede ese límite") y
un ítem propio en `responsibilities` ("Enforcement del límite de recursos
del export") — no una mención de pasada. `traceability.json` lo marca `OK`
→ `Product`, consistente con NFR3/AC1.3.1-1.3.2 de las capas upstream. US1.2
quedó `N/A` con una justificación específica y verificable: la historia
(`stories.md` US1.2, AC1.2.1-1.2.3) describe una interacción 100%
client-side (campo de texto editable con default sugerido, sin ida y vuelta
al servidor) trazada a FR3.1/FR3.2 — no hay lógica de negocio de backend que
`Product` (u otro componente) deba realizar. Cumple el criterio del stage
file ("N/A only with justification"), y el sensor `traceability` (ejecutado:
`pass: true`, `gaps: []`) no lo marca como GAP.

**Sobre el hallazgo Major previo (sensor `upstream-coverage`)**: resuelto y
confirmado mecánicamente. Se ejecutó
`bun .claude/tools/aidlc-sensor-upstream-coverage.ts --output-path components.md --consumes "requirements,stories,architecture,component-inventory,team-practices" --deliverables "components,decisions"`
→ `{"pass":true,"unreferenced":[],"findings_count":0}`. Las citas no son
solo el nombre de archivo para satisfacer el sensor: `component-inventory.md`
se cita con la sección concreta (`§ "Export de catálogo — formato cliente +
ZIP de imágenes"`), `architecture.md` respalda la afirmación de Clean
Architecture ya vigente, y `requirements.md`/`stories.md` se citan con IDs
concretos (FR1-FR4, NFR1-NFR4, US1.1-US1.3). También se ejecutaron
`aidlc-sensor-required-sections` (`pass: true`, 2 H2 en cada archivo) y
`aidlc-sensor-traceability` (`pass: true`, sin gaps/huérfanos/targets
inválidos) — los tres sensores declarados en el frontmatter del stage pasan.

**Sobre el hallazgo Minor previo (atributos de `Product`)**: resuelto. La
lista de atributos ahora incluye `year, make, model, mileage,
exterior_color` tanto en el bloque YAML (línea 53) como en la tabla Entity
Ownership (línea 101) — los 5 segmentos del nombre de carpeta de imágenes
(`FR2.2`) están cubiertos, no solo `exterior_color`.

**Verificación adicional (adversarial)**: `depends_on`/`dependents` son
simétricos (`Product → Organization` / `Organization ← Product`), sin ciclos;
cada `entity`/`owned_by` referenciado está declarado bajo su componente
propietario; no hay componente que dependa de sí mismo; `traceability.json`
enumera exactamente `US1.1`-`US1.3` (correcto — `stories.md` existe, así que
no se cae al fallback de FR). ADR-001 y ADR-002 siguen la estructura
Context/Decision/Consequences/Alternatives Rejected exigida por
`phases/inception.md`.

### Validation Tool Results

| Tool                             | Result                                             | Interpretation                                                                            |
| -------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `aidlc-sensor-upstream-coverage` | PASS — `unreferenced: []`                          | Confirma que el hallazgo Major previo está resuelto mecánicamente, no solo en apariencia. |
| `aidlc-sensor-traceability`      | PASS — `gaps: [] orphans: [] invalid_targets: []`  | El `N/A` de US1.2 no se computa como gap; la cobertura de las 3 historias es completa.    |
| `aidlc-sensor-required-sections` | PASS — 2 H2 en `components.md` y en `decisions.md` | Cumple el piso estructural del stage.                                                     |

### Summary

Las tres correcciones declaradas por el equipo son reales y verificables, no
cosméticas: el enforcement de US1.3/NFR3 está integrado en behaviour +
responsibilities (no de pasada), la reclasificación `N/A` de US1.2 tiene
justificación específica y trazable a FR3.1/FR3.2, y los tres sensores del
stage pasan mecánicamente sobre el contenido actual. No se encontraron
hallazgos Critical ni Major nuevos.
