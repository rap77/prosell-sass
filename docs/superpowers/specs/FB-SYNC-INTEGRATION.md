# FB Sync Integration Spec

**Status**: IMPLEMENTED (PR #c6e79363, #5d17e952, #846a1a33, merged 2026-07-30)
**Author**: Claude + rpadron
**Date**: 2026-07-28 (updated 2026-08-01)

## Overview

Integración entre `fb-auto-post` (bot Selenium standalone) y `prosell-sass` para:

1. Eliminar Excel como fuente de datos
2. ProSell como única fuente de verdad de productos
3. Tracking completo de publicaciones en Facebook Marketplace

## Problem Statement

Actualmente:

- `fb-auto-post` lee de SQLite alimentada por Excel manual
- No hay retroalimentación a ProSell sobre qué se publicó
- Duplicación de datos entre sistemas
- Sin visibilidad de estado de publicaciones

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  ProSell (PostgreSQL)                                               │
│                                                                     │
│  products ──────────────┐                                           │
│                         │                                           │
│  fb_publication_history ◄─── immutable event log                   │
│  fb_publication_status  ◄─── consolidated state per product/acct   │
│  marketplace_publications ◄─── legacy (backwards compat)           │
│                         │                                           │
│  /api/v1/fb-sync/* ─────┼─── endpoints (X-Bot-Token auth)           │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
                          │ HTTP + X-Bot-Token header
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│  fb-auto-post                                                       │
│                                                                     │
│  1. GET /fb-sync/accounts ──► list active accounts                  │
│  2. GET /fb-sync/account-config ──► get credentials                 │
│  3. GET /fb-sync/pending ──► get products for account               │
│  4. Download images, convert WebP → JPEG                            │
│  5. Selenium publish to FB                                          │
│  6. POST /fb-sync/callback ──► report success/failure               │
│  7. POST /fb-sync/account-status ──► report account health          │
└─────────────────────────────────────────────────────────────────────┘
```

## Authentication

**All endpoints require `X-Bot-Token` header.**

```
X-Bot-Token: <shared-secret>
```

Server validates against `FB_BOT_API_KEY` env var using constant-time comparison.

| Status | Meaning                                         |
| ------ | ----------------------------------------------- |
| 401    | Missing or invalid token                        |
| 403    | Cross-tenant access attempt                     |
| 409    | Account suspended/restricted                    |
| 503    | Server misconfigured (`FB_BOT_API_KEY` not set) |

See `docs/BOT-MIGRATION-GUIDE.md` for bot migration details.

## Data Model

### Table: `fb_publication_history` (NEW)

Immutable event log for every publication attempt.

| Column             | Type         | Description                             |
| ------------------ | ------------ | --------------------------------------- |
| `id`               | UUID         | PK                                      |
| `tenant_id`        | UUID         | FK → organizations                      |
| `product_id`       | UUID         | FK → products                           |
| `fb_account_id`    | UUID         | FK → fb_accounts                        |
| `event_type`       | VARCHAR(20)  | published, failed, renewed, deleted     |
| `fb_post_id`       | VARCHAR(100) | FB's post ID (nullable)                 |
| `fb_groups_posted` | JSONB        | `[{position, fb_group_id, name}]`       |
| `groups_count`     | INTEGER      | Number of groups posted to              |
| `error_message`    | TEXT         | Error details (nullable)                |
| `error_code`       | VARCHAR(50)  | rate_limit, suspended, post_limit, etc. |
| `event_at`         | TIMESTAMP    | When event occurred                     |
| `expires_at`       | TIMESTAMP    | event_at + 7 days (nullable)            |
| `created_at`       | TIMESTAMP    | Record creation                         |

### Table: `fb_publication_status` (NEW)

Consolidated state per product+account pair.

| Column               | Type        | Description                 |
| -------------------- | ----------- | --------------------------- |
| `id`                 | UUID        | PK                          |
| `tenant_id`          | UUID        | FK → organizations          |
| `product_id`         | UUID        | FK → products               |
| `fb_account_id`      | UUID        | FK → fb_accounts            |
| `status`             | VARCHAR(20) | active, failed, expired     |
| `last_event_id`      | UUID        | FK → fb_publication_history |
| `last_event_at`      | TIMESTAMP   |                             |
| `publication_count`  | INTEGER     | Total successful posts      |
| `failure_count`      | INTEGER     | Total failures              |
| `first_published_at` | TIMESTAMP   |                             |
| `last_published_at`  | TIMESTAMP   |                             |
| `created_at`         | TIMESTAMP   |                             |
| `updated_at`         | TIMESTAMP   |                             |

### Table: `marketplace_publications` (LEGACY)

Kept for backwards compatibility with existing dashboard.

| Column          | Type         | Description             |
| --------------- | ------------ | ----------------------- |
| `id`            | UUID         | PK                      |
| `product_id`    | UUID         | FK → products           |
| `tenant_id`     | UUID         | FK → organizations      |
| `platform`      | VARCHAR(50)  | "facebook"              |
| `account_email` | VARCHAR(255) | FB account used         |
| `account_alias` | VARCHAR(100) | Friendly name           |
| `fb_groups`     | JSONB        | `[1, 2, 3]` (positions) |
| `fb_post_id`    | VARCHAR(100) |                         |
| `published_at`  | TIMESTAMP    |                         |
| `expires_at`    | TIMESTAMP    |                         |
| `status`        | VARCHAR(20)  | active, failed, expired |
| `error_message` | TEXT         |                         |
| `created_at`    | TIMESTAMP    |                         |
| `updated_at`    | TIMESTAMP    |                         |

## API Endpoints

### 1. GET `/api/v1/fb-sync/pending`

Returns products pending publication for a specific FB account.

**Auth**: `X-Bot-Token` required

**Query params:**

- `account_email` (required): FB account email
- `limit` (optional): Max products (default 10, max 50)

**Tenant scoping**: Returns only products from the same tenant as the FB account.

**Response:**

```json
{
  "products": [
    {
      "id": "uuid",
      "title": "2020 Ford Explorer XLT",
      "price": 17800,
      "type": "SUV/Crossover",
      "location": "Orlando, Florida",
      "year": 2020,
      "make": "Ford",
      "model": "Explorer",
      "mileage": 70000,
      "body_style": "SUV",
      "exterior_color": "Gris",
      "interior_color": "Negro",
      "clean_title": false,
      "state": "Usado",
      "fuel_type": "Gasolina",
      "transmission": "Transmisión automática",
      "description": "...",
      "vin": "1FMSK7DH7LGA77418",
      "option": "",
      "image_urls": ["https://...?signature=..."]
    }
  ]
}
```

**Notes:**

- URLs are signed with 1-hour TTL
- Returns 404 if account not found or inactive

### 2. POST `/api/v1/fb-sync/callback`

Bot reports publication result (success or failure).

**Auth**: `X-Bot-Token` required

**Request:**

```json
{
  "product_id": "uuid",
  "status": "published",
  "account_email": "user@example.com",
  "account_alias": "Juan Luis",
  "fb_post_id": "123456789",
  "fb_groups": [
    { "position": 1, "fb_group_id": "111", "name": "Cars Miami" },
    { "position": 2, "fb_group_id": "222", "name": "Autos Florida" }
  ],
  "error": null,
  "error_code": null
}
```

| Field                | Type   | Required | Notes                                                     |
| -------------------- | ------ | -------- | --------------------------------------------------------- |
| `product_id`         | UUID   | Yes      |                                                           |
| `status`             | string | Yes      | `published` or `failed`                                   |
| `account_email`      | email  | Yes      |                                                           |
| `account_alias`      | string | No       |                                                           |
| `fb_post_id`         | string | No       | Required if published                                     |
| `fb_groups`          | array  | No       | Preferred (structured)                                    |
| `fb_group_positions` | array  | No       | Deprecated (just positions)                               |
| `error`              | string | No       | Error message if failed                                   |
| `error_code`         | string | No       | `rate_limit`, `suspended`, `post_limit`, `login_required` |

**Tenant validation**: Server verifies FB account belongs to same tenant as product. Returns 403 if mismatch.

**Response:** `201 Created`

```json
{
  "publication_id": "uuid",
  "status": "active"
}
```

### 3. GET `/api/v1/fb-sync/accounts`

List active FB accounts for bot to iterate.

**Auth**: `X-Bot-Token` required

**Response:**

```json
{
  "accounts": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "alias": "Juan Luis",
      "status": "active",
      "groups_count": 5
    }
  ]
}
```

### 4. GET `/api/v1/fb-sync/account-config`

Get full account config with decrypted password.

**Auth**: `X-Bot-Token` required

**Query params:**

- `email` (required): FB account email

**Response:**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "password": "decrypted-password",
  "browser": "firefox",
  "language": "es",
  "time_to_sleep": 2.5,
  "groups": [
    {
      "position": 1,
      "fb_group_id": "111",
      "name": "Cars Miami",
      "category": "vehicles"
    }
  ]
}
```

### 5. POST `/api/v1/fb-sync/account-status`

Bot reports account health (suspended, restricted, etc.).

**Auth**: `X-Bot-Token` required

**Request:**

```json
{
  "account_email": "user@example.com",
  "status": "suspended",
  "error": "Account restricted by Facebook"
}
```

**Response:** `200 OK`

```json
{
  "status": "updated",
  "account_email": "user@example.com",
  "updated_at": "2026-07-30T15:30:00Z"
}
```

## Image Handling

### Flow

1. ProSell returns signed URLs in `/fb-sync/pending` response
2. Bot downloads to `/tmp/fb-{product_id}/`
3. Bot converts WebP → JPEG using PIL
4. Bot uploads via Selenium file picker
5. Bot cleans up `/tmp/` after success

### Conversion Code (fb-auto-post)

```python
from PIL import Image
from io import BytesIO
from pathlib import Path
import requests
import tempfile
import shutil

def download_product_media(product: dict) -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix=f"fb-{product['id'][:8]}-"))

    for i, url in enumerate(product["image_urls"]):
        response = requests.get(url, timeout=30)
        img = Image.open(BytesIO(response.content))
        dest = temp_dir / f"img_{i:02d}.jpg"
        img.convert("RGB").save(dest, "JPEG", quality=90)

    return temp_dir

def cleanup_media(temp_dir: Path):
    shutil.rmtree(temp_dir, ignore_errors=True)
```

## Business Rules

| Rule                 | Default       | Configurable     |
| -------------------- | ------------- | ---------------- |
| Publication duration | 7 days        | Per organization |
| Expiration alert     | 2 days before | Per organization |
| Auto-renew           | Disabled      | Per organization |
| Max renewals         | Unlimited     | Per organization |

## Gaps / Future Work

1. **Tests**: Unit tests for `verify_bot_token`, tenant scoping
2. **UI Dashboard**: `/admin/fb-publications` consuming new history/status tables
3. **Product Detail Tab**: FB History in product detail view
4. **Renewal endpoints**: `/expiring`, `/renewed` not yet implemented
5. **Multi-account rotation**: Distribute posts across accounts
6. **Rate limiting**: Prevent FB account lockouts
7. **Scheduling**: Post at optimal times

## Related Documents

- `docs/BOT-MIGRATION-GUIDE.md` — Bot migration instructions
- `apps/api/src/prosell/infrastructure/api/routers/fb_sync_router.py` — Router implementation
- `apps/api/src/prosell/infrastructure/api/dependencies.py:verify_bot_token` — Auth dependency
