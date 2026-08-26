# ProSell Ecosystem — System Context

**Last updated**: 2026-08-23

## Overview

ProSell is a **multi-tenant B2B SaaS platform** for product dealers/sellers.
The first vertical is vehicles; the architecture supports any product category.
The system has two main components that work together:

## Components

### prosell-sass (SaaS Platform)

- **What**: Full-stack web application — public marketplace + admin SaaS + CRM
- **Stack**: Next.js 16 + FastAPI + PostgreSQL + Redis
- **Deployed**: DigitalOcean (production)
- **Repo**: ~/proy/prosell-sass

### fb-autopost (Desktop Publisher)

- **What**: Windows desktop app that publishes products to Facebook Marketplace
- **Stack**: Python + Flet (Material 3) + Selenium (undetected-chromedriver)
- **Distribution**: .exe via ProSell (authenticated download + auto-update)
- **Repo**: ~/proy/fb-autopost

## Integration Points

```
prosell-sass API ←── fb-autopost (consumer)
     │
     ├── GET /api/v1/vehicles (or /products in future)
     ├── POST /api/v1/publications
     ├── GET /api/v1/desktop-releases/latest
     └── Auth: JWT bearer token (bot/user)
```

## Vision

**ProSell = Marketplace + CRM Híbrido Multi-Canal + Multi-Platform Publishing**

1. Marketplace: Expose organization products to buyers
2. CRM Multi-Canal: Manage leads from capture (FB Messages, WhatsApp) to sale
3. Multi-Platform Publishing: Publish to FB Marketplace, Instagram, Craigslist, etc.
4. Mobile-First: Dealers upload photos/videos from mobile
5. AI-Powered: Title generation, price prediction, auto-responder

## Current State (August 2026)

- prosell-sass: MVP deployed, Milestone C complete (UX gaps closed)
- fb-autopost: Discovery harness implemented, first live pilot targeted for Aug 24-31
- First vertical: Vehicles (USA dealers primary, LATAM secondary)
- Languages: English (default) + Spanish
- ~25 active organizations
- Revenue model: commissions on vehicles sold

## Development Methodology

**AI-DLC v2** is the sole development methodology for both projects.

- MasterMind has been REMOVED from both repos (exists as separate project only)
- Each project has its own `aidlc/` workspace and `Product-Definition/`
- This file (`prosell-ecosystem.md`) provides cross-project context to the AI agents

## Key Decisions

- Products are generic (categories → products → verticals) — NOT vehicle-specific
- fb-autopost is the FIRST publisher client — architecture supports N platforms
- Publishing platforms prioritized by USA market popularity per vertical
- Architecture is HYBRID: desktop for browser automation, server for intelligence/ML
- AI lead responder: full LLM conversation with human escalation path
- Video processing: hybrid (client compress + server transcode)
- Desktop distribution through ProSell (not GitHub Releases)
- Clean Architecture in backend (domain → application → infrastructure)
- AI-DLC v2 is the SOLE development methodology (MasterMind removed)

## Platform Priority Research (TODO)

For the vehicles vertical in USA, research and rank these platforms by
volume/popularity to determine publishing priority after Facebook Marketplace:

- Craigslist
- OfferUp
- AutoTrader
- Cars.com
- CarGurus
- (others discovered via research)
