---
task: oauth-cookie-fix
status: in_progress
last_updated: 2026-04-01T00:06:43.421Z
type: bugfix
---

<current_state>
**Debugging OAuth 401 Unauthorized error**

User logged in with Google OAuth successfully, but when frontend requests `/api/v1/vehicles`, backend returns 401 because cookies aren't being sent.

**Root Cause Identified:**
- Cookies set on `localhost:8000` (backend) aren't sent to `localhost:3000` (frontend)
- Browser treats different ports as different origins for cookies
- Next.js rewrites `/api/*` to backend, but cookies don't follow the rewrite

**Fix Applied:**
- Added `domain="localhost"` to all `set_cookie()` calls in auth_router.py
- Changed `secure=True` → `secure=settings.environment != "development"` (so cookies work with HTTP)
- Changed `samesite="strict"` → `samesite="lax"` (required for OAuth callback flow)

**Current Status:**
- Frontend: Running on localhost:3000 ✅
- Backend: Failed to start (needs manual restart)
- Changes made to: apps/api/src/prosell/infrastructure/api/routers/auth_router.py
- Frontend .env.local: Reverted to localhost:8000 (no .local changes needed)
</current_state>

<completed_work>

1. ✅ Identified root cause: Cookie domain mismatch between ports
2. ✅ Modified auth_router.py:
   - Added `domain="localhost"` to all 6 set_cookie() calls (login + oauth callback)
   - Changed `secure=True` to `secure=settings.environment != "development"`
   - Changed `samesite="strict"` to `samesite="lax"`
3. ✅ Reverted frontend .env.local back to `localhost:8000` (no need for .local)
4. ✅ Saved fix to Engram memory

</completed_work>

<remaining_work>

1. **Restart backend** with new cookie configuration
2. **Test OAuth flow**:
   - Clear browser cookies/storage
   - Login with Google OAuth
   - Verify cookies are set with `domain="localhost"`
   - Verify `/api/v1/vehicles` returns 200 (not 401)
3. **If still failing**: Debug cookie headers in browser DevTools
   - Check if cookies are being set at all
   - Check cookie attributes (domain, path, secure, samesite)
   - Verify cookies are sent with API requests

</remaining_work>

<decisions_made>

- **Domain fix over localhost.local**: User correctly pointed out that `localhost.local:3000` vs `localhost.local:8000` still have different ports, so that wouldn't fix the issue. The real fix is `domain="localhost"` (no port).
- **Secure flag**: Must be `False` in development because we're using HTTP, not HTTPS
- **SameSite**: Must be `lax` for OAuth callback to work (strict would block cookies after OAuth redirect)

</decisions_made>

<files_changed>

**Modified:**
- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py`
  - Lines ~178-205: Login endpoint cookies (3 cookies)
  - Lines ~425-453: OAuth callback cookies (3 cookies)
  - Changes: Added `domain="localhost"`, changed `secure` and `samesite`

- `apps/web/.env.local`
  - Reverted: `NEXT_PUBLIC_API_URL=http://localhost:8000` (no .local)

</files_changed>

<blockers>

- **Backend not running**: Failed to start after changes. Need to manually restart.
- **Need to clear browser cookies**: Old cookies with old attributes might interfere

</blockers>

<context>

**User's concern**: "no se que fue lo que hicistes igual dejaste el localhost.local"

User was right to question the approach. I initially suggested `localhost.local` but that doesn't solve the port issue. The correct fix is `domain="localhost"` without port, which allows cookies to be shared across all localhost ports.

**Mental state**: Confused about cookie domain behavior initially. After user pointed out the flaw, clarified that `domain="localhost"` (no port) is the correct approach, not `localhost.local`.

**Next step when resuming**: Restart backend manually and test the OAuth flow with fresh cookies.

</context>

<next_action>

1. Restart backend:
   ```bash
   cd /home/rpadron/proy/prosell-sass/apps/api
   source .venv/bin/activate
   fastapi dev src/prosell/infrastructure/api/main.py --reload --port 8000
   ```

2. Clear browser cookies (important! Old cookies have old attributes)

3. Test OAuth login at `http://localhost:3000/auth/login`

4. Verify `/api/v1/vehicles` returns 200 OK

5. If still 401, check DevTools → Application → Cookies:
   - Look for `access_token`, `refresh_token`, `user_data` cookies
   - Verify `domain=localhost` (no port)
   - Verify `secure=false` in dev
   - Verify `samesite=lax`

</next_action>

<resume_command>
To continue: Open this file and follow the steps in `<next_action>`
</resume_command>
