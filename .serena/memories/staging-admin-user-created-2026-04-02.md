# Staging Admin User Created - 2026-04-02

**Status**: ✅ COMPLETE

---

## Admin User Credentials

**Email**: admin@prosell-demo.com  
**Password**: Admin123!  
**User ID**: 68a2323a-0254-48a4-a2c1-9ff0e29269d9  
**Role**: super_admin  
**Status**: active (email verified)

---

## Verification Steps Completed

### 1. User Creation ✅
- Created directly in database via Python script
- Script: `scripts/create_admin_user.py`
- User has super_admin role assigned
- Email is verified (bypassed SendGrid requirement)
- User is their own tenant (tenant_id = user_id)

### 2. Login Test ✅
- POST /api/v1/auth/login successful
- Returns access_token and refresh_token
- JWT contains roles: ["super_admin"]
- requires_2fa: false

### 3. Protected Route Access ✅
- GET /api/v1/auth/me successful
- Returns correct user ID and roles
- httpOnly cookies working correctly

### 4. Web App Auth ✅
- GET /api/auth/state successful
- isAuthenticated: true
- User data accessible from Next.js

---

## Database Records

### Users Table
```
id: 68a2323a-0254-48a4-a2c1-9ff0e29269d9
email: admin@prosell-demo.com
status: active
email_verified: true
tenant_id: 68a2323a-0254-48a4-a2c1-9ff0e29269d9
```

### User Roles Table
```
user_id: 68a2323a-0254-48a4-a2c1-9ff0e29269d9
role_id: c9ae94e1-e2ee-431d-84e3-7f5ba3c9c5f6
role_type: super_admin
role_name: Super Admin
```

---

## Key Learnings

### Email Verification Bypass
- Registration endpoint requires SendGrid for email verification
- For staging, created user directly in database with email_verified=true
- This bypasses the email verification flow

### Role Assignment
- Roles must be assigned via user_roles junction table
- super_admin role ID: c9ae94e1-e2ee-431d-84e3-7f5ba3c9c5f6
- User can have multiple roles (junction table)

### Required User Fields
All NOT NULL fields must be provided:
- is_2fa_enabled (boolean, default false)
- failed_login_attempts (integer, default 0)
- totp_secret (varchar, nullable)
- backup_codes (text, nullable)
- last_login_at (timestamp, nullable)
- last_login_ip (varchar, nullable)
- locked_until (timestamp, nullable)

---

## Testing Commands

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@prosell-demo.com","password":"Admin123!","remember_me":false}' \
  -c /tmp/cookies.txt
```

### Get User Info
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt
```

### Check Auth State
```bash
curl -X GET http://localhost:3000/api/auth/state \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt
```

---

## Files Created/Modified

### Created
- `scripts/create_admin_user.py` - Python script to create admin user directly in database

### Database Tables Used
- `users` - User accounts
- `roles` - System roles (super_admin, admin, manager, etc.)
- `user_roles` - Junction table for user-role assignments

---

## Next Steps

1. ✅ Admin user created and verified
2. ✅ Login working
3. ✅ Protected routes accessible
4. ✅ Role assignment confirmed
5. ✅ Web app authentication working

**Ready for**: Testing admin functionality, creating dealers, managing catalog, etc.

---

*Created: 2026-04-02*
*User: Rafael Padrón*
