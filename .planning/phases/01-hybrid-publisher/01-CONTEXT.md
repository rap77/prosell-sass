# Phase 1: Hybrid Publisher - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Sistema backend + frontend mínimo que permite a vendedores ProSell publicar, actualizar, eliminar y re-publicar automáticamente vehículos en Facebook Marketplace. Playwright es el motor primario (inmediato). Graph API es el motor secundario (post-aprobación de Facebook App Review). Los posts expiran a los 7 días → auto-republish es P0. El catálogo público es Phase B (fuera de scope aquí).

Requirements en scope: PUBLISH-01, PUBLISH-02, PUBLISH-03, PUBLISH-04, PUBLISH-05, PUBLISH-06, PUBLISH-07, PUBLISH-09, PUBLISH-10.

</domain>

<decisions>
## Implementation Decisions

### Trigger de publicación
- Acceso desde el catálogo (no desde el detalle del vehículo) — modal se superpone sin perder la posición en la lista
- Flujo: "Preparar Publicación" → modal → review + edición → Submit → modal cierra → fila muestra "Pending/Publishing"
- Si ya existe un listing activo: botón cambia a "Actualizar" — modal muestra diff (precio actual en FB vs nuevo precio en ProSell)
- Modal de "Actualizar" incluye botón secundario "Eliminar/Finalizar" para marcar como vendido desde el mismo lugar

### Campos del modal de publicación
- **Título**: pre-llenado (año/marca/modelo), editable
- **Descripción**: pre-llenada con info del vehículo, editable (vendedor puede agregar ganchos manuales)
- **Precio**: editable, con delta de mercado visible si hay datos de CarGurus (BAJO/EN RANGO/ALTO) — puede estar vacío en Phase 1 si los datos de scraping aún no existen
- **Facebook Page selector**: dropdown de las páginas conectadas del vendedor (CATALOG-06: vendedor publica con su propia cuenta, no la del dealer)
- **Hero Shot**: selector de imagen de portada — click para marcar como primera, se mueve a índice 0 con badge "PORTADA"
- **ZIP Code**: pre-llenado desde el dealer del vehículo, editable — determina dónde muestra el post el algoritmo de Marketplace
- **Galería**: imágenes del scraper + opción de upload manual adicional

### Validación antes de Submit
- Frontend (Zod): precio > 0, al menos una foto, Facebook Page seleccionada
- Errores de validación se muestran inline en el modal — nunca llegan al motor de Playwright

### Manejo de errores — 3 categorías
- **Categoría A (Transient — red/timeout)**: retry automático con exponential backoff (1 min → 5 min → 15 min). Si falla 3 veces → estado "Atención Requerida" en catálogo
- **Categoría B (Bloqueante — captcha/ban)**: pausa inmediata de la cola de ese vendedor. Badge rojo + mensaje "Facebook solicita validación de seguridad. Abrí tu cuenta en un navegador para resolver el desafío". Retry deshabilitado hasta que el vendedor confirme "Ya validé mi cuenta de Facebook"
- **Categoría C (Validación)**: bloqueado en frontend por Zod antes de enviarse. Nunca ejecuta Playwright

### Errores — visibilidad
- Badge de advertencia (color amarillo/rojo) en la fila del catálogo
- Detalle del error (tipo + mensaje + timestamp) en el modal al reabrir el vehículo
- Widget "Pending Actions" en el dashboard del vendedor: "Tenés N publicaciones con errores" → clic filtra el catálogo a solo los que necesitan atención
- Dashboard Admin: vista global de fallos cross-vendedor — permite detectar patrones (ej: todos los autos de un dealer fallando = ban de cuenta o cambio de UI en Marketplace)

### Errores — recuperación contextual
- Error de Categoría A agotado → botón "Reintentar" disponible + log simplificado
- Error de Categoría B → reintento bloqueado hasta checkbox de confirmación "Ya validé"
- Error de Categoría C → botón "Corregir y Reintentar" abre modal directo al campo que falló

### Selector de estrategia (Playwright vs Graph API)
- Feature flag `PUBLISHER_ENGINE=playwright|graph_api|auto` en settings/config
- En `auto`: Playwright es primario (Phase 1, Graph API sin aprobación); Graph API será primario cuando esté aprobado
- Estrategia completamente transparente para el vendedor — no necesita elegir
- Log de cada publicación guarda: estrategia usada (`playwright` / `graph_api`) + versión del motor (ej: `playwright_v1.42`) para correlacionar fallos con actualizaciones
- Dashboard Admin muestra la estrategia por registro (útil para detectar degradación de un motor específico)
- Toggle en panel Admin (sin redeploy): interruptor maestro "Modo de publicación: Playwright / Graph API / Auto" — permite responder a crisis en producción sin SSH

### Manejo de imágenes
- Fuente: imágenes del scraper del dealer (pre-cargadas) + upload manual adicional desde el modal (híbrido)
- Hero shot: click en cualquier foto la mueve a posición #1 con badge "PORTADA" — array index 0 es lo que Playwright sube primero
- Pipeline de procesamiento en backend antes de subir a Facebook:
  - Compresión a < 1MB (evitar timeouts de Playwright con fotos de alta resolución)
  - Resize a dimensiones estándar de Marketplace (1080px, ratio consistente)
  - Conversión a JPG (normalizar desde .webp, .png, .avif)
  - Strip de metadata EXIF (privacidad + evitar que FB detecte contenido duplicado de otros sitios)

### Auto-republish (PUBLISH-06)
- Proceso completamente automático en background (scheduler Taskiq)
- Claude's Discretion: diseño del scheduler y frecuencia de checks de expiración

### Claude's Discretion
- Diseño del scheduler de auto-republish (frecuencia, lógica de detección de expiración, manejo de listing expirado vs. próximo a expirar)
- Implementación del exponential backoff en Taskiq (timing exacto)
- Estructura interna del Publication entity state machine
- Diseño de endpoints REST para el flujo publish/update/delete
- Selección del adaptador de Graph API client

</decisions>

<specifics>
## Specific Ideas

- "El vendedor necesita una herramienta de alta cadencia — acceder desde el catálogo permite gestión ágil del inventario recién scrapeado, publicación en serie sin perder el contexto de la lista"
- "El retry no debe ser genérico — si es Categoría B (captcha/ban), el botón de reintento debe estar bloqueado hasta que el vendedor marque que ya validó su cuenta"
- "El toggle admin es el interruptor de emergencia: si Facebook cambia su UI a las 3PM y rompe Playwright, el admin puede cambiar el motor desde el celular en 5 segundos sin redeploy"
- "Los vendedores usan tablets/celulares en el patio del dealer — la selección del Hero Shot es click simple, no drag & drop (mobile-first decision)"
- Hero shot badge: "PORTADA" visible sobre la miniatura de la imagen seleccionada como primera

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FacebookAccount` + `FacebookPage` entities: ya implementadas con token encryption AES-256. El publisher usará `FacebookPage.access_token` (desencriptado) para autenticar las llamadas — integración directa
- `Taskiq + Redis broker`: infraestructura de task queue lista. Los jobs de publicación, auto-republish y retry van aquí
- `DoSpacesService` (`ido_spaces.py`): ya implementado para upload de archivos a DigitalOcean Spaces. Pipeline de imágenes puede usar este adaptador
- `TokenEncryptionService`: ya implementado (AES-256), reutilizable para cualquier token adicional
- `Product` entity: ya tiene campos de vehículo (VIN, year, make, model, mileage, condition, price) — base para pre-llenar el modal
- Circuit breaker pattern: ya implementado en health checks (OPEN/CLOSED/HALF_OPEN) — puede aplicarse al Graph API client

### Established Patterns
- Clean Architecture: Domain → Application → Infrastructure. Publication entity va en `domain/entities/`, use cases en `application/use_cases/publisher/`, Playwright adapter en `infrastructure/services/`
- Use case pattern: una clase, un `execute()` method. `PublishVehicleUseCase`, `UpdateListingUseCase`, `DeleteListingUseCase`, `AutoRepublishUseCase`
- DI container: `infrastructure/api/dependencies.py` centraliza los factories. Nuevos servicios se registran aquí
- SQLAlchemy 2.0 async: `Mapped[]`, `mapped_column()`, `select()` — todos los modelos siguen este patrón
- Taskiq tasks: `@broker.task` decorator en `infrastructure/tasks/`. Tareas de Facebook ya documentadas en `refresh_facebook_tokens.py`

### Integration Points
- `facebook_router.py`: ya existe para OAuth. El publisher añade nuevos endpoints en este router o en uno nuevo `publisher_router.py`
- `dependencies.py`: registrar `PlaywrightPublisherService`, `GraphAPIPublisherService`, `PublishStrategySelector`
- `tasks/broker.py`: registrar tasks de `publish_vehicle`, `auto_republish`, `retry_failed_publication`
- `product_router.py`: posiblemente añadir endpoint `POST /products/{id}/publish` que dispara el flow

</code_context>

<deferred>
## Deferred Ideas

- Drag & drop para reordenar todas las fotos (no solo elegir la principal) — UX enhancement para Phase 2+
- Estrategia configurable por Facebook Page individual (diferentes engines para diferentes dealers) — post-MVP
- Notificación en tiempo real (toast/push) cuando una publicación completa o falla en background — requiere WebSockets, fuera de Phase 1
- Precio sugerido por IA antes de publicar (requiere datos CarGurus de Phase 3) — PUBLISH-08 ya deferred a Phase 7
- "Watermark" de ProSell en imágenes para branding — idea del procesamiento de imágenes, no prioritario

</deferred>

---

*Phase: 01-hybrid-publisher*
*Context gathered: 2026-03-15*
