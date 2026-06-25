# Roadmap: Generalize Catalog → Category-Driven Multi-Vertical Product Platform

**Date:** 2026-06-06
**Status:** COMPLETED — all 6 subsystems (0 Foundation, A, B, C, D, E) merged to main as of 2026-06-25 (Subsystem C frontend PR #55 was the last to land). This roadmap document is retained as the index of how the work was decomposed.

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

## Out of scope (YAGNI — explicit)

The platform-generalization roadmap deliberately does NOT cover:

- **Public marketplace / SEO landing pages** — out of MVP scope, gated separately.
- **Full e-commerce (cart, checkout, payments)** — present (Stripe exists for subs) but not generalized per vertical.
- **Mobile native apps** — web-only.
- **AI-driven price prediction** — exists as a model but not wired into the UI per vertical.
- **Schema marketplace / cross-tenant schema sharing** — each tenant owns its own categories; no shared template marketplace.
- **Bulk upload generalization for arbitrary categories** — was an undocumented gap (vehicle-coupling) that this roadmap did not include; now lives in [`2026-06-25-bulk-upload-category-generalization-design.md`](2026-06-25-bulk-upload-category-generalization-design.md) as a separate roadmap (G-1 + G-2).

## Risks & mitigations

These were the risks accepted at roadmap commit time (2026-06-06). All are now closed (roadmap COMPLETED) — preserved for the historical record so future agents understand the trade-offs that were made.

1. **Long roadmap with 6 dependent subsystems** — risk of partial completion leaving the codebase in an inconsistent state.
   - **Mitigation adopted**: strict dependency ordering (0 → A+B → D → E → C). No subsystem was started without its dependency merged. Result: clean intermediate states at every merge.
2. **Foundation (Subsystem 0) had to be right before A/B/C could start** — risk of foundation lock-in.
   - **Mitigation adopted**: Foundation was brainstormed + spec'd with all dependent subsystems' needs in mind (presentation contract, filterable metadata, title composition all designed upfront to support the consumers). Result: no rework needed when A/B/C consumed the contract.
3. **Backend "vehicle-shaped" residue** — risk of leaving dead code that complicates future work.
   - **Mitigation adopted**: Opción 1 of the residual coupling spec (Vehicle→ProductRow rename) was executed as PR `c87cd4ce`. Other items tracked in [`2026-06-17-subsystem-a-residual-vehicle-coupling-debt.md`](2026-06-17-subsystem-a-residual-vehicle-coupling-debt.md) (now STALE, items closed by other subsystems — see audit at end of that doc).
4. **Cross-tenant isolation bugs** — risk of vehicle data leaking across tenants in a multi-vertical world.
   - **Mitigation adopted**: Subsystem E introduced tenant-scoping patterns; Subsystem C and B hardened them. PR #49 (`S-4 cross_tenant rename`) formalized the pattern.
5. **Spec drift between design and implementation** — risk of implementing something different than what was designed.
   - **Mitigation adopted (post-hoc)**: Spec Status Lifecycle (DRAFT → APPROVED → IN PROGRESS → IMPLEMENTED) enforced via `scripts/validate_spec_status.py` pre-commit hook + Status field convention (see CLAUDE.md).
