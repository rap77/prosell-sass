# 🗺️ ROADMAP v6.0 SINCERO — ProSell SaaS

**Fecha**: 2026-10-05
**Basado en**: Auditoría de código real (no de specs ni de intención) — cada fila de la
tabla de abajo está verificada contra un archivo concreto del repo, no contra lo que un
roadmap anterior decía que "iba a pasar".
**Reemplaza**: v5.0 FINAL (2026-07-21) — no porque v5 estuviera mal pensado, sino porque
el equipo pivotó a otra prioridad sin que ningún documento lo registrara. Este documento
existe para cerrar esa brecha antes de decidir qué sigue.

---

## Por qué existe este documento

El roadmap v5.0 (21 jul 2026) planeaba 9 sprints sobre 3 pilares: Mobile-First, Facebook
Automation (multi-cuenta + video + IA), y CRM Multi-Canal (FB Messages + WhatsApp +
agente IA). Encargué una verificación línea por línea contra el código real de hoy
(05 oct 2026, commit `216f7f81`) antes de escribir esto, porque la primera vez que miré
esto asumí —sin verificar— que nada de v5 se había construido. Estaba mal. **Se construyó
bastante más de lo que un vistazo rápido sugiere, pero no lo que v5 pedía exactamente, y
en paralelo se construyó una cantidad enorme de trabajo que v5 ni v4 mencionan.**

---

## 📊 Estado real verificado — Feature por feature de v5.0

Leyenda: ✅ Hecho y verificado · 🟡 Parcial/divergente (hecho pero no como lo pedía v5)
· ❌ No existe evidencia en el código

### Sprint 0 — Mobile-First Foundation

| Feature v5.0                          | Estado | Evidencia                                                                                         |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Bottom nav mobile (reemplaza sidebar) | ✅     | `apps/web/src/components/layout/MobileNav.tsx` — thumb-zone pattern, 44px touch targets, 4 iconos |
| Admin tables horizontal scroll        | 🟡     | No verificado a fondo — hay trabajo de responsive disperso, sin auditoría formal                  |
| Camera API nativa / upload optimizado | ❌     | Sin evidencia de Camera API ni compresión client-side antes de upload                             |
| PWA (manifest.json, service worker)   | ❌     | No existe `manifest.json`, no hay `next-pwa`, no hay service worker                               |

**Lectura real**: hay intención mobile-first real (el `MobileNav` está bien pensado, cita
Fitts's Law), pero no es una PWA ni pasó por una auditoría formal. Está lejos del "100%
funcional en iPhone/Android" que pedía el Acceptance Criteria original.

### Sprint A — Facebook Automation Core + Multi-Account + Video

| Feature v5.0                        | Estado | Evidencia                                                                                                                                                                                                                            |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multi-Account Facebook              | 🟡     | **Diverge del diseño**: existe `facebook_account.py`/`facebook_account_model.py` con OAuth + token refresh real, pero ligado a `seller_user_id` (1 cuenta por VENDEDOR), no "admin ProSell publica, unlimited por org" como pedía v5 |
| Task Queue (Redis + Taskiq)         | ✅     | `infrastructure/tasks/broker.py` + servicio `worker` real en `docker-compose.prod.yml` (`python -m prosell.infrastructure.tasks.worker`)                                                                                             |
| Rate Limiting + Circuit Breaker     | ✅     | `infrastructure/api/middleware/rate_limit_middleware.py` + `tests/unit/infrastructure/tasks/test_circuit_breaker.py`                                                                                                                 |
| Image + Video Optimization Pipeline | 🟡     | Imágenes sí (`image_pipeline.py`, compresión/resize real); **video no existe** — cero referencias a ffmpeg o transcode en todo el repo                                                                                               |
| Manual Publish UI v2 (video, bulk)  | ❌     | Sin upload de video; bulk publish no verificado como feature propia                                                                                                                                                                  |

### Sprint B — Facebook Automation Intelligence

| Feature v5.0                           | Estado | Evidencia                                                                                                                                               |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI Title Generation (OpenAI)           | ❌     | Cero referencias a `openai`/`gpt-` en todo `apps/api` — ni siquiera un cliente configurado                                                              |
| Auto-Republish Scheduler               | ✅     | `application/use_cases/publisher/auto_republish.py` + `infrastructure/tasks/use_cases/auto_republish_task.py`, corriendo vía el `worker` de producción  |
| Bulk Actions v2 (pause/delete/precios) | 🟡     | Lo que existe es otra cosa: `BatchSubmitRequest`/`BatchApproveRequest`/`BatchRejectRequest` — flujo de aprobación en lote, no edición operativa en lote |
| Error Handling + Alertas Slack/email   | ❌     | Sin evidencia de integración Slack/email de alertas                                                                                                     |

### Sprint C — Production-Ready + FB Lead Ads

| Feature v5.0                  | Estado | Evidencia                                                                                                                                                                                   |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monitoring (Sentry APM)       | ❌     | `sentry_dsn` existe como campo de config (`core/config.py:522`) pero **nunca se llama `sentry_sdk.init()`** — es un placeholder, no monitoring real                                         |
| Performance Optimization      | 🟡     | No auditado a fondo en esta pasada                                                                                                                                                          |
| Facebook Lead Ads Integration | ✅     | `infrastructure/tasks/use_cases/poll_facebook_leads_task.py` — polling real, dedup, retry con backoff, métricas (rate_limit_hits, transient_errors, etc.), corriendo cada 10 min vía worker |

### Sprint i18n — Multi-idioma Completo

| Feature v5.0                     | Estado | Evidencia                                                                                                                                                                                         |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 100% strings EN/ES, 0 hardcoding | 🟡     | `apps/web/messages/{en,es}.json` existen pero son chicos (235 líneas cada uno) — lejos de cubrir auth + admin + seller + CRM + public + backend errors + emails como pedía el Acceptance Criteria |

### Sprint D — CRM Básico + Multi-Canal Fase 1

| Feature v5.0                                | Estado | Evidencia                                                                                                                                                                                       |
| ------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kanban drag-and-drop                        | ✅     | `apps/web/src/app/(seller)/pipeline/` con `@dnd-kit/core` real (SSR deshabilitado por un issue de symlink conocido) — y esto es **anterior** a v5: ya estaba cerrado en Milestone C, 2026-05-21 |
| Timeline de actividades                     | ❌     | Sin entidad `LeadActivity`/timeline — cero evidencia                                                                                                                                            |
| Facebook Marketplace Messages webhook       | ✅     | `application/use_cases/facebook_webhook_use_case.py` + `fb_sync_router.py` + `infrastructure/webhook/facebook_webhook_processor.py`                                                             |
| WhatsApp Playwright scraping (MVP temporal) | ❌     | Cero evidencia de scraping ni de sesión WhatsApp Web guardada                                                                                                                                   |
| Unified Inbox                               | ❌     | No existe                                                                                                                                                                                       |

### Sprint E — CRM Intermedio + Multi-Canal Fase 2

| Feature v5.0                                                                  | Estado | Evidencia                                                                                                                                                     |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp Share Button                                                         | ✅     | `wa.me` real en `AvailabilityActions.tsx`, `ProductPublicView.tsx`, `ShareMenu.tsx` — pero es un botón de compartir, no el canal CRM completo que v5 planeaba |
| Lead Auto-Assignment UI                                                       | 🟡     | El motor (round-robin, workload balancing) ya existía antes de v5; la UI de configuración no se verificó                                                      |
| Task Management / Notes                                                       | ❌     | Sin evidencia de ninguno de los dos                                                                                                                           |
| WhatsApp Business API / Reply directo / Message threading / Channel analytics | ❌     | Ninguno existe — no hay nada que migrar porque el scraping (Sprint D) nunca se construyó                                                                      |

### Sprint F (Workflows), G (AI Agent), H (Wallet)

| Feature v5.0            | Estado | Evidencia                                                                                                                                                                                                                                                                               |
| ----------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow Engine         | ❌     | Cero evidencia — y v5 lo marcaba explícitamente "solo si dealers lo piden", sin evidencia de que lo hayan pedido tampoco                                                                                                                                                                |
| AI Agent Auto-Responder | ❌     | Cero evidencia de OpenAI Assistant API / RAG / vector DB — marcado "POST-MVP" en v5, consistente con no haberlo tocado                                                                                                                                                                  |
| Wallet + Monetización   | 🟡     | `domain/entities/wallet.py` (balance_cents, currency) + `wallet_router.py` + `WalletCard.tsx` en frontend existen de verdad, pero **Stripe no está integrado** — el único rastro es un comentario ("Normally called after successful Stripe payment"), sin SDK de Stripe en ningún lado |

---

## 🔧 Lo que se construyó y NO está en ningún roadmap (v4 ni v5)

Esto es el grueso real del trabajo de las últimas 6-8 semanas, y es trabajo serio — solo
que nadie lo escribió como plan antes de hacerlo:

1. **Catálogo canónico de vehículos** — reconciliación NHTSA ↔ Facebook Marketplace,
   decode de VIN con fallback, catálogo de valores compartido frontend/backend
   (intent `260915-vehicle-catalog`).
2. **Bulk upload CSV para vehículos** — parser dedicado, preview pre-import, mapeo de
   imágenes por ZIP, resolución de organización por código, con una batería grande de
   fixes de integridad (VIN cruzado entre orgs, filas rotas que se importaban como
   producto de $0, numeración de fila, mapeo de imágenes multi-org) cerrados recién ayer.
3. **Export/import cross-organización para super-admin** — `ORG_ADMIN_VIEW_ALL`, filtro
   multi-org, export client-format CSV+ZIP.
4. **Product Approval & Marketplace Queue** (`docs/plans/product-approval-and-marketplace-queue-plan.md`,
   sin `Status` formal pero implementado): `BatchSubmitRequest`/`BatchApproveRequest`/
   `BatchRejectRequest` — flujo de revisión de inventario antes de publicar.
5. **Inventory Availability + FB unpublish + WhatsApp sold** (`docs/plans/inventory-availability-facebook-whatsapp-plan.md`,
   mismo caso): `fb_unpublish_requests`, estados reserved/paused/sold/archived,
   botón de WhatsApp para avisar venta.
6. **Category Schema Editor mejorado** (`docs/plans/category-schema-editor-improvements.md`,
   marcado IMPLEMENTED) — gestión de campos/grupos dinámicos por categoría.
7. **CDN + performance de imágenes** — thumbnail privado, purga de CDN con compensación,
   firma contra origin + swap de host (3 bugs reales de producción resueltos la noche
   del 24/9).
8. **Multi-cuenta Facebook real** (ver arriba) — construido, pero como feature
   per-vendedor, no como lo planeaba v5.

Ninguno de estos 8 bloques aparece en v4 ni en v5. Son, en conjunto, más trabajo que
todo lo que SÍ estaba planeado y se hizo.

---

## 🧭 El patrón real: lo que pasó no fue "no se hizo nada del roadmap"

Fue un **pivot silencioso** de "features de cara al comprador/vendedor" (CRM multi-canal,
mobile-first, FB con video) hacia **"calidad e integridad de datos del catálogo +
herramientas operativas de admin"** (bulk import, reconciliación de catálogos, export
cross-org, revisión de inventario). Las dos cosas tienen valor real, pero son visiones
de producto distintas, y ahora hay una decisión pendiente que nadie tomó explícitamente:
**¿seguimos por el camino de catálogo/operaciones, o retomamos CRM multi-canal/mobile?**

---

## ⚠️ Gaps críticos reales que siguen abiertos (no negociables, tengan o no roadmap)

Estos son los que importan independientemente de qué dirección se elija:

1. **Sentry nunca se inicializó** — hay un campo de config muerto. Cero observability
   de errores en producción hoy. Esto es gratis de arreglar y debería ser lo primero,
   sea cual sea la decisión de producto.
2. **Mobile sigue sin ser una PWA real** — el bottom nav está bien hecho, pero no hay
   instalación a home screen ni funcionamiento offline.
3. **i18n sigue en estado embrionario** (235 líneas) — si LATAM es mercado real, esto
   bloquea esa expansión tal como está.
4. **Wallet existe sin Stripe** — no se puede monetizar con lo que hay hoy, solo
   trackear balance manualmente.
5. **Multi-cuenta FB es per-vendedor, no por-org como se diseñó** — si el plan de negocio
   asume "admin ProSell publica por todos", hay que decidir si corregir el modelo o
   aceptar el que existe.

---

## 🎯 Próximo paso

Este documento es diagnóstico, no decide la estrategia — esa parte es tuya. Dos
preguntas abiertas antes de que esto se convierta en un roadmap ejecutable:

1. ¿El pivot a catálogo/operaciones fue una decisión consciente que querés formalizar
   como la estrategia real (y entonces v5 se archiva como "superseded"), o querés
   retomar CRM multi-canal/mobile-first y tratar lo de catálogo como trabajo de
   mantenimiento paralelo?
2. De los 5 gaps críticos de arriba, ¿cuáles priorizamos primero independientemente de
   esa decisión (Sentry es candidato obvio por ser gratis y crítico)?

---

## ✅ Decisión post-diagnóstico (2026-10-05)

Los 5 gaps críticos de arriba **quedan explícitamente pospuestos** — decisión del
usuario, no una recomendación mía. El foco inmediato pasa a una línea de trabajo que
no estaba en v5 ni en este diagnóstico: **diseñar e implementar bien RBAC, perfiles de
seguridad, visibilidad de datos y control de acceso a recursos** (multi-tenant, ya con
una base real — `RoleType`/`Permission`/matriz en `role.py`, `ORG_ADMIN_VIEW_ALL` — pero
sin que nadie haya hecho una pasada de diseño formal sobre el modelo completo). Se
retoma este documento cuando los 5 gaps vuelvan a la mesa.

---

**Metodología de verificación**: cada fila ✅/🟡/❌ de este documento fue confirmada con
`rg`/`fd` contra el código real en `apps/api/src` y `apps/web/src`, commit `216f7f81`
(2026-10-05) — no contra specs, planes ni mensajes de commit. Donde la evidencia fue
parcial o no se auditó a fondo, está marcado explícitamente como tal en vez de asumido.
