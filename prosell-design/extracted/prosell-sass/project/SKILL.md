---
name: prosell-design
description: Use this skill to generate well-branded interfaces and assets for ProSell, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

ProSell is a B2B SaaS sales intelligence platform with a **dark premium SaaS** aesthetic — references: Linear (cleanliness), Attio (sales context), Stripe (gradient depth). Voice is confident, precise, and operator-grade. Never use emoji. Never use light backgrounds.

Key files:
- `colors_and_type.css` — drop into any HTML file; gives you all color/type CSS vars + semantic classes (`.ds-hero`, `.ds-h1`, `.ds-body`, etc.)
- `assets/logo-mark.png` — the ProSell mark (transparent PNG); pair with "ProSell" set in Inter 700 for horizontal lockup
- `preview/*.html` — specimen cards showing colors, type, components, spacing in use
- `ui_kits/app/` — recreated ProSell app shell (dashboard, pipeline, account, deal). Components are in JSX and can be lifted directly.

Rules at a glance:
- Cyan `#4DB8FF` is the only primary action color
- Cards: `rgba(13,27,62,0.7)` + `1px solid rgba(77,184,255,0.15)` + `border-radius: 12–16px` + `backdrop-filter: blur(20px)`
- Icons: Lucide (thin stroke), 1.5px weight, 16/20/24px sizes
- No emoji, no photography, no hand-drawn illustrations, no light backgrounds, no rounded photo avatars (use initials + gradient)
- Animations: ease-out cubic-bezier(0.16, 1, 0.3, 1), 120/200/320ms, no bounces

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
