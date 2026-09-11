<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-11T00:00:00Z — el store existente quedó STALE (rutas cambiadas desde 260910-export-cross-org); el humano eligió focused scan sobre full rescan dado el área acotada (selector de organización para export de catálogo).
- 2026-09-11T00:00:00Z — `GET /api/v1/admin/organizations` (schema `organizations.ts`) se identificó como el endpoint correcto a reutilizar para poblar cualquier selector nuevo, no `orgApi.list()` (shape distinto, usado para CRUD).

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-11T00:00:00Z — el scan preservó aditivamente el conocimiento previo de 260910 (permisos cross-org del backend) en vez de re-derivarlo; el compare dio NARROWER esperado para esos paths, documentado como preservado íntegro en reverse-engineering-timestamp.md.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-11T00:00:00Z — bifurcación de diseño sin resolver, para Requirements/Functional Design: (a) cablear el export al `organizationStore.viewingOrgId`/`OrganizationPicker` global existente (dormido, ya testeado, ya gateado por `ORG_ADMIN_VIEW_ALL`) vs. (b) un selector local independiente acotado solo al flujo de export. Ninguna opción se descartó en este stage.
- 2026-09-11T00:00:00Z — confirmar si gatear el selector por `isAdmin` (más amplio, usado hoy por `OrganizationPicker`) o específicamente por `Permission.ORG_ADMIN_VIEW_ALL` (lo que pidió el usuario) — hoy coinciden en la práctica (`ROLE_PERMISSIONS`), pero son chequeos conceptualmente distintos.
