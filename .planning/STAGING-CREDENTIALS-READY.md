# ProSell SaaS - Staging Credentials (READY TO COPY)

## ⚠️ INSTRUCTIONS
1. Open `.env.staging` in your editor
2. Replace ALL `CHANGE_ME_*` values with the values below
3. Save the file
4. Delete this file after configuration

---

## ✅ CONFIGURED VALUES

### Google OAuth
```
GOOGLE_CLIENT_ID=480611397552-ispa23bvfhlknm2cu7m119eefabrqj7b.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### SendGrid
```
SENDGRID_API_KEY=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
```

### Database & Redis
```
POSTGRES_PASSWORD=yQZMINddwF+ZzTRhTQJ/B1R9fXstcfUU5VcFDbNCdm0=
REDIS_PASSWORD=HMgWYtJJeqqV8pxBIIIPMFpNYbNJ9/oH
```

### Facebook OAuth (OMITTED)
```
# Facebook OAuth omitted - requires Business Manager verification
# Will be configured later before production deployment
FACEBOOK_OAUTH_APP_ID=
FACEBOOK_OAUTH_APP_SECRET=
```

---

## 📝 WHAT TO REPLACE IN .env.staging

Line ~43-44: Google OAuth → Use values above
Line ~48-49: Facebook OAuth → Leave empty or comment out
Line ~54: SendGrid → Use value above
Line ~77: POSTGRES_PASSWORD → Use generated password above
Line ~78: REDIS_PASSWORD → Use generated password above

---

## ✅ VERIFICATION CHECKLIST

After editing .env.staging:
- [ ] No `CHANGE_ME_*` values remain
- [ ] Google OAuth values are copied correctly
- [ ] SendGrid API key starts with `SG.`
- [ ] PostgreSQL password is copied
- [ ] Redis password is copied
- [ ] Facebook OAuth is empty (we'll add later)

---

*Generated: 2026-04-01*
*Delete this file after configuration!*
