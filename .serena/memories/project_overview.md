# ProSell SaaS - Project Overview

## Purpose

ProSell SaaS is a **vehicle market analysis platform** that combines:

- **Public Marketplace**: E-commerce for vehicle buyers
- **SaaS Analytics**: Real-time market intelligence for dealerships
- **Automated Scraping**: Multi-marketplace scraping (Facebook Marketplace primary)
- **ML Predictions**: Price prediction and recommendation models

## Current State

Monorepo configured, ready for implementation. Clean Architecture with SOLID principles.

## Business Goals Q4 2026

- 300 active organizations
- 100,000 products in catalog
- 50,000 monthly users
- $100,000 monthly revenue

## Role System

```
MASTER (ProSell)
├── MANAGER (Manages team, assigned to orgs)
│   └── SELLER_PROSELL (Sells from all orgs)
│
ORGANIZATION
├── ORG_ADMIN (Admin of their org)
│   └── ORG_SELLER (Sells from their org)
│
PUBLIC
└── CLIENT (Buyer)
```

## Key Features MVP

1. Authentication (JWT + OAuth2 + TOTP 2FA)
2. Multi-tenant product management
3. Appointments and sales system
4. Commission and MLM team management
5. Market scraping and analysis
6. AI conversational agents
7. Prepaid wallet system with tokens
