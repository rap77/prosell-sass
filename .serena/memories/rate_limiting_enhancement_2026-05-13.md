## What
Enhanced rate limiting middleware with environment-specific configuration and testing exemptions

## Why
Current rate limiting configuration doesn't differentiate between production and testing environments, causing E2E tests to fail due to 4 requests/minute limits on auth endpoints.

## Where
- Modified: `apps/api/src/prosell/infrastructure/api/middleware/rate_limit_middleware.py`
- New environment variables: Added to `apps/api/.env.test`
- Testing exemptions: Added to configuration logic

## Learned
- Need environment-specific rate limiting configuration
- Test IPs/hosts should be exempt from rate limiting
- Auth endpoints need much higher limits in testing (e.g., 100/minute vs 5/minute)
- Configuration should be flexible and environment-aware