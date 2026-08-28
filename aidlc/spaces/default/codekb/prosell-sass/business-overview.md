# Business Overview — ProSell SaaS

## Dominio de negocio

ProSell SaaS es una **plataforma de análisis de mercado de vehículos** que combina tres frentes de negocio en un mismo monorepo:

1. **Marketplace público** — e-commerce orientado al comprador final de vehículos: catálogo, fichas de producto, contacto con vendedor/dealer, citas.
2. **Analytics SaaS para concesionarios (dealers)** — inteligencia de mercado en tiempo (casi) real: qué se está vendiendo, a qué precio, qué tan rápido rota el inventario de la competencia.
3. **Scraping automatizado multi-marketplace** — Facebook Marketplace como fuente primaria, orquestado con Playwright, alimentando tanto el catálogo propio como los datos de mercado de terceros.
4. **Predicciones ML** — modelos de predicción de precio y recomendación, consumiendo los datos scrapeados + el catálogo propio.

## Funcionalidad clave

- **Gestión de inventario/catálogo**: alta, edición, publicación y ciclo de vida de estado de un producto (`Borrador → Pendiente revisión → Aprobado/Rechazado → Publicado → Vendido/Archivado`, con reversiones auditadas — ver `architecture.md` § Interaction Diagrams).
- **Cola de revisión (review queue)**: flujo de moderación donde un rol interno aprueba o rechaza publicaciones antes de que lleguen al marketplace público.
- **Leads y citas**: captura de interés de compradores y agendamiento de citas con el vendedor/dealer.
- **Multi-tenant**: cada organización (dealer) opera con su propio espacio de datos; todo agregado de dominio lleva `tenant_id`.
- **Onboarding e invitaciones**: alta de organizaciones nuevas y alta de usuarios vía invitación por token.
- **Autenticación**: JWT + OAuth2 + 2FA (TOTP), cookies httpOnly.
- **Categorización dinámica**: taxonomía de categorías con `attribute_schema` configurable por categoría (no exclusivo de vehículos — el modelo de producto es genérico, con vehículos como vertical principal).
- **Wallet / monetización**: integración con Stripe (evidenciada en dependencias backend).

## Actores / usuarios

- **Comprador (público)**: navega el marketplace, contacta vendedores, agenda citas. No requiere cuenta necesariamente.
- **Vendedor/dealer (seller)**: publica inventario, gestiona leads, ve analytics de su organización.
- **Revisor/moderador (admin interno)**: aprueba/rechaza publicaciones en la cola de revisión.
- **Super admin / plataforma**: gestiona categorías, esquemas de atributos, y operaciones sensibles (p. ej. `archive()` restringido a este rol según memoria del proyecto).

## Alcance de este pase de reverse engineering

Este es un **rescan completo** disparado por el intent `260828-fix-invalid-tailwind-spa` (bugfix de clases Tailwind inválidas). El bug en sí es puramente de presentación (CSS que compila vacío), sin impacto funcional de negocio — pero el rescan de todo el repo permitió corregir drift documental relevante para el negocio y el equipo (ver `technology-stack.md` y `code-quality-assessment.md`). El store anterior (`260827-react-doctor-cleanup`) era un pase parcial dirigido a salud de código frontend; este documento y sus hermanos lo reemplazan íntegramente.

## Fuera de alcance (según memoria del proyecto)

- Marketplace público completo / SEO — parcialmente implementado, no es el foco de MVP.
- E-commerce completo (pagos de compra directa al comprador).
- App móvil nativa.
- Pricing por IA en producción (existe integración con Anthropic SDK en dependencias, alcance exacto no verificado en este pase).
