# ProSell SaaS - Staging Credentials

## ⚠️ WARNING: DELETE AFTER CONFIGURING .env.staging!

---

## ✅ Google OAuth (CONFIGURED)

```
GOOGLE_CLIENT_ID=480611397552-ispa23bvfhlknm2cu7m119eefabrqj7b.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

---

## ⏳ Facebook OAuth (PENDING)

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
8. In "App Settings" → "Basic", copy App ID and App Secret

**When ready, paste below:**
```
FACEBOOK_OAUTH_APP_ID=<paste here>
FACEBOOK_OAUTH_APP_SECRET=<paste here>
```

---

## ⏳ SendGrid API Key (PENDING)

**URL:** https://app.sendgrid.com/settings/api_keys

**Steps:**
1. Click "Create API Key"
2. Name: "ProSell Staging"
3. Permissions: ✅ Mail Send only
4. Click "Create & View"
5. Copy the API key

**When ready, paste below:**
```
SENDGRID_API_KEY=<paste here>
```

---

## 🔐 Generated Passwords

```
POSTGRES_PASSWORD=yQZMINddwF+ZzTRhTQJ/B1R9fXstcfUU5VcFDbNCdm0=
REDIS_PASSWORD=HMgWYtJJeqqV8pxBIIIPMFpNYbNJ9/oH
```

---

## 📝 Manual Configuration Required

Please edit `.env.staging` and replace these values:

1. Line ~43-44: Google OAuth ✅ (configured above)
2. Line ~48-49: Facebook OAuth (pending)
3. Line ~54: SendGrid API Key (pending)
4. Line ~77: POSTGRES_PASSWORD (use generated password above)
5. Line ~78: REDIS_PASSWORD (use generated password above)
