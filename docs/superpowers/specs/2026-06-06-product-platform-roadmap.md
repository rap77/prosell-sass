# Roadmap: Generalize Catalog → Category-Driven Multi-Vertical Product Platform

**Date:** 2026-06-06
**Status:** Roadmap / index. Each subsystem gets its OWN design spec → plan → implementation cycle when we reach it. This document only captures the decomposition, dependencies, and order so the plan survives across sessions.

## Goal

Turn the vehicle-specific catalog into a platform where each **vertical/niche** (Vehicles, Real Estate, Retail…) declares its own fields, title, subtitle, and filters — without re-coding the frontend per niche. A business owner (dealer) can operate in multiple verticals from a single account.

## Locked cross-cutting decisions (from brainstorming, 2026-06-06)

- **Vertical = root `Category` (`level 0`)** — reuse the existing category tree, no new entity.
- **Global platform templates** (`Category.tenant_id = NULL`) — defined once by ProSell.
- **`organization_vertical` M2M** — one account, multiple niches; no account-per-niche.
- **Presentation contract on category metadata** (title/subtitle template strings with `{field}` placeholders, card fields, per-field `filterable`).
- **Title stored** on `Product.title`, recomposed on save.

## Subsystems & dependency order

| #     | Subsystem                                         | Scope (one line)                                                                                                                                                                                                                | Depends on | Status                                                                     |
| ----- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| **0** | **Foundation — Category presentation model**      | Data model: verticals-as-root-categories, global templates, `organization_vertical` M2M, presentation contract + filterable metadata, title/subtitle composition service, read-API `GET /organizations/{id}/verticals`.         | —          | **Spec written** → `2026-06-06-category-presentation-foundation-design.md` |
| **A** | **Presentation (frontend)**                       | Generic `ProductCard` + catalog rendering composed from the presentation contract; retire vehicle-baked title/subtitle/card.                                                                                                    | 0          | Not started                                                                |
| **B** | **Dynamic filters**                               | Catalog filter UI driven by each category's `filterable` fields + `filter_type` (range/select/text/boolean); retire hardcoded `useVehicleFilters`.                                                                              | 0          | Not started                                                                |
| **C** | **Category auto-inference on create**             | Create flow resolves category from the org's enabled verticals: 1 vertical+1 category → automatic; N → guided picker, then dynamic form from the category schema.                                                               | 0          | Not started                                                                |
| **D** | **Dealer/seller ownership**                       | Product belongs to a dealer (org); admin differentiates dealers in the platform. Mostly exists via `organization_id`/`tenant_id` — needs the UI/scoping surface.                                                                | 0 (light)  | Not started                                                                |
| **E** | **Business-owner onboarding + self-service RBAC** | Operator creates a dealer (org + owner invite + enabled verticals); dealer logs in and manages own products. Assembles existing roles/teams/invitations. Includes the `Permission.VEHICLE_*` → `LISTING_*`/`PRODUCT_*` cleanup. | 0, D       | Not started                                                                |

**Note:** the originally-discussed "F — product configuration" was **absorbed into subsystem 0**: configuring what a product looks like per niche IS the category presentation contract.

## Recommended sequence

`0 (Foundation)` → `A + B` (consume the contract) → `D` (ownership surface, mostly exists) → `E` (onboarding, reuses RBAC) → `C` (create-flow refinement, last).

## Process per subsystem

1. Brainstorm that subsystem's design (its own clarifying questions).
2. Write `docs/superpowers/specs/<date>-<subsystem>-design.md`.
3. writing-plans → implementation plan.
4. Implement (direct TDD for Foundation; mm-flow vs direct re-decided after Foundation validates the pattern).
