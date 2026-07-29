# FB Sync Integration Spec

**Status**: IN PROGRESS
**Author**: Claude + rpadron
**Date**: 2026-07-28

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
│  marketplace_publications ◄─── tracking de cada post FB            │
│                         │                                           │
│  /api/v1/fb-sync/* ─────┼─── endpoints de sincronización            │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
                          │ HTTP (signed URLs, callbacks)
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│  fb-auto-post                                                       │
│                                                                     │
│  1. GET /fb-sync/pending ──► download images to /tmp/               │
│  2. Convert WebP → JPEG                                             │
│  3. Selenium publish to FB                                          │
│  4. POST /fb-sync/published ──► report success                      │
│  5. Cleanup /tmp/                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Model

### Table: `marketplace_publications`

| Column            | Type         | Description                           |
| ----------------- | ------------ | ------------------------------------- |
| `id`              | UUID         | PK                                    |
| `product_id`      | UUID         | FK → products                         |
| `tenant_id`       | UUID         | FK → organizations                    |
| `platform`        | VARCHAR(50)  | "facebook", future: "instagram"       |
| `account_email`   | VARCHAR(255) | FB account used                       |
| `account_alias`   | VARCHAR(100) | Friendly name (nullable)              |
| `fb_groups`       | JSONB        | Array of group IDs [1,2,3,5]          |
| `fb_post_id`      | VARCHAR(100) | FB's post ID if available             |
| `published_at`    | TIMESTAMP    | When published                        |
| `expires_at`      | TIMESTAMP    | published_at + 7 days                 |
| `last_renewed_at` | TIMESTAMP    | Last renewal (nullable)               |
| `deleted_at`      | TIMESTAMP    | When deleted (nullable)               |
| `status`          | VARCHAR(20)  | pending/active/expired/deleted/failed |
| `renewal_count`   | INTEGER      | Times renewed (default 0)             |
| `error_message`   | TEXT         | Error details if failed               |
| `created_at`      | TIMESTAMP    | Record creation                       |
| `updated_at`      | TIMESTAMP    | Last update                           |

### Indexes

- `ix_marketplace_publications_product_id`
- `ix_marketplace_publications_status`
- `ix_marketplace_publications_expires_at`
- `ix_marketplace_publications_tenant_id`

## API Endpoints

### 1. GET `/api/v1/fb-sync/pending`

Returns products approved for FB but without active publication.

**Query params:**

- `account_email` (optional): Filter by specific account
- `limit` (optional): Max products (default 10)

**Response:**

```json
{
  "products": [
    {
      "id": "uuid",
      "title": "2020 Ford Explorer XLT",
      "price": 17800,
      "currency": "USD",
      "description": "...",
      "location_city": "Orlando",
      "location_state": "Florida",
      "attributes": {
        "year": 2020,
        "make": "Ford",
        "model": "Explorer",
        "mileage": 70000,
        "body_type": "SUV",
        "exterior_color": "Gris",
        "interior_color": "Negro",
        "fuel_type": "Gasolina",
        "transmission": "Transmisión automática",
        "clean_title": false,
        "vin": "1FMSK7DH7LGA77418"
      },
      "image_urls": [
        "https://prosell.nyc3.digitaloceanspaces.com/...?signature=..."
      ],
      "video_urls": []
    }
  ]
}
```

**Note:** URLs are signed with 1-hour TTL.

### 2. POST `/api/v1/fb-sync/published`

Bot reports successful publication.

**Request:**

```json
{
  "product_id": "uuid",
  "account_email": "juanluisherrera26@hotmail.com",
  "account_alias": "Juan Luis",
  "fb_groups": [1, 2, 3, 5, 8],
  "fb_post_id": "123456789",
  "published_at": "2026-07-28T15:30:00Z"
}
```

**Response:** `201 Created` with publication record.

### 3. GET `/api/v1/fb-sync/expiring`

Returns publications expiring soon.

**Query params:**

- `days` (optional): Days until expiration (default 2)

**Response:**

```json
{
  "publications": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_title": "2020 Ford Explorer",
      "account_email": "...",
      "expires_at": "2026-07-30T15:30:00Z",
      "days_remaining": 2
    }
  ]
}
```

### 4. POST `/api/v1/fb-sync/renewed`

Bot reports successful renewal (delete + re-publish).

**Request:**

```json
{
  "publication_id": "uuid",
  "renewed_at": "2026-07-28T15:30:00Z",
  "new_fb_post_id": "987654321"
}
```

### 5. POST `/api/v1/fb-sync/deleted`

Bot reports deletion.

**Request:**

```json
{
  "publication_id": "uuid",
  "deleted_at": "2026-07-28T15:30:00Z"
}
```

### 6. POST `/api/v1/fb-sync/failed`

Bot reports failure.

**Request:**

```json
{
  "product_id": "uuid",
  "account_email": "...",
  "error": "Account temporarily locked",
  "failed_at": "2026-07-28T15:30:00Z"
}
```

## Image/Video Handling

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

    for i, url in enumerate(product.get("video_urls", [])):
        response = requests.get(url, timeout=120)
        dest = temp_dir / f"video_{i:02d}.mp4"
        dest.write_bytes(response.content)

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

1. **video_urls**: ProductModel doesn't have video support yet (Sprint A)
2. **Multi-account rotation**: Distribute posts across accounts
3. **Rate limiting**: Prevent FB account lockouts
4. **Scheduling**: Post at optimal times
5. **Analytics**: Views, engagement from FB (requires scraping)

## Migration

```sql
-- Alembic migration
CREATE TABLE marketplace_publications (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL DEFAULT 'facebook',
    account_email VARCHAR(255) NOT NULL,
    account_alias VARCHAR(100),
    fb_groups JSONB DEFAULT '[]',
    fb_post_id VARCHAR(100),
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_renewed_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    renewal_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ix_marketplace_publications_product_id ON marketplace_publications(product_id);
CREATE INDEX ix_marketplace_publications_status ON marketplace_publications(status);
CREATE INDEX ix_marketplace_publications_expires_at ON marketplace_publications(expires_at);
CREATE INDEX ix_marketplace_publications_tenant_id ON marketplace_publications(tenant_id);
```

## Effort Estimate

| Task                      | Hours              |
| ------------------------- | ------------------ |
| Alembic migration + model | 2                  |
| DTOs (request/response)   | 1                  |
| Endpoints (6)             | 4                  |
| Modify fb-auto-post       | 3                  |
| Tests                     | 2                  |
| **Total**                 | **12 (~1.5 days)** |

## Related Documents

- `architecture/fb-prosell-field-mapping` (engram)
- `architecture/fb-marketplace-masters` (engram)
- `apps/api/src/prosell/infrastructure/integrations/fb_marketplace_options.json`
