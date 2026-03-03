# OAuth Credentials Configured - 2026-03-03

## Status: ✅ CONFIGURED

### Google OAuth
- **Client ID**: Configured in `.env.local`
- **Client Secret**: Configured in `.env.local`
- **Redirect URI**: `http://localhost:8000/api/auth/oauth/google/callback`

### Facebook OAuth
- **App ID**: Configured in `.env.local` (placeholder)
- **App Secret**: Configured in `.env.local` (placeholder)
- **Redirect URI**: `http://localhost:3000/auth/callback/facebook`

### Docker Containers
Containers created and available:
- `prosell-api` - FastAPI backend (port 8000)
- `prosell-web` - Next.js frontend (port 3000)
- `prosell-db` - PostgreSQL 17 (port 5432)
- `prosell-redis` - Redis 7.4 (port 6379)

**Note**: Containers are currently stopped. Start with:
```bash
docker compose -f docker/docker-compose.yml up -d
```

### Environment File Location
**IMPORTANT**: Credentials are in `.env.local` (root), NOT `apps/api/.env`

```bash
# OAuth variables in .env.local:
GOOGLE_OAUTH_CLIENT_ID=***
GOOGLE_OAUTH_CLIENT_SECRET=***
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/oauth/google/callback
```

### Next Steps
1. Start Docker containers: `docker compose -f docker/docker-compose.yml up -d`
2. Start API (if not using Docker): `cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py --reload`
3. Start Web: `cd apps/web && pnpm dev`
4. Test OAuth flow in browser: `http://localhost:3000/auth/login`

### Production URLs (Future)
When deploying to production, update redirect URIs in Google Console:
- `https://api.prosell.saas/api/auth/oauth/google/callback`
- `https://staging-api.prosell.saas/api/auth/oauth/google/callback`

Reference: `docs/setup/google-oauth-setup.md`

---

**Date**: 2026-03-03
**Status**: Ready for testing
