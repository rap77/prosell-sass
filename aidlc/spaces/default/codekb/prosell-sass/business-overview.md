# Business Overview — prosell-sass

## Propósito del negocio

ProSell SaaS es una **plataforma de análisis de mercado de vehículos** que combina tres funciones de negocio en un mismo monorepo:

1. **Marketplace público** — un e-commerce orientado a compradores de vehículos, con páginas de producto públicas y navegables sin autenticación (`apps/web/src/app/p/[slug]/`).
2. **SaaS de analítica para concesionarias (dealers)** — inteligencia de mercado en tiempo real para organizaciones vendedoras, con paneles de administración y catálogo operativo (`apps/web/src/app/(admin)/`, `apps/web/src/app/(seller)/`).
3. **Scraping automatizado multi-marketplace** — con Facebook Marketplace como fuente primaria, para publicar y sincronizar inventario (`fb_router`, `fb_account_router`, `fb_sync_router`, `facebook_router`).

Un cuarto pilar (predicciones ML de precio y recomendaciones) está descrito en la documentación del producto pero no se encontró evidencia de un motor de ML activo en el código analizado en este pase — se lista como capacidad declarada, no confirmada.

## Modelo de negocio observado

- **Multi-tenant**: toda entidad de negocio de nivel superior lleva `tenant_id` (regla confirmada tanto en `CLAUDE.md` como en el patrón repetido de los agregados backend).
- **Organizaciones (dealers)** publican y gestionan su propio catálogo de vehículos (y potencialmente otras categorías — ver `carros-y-camionetas`, `bienes-raíces`, `artículos` como verticales raíz según memoria de sesiones previas).
- **Cola de revisión (review queue)**: los productos publicados por un vendedor pasan por un flujo de aprobación/rechazo antes de quedar visibles en el catálogo público, con trazabilidad completa vía `ProductAuditLog` (tabla `product_audit_log`, migración `20260818_0001`).
- **Contacto de organización**: cada organización puede registrar contactos nombrados (incluyendo WhatsApp) a través de `ContactManager.tsx`/`OrganizationContact`, pensados para que el comprador final pueda contactar al vendedor — aunque, como se detalla en `architecture.md`, ese contacto aún no llega a la página pública de producto.

## Alcance de este pase de reverse engineering (actualizado — intent `260827-react-doctor-cleanup`)

Este pase fue disparado por un intent de **refactor de salud de código frontend** (scope `refactor`, intent `260827-react-doctor-cleanup`), no por exploración de dominio de negocio ni por bugfixing. El disparador es la herramienta `react-doctor` (análisis estático de React), instalada esta sesión como devDependency + hook de pre-commit + workflow de CI en `apps/web`, que reportó un score de **53/100** con **371 diagnósticos** (9 errores, 362 warnings) tras un primer batch de 7 archivos ya corregidos y verificados (sin commitear). Este pase de RE no toca reglas de negocio ni flujos de usuario — su lectura profunda se concentra en la configuración de tooling (`package.json`, `eslint.config.js`, `next.config.ts`, `vitest.config.ts`, `pyproject.toml`, workflows de CI) y en evidencia de grep en vivo sobre los patrones de diagnóstico del intent (bailouts del React Compiler, APIs deprecadas de Zod v3→v4, tamaño de componentes, imports dinámicos). El resto de este documento (actores, riesgos de negocio, alcance previo) describe el estado del dominio tal como lo dejó el pase anterior (`260826-prod-bugfixes-batch`) — no revalidado en este pase porque está fuera de su alcance. Ver `## Scope of Analysis` en `reverse-engineering-timestamp.md` para el detalle exacto.

### Alcance del pase anterior (`260826-prod-bugfixes-batch`, preservado como contexto de dominio)

Ese pase fue disparado por un intent de **bugfixes de producción** (scope `express`), no por una exploración exhaustiva del dominio. El foco de la lectura profunda fueron las áreas de código detrás de 7 bugs reportados y 1 feature pequeña:

1. Cola de revisión — imágenes no se muestran en los registros
2. Lista de publicaciones (catálogo) — falta thumbnail
3. Schema de categorías — selects (Type/Group) no retienen el valor seleccionado
4. Compartir contacto de organización por WhatsApp — debe ocultar el teléfono y mostrar solo la dirección
5. Capitalización (Title Case) en formulario de vehículos, incluso con datos crudos del VIN decoder
6. Campos select (Bed Type, Body Type, Drivetrain, Cab Type, Wheelbase Type) se renderizan como inputs de texto
7. Mezcla de idiomas español/inglés en formularios de vehículos
8. FEAT-1: exportación de catálogo a CSV, espejando los campos del importador actual

Por eso este documento y el resto de la base de conocimiento (`codekb/`) describen el negocio con mayor profundidad en las áreas de **catálogo, categorías dinámicas, formularios de vehículo, decodificación VIN, contacto público e i18n**, y con menor profundidad (a nivel de directorio, no de archivo) en áreas no tocadas por estos bugs — CRM de leads, citas, wallet/Stripe, autenticación 2FA, scraping de Facebook. Ver `## Scope of Analysis` en `reverse-engineering-timestamp.md` para el detalle exacto de qué se leyó a fondo.

## Actores de negocio identificados

- **Comprador (buyer)** — navega el marketplace público (`/p/[slug]`), sin autenticación, potencialmente contacta al vendedor.
- **Vendedor (seller)** — crea y gestiona productos desde su catálogo (`(seller)/catalog`), usa el decodificador VIN al crear vehículos, se somete a la cola de revisión.
- **Administrador de organización (org admin)** — gestiona contactos de la organización (`ContactManager`), schema de categorías si tiene rol `platform`.
- **Revisor/Admin de plataforma** — opera la cola de revisión (`(admin)/admin/review-queue`), aprueba/rechaza/revierte transiciones de estado de producto.

## Riesgos de negocio detectados durante el scan

- **BUG-4 (WhatsApp) es un vacío funcional de punta a punta, no solo un bug de UI**: el endpoint público de producto nunca hace join con los contactos de la organización, así que aunque se arregle el botón, no hay dato que mostrar sin también tocar el backend. Ver `architecture.md` § Interaction Diagrams.
- **Mezcla de idiomas (BUG-7) es sistémica**: `docs/AUDIT-UI-UX-I18N-2026-07-21.md` (fechado 2026-07-21, ya en el repo) documenta que solo 2 de +125 archivos usan `next-intl` — el resto del panel admin/seller/CRM tiene strings hardcodeados en español e inglés mezclados. El bug puntual de vehículos reportado en el intent es un síntoma visible de esa deuda mayor, no un caso aislado.
