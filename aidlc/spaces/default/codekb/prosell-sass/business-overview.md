# Business Overview

## Purpose

ProSell is a multi-tenant B2B SaaS for vehicle dealerships. It manages a generic product catalog (vehicles are the first vertical), publishes eligible inventory to Facebook Marketplace, captures leads, and supports appointment workflows.

## Business Domain

- **Tenants and organizations:** data and object storage are isolated by organization/tenant.
- **Catalog:** sellers create, enrich, publish, and manage products and their media.
- **Vehicle workflow:** category schemas define vehicle attributes; VIN decoding can populate attributes.
- **Publishing and leads:** catalog records feed Facebook publishing integrations and subsequent lead handling.

## Catalog Image Value Flow

Catalog cards need a fast, authorized cover image. The current flow requests signed gallery URLs separately for each visible product, then renders only the first URL. This harms perceived catalog speed as product counts grow.

The active intent is a performance and correctness fix: remove this N+1 request/signing pattern, serve an appropriate private catalog derivative, and define cache/CDN behavior without making original product media public.

## Actors

- **Seller/dealer user:** manages its organization catalog and views catalog cards.
- **Cross-organization administrator:** can access allowed organizations while tenant checks remain enforced.
- **Public social crawler:** may access only the deliberately public Open Graph derivative.

## Business Rules Relevant to Images

- Private product originals remain protected by authenticated authorization and tenant-prefixed object-key validation.
- A signed URL is issued only after product access is authorized and every requested key passes the tenant namespace check.
- The public Open Graph JPEG is not a general catalog-media substitute.
- A product can retain legacy image keys in `attributes.image_urls`; new behavior must preserve that fallback.

## Success Criteria for the Intent

1. A catalog page avoids one cover-image request per visible product.
2. Catalog cards consume a cover-sized private derivative rather than a full gallery/original path.
3. Cache expiry, invalidation after replacement/deletion, and CDN endpoint behavior are explicit and testable.
4. The existing fail-closed tenant boundary is preserved for normal and cross-organization access.
