# ProSell Design System

> **ProSell** is a B2B SaaS sales intelligence platform. Style: _dark premium SaaS._ Mood references: Linear (cleanliness), Attio (sales context), Stripe (gradient depth).

This folder is the source of truth for ProSell's brand and product UI. It contains color and type tokens, typography rules, brand assets, component specimens, and a UI kit that recreates the ProSell app shell.

---

## Sources

The design system was built **from a written brief only** — no codebase, Figma file, or visual assets were attached. The brief specified:

- Color palette (base, brand, text, status, gradients)
- Typography scale (Inter, 9-step ramp)
- Component style guidelines (cards, buttons, badges, decorative)
- Mood: Linear / Attio / Stripe
- "Do not use" list (light bg, photography, hand-drawn illustrations, photo avatars)

> ⚠️ **Substitutions flagged for user review:**
>
> - **Logo:** Provided as `assets/logo-mark.png` (transparent, cropped from the brand reference). If a vector (SVG) version exists, attach it for crisp scaling.
> - **Icons:** No icon set was provided. Using **Lucide** (CDN), which matches the "thin stroke, Inter geometry" guidance in the brief. If ProSell ships with Phosphor or a custom set, please attach.
> - **Sample app screens:** Built from intuition for B2B sales intelligence (pipeline, accounts, deal detail). If the real product diverges, attach the codebase or Figma and I'll re-cut the UI kit against it.

---

## File index

| Path                  | Purpose                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| `README.md`           | This file — brand context, fundamentals, manifest                           |
| `SKILL.md`            | Cross-compatible Agent Skill manifest                                       |
| `colors_and_type.css` | All design tokens (CSS vars) + semantic typography classes                  |
| `assets/`             | Logo, icons, decorative SVGs                                                |
| `preview/`            | Specimen cards rendered in the Design System tab                            |
| `ui_kits/app/`        | UI kit: ProSell sales intelligence app (dashboard, pipeline, account, deal) |

---

## Content fundamentals

ProSell's voice is **confident, precise, and operator-grade.** It speaks to revenue leaders and AEs who don't have time for fluff. Every word earns its place.

### Tone

- **Direct, not breezy.** "Pipeline at risk." not "Heads up — looks like things might be getting a little spicy in your pipeline 😬"
- **Outcome-oriented.** Lead with the number, the deal, the action — not the feature.
- **Quietly confident.** No exclamation points. No marketing superlatives ("revolutionary", "game-changing"). The product is the proof.
- **Sales-native vocabulary.** ARR, pipeline, MEDDIC, ICP, multi-thread, champion, intent signal. Don't translate down.

### Casing

- **Sentence case** for almost everything: nav items, buttons, table headers, page titles ("Account intelligence", not "Account Intelligence" or "ACCOUNT INTELLIGENCE")
- **UPPERCASE eyebrows** for section labels above hero headlines, with `letter-spacing: 0.12em` (e.g., `PIPELINE INTELLIGENCE`)
- **Title Case** is reserved for proper nouns and product names ("Signal Inbox", "Deal Room")

### Person

- **Second person ("you")** in marketing and onboarding: "See every account that just hired a new VP of Sales."
- **Imperative** in actions and empty states: "Connect Salesforce", "Add a deal"
- **Third person / data-forward** inside the product: "Acme Corp shows 4 buying signals this week" — the product reports, doesn't editorialize.

### Emoji

- **Never.** Status is communicated with color, iconography (Lucide), and typography. Emoji read as casual; ProSell is operator software.

### Numbers and units

- Always show units explicitly: `$2.4M ARR`, `+34% QoQ`, `12 days in stage`
- Use real number formatting (`$2,400,000` or `$2.4M`, never `2400000`)
- Trend indicators: `↑ 12%` (success), `↓ 8%` (error), `→ flat`

### Examples

| Don't                                            | Do                                                     |
| ------------------------------------------------ | ------------------------------------------------------ |
| "Welcome back! 👋 Let's crush some deals today!" | "Good morning, Sarah. 4 deals need attention."         |
| "Oops! Looks like something went wrong."         | "Sync failed. Retry, or check Salesforce credentials." |
| "Awesome job closing that deal! 🎉"              | "Acme Corp — Closed Won. $240K ARR added to Q3."       |
| "Get started by clicking the button below"       | "Connect Salesforce to import your pipeline."          |

---

## Visual foundations

### Color

ProSell is **dark by default.** Light mode is not part of the system. The palette is built around three layers of navy depth (`#060D24` → `#0D1B3E` → `#1A2D5A`) with **cyan (`#4DB8FF`)** as the singular accent — the only color allowed for primary CTAs, links, and key data viz highlights. Brand blue (`#1E5FD4`) is used for secondary interactive states and within gradients. Status colors (success/warning/error) are reserved for actual status — never decorative.

### Type

**Inter, all weights 400–800.** Headings get tight tracking (`-0.02em` to `-0.03em`) and weight 700–800 for hero, 600–700 for H1-H3. Body is 16px / 1.6 line-height for readability against dark backgrounds. The type system is monochromatic-on-navy by default; gradient text is reserved for one or two hero moments per surface, never for body or repeating UI.

### Spacing

4px base grid. Cards get 24–32px internal padding; sections get 64–96px vertical rhythm. Density is **deliberately spacious** in marketing, **compact and information-dense** inside the app (8–12px row padding in tables).

### Backgrounds

- **No photography.** Ever.
- **No hand-drawn illustrations.** The brand is geometric, not whimsical.
- **Hero gradient** (`linear-gradient(135deg, #060D24, #0D1B6E, #1E5FD4)`) for full-bleed marketing heroes
- **Glow orbs** — radial gradients in navy/blue, very low opacity, behind key sections — create depth without noise
- **Circuit grid pattern** at 3–5% opacity in cyan, on hero backgrounds only — references "intelligence / data flow"

### Animation & easing

- Default ease: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out, cinematic)
- Durations: `120ms` (micro: hover), `200ms` (base: state change), `320ms` (slow: panel open)
- **No bounces.** No spring easing. ProSell is composed, not playful.
- Page transitions: opacity fades only, never slide-ins
- Hover scale: subtle `translateY(-2px)` on primary CTAs; never `scale()`

### Hover & press states

- **Buttons (primary):** background `#4DB8FF` → `#7DCEFF` + `translateY(-2px)` + cyan glow shadow
- **Buttons (ghost):** border `rgba(77,184,255,0.2)` → solid `#4DB8FF`
- **Cards (interactive):** border-color brightens to `rgba(77,184,255,0.3)`; bg lifts from `surface` to `elevated`; no scale change
- **Press:** translateY returns to 0 (the lift retracts) — implies physical "click down". No size shrink.
- **Links:** cyan `#4DB8FF` → cyan-hover `#7DCEFF`, no underline by default

### Borders

Borders are **always cyan-tinted, always low-opacity.**

- Subtle: `rgba(77, 184, 255, 0.10)` — table dividers
- Default: `rgba(77, 184, 255, 0.15)` — card borders
- Strong: `rgba(77, 184, 255, 0.30)` — hover/active card borders
- Active: solid `#4DB8FF` — focused inputs only

### Shadows

Shadows are **deep and navy-tinted,** not gray. They suggest the surface is floating in deep space.

- `sm`: `0 2px 8px rgba(6,13,36,0.4)`
- `md`: `0 8px 24px rgba(6,13,36,0.5)`
- `lg`: `0 16px 48px rgba(6,13,36,0.55)`
- `xl`: `0 32px 80px rgba(6,13,36,0.6)` — for floating hero cards
- `glow-cyan`: `0 8px 32px rgba(77,184,255,0.35)` — only on primary CTA hover

### Transparency & blur

**Glassmorphism is used sparingly and intentionally.** Cards are `rgba(13,27,62,0.7)` with `backdrop-filter: blur(20px)` — the blur is real, not decorative, so cards layered over the hero gradient pick up the color underneath. Don't apply blur to flat-bg cards; it does nothing and costs perf.

### Corner radii

- `4px` — XS badges, inline tags
- `8–10px` — buttons, inputs, small cards
- `12–16px` — content cards, panels, modals
- `24px` — hero / floating cards
- `100px` (pill) — status pills, rounded badges, avatars

### Cards

The canonical ProSell card:

```css
background: rgba(13, 27, 62, 0.7);
border: 1px solid rgba(77, 184, 255, 0.15);
border-radius: 12px;
backdrop-filter: blur(20px);
box-shadow: 0 8px 24px rgba(6, 13, 36, 0.5);
padding: 24px;
```

### Imagery vibe

ProSell uses **almost no imagery.** When data viz is shown (charts, pipeline funnels, network graphs), the palette is monochromatic cyan/blue with a single status color for accent. No warm tones. No grain. No photography.

### Layout rules

- **Full-bleed sections** for marketing hero and feature reveals; bounded `max-width: 1280px` containers for everything else
- **Sticky top nav** at 64px height with `backdrop-filter: blur(20px)` over a `rgba(6,13,36,0.7)` bg
- **Side nav** in the app: 240px wide, `bg-surface` background
- **Content max-width** in long-form copy: 720px
- **12-column grid** for marketing, **table-based** for app data views

---

## Iconography

**Library: Lucide Icons (CDN)** — chosen to match the brief's "thin stroke, consistent with Inter geometry" requirement. Phosphor would be the close alternative if ProSell prefers it.

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
<script>
  lucide.createIcons();
</script>
```

Or per-icon SVG (preferred for production):

```html
<i data-lucide="trending-up"></i>
```

### Rules

- **Stroke weight:** 1.5px (Lucide default); never 2px+
- **Size:** 16px (inline / table), 20px (button-adjacent), 24px (nav), 32px+ (feature illustration)
- **Color:** inherits `currentColor` — never colored except for status (success/warning/error)
- **Spacing:** 8px gap between icon and adjacent text
- **No emoji.** No unicode-as-icon (✓, ★, →) — always use the Lucide equivalent (`check`, `star`, `arrow-right`)

### Icons used in the kit

`trending-up`, `trending-down`, `users`, `building-2`, `briefcase`, `target`, `zap`, `bell`, `search`, `filter`, `more-horizontal`, `chevron-right`, `chevron-down`, `arrow-up-right`, `external-link`, `check`, `x`, `circle`, `dollar-sign`, `calendar`, `mail`, `phone`, `linkedin`, `sparkles`, `activity`, `inbox`, `settings`, `plus`

### Logo

`assets/logo-mark.png` — the ProSell mark (transparent PNG, cropped from the brand reference). A blue painterly "P" with circuit-node accents. Use the wordmark "ProSell" set in Inter 700 next to the mark for the horizontal lockup. **Vector (SVG) preferred when available.**

---

## Quick reference

```css
/* Backgrounds */
--bg-base: #060d24;
--bg-surface: #0d1b3e;
--bg-elevated: #1a2d5a;

/* Brand */
--cyan: #4db8ff; /* primary action */
--blue: #1e5fd4; /* interactive */
--navy: #0d1b6e;

/* Text */
--text-primary: #f0f4ff;
--text-secondary: #8a9bbf;
--text-disabled: #3d4f72;

/* Status */
--success: #22d3a0;
--warning: #f5a623;
--error: #f04438;
```

```css
/* The canonical card */
background: rgba(13, 27, 62, 0.7);
border: 1px solid rgba(77, 184, 255, 0.15);
border-radius: 12px;
backdrop-filter: blur(20px);
```

```css
/* The canonical primary button */
background: #4db8ff;
color: #060d24;
border-radius: 8px;
font-weight: 600;
/* hover: #7DCEFF + translateY(-2px) + glow */
```
