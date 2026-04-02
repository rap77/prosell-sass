# ProSell SaaS - Staging Deployment Checklist

**Date**: 2026-04-01
**Environment**: Staging
**Branch**: `main`
**Status**: 🟡 Preparation Complete - Ready for Deployment

---

## 📋 Pre-Deployment Checks

### 1. Environment Configuration ✅
- [x] `.env.staging` file created
- [ ] All `CHANGE_ME_*` values replaced with actual secrets
- [ ] JWT keys generated (`scripts/generate-jwt-keys.sh`)
- [ ] SendGrid API key configured
- [ ] Google OAuth app created (staging)
- [ ] Facebook OAuth app created (staging)
- [ ] OAuth redirect URIs set to `https://staging.prosell.com/api/auth/oauth/*/callback`

### 2. Database Preparation
- [ ] PostgreSQL 17 installed or external DB provisioned
- [ ] Database `prosell_staging` created
- [ ] Database user with proper permissions
- [ ] Run `alembic upgrade head` to apply all migrations
- [ ] Verify `dealers` table exists
- [ ] Verify `user_dealers` table exists
- [ ] Verify all 6 migrations applied

### 3. External Services
- [ ] SendGrid account active
- [ ] SendGrid API key with "Mail Send" permissions
- [ ] SendGrid sender email verified (`noreply@prosell.com`)
- [ ] Google OAuth app created
- [ ] Facebook OAuth app created
- [ ] Domain `staging.prosell.com` configured (DNS A record)

### 4. Code Verification
- [x] All tests passing (1027/1027)
- [x] No TypeScript errors
- [x] No pyright errors
- [x] Linting passed (ruff, eslint, prettier)
- [x] GGA code review passed
- [ ] Latest commits merged to `main`
- [ ] Docker images build successfully

### 5. Security Review
- [ ] No hardcoded secrets in code
- [ ] `.env.staging` in `.gitignore`
- [ ] JWT keys NOT in git
- [ ] API keys NOT in git
- [ ] CORS configured for staging domains only
- [ ] Rate limiting enabled
- [ ] File upload restrictions in place

---

## 🚀 Deployment Steps

### Step 1: Build Docker Images
```bash
# From project root
cd /home/rpadron/proy/prosell-sass

# Build API image
docker build -f docker/api.Dockerfile -t prosell-api:staging .

# Build Web image (with staging API URL)
docker build -f docker/web.Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://staging.prosell.com \
  -t prosell-web:staging .
```

### Step 2: Run Database Migrations
```bash
# Option A: Run migrations in Docker container
docker run --rm \
  --network host \
  -e DATABASE_URL="postgresql+asyncpg://postgres:PASSWORD@localhost:5432/prosell_staging" \
  prosell-api:staging \
  alembic upgrade head

# Option B: Run migrations locally (if DB is external)
cd apps/api
export DATABASE_URL="postgresql+asyncpg://postgres:PASSWORD@external-db:5432/prosell_staging"
uv run alembic upgrade head
```

### Step 3: Start All Services
```bash
# From docker directory
cd /home/rpadron/proy/prosell-sass/docker

# Start staging stack
docker-compose -f docker-compose.staging.yml up -d

# Verify all containers running
docker-compose -f docker-compose.staging.yml ps
```

### Step 4: Verify Health Endpoints
```bash
# API Health
curl https://staging.prosell.com/api/v1/health

# Expected response: {"status": "healthy", "version": "1.0.0"}

# Web App
curl https://staging.prosell.com/

# Expected: HTML response with ProSell app
```

### Step 5: Check Logs
```bash
# API logs
docker logs prosell-staging-api -f

# Web logs
docker logs prosell-staging-web -f

# DB logs
docker logs prosell-staging-db

# Redis logs
docker logs prosell-staging-redis
```

---

## ✅ Post-Deployment Verification

### Smoke Tests (Critical Path)

#### 1. Authentication Flow
- [ ] Navigate to `https://staging.prosell.com/login`
- [ ] Login with test account
- [ ] Verify session cookie set (httpOnly)
- [ ] Verify redirected to dashboard
- [ ] Logout works
- [ ] Verify cookies cleared

#### 2. OAuth Flows
- [ ] Google OAuth: Click "Continue with Google"
- [ ] Redirect to Google consent screen
- [ ] Authorize app
- [ ] Redirect back to staging with auth code
- [ ] User created/logged in
- [ ] Repeat for Facebook OAuth

#### 3. Email Verification
- [ ] Register new account
- [ ] Check email inbox (SendGrid)
- [ ] Click verification link
- [ ] Verify email confirmed
- [ ] Login works after verification

#### 4. Password Reset
- [ ] Click "Forgot Password"
- [ ] Enter email address
- [ ] Check email inbox
- [ ] Click reset link
- [ ] Set new password
- [ ] Login with new password

#### 5. 2FA Flow
- [ ] Enable 2FA in settings
- [ ] Scan QR code with authenticator app
- [ ] Verify 2FA code
- [ ] Login with 2FA enabled
- [ ] Verify backup codes work

#### 6. Inventory Features (MVP)
- [ ] Create vehicle (40+ fields)
- [ ] Upload vehicle image
- [ ] Edit vehicle
- [ ] Delete vehicle
- [ ] Bulk upload CSV (10 rows max)
- [ ] Verify VIN validation
- [ ] Assign vehicle to dealer
- [ ] Bulk assign dealer (multiple vehicles)
- [ ] Infinite scroll in catalog

#### 7. Role-Based Access
- [ ] Admin user can access all features
- [ ] Regular user has restricted access
- [ ] Dealer assignment respects permissions
- [ ] Unauthorized routes return 403

---

## 🔒 Security Validation

### Checklist
- [ ] No sensitive data in logs
- [ ] Passwords hashed (bcrypt)
- [ ] JWT tokens signed and verified
- [ ] CSRF protection active
- [ ] Rate limiting prevents abuse
- [ ] File upload restrictions enforced
- [ ] SQL injection protection (SQLAlchemy parameterized)
- [ ] XSS protection (React escaping)
- [ ] CORS headers correct
- [ ] Session cookies httpOnly + secure + sameSite

---

## 📊 Performance Validation

### Metrics
- [ ] API response time < 500ms (p95)
- [ ] Web app initial load < 3s
- [ ] Database query times reasonable
- [ ] No memory leaks in containers
- [ ] Redis caching working
- [ ] File uploads complete in reasonable time

---

## 🔄 Rollback Procedures

### If Critical Issues Found:

#### Option 1: Stop Services
```bash
cd /home/rpadron/proy/prosell-sass/docker
docker-compose -f docker-compose.staging.yml down
```

#### Option 2: Revert to Previous Version
```bash
# Identify previous working commit
git log --oneline -10

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and redeploy
docker build -f docker/api.Dockerfile -t prosell-api:staging .
docker build -f docker/web.Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://staging.prosell.com -t prosell-web:staging .

# Restart services
docker-compose -f docker-compose.staging.yml up -d
```

#### Option 3: Database Rollback
```bash
# Identify migration to rollback to
alembic history

# Rollback to specific migration
alembic downgrade <migration-revision>
```

---

## 📝 Monitoring Setup

### Logs
- **API logs**: `docker logs prosell-staging-api -f`
- **Web logs**: `docker logs prosell-staging-web -f`
- **DB logs**: `docker logs prosell-staging-db`
- **Redis logs**: `docker logs prosell-staging-redis`

### Health Checks
- **API**: `https://staging.prosell.com/api/v1/health`
- **Web**: `https://staging.prosell.com/`

### Metrics (Optional - Future)
- Sentry for error tracking
- Datadog/New Relic for APM
- Grafana for dashboards

---

## 🐛 Known Issues & Workarounds

### Current Issues (from development)
- **OAuth tenant_id=None**: Fixed in Phase 2, verify in staging
- **Rate limiting not enforced**: Confirm rate limits active
- **SendGrid not wired**: Verify real emails in staging

### Workarounds
- If OAuth fails: Check redirect URIs match exactly
- If emails not sent: Verify SendGrid API key and templates
- If DB errors: Check migrations applied with `alembic current`

---

## 📞 Contact & Support

### Deployment Team
- **DevOps**: [Contact]
- **Backend Lead**: [Contact]
- **Frontend Lead**: [Contact]

### Emergency Contacts
- **On-Call Engineer**: [Contact]
- **Product Owner**: [Contact]

---

## ✍️ Deployment Sign-Off

### Pre-Deployment
- [ ] Developer: ________________ Date: ______
- [ ] Tech Lead: ________________ Date: ______
- [ ] DevOps: ________________ Date: ______

### Post-Deployment
- [ ] Smoke Tests: ________________ Date: ______
- [ ] Security Review: ________________ Date: ______
- [ ] Performance Check: ________________ Date: ______

### Final Approval
- [ ] Product Owner: ________________ Date: ______
- [ ] Stakeholder: ________________ Date: ______

---

## 📅 Next Steps After Successful Staging

1. **Run full E2E test suite** (Phase 7 - pending)
2. **Performance testing** with load testing tools
3. **Security audit** with external tools (Snyk, OWASP ZAP)
4. **User acceptance testing (UAT)** with beta users
5. **Production deployment** preparation

---

*Last updated: 2026-04-01*
*Version: 1.0*
