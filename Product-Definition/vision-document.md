# Vision Document — ProSell SaaS

**Status**: Pre-filled (retroactive discovery from existing documentation)
**Date**: 2026-08-23
**Role**: Product Manager + Tech Lead (parallel)
**Project Type**: Brownfield (deployed MVP)

---

## 1. Problem Statement

Small and mid-size vehicle dealers (and general product sellers) in the USA and LATAM lack an integrated tool to:

1. **Manage their product catalog** with rich data (VIN decode, images, video)
2. **Publish listings** to multiple sales platforms (Facebook Marketplace, Instagram, Craigslist)
3. **Capture and manage leads** from those publications through a unified CRM
4. **Track the sales pipeline** from initial contact to closed deal

Current alternatives force dealers to use:

- Separate tools for each platform (manual copy-paste)
- Generic CRMs not optimized for marketplace-generated leads
- No automation for republishing, pricing, or lead assignment

---

## 2. Target Users

| User               | Description                                       | Primary Need                                                      |
| ------------------ | ------------------------------------------------- | ----------------------------------------------------------------- |
| **Dealer Admin**   | Owner/manager of a vehicle dealership (1-50 cars) | Operational oversight, team management, multi-platform publishing |
| **Salesperson**    | Individual seller within an organization          | Lead management, appointment scheduling, quick catalog access     |
| **Buyer** (future) | End consumer browsing the public marketplace      | Find and compare vehicles, contact sellers                        |

**Primary market**: USA (English-speaking dealers)
**Secondary market**: LATAM dealers operating in USA (bilingual EN/ES)
**Device priority**: Mobile-first (dealers photograph inventory daily on phone)

---

## 3. Product Vision

> **ProSell = Marketplace + CRM Híbrido Multi-Canal + Multi-Platform Publishing**

A platform where dealers:

1. **Upload** products from mobile (photos/video → catalog)
2. **Publish** to N platforms automatically (FB Marketplace first, then Instagram, Craigslist, etc.)
3. **Capture** leads multi-channel (FB Messages, WhatsApp, Lead Ads, organic form)
4. **Manage** the full pipeline (new → qualified → appointment → deal → closed)
5. **Optimize** with AI (title generation, price prediction, auto-responder)

---

## 4. Success Criteria

| Metric                                 | Target                              | Timeframe            |
| -------------------------------------- | ----------------------------------- | -------------------- |
| Active dealerships                     | 10                                  | 3 months post-launch |
| Publications/month per org             | 50+                                 | Steady state         |
| Lead capture rate                      | >5% of publications generate a lead | Measured             |
| Time to publish (from catalog to live) | <2 minutes                          | Automated mode       |
| Platform uptime                        | 99.5%                               | Monthly              |

---

## 5. Competitive Landscape

| Competitor            | Strength               | ProSell Advantage                                |
| --------------------- | ---------------------- | ------------------------------------------------ |
| AutoTrader/CarGurus   | Massive traffic, SEO   | ProSell targets FB Marketplace + multi-platform  |
| Frazer DMS            | Full dealer management | Overkill for small dealers; ProSell is simpler   |
| Facebook native tools | Free, direct           | No automation, no CRM, no multi-account          |
| Dealersocket          | Enterprise CRM         | Expensive, complex; ProSell is lean + affordable |

---

## 6. Scope — What's IN (MVP + near-term)

- ✅ Multi-tenant organizations with team management
- ✅ Generic product catalog (vehicles = first vertical)
- ✅ VIN decoding + rich vehicle data
- ✅ Lead capture + auto-assignment (round-robin, workload balance)
- ✅ Appointment scheduling with conflict detection
- ✅ Pipeline/Kanban view
- ✅ Auth with 2FA + onboarding wizard
- ✅ Notifications system (in-app)
- 🔄 Facebook Marketplace publishing (desktop client in progress)
- 🔄 Mobile-first responsive (Sprint 0)
- 📋 Multi-account Facebook
- 📋 Video support in listings
- 📋 Multi-platform publishing (beyond Facebook)
- 📋 CRM multi-canal (FB Messages, WhatsApp)
- 📋 i18n complete (EN + ES)
- 📋 AI title generation + price prediction

---

## 7. Scope — What's OUT (future phases)

- Native mobile app (iOS/Android) — PWA first
- Ecommerce/payments integration
- ML-based market predictions (advanced analytics)
- White-label/custom branding per org
- Third-party CRM integrations (Salesforce, HubSpot)
- Auction/bidding system

---

## 8. Key Constraints

| Constraint                              | Impact                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| Solo developer (Prosell)                | Must prioritize ruthlessly; automation + AI-assisted dev essential |
| Budget limited                          | DigitalOcean hosting; no expensive SaaS dependencies               |
| Facebook platform policies              | Must comply with Marketplace ToS; no evasion of safeguards         |
| First vertical = vehicles               | Architecture must be generic but initial UX is vehicle-optimized   |
| Desktop client = Windows only (initial) | macOS/Linux deferred                                               |

---

## 9. Key Risks

| Risk                                         | Likelihood | Impact   | Mitigation                                                        |
| -------------------------------------------- | ---------- | -------- | ----------------------------------------------------------------- |
| Facebook API/policy changes break publishing | Medium     | High     | Guided calibration approach (human-in-loop), not blind automation |
| Solo developer burnout                       | Medium     | Critical | AIDLC methodology + AI-assisted development                       |
| Market too competitive (AutoTrader, etc.)    | Low        | Medium   | Different segment (small dealers, multi-platform, affordable)     |
| Mobile-first delay blocks adoption           | High       | High     | Sprint 0 prioritized                                              |

---

## 10. Business Model

### Current Model (August 2026)

- **Services company**: Managing inventory + sales control + leads for dealers
- **Revenue**: Commissions on vehicles sold through the platform
- **~25 active organizations** using the platform

### Future Model (when platform value justifies it)

- Explore SaaS subscription tiers
- Tiered pricing based on # accounts, # publications/month, AI features
- Possible freemium for lead capture
- Desktop client included with service

**Key insight**: Not rushing to SaaS pricing. Current commission model validates product-market fit before adding subscription friction.
