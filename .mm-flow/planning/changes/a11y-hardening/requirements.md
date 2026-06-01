# Requirements — a11y-hardening

## Problem / Purpose

El MVP está en staging con 3 problemas de accesibilidad que bloquean WCAG AA compliance:

1. **Contraste insuficiente en sidebar (dark mode):** relación actual 2.4:1 — WCAG AA exige mínimo 4.5:1 para texto normal / 3:1 para texto grande.
2. **Heading hierarchy rota en dashboard:** hay `<h3>` sin `<h2>` precedente — viola la estructura lógica de headings.
3. **Aside elements sin aria-label diferenciadores:** dos elementos `<aside>` en el DOM sin `aria-label` que los distinga entre sí.

## Stakeholders / Users

- Usuarios con baja visión o usuarios de screen reader
- Auditores de accesibilidad (legal/compliance risk)

## Scope

- Corregir los 3 issues identificados en `docs/mvp-status.md` (sección deuda técnica)
- No tocar layout ni lógica de negocio

## Out of Scope

- Auditoría completa WCAG AA (hay issues fuera de estos 3)
- Cambios de diseño más allá de los colores de contraste

## Non-negotiables

- Los tests de accesibilidad automáticos deben pasar después del fix
- No degradar contraste en light mode
- Mantener diseño visual existente (solo ajustar valores de color en dark mode)

## Objective-level Acceptance Criteria

- [ ] Sidebar dark mode: contraste ≥ 4.5:1 (texto normal) o ≥ 3:1 (texto grande)
- [ ] Dashboard: jerarquía de headings sin saltos (h1→h2→h3)
- [ ] Dos `<aside>` tienen `aria-label` únicos y descriptivos
- [ ] `pnpm test` / `uv run pytest` sin nuevas regresiones
