# Business Overview — ProSell SaaS

## Dominio de negocio

ProSell SaaS es una **plataforma de análisis de mercado de vehículos** que combina tres frentes de negocio en un mismo monorepo:

1. **Marketplace público** — e-commerce orientado al comprador final de vehículos: catálogo, fichas de producto, contacto con vendedor/dealer, citas.
2. **Analytics SaaS para concesionarios (dealers)** — inteligencia de mercado en tiempo (casi) real: qué se está vendiendo, a qué precio, qué tan rápido rota el inventario de la competencia.
3. **Scraping automatizado multi-marketplace** — Facebook Marketplace como fuente primaria, orquestado con Playwright (backend, `facebook-sdk` incluido en dependencias), alimentando tanto el catálogo propio como los datos de mercado de terceros.
4. **Predicciones ML** — modelos de predicción de precio y recomendación, apoyados en el SDK de Anthropic entre las dependencias backend (alcance funcional exacto no releído en profundidad este pase).

## Funcionalidad clave

- **Gestión de inventario/catálogo**: alta, edición, publicación y ciclo de vida de estado de un producto (`Borrador → Pendiente revisión → Aprobado/Rechazado → Publicado → Vendido/Archivado`, con reversiones auditadas — ver `architecture.md` § Interaction Diagrams).
- **Cola de revisión (review queue)**: flujo de moderación donde un rol interno aprueba o rechaza publicaciones antes de que lleguen al marketplace público.
- **Leads y citas**: captura de interés de compradores y agendamiento de citas con el vendedor/dealer, con calendario (`FullCalendar` en dependencias frontend).
- **Multi-tenant**: cada organización (dealer) opera con su propio espacio de datos; todo agregado de dominio lleva `tenant_id`.
- **Onboarding e invitaciones**: alta de organizaciones nuevas y alta de usuarios vía invitación por token.
- **Autenticación**: JWT + OAuth2 + 2FA (TOTP), cookies httpOnly, con auditoría multi-nivel (`auth_middleware.py`, `rbac_middleware.py`, `rate_limit_middleware.py`).
- **Categorización dinámica**: taxonomía de categorías con `attribute_schema` configurable por categoría (no exclusivo de vehículos — el modelo de producto es genérico, con vehículos como vertical principal).
- **Wallet / monetización**: integración con Stripe (`stripe>=11.0.0` en dependencias backend).

## Actores / usuarios

- **Comprador (público)**: navega el marketplace, contacta vendedores, agenda citas. No requiere cuenta necesariamente.
- **Vendedor/dealer (seller)**: publica inventario, gestiona leads, ve analytics de su organización.
- **Revisor/moderador (admin interno)**: aprueba/rechaza publicaciones en la cola de revisión.
- **Super admin / plataforma**: gestiona categorías, esquemas de atributos, y operaciones sensibles. Nota de deuda: un chequeo de rol admin queda **sin implementar** en `marketplace_access_router.py:110` (marcado TODO), lo cual es relevante para este actor — ver `code-quality-assessment.md`.

## Alcance de este pase de reverse engineering

Este es un **rescan completo** (full rescan) del repositorio entero, disparado por el intent `260828-fix-invalid-tailwind-spa` (bugfix de clases Tailwind inválidas). El bug en sí es puramente de presentación (CSS que compila vacío), sin impacto funcional de negocio directo — pero el rescan de todo el repo permitió reconfirmar el estado real post-fix del defecto original, detectar un **residuo no cubierto por el fix anterior** (clases de paso de cuarto — `.25`/`.75` — distintas de la familia `.5` ya corregida), y actualizar el inventario de deuda documental y técnica del proyecto. El store anterior de este mismo intent (pase previo, familia `.5` sin corregir aún) queda íntegramente reemplazado por este documento y sus ocho hermanos.

## Fuera de alcance (según memoria del proyecto)

- Marketplace público completo / SEO — parcialmente implementado, no es el foco de MVP.
- E-commerce completo (pagos de compra directa al comprador).
- App móvil nativa.
- Pricing por IA en producción (existe integración con Anthropic SDK en dependencias, alcance exacto no verificado en este pase).
