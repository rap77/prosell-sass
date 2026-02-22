# Token Storage and OAuth Implementation Complete - 2026-02-06

## Summary

All TODOs in user_repository_impl.py have been implemented. Token storage and OAuth functionality are now fully operational.

## What Was Implemented

### 1. Token Storage Methods ✅

**File**: `user_repository_impl.py`

#### `get_by_verification_token()`

- Queries `user_tokens` table
- Filters by token type `email_verification`
- Validates token is not used (`used_at IS NULL`)
- Validates token is not expired (`expires_at > NOW`)
- Returns user entity if valid

#### `get_by_password_reset_token()`

- Queries `user_tokens` table
- Filters by token type `password_reset`
- Validates token is not used and not expired
- Returns user entity if valid

#### `get_by_oauth()`

- Queries `oauth_accounts` table
- Filters by provider and provider_user_id
- Returns linked user entity

### 2. Token Management Methods ✅

#### `create_verification_token()`

- Creates token record in `user_tokens` table
- Supports custom expiration time
- Token types: `email_verification`, `password_reset`

#### `consume_token()`

- Marks token as used by setting `used_at`
- Returns True if token was found and consumed

### 3. OAuth Repository ✅

#### New Protocol (Domain)

**File**: `domain/repositories/oauth_repository.py`

```python
class AbstractOAuthRepository(Protocol):
    async def link_oauth_account(...)
    async def unlink_oauth_account(...)
    async def get_user_oauth_providers(...)
```

#### New Implementation (Infrastructure)

**File**: `infrastructure/repositories/oauth_repository_impl.py`

- `SqlAlchemyOAuthRepository` created
- Link/unlink OAuth accounts
- List user's OAuth providers

### 4. OAuth Login Use Case Enhanced ✅

**File**: `application/use_cases/auth/oauth_login.py`

New flow:

1. Check if user exists via OAuth (provider + provider_user_id)
2. If exists → update login time
3. If not:
   - Check if email exists → link OAuth to existing account
   - If email doesn't exist → create new user + link OAuth
4. Generate JWT tokens

### 5. Dependency Injection Updated ✅

**File**: `infrastructure/api/dependencies.py`

Added:

- `get_oauth_repository()` factory
- Updated `get_oauth_login_use_case()` to inject oauth_repository

## Database Schema Used

### `user_tokens` table

```sql
id (UUID)
user_id (UUID, indexed)
token (VARCHAR(255), unique, indexed)
token_type (VARCHAR(50)) -- 'email_verification', 'password_reset'
expires_at (TIMESTAMPTZ)
created_at (TIMESTAMPTZ)
used_at (TIMESTAMPTZ, nullable)
```

### `oauth_accounts` table

```sql
id (UUID)
user_id (UUID, foreign key → users.id)
provider (VARCHAR(50)) -- 'google', 'facebook'
provider_user_id (VARCHAR(255))
provider_email (VARCHAR(255), nullable)
access_token (VARCHAR(500), nullable)
refresh_token (VARCHAR(500), nullable)
expires_at (TIMESTAMPTZ, nullable)
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

## Files Created/Modified

### Created

1. `domain/repositories/oauth_repository.py` - Protocol
2. `infrastructure/repositories/oauth_repository_impl.py` - Implementation

### Modified

1. `domain/repositories/user_repository.py` - Added token management methods
2. `infrastructure/repositories/user_repository_impl.py` - Implemented all TODOs
3. `infrastructure/repositories/__init__.py` - Exported OAuth repository
4. `infrastructure/api/dependencies.py` - Added OAuth repository factory
5. `application/use_cases/auth/oauth_login.py` - Enhanced OAuth login flow

## Usage Examples

### Email Verification

```python
# Create token
await user_repository.create_verification_token(
    user_id=user.id,
    token="abc123",
    token_type="email_verification",
    expires_in_minutes=60,
)

# Verify token
user = await user_repository.get_by_verification_token("abc123")
if user:
    user.verify_email()
    await user_repository.update(user)
    await user_repository.consume_token("abc123")
```

### Password Reset

```python
# Create reset token
await user_repository.create_verification_token(
    user_id=user.id,
    token="xyz789",
    token_type="password_reset",
    expires_in_minutes=15,
)

# Reset password
user = await user_repository.get_by_password_reset_token("xyz789")
if user:
    # Update password...
    await user_repository.consume_token("xyz789")
```

### OAuth Link/Unlink

```python
# Link OAuth account
await oauth_repository.link_oauth_account(
    user_id=user.id,
    provider="google",
    provider_user_id="123456789",
    provider_email="user@gmail.com",
)

# Get user's OAuth providers
providers = await oauth_repository.get_user_oauth_providers(user.id)

# Unlink OAuth account
await oauth_repository.unlink_oauth_account(user.id, "google")
```

## Testing

The implementation is ready for testing. Key test scenarios:

1. **Email verification flow**:
   - Create token → get_by_verification_token → consume_token

2. **Password reset flow**:
   - Create token → get_by_password_reset_token → consume_token

3. **OAuth login flow**:
   - New user via OAuth → auto-create + link
   - Existing user via OAuth → link accounts
   - Return user with roles

4. **Token expiration**:
   - Expired tokens return None
   - Used tokens return None

## Cleanup Opportunities

The following imports can be cleaned up (local imports):

- `UserTokenModel` imported in methods
- `OAuthAccountModel` imported in methods
- `datetime, timezone` imported in methods

These could be moved to top-level imports for consistency.

---

**Implemented via**: `/sc:implement`
**Date**: 2026-02-06
**TODOs Resolved**: 3/3 (100%)
