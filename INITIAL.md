# INITIAL.md - Sprint 1-2: Authentication System

> **Sprint**: 1-2 | **Duration**: 4 weeks | **Priority**: P0 (Critical)
> **Tech Stack**: Python 3.13, FastAPI 0.115+, Next.js 16, React 19, Tailwind 4

---

## 1. Executive Summary

Implement a complete authentication and authorization system for ProSell SaaS, including user registration, email verification, login with JWT tokens, OAuth social login, 2FA with TOTP, and a full RBAC (Role-Based Access Control) system with 6 distinct roles.

**Business Value**: This is the foundation for all other features. Without proper auth, no other functionality can be built securely.

---

## 2. User Stories

### US-001: User Registration

**As a** new user
**I want** to register with email and password
**So that** I can access the platform

**Acceptance Criteria**:

```gherkin
Scenario: Successful registration with valid email
  GIVEN an unregistered user
  WHEN registering with:
    - valid and unique email
    - strong password (8+ chars, uppercase, number, special)
    - terms accepted
  THEN account is created with status PENDING_VERIFICATION
  AND verification email is sent with 24h expiration token
  AND user CANNOT login until email verified
  AND message shows "Check your email to verify"

Scenario: Email already registered
  GIVEN an email already exists in system
  WHEN attempting to register with same email
  THEN error shows "Email already registered"
  AND NO new account is created
  AND option offered "Forgot password?"

Scenario: Weak password
  GIVEN user attempts registration
  WHEN password does NOT meet minimum requirements
  THEN specific error shows:
    "Password must have at least 8 characters,
     one uppercase, one number, and one special character"
  AND password field marked invalid

Scenario: Invalid email format
  GIVEN user enters invalid email format
  WHEN submitting form
  THEN error shows "Invalid email format"
  AND correct format suggested: user@example.com
```

**Negative Scenarios**:

- Email with + alias (test+alias@gmail.com) → treat as unique
- Temporary domain (tempmail.com) → block with warning
- IP with multiple registrations → rate limit 3/hour
- Bot detected → require reCAPTCHA v3

---

### US-002: Login

**As a** registered user
**I want** to login with my credentials
**So that** I can access my account

**Acceptance Criteria**:

```gherkin
Scenario: Successful login
  GIVEN a verified user
  WHEN entering correct email and password
  THEN redirected to dashboard
  AND tokens are generated:
    - access_token (expires 1h)
    - refresh_token (expires 7 days)
  AND last login IP and timestamp are recorded

Scenario: Invalid credentials
  GIVEN user enters incorrect email or password
  WHEN submitting form
  THEN error shows "Invalid credentials"
  AND failed attempt counter increments
  AND does NOT reveal if email exists (security)

Scenario: Account locked due to attempts
  GIVEN user has 5 failed attempts
  WHEN attempting login again
  THEN error shows "Account temporarily locked"
  AND auto-unlocks after 15 minutes
  AND email notification sent about lock

Scenario: Email not verified
  GIVEN user registered but NOT verified
  WHEN attempting login
  THEN error shows "You must verify your email first"
  AND option offered "Resend verification email"

Scenario: "Remember me" enabled
  GIVEN user checks "Remember me"
  WHEN login is successful
  THEN refresh_token expires in 30 days (not 7 days)
  AND httpOnly cookie is saved in browser
```

**Password Recovery Flow**:

```gherkin
Scenario: Successful password recovery
  GIVEN user forgot their password
  WHEN requesting recovery with their email
  THEN email sent with reset link (expires 1h)
  AND token is unique and single-use
  WHEN using link to set new password
  THEN can establish new password
  AND existing tokens are revoked
  AND must login again
```

---

### US-003: OAuth Social Login

**As a** new user
**I want** to login with Google/Facebook
**So that** I can access the platform quickly

**Acceptance Criteria**:

```gherkin
Scenario: First time Google login
  GIVEN user without account in ProSell
  WHEN clicking "Continue with Google"
  THEN redirected to Google OAuth
  WHEN authorizing ProSell
  THEN account automatically created with:
    - Google email
    - Google avatar
    - status VERIFIED (no email verification needed)
  AND redirected to onboarding (role selection)

Scenario: Account exists with same email
  GIVEN user with email/password account
  WHEN logging with Google (same email)
  THEN option shown:
    - "Link Google account" → updates account
    - "Use existing account" → requires password
  AND after linking, can use Google

Scenario: Account linking
  GIVEN user logged in with email/password
  WHEN going to Settings → "Link Google"
  THEN can add Google as login method
  AND can use both methods afterwards
```

**Google Data Mapping**:

```
Google Profile → ProSell User
  email         → email (VERIFIED)
  name          → full_name
  picture       → avatar_url
  sub           → google_id (social_id)
```

---

### US-004: 2FA (Two-Factor Authentication)

**As an** admin user
**I want** to enable 2FA
**So that** my account is more secure

**Acceptance Criteria**:

```gherkin
Scenario: Initial 2FA setup
  GIVEN user with ADMIN/MANAGER role
  WHEN logging in for first time
  THEN forced to configure 2FA
  AND QR code shown for Google Authenticator
  AND 10 backup codes generated
  AND must enter current code to confirm

Scenario: Login with 2FA
  GIVEN user with 2FA enabled
  WHEN entering correct email and password
  THEN redirected to "Enter your 2FA code" page
  WHEN entering correct TOTP code (6 digits)
  THEN accesses dashboard
  AND code valid only for 30 seconds

Scenario: Invalid 2FA code
  GIVEN user on 2FA page
  WHEN entering incorrect code
  THEN error shows "Invalid code"
  AND has 5 attempts before temporary lock
  AND can use backup code if lost access

Scenario: Using backup code
  GIVEN user lost access to Authenticator
  WHEN using one of backup codes
  THEN code is valid
  AND that backup code is consumed
  AND shows "Remaining codes: X"
  WHEN only 3 codes remain
  THEN suggests regenerating new codes
```

**2FA Rules**:
| Role | 2FA Required | From When |
|------|--------------|-----------|
| MASTER | YES | Immediate |
| MANAGER | YES | Immediate |
| SELLER_PROSELL | NO | - |
| ORG_ADMIN | YES | When creating org |
| ORG_SELLER | NO | - |
| CLIENT | NO | - |

---

### US-005: RBAC System

**As a** system administrator
**I want** to control access by roles
**So that** users can only access what they're allowed

**Acceptance Criteria**:

```gherkin
Scenario: Permission verification on endpoint
  GIVEN user with ORG_ADMIN role
  WHEN attempting GET /api/products (all products)
  THEN receives HTTP 403 Forbidden
  AND error message: "You don't have permission for this action"

Scenario: Permission verification in UI
  GIVEN user with ORG_SELLER role
  WHEN on dashboard
  THEN does NOT see "Create Organization" button
  AND does NOT see "Global Commissions" section
  AND ONLY sees products from their organization

Scenario: User with multiple roles
  GIVEN user with roles ORG_ADMIN and SELLER_PROSELL
  WHEN accessing system
  THEN has permissions from BOTH roles
  AND can switch context between organizations
```

---

## 3. Data Model

### 3.1 Core Entities

```python
# User Entity
User:
  - id: UUID (PK)
  - email: Email (unique, indexed)
  - password_hash: str (nullable, for OAuth users)
  - full_name: str
  - avatar_url: str (nullable)
  - status: Enum[ACTIVE, PENDING_VERIFICATION, SUSPENDED]
  - email_verified: bool
  - email_verified_at: datetime (nullable)
  - is_2fa_enabled: bool
  - totp_secret: str (encrypted, nullable)
  - backup_codes: List[str] (encrypted, nullable)
  - last_login_at: datetime (nullable)
  - last_login_ip: str (nullable)
  - failed_login_attempts: int
  - locked_until: datetime (nullable)
  - created_at: datetime
  - updated_at: datetime
  - tenant_id: UUID (nullable, for multi-tenant)

# Role Entity
Role:
  - id: UUID (PK)
  - name: Enum[MASTER, MANAGER, SELLER_PROSELL, ORG_ADMIN, ORG_SELLER, CLIENT]
  - description: str
  - is_system_role: bool (predefined roles cannot be deleted)
  - created_at: datetime

# Permission Entity
Permission:
  - id: UUID (PK)
  - resource: str (e.g., "users", "products", "organizations")
  - action: str (e.g., "create", "read", "update", "delete")
  - description: str

# UserRole (Many-to-Many)
UserRole:
  - id: UUID (PK)
  - user_id: UUID (FK)
  - role_id: UUID (FK)
  - tenant_id: UUID (nullable, for org-specific roles)
  - assigned_at: datetime
  - assigned_by: UUID (FK to User)

# RolePermission (Many-to-Many)
RolePermission:
  - id: UUID (PK)
  - role_id: UUID (FK)
  - permission_id: UUID (FK)

# Session Entity
Session:
  - id: UUID (PK)
  - user_id: UUID (FK)
  - refresh_token: str (hashed)
  - access_token_hash: str
  - ip_address: str
  - user_agent: str
  - expires_at: datetime
  - created_at: datetime
  - revoked_at: datetime (nullable)

# RefreshToken Entity (for rotation)
RefreshToken:
  - id: UUID (PK)
  - user_id: UUID (FK)
  - token: str (hashed)
  - token_family: str (for rotation detection)
  - expires_at: datetime
  - created_at: datetime
  - revoked_at: datetime (nullable)
  - replaced_by: UUID (FK, nullable)

# EmailVerificationToken Entity
EmailVerificationToken:
  - id: UUID (PK)
  - user_id: UUID (FK)
  - token: str (unique)
  - expires_at: datetime
  - used_at: datetime (nullable)
  - created_at: datetime

# PasswordResetToken Entity
PasswordResetToken:
  - id: UUID (PK)
  - user_id: UUID (FK)
  - token: str (unique)
  - expires_at: datetime
  - used_at: datetime (nullable)
  - created_at: datetime

# OAuthAccount Entity
OAuthAccount:
  - id: UUID (PK)
  - user_id: UUID (FK)
  - provider: Enum[GOOGLE, FACEBOOK]
  - provider_user_id: str (social ID from provider)
  - access_token: str (encrypted)
  - refresh_token: str (encrypted, nullable)
  - expires_at: datetime (nullable)
  - created_at: datetime
  - updated_at: datetime
```

### 3.2 Role Matrix

```
MASTER (ProSell owner)
├── MANAGER (Manages team, assigned to orgs)
│   └── SELLER_PROSELL (Sells from all orgs)
│
ORGANIZATION
├── ORG_ADMIN (Admin of their org)
│   └── ORG_SELLER (Sells from their org)
│
PUBLIC
└── CLIENT (Buyer)
```

| Action               | Master | Manager | Seller PS | Org Admin | Org Seller | Client |
| -------------------- | ------ | ------- | --------- | --------- | ---------- | ------ |
| Create organization  | ✅     | ❌      | ❌        | ❌        | ❌         | ❌     |
| Approve products     | ✅     | ❌      | ❌        | ❌        | ❌         | ❌     |
| View all products    | ✅     | ✅\*    | ✅        | ❌        | ❌         | 🌐     |
| Create product       | ✅     | ❌      | ❌        | ✅\*\*    | ❌         | ❌     |
| Create appointment   | ✅     | ✅      | ✅        | ✅        | ✅         | ❌     |
| Register sale        | ✅     | ✅\*    | ❌        | ✅\*\*    | ❌         | ❌     |
| View own commissions | ✅     | ✅      | ✅        | ✅        | ✅         | ❌     |
| Edit % commissions   | ✅     | ❌      | ❌        | ❌        | ❌         | ❌     |
| Manage teams         | ✅     | ✅      | ❌        | ❌        | ❌         | ❌     |

\*Only assigned orgs | \*\*Only their org | 🌐Public only

---

## 4. API Endpoints

### 4.1 Authentication Endpoints

```python
# Registration
POST /api/auth/register
  Request: { email, password, full_name, accept_terms }
  Response: { user_id, email, status, message }
  Status: 201

# Email Verification
POST /api/auth/verify-email
  Request: { token }
  Response: { success, message }
  Status: 200

# Resend Verification
POST /api/auth/resend-verification
  Request: { email }
  Response: { success, message }
  Status: 200

# Login
POST /api/auth/login
  Request: { email, password, remember_me }
  Response: { access_token, refresh_token, user }
  Status: 200

# Refresh Token
POST /api/auth/refresh
  Request: { refresh_token }
  Response: { access_token, refresh_token }
  Status: 200

# Logout
POST /api/auth/logout
  Headers: Authorization: Bearer {access_token}
  Response: { success, message }
  Status: 200

# Forgot Password
POST /api/auth/forgot-password
  Request: { email }
  Response: { success, message }
  Status: 200

# Reset Password
POST /api/auth/reset-password
  Request: { token, new_password }
  Response: { success, message }
  Status: 200

# Get Current User
GET /api/auth/me
  Headers: Authorization: Bearer {access_token}
  Response: { user, roles, permissions }
  Status: 200

# Update Profile
PUT /api/auth/profile
  Headers: Authorization: Bearer {access_token}
  Request: { full_name, avatar_url }
  Response: { user }
  Status: 200

# Change Password
PUT /api/auth/change-password
  Headers: Authorization: Bearer {access_token}
  Request: { current_password, new_password }
  Response: { success, message }
  Status: 200
```

### 4.2 OAuth Endpoints

```python
# Google OAuth
GET /api/auth/oauth/google
  Redirects to Google consent screen

GET /api/auth/oauth/google/callback
  Query: code, state
  Response: { access_token, refresh_token, user }
  Status: 200

# Facebook OAuth
GET /api/auth/oauth/facebook
  Redirects to Facebook consent screen

GET /api/auth/oauth/facebook/callback
  Query: code, state
  Response: { access_token, refresh_token, user }
  Status: 200

# Link OAuth Account
POST /api/auth/oauth/link
  Headers: Authorization: Bearer {access_token}
  Request: { provider, code }
  Response: { success, message }
  Status: 200

# Unlink OAuth Account
DELETE /api/auth/oauth/unlink
  Headers: Authorization: Bearer {access_token}
  Request: { provider }
  Response: { success, message }
  Status: 200
```

### 4.3 2FA Endpoints

```python
# Enable 2FA
POST /api/auth/2fa/enable
  Headers: Authorization: Bearer {access_token}
  Response: { qr_code_uri, backup_codes, secret }
  Status: 200

# Verify 2FA Setup
POST /api/auth/2fa/verify-setup
  Headers: Authorization: Bearer {access_token}
  Request: { code }
  Response: { success, message }
  Status: 200

# Verify 2FA During Login
POST /api/auth/2fa/verify
  Request: { email, code, temp_token }
  Response: { access_token, refresh_token, user }
  Status: 200

# Disable 2FA
POST /api/auth/2fa/disable
  Headers: Authorization: Bearer {access_token}
  Request: { code }
  Response: { success, message }
  Status: 200

# Regenerate Backup Codes
POST /api/auth/2fa/regenerate-codes
  Headers: Authorization: Bearer {access_token}
  Request: { code }
  Response: { backup_codes }
  Status: 200
```

### 4.4 Admin Endpoints (MASTER/MANAGER only)

```python
# Get All Users
GET /api/admin/users
  Headers: Authorization: Bearer {access_token}
  Query: page, limit, search, role, status
  Response: { users, total, page, limit }
  Status: 200

# Get User by ID
GET /api/admin/users/{user_id}
  Headers: Authorization: Bearer {access_token}
  Response: { user, roles, permissions, sessions }
  Status: 200

# Update User
PUT /api/admin/users/{user_id}
  Headers: Authorization: Bearer {access_token}
  Request: { status, roles }
  Response: { user }
  Status: 200

# Delete User
DELETE /api/admin/users/{user_id}
  Headers: Authorization: Bearer {access_token}
  Response: { success, message }
  Status: 200

# Get All Roles
GET /api/admin/roles
  Headers: Authorization: Bearer {access_token}
  Response: { roles }
  Status: 200

# Create Role
POST /api/admin/roles
  Headers: Authorization: Bearer {access_token}
  Request: { name, description, permissions }
  Response: { role }
  Status: 201

# Update Role
PUT /api/admin/roles/{role_id}
  Headers: Authorization: Bearer {access_token}
  Request: { name, description, permissions }
  Response: { role }
  Status: 200
```

---

## 5. Frontend Pages & Components

### 5.1 Pages Structure

```
apps/web/src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── register/
│   │   └── page.tsx              # Registration page
│   ├── verify-email/
│   │   └── page.tsx              # Email verification page
│   ├── forgot-password/
│   │   └── page.tsx              # Forgot password page
│   ├── reset-password/
│   │   └── page.tsx              # Reset password page
│   └── 2fa/
│       ├── setup/
│       │   └── page.tsx          # 2FA setup page
│       └── verify/
│           └── page.tsx          # 2FA verification page
│
├── (app)/
│   ├── dashboard/
│   │   └── page.tsx              # Protected dashboard
│   ├── profile/
│   │   └── page.tsx              # User profile settings
│   └── admin/
│       ├── users/
│       │   └── page.tsx          # User management (admin)
│       └── roles/
│           └── page.tsx          # Role management (admin)
│
└── layout.tsx                     # Root layout with auth provider
```

### 5.2 Components

```
apps/web/src/components/
├── auth/
│   ├── LoginForm.tsx             # Login form component
│   ├── RegisterForm.tsx          # Registration form component
│   ├── OAuthButtons.tsx          # OAuth login buttons
│   ├── TwoFactorInput.tsx        # 6-digit 2FA input
│   ├── PasswordInput.tsx         # Password input with strength indicator
│   └── PasswordStrength.tsx      # Password strength meter
│
├── ui/
│   ├── Button.tsx                # Reusable button
│   ├── Input.tsx                 # Reusable input
│   ├── Card.tsx                  # Reusable card
│   └── Alert.tsx                 # Reusable alert
│
└── layout/
    ├── Header.tsx                # App header with user menu
    ├── Sidebar.tsx               # App sidebar
    └── Footer.tsx                # App footer
```

### 5.3 State Management (Zustand)

```
apps/web/src/stores/
├── authStore.ts                  # Auth state management
│   - user, token, isAuthenticated
│   - login(), logout(), register()
│   - refreshSession()
│
├── userStore.ts                  # User profile state
│   - profile, roles, permissions
│   - updateProfile(), changePassword()
│
└── uiStore.ts                    # UI state
    - sidebarOpen, theme, notifications
```

---

## 6. Success Criteria

### 6.1 Functional

- [ ] User can register and receive verification email
- [ ] User can verify email and login
- [ ] Login works with email/password and OAuth
- [ ] JWT tokens work with proper expiration
- [ ] Refresh token rotation works
- [ ] 2FA can be enabled and verified
- [ ] All 6 roles have correct permissions
- [ ] RBAC prevents unauthorized access

### 6.2 Non-Functional

- [ ] All endpoints respond < 200ms (p95)
- [ ] Password hashing uses bcrypt (cost factor 12)
- [ ] JWT tokens signed with RS256
- [ ] Rate limiting: 100 req/min per IP, 5 login attempts
- [ ] Session tracking for audit
- [ ] All sensitive data encrypted at rest

### 6.3 Testing

- [ ] Unit test coverage > 80%
- [ ] All critical paths have E2E tests
- [ ] Security tests for auth endpoints
- [ ] Load tests handle 1000 concurrent users

### 6.4 Documentation

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Component documentation (Storybook)
- [ ] Auth flow diagrams
- [ ] Deployment instructions

---

## 7. Dependencies & Constraints

### 7.1 Technical Constraints

- **Python 3.13+** with free-threading enabled
- **FastAPI 0.115+** for API framework
- **SQLAlchemy 2.0.36+** with async support
- **PostgreSQL 17** for production database
- **Next.js 16** with Turbopack
- **React 19** with Server Components
- **TailwindCSS 4** for styling

### 7.2 External Dependencies

- **SendGrid** for transactional emails
- **Google OAuth 2.0** for social login
- **Facebook Login** for social login
- **reCAPTCHA v3** for bot protection

### 7.3 Security Requirements

- All passwords hashed with bcrypt (cost 12)
- JWT signed with RS256 (asymmetric keys)
- HTTPS only in production
- CSRF protection for state-changing operations
- SQL injection protection (parameterized queries)
- XSS protection (input sanitization)

---

## 8. References

### 8.1 Internal Documentation

- Architecture: `docs/01_ARQUITECTURA_PROSELL_SAAS_V2.md`
- Full PRD: `docs/02_REQUISITOS_PRD_PROSELL_SAAS_V2.md`
- Data Model: `docs/03_MODELO_DATOS_PROSELL_SAAS_V2.md`
- Roadmap: `docs/04_ROADMAP_PROSELL_SAAS_V2.md`
- Task List: `docs/05_TAREAS_SPRINT_PROSELL_SAAS_V2.md`
- Stack 2026: `docs/06_PROMPT_CLAUDE_CODE_2026_v2.md`

### 8.2 External Resources

- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
- OAuth 2.0: https://datatracker.ietf.org/doc/html/rfc6749
- TOTP: https://datatracker.ietf.org/doc/html/rfc6238
- JWT Best Practices: https://datatracker.ietf.org/doc/html/rfc8725
- OWASP Auth: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

---

## 9. Open Questions

1. **Email Service**: Should we use SendGrid directly or abstract for multiple providers?
2. **Session Storage**: Should we use Redis for sessions or PostgreSQL only?
3. **OAuth State**: How should we store OAuth state during flow (Redis vs encrypted token)?
4. **2FA Enforcement**: Should 2FA be gradual or immediate for all admins?
5. **Account Deletion**: Should we implement soft delete or hard delete?

---

## 10. Next Steps

1. Review and approve this INITIAL.md
2. Generate PRP based on this spec
3. Create implementation tasks
4. Start Sprint 1-2 development
