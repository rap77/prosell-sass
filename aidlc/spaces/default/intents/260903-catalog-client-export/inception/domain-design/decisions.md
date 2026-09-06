# Architecture Decision Records — Domain Design

## ADR-001: Extender el componente `Product` existente, sin componente nuevo

- **Context**: El intent agrega una capacidad de export de catálogo en
  formato cliente (CSV de 24 columnas + ZIP de imágenes), descripta en
  `requirements.md` (FR1-FR4) y `stories.md` (US1.1-US1.3). El dominio
  `Product` ya existe con Clean Architecture completa (`architecture.md`,
  `component-inventory.md` § "Export de catálogo — formato cliente + ZIP de
  imágenes"), ya tiene una capacidad simétrica (import de CSV cliente) y ya
  tiene el patrón de nombrado de carpetas de imágenes casi implementado
  (`build_image_folder_name()` en `csv_export.py`, con un bug de campo ya
  confirmado). `team-practices.md` (Practices Discovery, sin objeción de
  las 3 revisiones ciegas) ya afirmó que el feature es "una adición de
  código dentro de un Unit existente (backend `product` + frontend
  catálogo)".
- **Decision**: El export en formato cliente es una responsabilidad más del
  componente `Product` — no se crea un componente nuevo (ej. `CatalogExport`).
- **Consequences**:
  - Positivas: reutiliza el ciclo de vida, el tenant scoping, el patrón de
    manejo de errores (`ProductError`), y el precedente de sanitización de
    nombres ya vigentes en `Product`. Sin nueva superficie de coordinación
    entre componentes.
  - Negativas: el componente `Product` sigue creciendo en responsabilidades
    (import + export + ciclo de vida + review queue). Si en el futuro el
    export gana lógica sustancialmente distinta (ej. programación de
    exports periódicos, integraciones con múltiples formatos externos),
    valdría la pena reevaluar una extracción — no ahora, el alcance actual
    es acotado.
  - Neutras: ninguna decisión de Contract Design ni NFR Design queda
    condicionada por esta elección — Units Generation decide igual cómo
    empaquetar el código, esta decisión es solo sobre el building block
    lógico.
- **Alternatives Rejected**:
  - **Componente `CatalogExport` separado**: pros — límites explícitos si
    el export creciera mucho; cons — coordinación adicional entre dos
    componentes para una funcionalidad que hoy es un solo endpoint
    síncrono, sin justificación de distinto ciclo de vida o distinta tasa
    de cambio respecto a `Product`. Rechazada por sobre-ingeniería para el
    alcance actual (confirmado en la entrevista, Q1).

## ADR-002: Sin entidad nueva para auditoría/historial de exports

- **Context**: A diferencia del import de CSV (que persiste productos), el
  export es una operación de lectura pura: filtra `Product` por
  `organization_id` + `status=published`, arma un CSV+ZIP en memoria, y lo
  devuelve como respuesta HTTP. No hay estado que sobreviva a la request.
- **Decision**: No se introduce ninguna entidad nueva para registrar o
  auditar exports realizados.
- **Consequences**:
  - Positivas: menor superficie de esquema de base de datos, menos
    migraciones, menor complejidad operativa.
  - Negativas: no queda un historial consultable de "quién exportó cuándo"
    más allá de logs de aplicación (ej. el log de nivel `warning` de
    AC1.1.6 para imágenes faltantes) — si el negocio pide en el futuro un
    historial de exports, haría falta una entidad nueva en ese momento.
  - Neutras: ninguna.
- **Alternatives Rejected**:
  - **Entidad `ProductExportLog`**: pros — trazabilidad histórica completa
    de cada export (quién, cuándo, cuántos productos); cons — no fue
    pedida en ningún requerimiento ni historia, agregaría una migración y
    un componente de escritura sin un caso de uso concreto que lo consuma
    hoy. Rechazada por falta de justificación de negocio (confirmado en la
    entrevista, Q2) — el patrón ya establecido de `ProductAuditLog` para
    cambios de estado del producto tampoco cubre exports, y extenderlo
    queda fuera de alcance de este intent.
