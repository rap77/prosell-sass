# Personas — Catálogo Canónico de Vehículos para Facebook

## Admin de Dealership/Organización (persona primaria)

- **Rol**: administrador de una organización/dealership en la plataforma; crea, edita y publica vehículos en el catálogo.
- **Objetivos**: que sus vehículos se publiquen correctamente en Facebook Marketplace sin errores de categoría/atributo; poder ajustar detalles específicos de un producto (como su ubicación) sin depender de un default genérico de la organización.
- **Pain points**: hoy el decode de VIN puede completar valores que no calzan con lo que Facebook espera, generando publicaciones rechazadas o mal categorizadas; no tiene forma de indicar una ubicación distinta para un vehículo puntual sin cambiar la ubicación de toda la organización.
- **Contexto**: usa la plataforma vía navegador de escritorio o mobile responsive (mismos form factors que el resto de la plataforma, confirmado en Rough Mockups), reutilizando los patrones de UI ya existentes (`CategorySelectorModal`, `GenericFormFields`/`GenericProductForm`, `OrganizationPicker`).

## Platform Admin (persona secundaria)

- **Rol**: administrador de plataforma (`super_admin`), no de una organización/dealership individual. Es quien mantiene el editor de schema de categorías — verificado contra código real (`_require_platform_admin()` en `category_router.py`, y los tests `test_tenant_admin_cannot_patch_schema()`/`test_tenant_admin_cannot_clone_schema()`): el tenant admin (Admin de Dealership) tiene explícitamente bloqueado el acceso a esa pantalla.
- **Objetivos**: mantener el schema de categorías sincronizado con el catálogo de valores de Facebook sin mantenimiento manual duplicado entre dos archivos.
- **Pain points**: hoy `FACEBOOK_FIELD_KEY_MAP` y el catálogo de valores se mantienen a mano en dos lugares distintos, sin verificación cruzada.
- **Corrección aplicada (ronda 1, señalada por design)**: el draft original atribuía esta acción al Admin de Dealership — corregido tras verificación contra código real.

## Priority Ranking

El Admin de Dealership/Organización es la persona primaria (dos de las tres historias, US1.1 y US2.1). El Platform Admin es secundaria, acotada a US1.2. El equipo de ingeniería y los stakeholders de producto/negocio (identificados en Intent Capture) son interesados de este trabajo, no usuarios finales de las pantallas que cubren estas historias.

## Assumptions & Open Questions

None.
