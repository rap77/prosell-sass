# Security Design — u2-cross-org-export-ui

Sin diseño de seguridad nuevo — `security-requirements.md` de este
mismo Unit ya estableció que U2 no tiene superficie propia: la
autorización (NFR2.4, incluyendo `all_organizations`), la resolución de
tenant y la sanitización zip-slip son responsabilidad exclusiva de
`u1-cross-org-export-api`, ya diseñadas en el `security-design.md` de
ese Unit.

## Sentinel `"ALL_ORGS"` — no-op de permiso (sin cambio de diseño)

`organizationStore.setViewingOrgId()` ya es un no-op para cualquier
valor (incluyendo el sentinel `"ALL_ORGS"`) cuando el usuario no tiene
`ORG_ADMIN_VIEW_ALL` — comportamiento existente del store, sin cambio
de diseño necesario para soportar el sentinel nuevo (`frontend-components.md`
ya lo confirma). La opción tampoco se renderiza en el picker para ese
usuario (AC2.1.1).

## Manejo de errores en la UI (sin cambio)

El único punto donde U2 "toca" seguridad es el renderizado del mensaje
de error (incluyendo el nuevo 403 de `all_organizations`) — usa directo
`detail.message` del contrato `ProductErrorResponse` vía
`extractErrorMessage()`, sin transformación ni lógica adicional. React
escapa automáticamente el contenido renderizado.

## Sesión (sin cambio)

U2 no maneja el token de sesión directamente — la cookie httpOnly viaja
automáticamente con el `fetch()`.

## Filtrado real de la grilla (FR3.1) — sin superficie de seguridad nueva

El envío de `organization_id` explícito por defecto (regla
`consumer_contract` de `contract-summary.md`, Contract 1) es una regla
de INTEGRACIÓN funcional, no de seguridad — el servidor sigue siendo la
única fuente autoritativa de autorización (`u1-cross-org-export-api`
NFR1.2/NFR2.4), independientemente de qué envíe el cliente.

## Fuente

Deriva de `security-requirements.md` (declara la ausencia de superficie
propia) y `frontend-components.md`/`contract-summary.md` (el punto
exacto donde se renderiza el error y donde se resuelve `organizationId`).
