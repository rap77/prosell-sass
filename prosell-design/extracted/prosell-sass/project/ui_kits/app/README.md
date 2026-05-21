# ProSell App — UI Kit

A pixel-faithful recreation of ProSell's sales intelligence app shell. Built from the design system spec only (no codebase or Figma was provided), so the screens are best-guess for a B2B sales intelligence product.

## Screens
- **Dashboard** (default) — KPI tiles, pipeline-at-risk feed, signals inbox
- **Pipeline** — sortable deals table with stage chips and ARR bars
- **Account** — Acme Corp detail: company info, signals, contacts, related deals
- **Deal** — deal detail panel with timeline + champion/blocker

## Components (`*.jsx`)
- `Shell.jsx` — top-level layout with sidebar + topbar + content area, view router
- `Sidebar.jsx` — left nav, 240px, primary navigation + workspace switcher
- `TopBar.jsx` — global search, notifications, user menu
- `KpiCard.jsx` — large number + delta, used on Dashboard
- `SignalCard.jsx` — buying signal item (intent, news, hire, funding)
- `PipelineTable.jsx` — deals table with stage, ARR, owner, days-in-stage
- `AccountHeader.jsx` — account hero with logo placeholder, ICP fit, ARR
- `DealTimeline.jsx` — vertical timeline of touches and stage transitions
- `Avatar.jsx`, `Badge.jsx`, `Button.jsx`, `Tag.jsx` — primitives
- `Icon.jsx` — Lucide wrapper

## How to use
Open `index.html` directly. Navigate via the sidebar; clicking a deal in the Pipeline table opens the Deal view, clicking an account name opens the Account view.

> ⚠️ This kit is a **visual recreation against the brand spec**. If a real ProSell codebase exists, attach it and the kit will be re-cut against actual components.
