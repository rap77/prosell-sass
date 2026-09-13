# Entities — u1-cross-org-export-api

Fuente: `requirements.md`, `stories.md`, `contract-summary.md`,
`unit-of-work.md`. Este Unit no introduce entidades de dominio
nuevas de negocio — extiende el uso de `Product`/`Organization` ya
existentes y agrega UNA estructura de configuración nueva (tabla de
traducción de categorías).

```yaml
entities:
  - name: Product
    description: >
      Producto ya existente en el dominio (no modificado por este
      intent salvo por lectura de nuevos campos de attributes ya
      almacenados). Se referencia acá solo por los atributos que
      este Unit LEE para el export.
    identifier: id
    attributes:
      - id
      - organization_id
      - category_id
      - location_city
      - location_state
      - attributes # JSONB — incluye vin, body_type, title_status, title_state, facebook_groups
    references:
      - entity: Organization
        owned_by: Organization
        relationship: "cada Product pertenece a una Organization (organization_id)"
      - entity: CategoryTranslationEntry
        owned_by: CategoryTranslationEntry
        relationship: >
          category_id de Product NO se traduce directo — se resuelve
          primero al vertical raíz (ancestro de nivel 0, walk-up vía
          CategoryRepository.get_by_id_cross_tenant() siguiendo
          parent_id hasta que sea null), y ESE id de vertical es el que
          se busca en CategoryTranslationEntry.vertical_category_id

  - name: Organization
    description: >
      Organización (dealer) ya existente. Se referencia acá solo por
      los atributos que este Unit necesita para resolver org_code
      por-producto en batch (FR4.2) y para el filtro de "todas".
    identifier: id
    attributes:
      - id
      - code

  - name: CategoryTranslationEntry
    description: >
      NUEVA (FR7.5) — entrada de una tabla de traducción estática que
      mapea el VERTICAL RAÍZ (nivel 0, ej. "Vehículos y Transporte")
      del árbol de categorías de la plataforma al vocabulario de 2
      columnas planas (category/type) que el sistema externo del
      cliente espera. Indexada por vertical, NUNCA por category_id de
      producto directo (Category es jerárquico multi-nivel —
      parent_id/level — y product.category_id apunta a un nodo hoja,
      no al vertical; hallazgo del reviewer §12a, corregido en esta
      iteración). No es una entidad de negocio con ciclo de vida
      propio — es configuración estática (ver Assumption de
      requirements.md: estructura simple, sin interfaz de admin).
    identifier: vertical_category_id
    attributes:
      - vertical_category_id # id del ancestro de nivel 0 (level=0, parent_id=null)
      - client_category # ej. "Vehiculos"
      - client_type # ej. "Auto/camioneta"
    references: []
```

## Resumen legible

- **Product** y **Organization** son entidades de dominio ya
  existentes en el sistema — este Unit no cambia su forma, solo lee
  atributos ya almacenados para completar el CSV de export.
- **CategoryTranslationEntry** es la única estructura nueva que este
  Unit introduce: un lookup estático `vertical raíz real → vocabulario
del cliente`, poblado inicialmente con UNA entrada confirmada (el
  vertical "Vehículos y Transporte" → `category="Vehiculos"`,
  `type="Auto/camioneta"` — verificado carácter a carácter contra
  `docs/data39.csv`). La clave de búsqueda es el ANCESTRO DE NIVEL 0
  del árbol (resuelto vía `CategoryRepository.get_by_id_cross_tenant()`
  con walk-up por `parent_id`, ver BR1.3 en `rules.md`), no el
  `category_id` hoja del producto — así, CUALQUIER producto de
  cualquier subcategoría de la vertical vehículos matchea la misma
  entrada, en vez de excluirse por tener un `category_id` distinto al
  único ejemplo confirmado. Un vertical sin entrada en la tabla implica
  que el producto queda fuera de la vertical vehículos y se excluye
  del export (BR1.7, confirmado en Q1 de
  `functional-design-questions.md`).

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-12T18:14:46Z
**Iteration:** 2 (re-verificación puntual del hallazgo Critical de la iteración 1)

### Re-verificación del hallazgo Critical

El hallazgo original (lookup directo de `CategoryTranslationEntry` por
`product.category_id` hoja, contra una tabla indexada por vertical raíz)
está **resuelto correctamente**:

1. **Walk-up técnicamente correcto contra el código real.** Verificado
   `apps/api/src/prosell/domain/entities/category.py`: `Category.parent_id:
UUID | None = None`, `level: int` (0 = root), `is_root()` → `parent_id
is None`. El algoritmo de BR1.3 (`entities.md` líneas 33-36, `rules.md`
   BR1.3 pasos 1-2) — resolver `category_id` vía
   `CategoryRepository.get_by_id_cross_tenant()`, y mientras `parent_id`
   no sea `null`, repetir el lookup con ese `parent_id` — termina
   exactamente en el ancestro `level=0`/`parent_id=null`. No hay riesgo de
   loop infinito no cubierto: el dominio ya rechaza referencias circulares
   en `add_child`/`parent_id == self.id` (línea 133), y el árbol real es
   estrictamente descendente.
2. **`vertical_category_id` es consistente en los 3 archivos.**
   `entities.md` (identifier + atributo `vertical_category_id`, línea 61,
   63), `rules.md` BR1.3 paso 3 (línea 37) y BR1.7, y `functional-spec.md`
   (Workflow 1 paso 4, Workflow 2 paso 7a, diagrama ER línea 89) usan la
   misma clave, sin ninguna referencia residual a un lookup directo por
   `category_id` hoja.
3. **Hallazgos mecánicos previos siguen resueltos.** BR1.8 (columna
   `state`) está presente en `rules.md` y trazada en `traceability.json`
   (`reverse[]`, `status: N/A` con justificación explícita — correcto per
   la convención de `project.md` para reglas derivadas sin AC dedicado).
   Los parámetros `base_folder`/`facebook_groups_fallback` como
   obligatorios en TODO modo (no solo "todas") están corregidos en
   `functional-spec.md` Workflow 1 paso 1 y 4, con nota explícita de la
   corrección.

### Hallazgos

Ninguno nuevo. No se reabre ningún punto de la pasada anterior.

### Summary

El fix del walk-up jerárquico es correcto contra el modelo de dominio
real (`parent_id`/`level`) y está aplicado consistentemente en
`entities.md`, `rules.md` y `functional-spec.md`. El diseño ya no
excluiría incorrectamente productos de subcategorías de la vertical
vehículos. READY.
