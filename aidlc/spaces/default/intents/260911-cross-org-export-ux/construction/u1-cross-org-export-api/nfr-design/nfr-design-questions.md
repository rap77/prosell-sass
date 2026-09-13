# NFR Design Questions — u1-cross-org-export-api

Las dos decisiones de diseño genuinas de este endpoint (concurrencia de
lectura de imágenes, política de retry) ya fueron resueltas y aprobadas
en el intent hermano `260903-catalog-client-export` (mismo endpoint,
mismo Unit kind `service`) — el volumen techo (500 productos) NO cambia
en este intent (BR2.4 lo mantiene, solo pasa de por-org a global), así
que no hay motivo para reabrir esas dos preguntas: se reutilizan sin
cambio.

**Cero preguntas bloqueantes.** Las decisiones NUEVAS que introduce este
intent son de bajo riesgo, sin trade-off genuino que amerite una
decisión del humano, y se resuelven directo (documentadas en
`memory.md`):

1. **Cache de vertical de categoría** — memoización lazy dentro del
   loop (dict `{category_id_hoja: vertical_id}`, poblado la primera vez
   que se ve cada `category_id` hoja) en vez de un batch upfront de IDs
   distintos — más simple que el patrón de `org_code` (que sí batchea
   upfront porque `organization_id` ya viene resuelto de cada producto
   sin necesitar un walk-up), y con el mismo efecto práctico (sin
   walk-up repetido para productos que comparten `category_id`).
2. **Query de cap global vs. por-org** — un único método de conteo con
   `organization_id: UUID | None` (None = sin filtro de tenant, cuenta
   la plataforma completa) en vez de dos métodos separados — evita
   duplicar la query por dos variantes casi idénticas.
3. **Resolución batch de `org_code`** — sigue exactamente el patrón ya
   afirmado (`_resolve_org_codes()` de `bulk_upload_vehicles.py`,
   documentado como precedente de implementación en `team.md`): una
   sola query `WHERE id IN (...)` sobre el conjunto de `organization_id`
   distintos del lote de productos, ANTES del loop por fila.

## Consolidated Summary Confirmation

- **Performance**: semáforo de concurrencia (máx. 20 lecturas
  simultáneas) y presupuesto por fase, sin cambio respecto a `260903` —
  el techo de volumen (500) es el mismo. Se agrega un presupuesto
  explícito para el walk-up de categoría cacheado (atendiendo la
  observación Minor del reviewer de NFR Requirements) y para la
  resolución batch de `org_code`.
- **Security**: reuso del middleware de auth ya vigente + extensión de
  `_check_org_scope_permission()` para aceptar el flag `all_organizations`
  (mismo mecanismo, nuevo parámetro) — sin diseño de autenticación
  nuevo. Zip-slip (`_slug_part()`) sin cambio.
- **Scalability**: un único método de conteo parametrizado por
  `organization_id` opcional, en vez de dos variantes separadas.
- **Reliability**: retry 1×200ms para lectura de imagen, sin circuit
  breaker — sin cambio respecto a `260903`.
- **Observability**: logging estructurado extendido con el evento
  `catalog_export.completed_all_orgs` (campo `scope=ALL_ORGS`) y una
  métrica de conteo de organizaciones exportadas.
- **Logical components**: se agregan 2 componentes nuevos al inventario
  (dict estático `CategoryTranslationEntry`, helper de resolución batch
  de `org_code`) sin componente desplegable nuevo — mismo blast radius
  acotado a la request individual.

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
