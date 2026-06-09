# Technical Debt: OAuth External Setup (Google + Facebook)

> **Priority**: P1 (High) | **Estimate**: 30 minutes | **Complexity**: Low
> **Created**: 2026-02-20 | **Status**: ⏳ Pending | **Blocking**: OAuth production deployment
>
> **Impact**: OAuth login is 100% implemented in code but cannot be used without external OAuth app credentials.

---

## 📋 Overview

**Current State**:

- ✅ Backend OAuth code: 100% complete
- ✅ Frontend OAuth UI: 100% complete
- ✅ OAuth flow logic: 100% complete
- ✅ Rate limiting: 100% complete (Phase 7)
- ❌ External OAuth apps: NOT CREATED (blocking production use)

**OAuth 2.0 Flow Architecture (Backend Callback Pattern)**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     OAuth 2.0 Authorization Code Flow                       │
│                     (Backend Callback - Implemented ✅)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User clicks "Login with Google/Facebook"                               │
│     Frontend → GET /api/auth/oauth/{provider}/authorize                     │
│                                                                             │
│  2. Backend generates state_token and redirects to provider                │
│     Backend → 302 Redirect to https://accounts.google.com/o/oauth2/auth    │
│                                                                             │
│  3. User authenticates at Google/Facebook                                   │
│                                                                             │
│  4. Provider redirects BACK TO BACKEND with authorization code             │
│     Google → GET /api/auth/oauth/{provider}/callback?code=xxx&state=yyy    │
│                                                                             │
│  5. Backend exchanges code for tokens, fetches user info                   │
│     Backend → GET https://www.googleapis.com/oauth2/v2/userinfo            │
│                                                                             │
│  6. Backend creates/updates user, generates JWT tokens                     │
│                                                                             │
│  7. Backend sets httpOnly cookies and redirects to frontend                │
│     Backend → 302 Redirect to http://localhost:3000/dashboard              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Difference**: OAuth providers redirect to the **BACKEND**, not the frontend.
This is more secure and follows OAuth 2.0 best practices.

**What's Missing**:

1. Google OAuth app creation (Google Cloud Console)
2. Facebook OAuth app creation (Meta Developers)
3. Environment variables configuration

**Estimated Time**: 30 minutes total

- Google OAuth: 15 minutes
- Facebook OAuth: 15 minutes

---

## 🎯 Why This Is Technical Debt

OAuth implementation follows **Clean Architecture principles**:

```
Domain Layer → Application Layer → Infrastructure Layer
     ✅              ✅                    ✅
```

However, OAuth 2.0 protocol requires **external configuration**:

```
┌─────────────────────────────────────────────────────────┐
│  INTERNAL (Code - 100% Complete)                        │
│  ✅ OAuth entities, use cases, services, routers        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  EXTERNAL (Config - 0% Complete) ⚠️                     │
│  ❌ Google OAuth app creation                           │
│  ❌ Facebook OAuth app creation                         │
│  ❌ Environment variables setup                         │
└─────────────────────────────────────────────────────────┘
```

**This is technical debt** because the code is production-ready but requires external setup to function.

---

## 🔧 Part 1: Google OAuth Setup (15 minutes)

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create new project** (or select existing)

   ```
   Click "Select a project" → "New Project"
   Project name: ProSell OAuth (or any name you prefer)
   Organization: (your organization if applicable)
   Click "Create"
   ```

3. **Enable Google+ API / People API**
   ```
   Navigation menu → "APIs & Services" → "Library"
   Search: "Google+ API" or "People API"
   Click "Enable"
   ```

### Step 2: Configure OAuth Consent Screen

1. **Go to OAuth consent screen**

   ```
   Navigation menu → "APIs & Services" → "OAuth consent screen"
   ```

2. **Choose user type**
   - Select: **External** (for development/production)
   - Click "Create"

3. **Fill in app information**

   ```
   App name: ProSell
   User support email: your-email@example.com
   App logo: (optional, skip for now)
   Application home page: https://your-domain.com (or localhost for dev)
   Authorized domains: (add your domains)
   Developer contact: your-email@example.com
   ```

4. **Add scopes** (permissions)

   ```
   Click "Add or remove scopes"
   Search and add:
   - ./auth/userinfo.email
   - ./auth/userinfo.profile
   - openid
   Click "Update"
   ```

5. **Add test users** (for External user type)

   ```
   Click "Add users"
   Add your email address as test user
   Click "Save"
   ```

6. **Submit for verification** (OPTIONAL for development)
   - For development: Click "Save and Continue" (skip verification)
   - For production: Complete verification process

### Step 3: Create OAuth 2.0 Credentials

1. **Go to Credentials page**

   ```
   Navigation menu → "APIs & Services" → "Credentials"
   ```

2. **Create OAuth client ID**

   ```
   Click "Create Credentials" → "OAuth client ID"
   ```

3. **Configure application type**

   ```
   Application type: Web application
   Name: ProSell Web Client
   ```

4. **Configure authorized JavaScript origins**

   ```
   For DEVELOPMENT:
   - http://localhost:3000
   - http://127.0.0.1:3000

   For PRODUCTION (add later):
   - https://your-domain.com
   - https://www.your-domain.com
   ```

5. **Configure authorized redirect URIs**

   > **IMPORTANT**: With the new Backend Callback Flow, redirect URIs point to the BACKEND

   ```
   For DEVELOPMENT:
   - http://localhost:8000/api/auth/oauth/google/callback
   - http://127.0.0.1:8000/api/auth/oauth/google/callback

   For PRODUCTION (add later):
   - https://api.your-domain.com/api/auth/oauth/google/callback
   - https://your-backend.com/api/auth/oauth/google/callback
   ```

6. **Create and save credentials**

   ```
   Click "Create"
   ```

7. **Copy your credentials** ⚠️ **IMPORTANT**

   ```
   Client ID: 123456789-abcdefg.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxx

   Save these - you'll only see the Secret ONCE!
   ```

### Step 4: Configure Environment Variables

**Create or edit** `apps/api/.env`:

```bash
# =============================================================================
# OAUTH - Google
# =============================================================================

# Google OAuth Client ID (from Google Cloud Console)
GOOGLE_OAUTH_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"

# Google OAuth Client Secret (from Google Cloud Console)
GOOGLE_OAUTH_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxxxxxx"

# Google OAuth Redirect URI (must match Google Console exactly)
# Points to BACKEND callback endpoint
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:8000/api/auth/oauth/google/callback"

# For production, change to:
# GOOGLE_OAUTH_REDIRECT_URI="https://api.your-domain.com/api/auth/oauth/google/callback"
```

### Step 5: Test OAuth Flow

#### Option A: Test with Frontend UI

1. **Start backend** (Terminal 1)

   ```bash
   cd apps/api
   source .venv/bin/activate
   uvicorn prosell.infrastructure.api.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start frontend** (Terminal 2)

   ```bash
   cd apps/web
   pnpm dev
   ```

3. **Open browser**

   ```
   http://localhost:3000/auth/login
   ```

4. **Click "Login with Google"**
   - Should redirect to Google OAuth consent screen
   - Login with your Google account
   - Approve permissions
   - Redirect back to `http://localhost:3000/auth/callback/google`
   - **SUCCESS**: User logged in ✅

#### Option B: Test with cURL

1. **Get OAuth URL**

   ```bash
   curl "http://localhost:8000/api/auth/oauth/google?url" | jq
   ```

2. **Copy `auth_url` from response**

   ```json
   {
     "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=..."
   }
   ```

3. **Open auth_url in browser**
   - Login with Google
   - Approve permissions
   - Google redirects to: `http://localhost:3000/auth/callback/google?code=4/0AXXXXX...`

4. **Copy `code` from URL**

   ```
   http://localhost:3000/auth/callback/google?code=4/0AXXXXX&scope=...
   ```

5. **Exchange code for tokens**

   ```bash
   curl -X POST "http://localhost:8000/api/auth/oauth/callback" \
     -H "Content-Type: application/json" \
     -d '{
       "provider": "google",
       "code": "4/0AXXXXX...",
       "redirect_uri": "http://localhost:3000/auth/callback/google"
     }' | jq
   ```

6. **Expected response**
   ```json
   {
     "access_token": "eyJ...",
     "refresh_token": "eyJ...",
     "user": {
       "id": "uuid",
       "email": "user@gmail.com",
       "full_name": "John Doe",
       "avatar_url": "https://..."
     }
   }
   ```

---

## 📘 Part 2: Facebook OAuth Setup (15 minutes)

### Step 1: Create Facebook App

1. **Go to Meta for Developers**
   - URL: https://developers.facebook.com/
   - Sign in with your Facebook account

2. **Create new app**

   ```
   Click "My Apps" → "Create App"
   ```

3. **Choose app type**

   ```
   Select: "Consumer"
   Click "Next"
   ```

4. **Fill in app information**

   ```
   App name: ProSell
   App contact email: your-email@example.com
   ```

5. **Create app**
   ```
   Click "Create App"
   Complete security check (Captcha)
   ```

### Step 2: Configure Facebook Login

1. **Add Facebook Login product**

   ```
   Dashboard → "Add Product" → "Facebook Login"
   Click "Set Up"
   ```

2. **Configure OAuth redirect URIs**

   ```
   Go to "Facebook Login" → "Settings"

   Valid OAuth Redirect URIs:
   For DEVELOPMENT:
   - http://localhost:8000/api/auth/oauth/facebook/callback
   - http://127.0.0.1:8000/api/auth/oauth/facebook/callback

   For PRODUCTION (add later):
   - https://api.your-domain.com/api/auth/oauth/facebook/callback
   - https://your-backend.com/api/auth/oauth/facebook/callback

   Click "Save Changes"
   ```

3. **Get your app credentials**

   ```
   Dashboard → "Settings" → "Basic"

   App ID: 1234567890123456
   App Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 3: Configure Environment Variables

**Add to** `apps/api/.env`:

```bash
# =============================================================================
# OAUTH - Facebook
# =============================================================================

# Facebook OAuth App ID (from Meta Developers)
FACEBOOK_OAUTH_APP_ID="1234567890123456"

# Facebook OAuth App Secret (from Meta Developers)
FACEBOOK_OAUTH_APP_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Facebook OAuth Redirect URI (must match Facebook app settings)
# Points to BACKEND callback endpoint
FACEBOOK_OAUTH_REDIRECT_URI="http://localhost:8000/api/auth/oauth/facebook/callback"

# For production, change to:
# FACEBOOK_OAUTH_REDIRECT_URI="https://api.your-domain.com/api/auth/oauth/facebook/callback"
```

### Step 4: Test Facebook OAuth Flow

Same process as Google (Option A or B above), using "Login with Facebook" button.

---

## 🚀 Part 3: Production Deployment

### When Ready for Production

#### 1. Update Google OAuth App

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com/

2. **Edit OAuth client**

   ```
   APIs & Services → Credentials
   Click on your OAuth 2.0 Client ID
   ```

3. **Add production URIs**

   ```
   Authorized JavaScript origins:
   - https://your-domain.com
   - https://www.your-domain.com

   Authorized redirect URIs:
   - https://api.your-domain.com/api/auth/oauth/google/callback
   - https://your-backend.com/api/auth/oauth/google/callback
   ```

4. **Save changes**

#### 2. Update Facebook OAuth App

1. **Go to Meta Developers**
   - https://developers.facebook.com/

2. **Edit app settings**

   ```
   Facebook Login → Settings
   ```

3. **Add production redirect URI**

   ```
   Valid OAuth Redirect URIs:
   - https://api.your-domain.com/api/auth/oauth/facebook/callback
   ```

4. **Save changes**

#### 3. Update Environment Variables

**Production** `.env`:

```bash
# Production URIs (point to API backend, not frontend)
GOOGLE_OAUTH_REDIRECT_URI="https://api.your-domain.com/api/auth/oauth/google/callback"
FACEBOOK_OAUTH_REDIRECT_URI="https://api.your-domain.com/api/auth/oauth/facebook/callback"
```

#### 4. Deploy

```bash
# Deploy to production (Vercel, Railway, etc.)
# OAuth will work with production URIs
```

---

## ⚠️ Troubleshooting

### Common Issues

#### 1. `redirect_uri_mismatch` Error

**Symptom**:

```
Error 400: redirect_uri_mismatch
```

**Solution**:

- Check that the redirect URI in your `.env` **EXACTLY MATCHES** the one in Google/Facebook Console
- Include `http://` or `https://`
- Include port number for development (`:3000`)
- No trailing slashes

#### 2. `invalid_client` Error

**Symptom**:

```
Error 401: invalid_client
```

**Solution**:

- Verify `client_id` and `client_secret` are correct
- Check for extra spaces in `.env` file
- Regenerate credentials if needed

#### 3. OAuth button doesn't redirect

**Symptom**: Click "Login with Google" but nothing happens

**Solution**:

- Check browser console for errors
- Verify backend is running on port 8000
- Verify frontend is running on port 3000
- Check CORS configuration in backend

#### 4. User not created after OAuth login

**Symptom**: OAuth flow completes but user not in database

**Solution**:

- Check backend logs for errors
- Verify database connection
- Check `oauth_login.py` use case logic
- Verify user repository implementation

### Debug Mode

**Enable verbose logging**:

```python
# apps/api/src/prosell/infrastructure/api/main.py
import logging

logging.basicConfig(level=logging.DEBUG)
```

**Check backend logs**:

```bash
# Should show OAuth flow steps
DEBUG:prosell.application.use_cases.auth.oauth_login:Executing OAuth login
DEBUG:prosell.infrastructure.repositories.oauth_repository:Getting user by OAuth
```

---

## 📊 Security Best Practices

### DO ✅

1. **Store credentials in `.env`** (never commit to git)
2. **Use different OAuth apps for dev/prod** (optional but recommended)
3. **Add redirect URIs for all environments** (localhost, staging, production)
4. **Rotate credentials if compromised**
5. **Limit scopes to minimum required** (email, profile only)
6. **Use HTTPS in production** (HTTP only for localhost)
7. **Set appropriate cookie flags** (httpOnly, secure, sameSite)

### DON'T ❌

1. **Never commit `.env` file** to git
2. **Never share `client_secret` publicly**
3. **Never use production credentials in development**
4. **Never skip OAuth consent screen configuration**
5. **Never add `localhost` URIs to production OAuth app**

---

## 📋 Checklist

### Development Setup

- [ ] Create Google Cloud project
- [ ] Enable Google+ API / People API
- [ ] Configure OAuth consent screen
- [ ] Create OAuth 2.0 credentials
- [ ] Copy `client_id` and `client_secret`
- [ ] Add `GOOGLE_OAUTH_*` variables to `.env`
- [ ] Add `http://localhost:3000` to authorized URIs
- [ ] Test Google OAuth flow
- [ ] Create Facebook app
- [ ] Add Facebook Login product
- [ ] Configure OAuth redirect URIs
- [ ] Copy `app_id` and `app_secret`
- [ ] Add `FACEBOOK_OAUTH_*` variables to `.env`
- [ ] Test Facebook OAuth flow

### Production Setup (when ready)

- [ ] Add production domain to Google OAuth app
- [ ] Add production domain to Facebook app
- [ ] Update `.env` with production URIs
- [ ] Deploy to production
- [ ] Test OAuth flow in production
- [ ] Monitor error logs

---

## 🔗 Resources

### Google OAuth

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google+ API Documentation](https://developers.google.com/+/api/latest)
- [People API Documentation](https://developers.google.com/people/api/rest/v1/people)
- [OAuth 2.0 for Mobile & Desktop Apps](https://developers.google.com/identity/protocols/oauth2)

### Facebook OAuth

- [Meta for Developers](https://developers.facebook.com/)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [OAuth Reference](https://developers.facebook.com/docs/reference/android/com.facebook/login)

### OAuth 2.0

- [RFC 6749 - OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/rfc6819)

---

## 📝 Notes

- **Time Estimate**: 30 minutes total (15 min Google + 15 min Facebook)
- **Complexity**: Low (no code changes, just external setup)
- **Risk**: Low (can be done independently, no deployment required)
- **Dependencies**: None (can be done anytime)

**Status**: ⏳ **PENDING** - Documentation updated for Backend Callback Flow (2026-03-01)
**Next Step**: Complete Google OAuth setup (Part 1, Steps 1-5)

---

**Last Updated**: 2026-03-01
**Document**: `docs/technical-debt/oauth-external-setup.md`
**Related PRP**: `PRPs/oauth-backend-callbacks.md` (OAuth Backend Callbacks - Phase 5 & 7)
