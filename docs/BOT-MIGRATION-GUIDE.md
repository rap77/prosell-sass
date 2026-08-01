# FB-Auto-Post Bot Migration Guide

**Date**: 2026-07-30
**Breaking Change**: All `/fb-sync/*` endpoints now require `X-Bot-Token` authentication.

## Summary

Commits `c6e79363`, `5d17e952`, `846a1a33` add:

1. **X-Bot-Token auth** on ALL bot endpoints (was open on internal network)
2. **Tenant scoping** — bot can only access products/accounts within the same tenant
3. **New callback fields** — `fb_groups` (structured), `error_code`

Without updating the bot, all requests will fail with **401 Unauthorized**.

---

## 1. Authentication Setup

### Header Required

```
X-Bot-Token: <shared-secret>
```

Add this header to **every** request to `/api/v1/fb-sync/*`.

### Get the Token

Coordinate with the ProSell team to get the shared secret. The same value must be set:

- **Server**: `FB_BOT_API_KEY` environment variable
- **Bot**: Stored securely (env var, secrets manager, etc.)

### Error Codes

| Status | Meaning                                                           |
| ------ | ----------------------------------------------------------------- |
| 401    | Missing or invalid `X-Bot-Token`                                  |
| 403    | Account doesn't belong to product's tenant (cross-tenant attempt) |
| 409    | FB account is suspended/restricted, cannot create publication     |
| 503    | Server misconfiguration (`FB_BOT_API_KEY` not set)                |

---

## 2. Endpoint Changes

### GET /fb-sync/pending

**No breaking changes**, but now:

- Requires `X-Bot-Token` header
- Returns only products from the **same tenant** as the FB account
- Returns 404 if account email not found or inactive

```bash
curl -H "X-Bot-Token: $BOT_TOKEN" \
  "https://api.prosell.saas/api/v1/fb-sync/pending?account_email=user@example.com&limit=10"
```

### POST /fb-sync/callback

**New fields** (optional, backwards compatible):

```json
{
  "product_id": "uuid",
  "status": "published",
  "account_email": "user@example.com",
  "fb_post_id": "123456789",

  "fb_groups": [
    { "position": 1, "fb_group_id": "111", "name": "Cars Miami" },
    { "position": 2, "fb_group_id": "222", "name": "Autos Florida" }
  ],
  "error_code": null
}
```

| Field                | Type                                    | Notes                                                                    |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| `fb_groups`          | `list[{position, fb_group_id?, name?}]` | **New**: Structured group info. Preferred over `fb_group_positions`.     |
| `fb_group_positions` | `list[int]`                             | **Deprecated**: Still works, but migrate to `fb_groups`.                 |
| `error_code`         | `string?`                               | **New**: `rate_limit`, `suspended`, `post_limit`, `login_required`, etc. |

**Tenant validation**: The server verifies that the FB account belongs to the same tenant as the product. If not → 403.

```bash
curl -X POST -H "X-Bot-Token: $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"...", "status":"published", "account_email":"...", "fb_post_id":"..."}' \
  "https://api.prosell.saas/api/v1/fb-sync/callback"
```

### GET /fb-sync/accounts

**No breaking changes**, but now requires `X-Bot-Token`.

```bash
curl -H "X-Bot-Token: $BOT_TOKEN" \
  "https://api.prosell.saas/api/v1/fb-sync/accounts"
```

### GET /fb-sync/account-config

**No breaking changes**, but now requires `X-Bot-Token`.

Returns decrypted FB password — this endpoint was the main security risk before auth was added.

```bash
curl -H "X-Bot-Token: $BOT_TOKEN" \
  "https://api.prosell.saas/api/v1/fb-sync/account-config?email=user@example.com"
```

### POST /fb-sync/account-status

**No breaking changes**, but now requires `X-Bot-Token`.

```bash
curl -X POST -H "X-Bot-Token: $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"account_email":"user@example.com", "status":"suspended", "error":"Account restricted"}' \
  "https://api.prosell.saas/api/v1/fb-sync/account-status"
```

---

## 3. Migration Checklist

- [ ] Get `X-Bot-Token` value from ProSell team
- [ ] Store token securely in bot's environment
- [ ] Add `X-Bot-Token` header to all `/fb-sync/*` requests
- [ ] Handle new error codes (401, 403, 409, 503)
- [ ] Migrate from `fb_group_positions` to `fb_groups` in callback
- [ ] Send `error_code` on failures (rate_limit, suspended, etc.)
- [ ] Test against staging before production

---

## 4. Testing Against Staging

```bash
# Set token
export BOT_TOKEN="your-staging-token"
export API_URL="https://staging-api.prosell.saas"

# Test auth
curl -I -H "X-Bot-Token: $BOT_TOKEN" "$API_URL/api/v1/fb-sync/accounts"
# Expected: 200 OK

# Test without token (should fail)
curl -I "$API_URL/api/v1/fb-sync/accounts"
# Expected: 401 Unauthorized

# Test pending products
curl -H "X-Bot-Token: $BOT_TOKEN" \
  "$API_URL/api/v1/fb-sync/pending?account_email=test@example.com"

# Test callback
curl -X POST -H "X-Bot-Token: $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "test-uuid",
    "status": "published",
    "account_email": "test@example.com",
    "fb_post_id": "12345",
    "fb_groups": [{"position": 1, "fb_group_id": "111", "name": "Test Group"}]
  }' \
  "$API_URL/api/v1/fb-sync/callback"
```

---

## 5. Rollback Plan

If the bot update can't be deployed immediately:

1. **Temporary**: Set `FB_BOT_API_KEY=""` on server (disables auth, returns 503)
2. **Not recommended**: This leaves endpoints open — only use as emergency rollback

The proper fix is to update the bot to send the header.
