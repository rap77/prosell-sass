# ProSell SaaS - Staging Secrets (TEMPORAL - DELETE AFTER USE)

## ⚠️ SECURITY WARNING
Delete this file after configuring .env.staging!

## Generated Passwords

### PostgreSQL
```
POSTGRES_PASSWORD=yQZMINddwF+ZzTRhTQJ/B1R9fXstcfUU5VcFDbNCdm0=
```

### Redis
```
REDIS_PASSWORD=HMgWYtJJeqqV8pxBIIIPMFpNYbNJ9/oH
```

## OAuth & SendGrid Instructions

### 1. Google OAuth App

**URL:** https://console.cloud.google.com/apis/credentials

**Steps:**
1. Create a new project or select existing
2. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "ProSell Staging"
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/oauth/google/callback`
   - `https://staging.prosell.com/api/auth/oauth/google/callback` (if using domain)
6. Click "Create"
7. Copy Client ID and Client Secret

**Required values:**
```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

---

### 2. Facebook OAuth App

**URL:** https://developers.facebook.com/apps

**Steps:**
1. Click "Create App" → "Business" type
2. App Name: "ProSell Staging"
3. Contact Email: your-email@example.com
4. Click "Create App"
5. Add product: "Facebook Login"
6. Go to Facebook Login → Settings
7. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/oauth/facebook/callback`
   - `https://staging.prosell.com/api/auth/oauth/facebook/callback` (if using domain)
8. In "App Settings" → "Basic", copy:
   - App ID → `FACEBOOK_OAUTH_APP_ID`
   - App Secret → `FACEBOOK_OAUTH_APP_SECRET`

**Required values:**
```
FACEBOOK_OAUTH_APP_ID=your-app-id-here
FACEBOOK_OAUTH_APP_SECRET=your-app-secret-here
```

---

### 3. SendGrid API Key

**URL:** https://app.sendgrid.com/settings/api_keys

**Steps:**
1. Click "Create API Key"
2. Name: "ProSell Staging"
3. Permissions:
   - ✅ Mail Send
   - ❌ All others unchecked
4. Click "Create & View"
5. Copy the API key (you won't see it again!)

**Required values:**
```
SENDGRID_API_KEY=SG.your-api-key-here
```

**Note:** Also verify sender email in SendGrid Settings → Sender Authentication
