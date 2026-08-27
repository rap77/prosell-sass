# Open Questions — ProSell SaaS

**Status**: Resolved (retroactive discovery — answers from stakeholder interview 2026-08-23)
**Date**: 2026-08-23

---

## RESOLVED ✅

### OQ-1: Multi-platform publishing priority ✅

**Question**: After Facebook Marketplace, which platforms should be next?
**Answer**: The order is defined by popularity in the USA market for the active vertical (vehicles first). Need to research which platforms are most used for vehicle sales in USA and prioritize accordingly.
**Candidates**: Facebook Marketplace (current), Craigslist, OfferUp, AutoTrader, Cars.com, CarGurus
**Decision**: Research-driven prioritization, not pre-committed.

### OQ-2: Pricing model specifics ✅

**Question**: What are the subscription tiers?
**Answer**: Currently operating as a services company — managing inventory + sales control + leads for dealers. Revenue comes from **commissions on vehicles sold**. No SaaS subscription tiers defined yet. Once more value is added to the platform, other business models will be explored.
**Decision**: Commission-based now; SaaS pricing deferred to when platform value justifies it.

### OQ-3: Geographic expansion strategy ✅

**Question**: Is LATAM a local play or USA-focused?
**Answer**: USA primary. LATAM dealers operating in USA (bilingual). Local marketplace support per country is deferred.
**Decision**: USA-first, i18n EN+ES for bilingual dealers in USA.

### OQ-4: Buyer-side experience scope ✅

**Question**: How much investment in public marketplace vs seller SaaS?
**Answer**: Current focus is seller-side (inventory management, publishing, leads, CRM). Public marketplace exists but is secondary — dealers are the paying customer.
**Decision**: Seller SaaS is priority. Buyer UX gets love only when it drives lead capture.

### OQ-5: Desktop client → Server-side publishing migration ✅

**Question**: Long-term, should publishing move server-side?
**Answer**: **Combine depending on tasks.** It's not binary:

- **Desktop (fb-autopost)**: Browser automation for publishing where no API exists
- **Server-side (prosell-sass)**: ML, price prediction, market intelligence, data collection
- **Evaluate per-platform**: Which approach works best for information gathering vs publishing
  **Decision**: Hybrid architecture. Both coexist permanently with different responsibilities.

### OQ-6: Video pipeline infrastructure ✅

**Question**: Where does video transcoding run?
**Answer**: **Hybrid** — client-side resize/compress before upload + server-side transcode to platform specs.

- For Facebook: separate image and video upload flows (FB handles them differently)
- For ProSell storage: same hybrid approach as images
  **Decision**: Client-side pre-processing + server-side final transcode.

### OQ-7: AI integration depth ✅

**Question**: Simple API calls or full conversational agent?
**Answer**: **Real LLM conversation** (professional solution). If conversation gets complex or contentious → **escalation to human**. Hybrid model:

- AI handles initial responses, common questions, scheduling
- Human takes over on complex negotiations, complaints, custom requests
  **Decision**: Full conversational AI with human escalation path.

### OQ-8: MasterMind → AIDLC migration timeline ✅

**Question**: When does MasterMind get replaced?
**Answer**: **NOW. Remove MasterMind from both projects immediately.** AIDLC is the sole methodology going forward. MasterMind continues as its own separate project (~/proy/mastermind) but does NOT guide prosell-sass or fb-autopost.
**Decision**: AIDLC only. MasterMind references removed from both repos.

### OQ-9: Scale expectations (Year 1) ✅

**Question**: How many concurrent organizations?
**Answer**: **~25 organizations currently**. Must scale progressively. Current DigitalOcean infrastructure may need upgrade soon.
**Decision**: Design for 50-100 orgs near-term; plan auto-scaling path.

### OQ-10: Backup and disaster recovery ✅

**Question**: What's the RPO/RTO?
**Answer**: Not explicitly defined yet. DigitalOcean managed DB provides automatic backups.
**Status**: TBD — document as part of Operations phase in AIDLC.

---

## Resolution Summary

All critical and important questions have been answered. OQ-10 (DR plan) remains TBD and will be addressed during the AIDLC Operations phase.
