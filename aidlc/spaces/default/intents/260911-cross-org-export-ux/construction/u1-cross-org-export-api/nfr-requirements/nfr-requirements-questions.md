# NFR Requirements — Preguntas (u1-cross-org-export-api)

Las 5 categorías de NFR de esta etapa derivan, sin ambigüedad genuina,
de decisiones ya tomadas en `requirements.md` (NFR1-NFR4), `rules.md`
(BR2.1, BR2.3, BR2.4, BR2.5, BR2.8, BR1.7), `contract-summary.md`
(códigos de error, límites) y del precedente ya construido en el
intent hermano `260903-catalog-client-export` (mismo endpoint, mismo
Unit kind `service`, targets de performance/confiabilidad/observabilidad
ya establecidos para el caso de una sola organización). A diferencia de
ese intent — donde el número exacto del cap de recursos (NFR3.1) era la
única pregunta genuina — acá el cap (500, ahora aplicado GLOBALMENTE)
ya está fijado por FR4.3/BR2.4, así que no queda ningún número por
decidir.

**Cero preguntas bloqueantes para el humano en esta pasada.** Tres
decisiones de bajo riesgo, que no contradicen nada ya afirmado y evitan
sobre-ingeniería, se resuelven directo (documentadas en `memory.md` como
Interpretations/Tradeoffs, no como preguntas):

1. **Cache de resolución de vertical por request** — el walk-up de
   categoría (BR1.3) se cachea en un dict `{category_id: vertical_id}`
   dentro del alcance de una sola request de export, para no repetir el
   mismo walk-up cuando varios productos comparten el mismo `category_id`
   hoja o el mismo vertical — mismo espíritu que el patrón de batch ya
   afirmado para `org_code` (BR2.3), sin necesidad de pedir permiso: es
   una optimización interna sin efecto observable en el contrato ni en
   el comportamiento funcional.
2. **`CategoryTranslationEntry` como diccionario estático en código**
   (no tabla de base de datos nueva) — `entities.md` ya la describe
   como "configuración estática... sin interfaz de administración",
   consistente con la Assumption de `requirements.md` ("estructura
   simple, sin interfaz de admin nueva"). No introduce migración ni
   repositorio nuevo.
3. **Nivel de log para el evento `scope=ALL_ORGS`** — se usa `logger.info()`
   estructurado (mismo mecanismo ya afirmado en `project.md` para
   auditoría liviana cross-org), no un nivel `warning` ni una alerta
   nueva — consistente con la decisión ya tomada en Practices Discovery
   de NO agregar infraestructura de alerta nueva para este intent
   (`team.md` § Deployment).

## Consolidated Summary Confirmation

- **Performance**: se extienden los targets ya establecidos en el
  intent `260903-catalog-client-export` (NFR-PERF-1/2/3, sin `NFR{n}`
  de origen en `requirements.md`) al modo "todas las organizaciones" —
  el cap de volumen (500) es el mismo orden de magnitud (antes por-org,
  ahora global), y el walk-up de categoría cacheado (decisión 1 arriba)
  no agrega overhead material frente al tiempo dominante de I/O de
  imágenes.
- **Seguridad**: NFR1.1/NFR1.2/NFR2.1/NFR2.2/NFR2.3 (ya establecidas en 260903) se mantienen sin cambio de mecanismo. Se agregan NFR de esta
  etapa formalizando BR2.1 (autorización `ORG_ADMIN_VIEW_ALL` para
  `all_organizations=true`, mismo mecanismo, ya decidido — NFR2 de
  `requirements.md`) y BR2.5 (auditoría `scope=ALL_ORGS`, ya decidido —
  NFR1 de `requirements.md`), documentando explícitamente el mayor
  radio de explosión (un solo fallo del control ya existente ahora
  expone el catálogo completo de la plataforma, no solo una
  organización) sin agregar un mecanismo de autorización nuevo — ya
  señalado como guía de implementación en `team.md`.
- **Escalabilidad**: NFR3.1 (500 productos) pasa de límite por-org a
  límite GLOBAL (BR2.4/FR4.3) — mismo número, mismo comportamiento de
  rechazo (413), sin cambio de arquitectura ni paginación nueva.
- **Confiabilidad**: NFR-REL-1/NFR-REL-2 (degradación graceful ante
  fallo de lectura de imagen individual o del storage completo) se
  mantienen sin cambio — el riesgo de memoria por request más grande en
  modo "todas" es un riesgo residual ya aceptado explícitamente en
  `requirements.md` NFR3, sin mitigación nueva en este intent.
- **Observabilidad**: se agrega el evento distinguible `scope=ALL_ORGS`
  (BR2.5/FR6.1) a la tabla de logging ya establecida en 260903, más el
  conteo de organizaciones exportadas como campo del log (consistente
  con el texto de advertencia de UI de FR5.1, que ya muestra "N
  organizaciones").
- **Tech stack**: sin dependencias nuevas (confirmado en
  `technology-stack.md`, scan enfocado de este intent) —
  `CategoryTranslationEntry` es un diccionario estático en código
  (decisión 2 arriba), no una tabla nueva.

¿Está todo correcto antes de generar los artefactos de NFR Requirements
para u1-cross-org-export-api?

A. Looks correct
B. Request changes

[Answer]: Looks correct
