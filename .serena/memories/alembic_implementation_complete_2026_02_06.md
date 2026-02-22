# Alembic Implementation Complete - 2026-02-06

## Summary

Alembic migrations fully configured and implemented for ProSell SaaS API.

## What Was Done

### 1. Alembic Configuration ✅

- Initialized Alembic with async support
- Configured `alembic/env.py` for SQLAlchemy async
- Updated `alembic.ini` with timestamp-based file names
- Set up database URL from environment settings

### 2. New Models Created ✅

#### `user_token_model.py`

For email verification and password reset tokens:

- `id` (UUID, primary key)
- `user_id` (indexed)
- `token` (unique, indexed, for verification/reset)
- `token_type` ('email_verification', 'password_reset', etc.)
- `expires_at`, `created_at`, `used_at`

#### `oauth_account_model.py`

For social login providers (Google, Facebook, etc.):

- `id` (UUID, primary key)
- `user_id` (foreign key to users, CASCADE delete)
- `provider` ('google', 'facebook', etc.)
- `provider_user_id` (user ID from OAuth provider)
- `provider_email`, `access_token`, `refresh_token`
- `expires_at`, `created_at`, `updated_at`

### 3. Migration Files Created ✅

#### Initial Migration: `20260206_1942-d1823b89fecb`

Creates all tables in correct order:

1. `users` - User accounts
2. `roles` - System and custom roles
3. `user_roles` - Junction table (many-to-many)
4. `sessions` - Refresh token sessions
5. `user_tokens` - Email verification and password reset tokens (NEW)
6. `oauth_accounts` - Social login accounts (NEW)

### 4. Helper Script Created ✅

`scripts/alembic-migrations.sh` - Convenient CLI for migrations:

```bash
./alembic-migrations.sh status    # Show migration status
./alembic-migrations.sh upgrade   # Apply pending migrations
./alembic-migrations.sh create    # Create new migration
./alembic-migrations.sh history   # Show migration history
./alembic-migrations.sh reset     # Drop and reapply (DEV ONLY)
```

## Database Schema

### Complete Table List

| Table            | Purpose                   | New? |
| ---------------- | ------------------------- | ---- |
| `users`          | User accounts             |      |
| `roles`          | Role definitions          |      |
| `user_roles`     | User-role junction        |      |
| `sessions`       | Refresh token storage     |      |
| `user_tokens`    | Verification/reset tokens | ✅   |
| `oauth_accounts` | Social login data         | ✅   |

### Indexes Created

- Unique: `users.email`, `roles.role_type`, `sessions.token_hash`, `user_tokens.token`
- Performance: `users.status`, `users.tenant_id`, `sessions.expires_at`, etc.

## File Structure

```
apps/api/
├── alembic/
│   ├── versions/
│   │   └── 20260206_1942-d1823b89fecb_*.py
│   ├── env.py              (async configuration)
│   ├── script.py.mako      (migration template)
│   └── README
├── alembic.ini             (Alembic config)
├── src/prosell/
│   ├── infrastructure/
│   │   ├── models/
│   │   │   ├── user_token_model.py     (NEW)
│   │   │   ├── oauth_account_model.py  (NEW)
│   │   │   └── ...
│   │   └── database/
│   │       └── base.py     (imports all models)
│   └── ...
└── scripts/
    └── alembic-migrations.sh (NEW)
```

## Next Steps

### Now that Alembic is set up:

1. **Implement token storage in repositories** - Fix the TODOs
   - `user_repository_impl.py` - get_by_verification_token()
   - `user_repository_impl.py` - get_by_password_reset_token()
   - `user_repository_impl.py` - get_by_oauth()

2. **Create new migrations** when schema changes:

   ```bash
   cd apps/api
   ./scripts/alembic-migrations.sh create "Add user preferences"
   ```

3. **Apply migrations in production**:
   ```bash
   ./scripts/alembic-migrations.sh upgrade
   ```

## Commands Reference

```bash
# Show current status
.venv/bin/alembic current

# Apply all pending migrations
.venv/bin/alembic upgrade head

# Create new migration
.venv/bin/alembic revision --autogenerate -m "description"

# Show migration history
.venv/bin/alembic history

# Downgrade last migration
.venv/bin/alembic downgrade -1

# Mark DB as current (no-op)
.venv/bin/alembic stamp head
```

## Integration with CI/CD

Add to `.github/workflows/ci.yml`:

```yaml
- name: Run database migrations
  run: |
    cd apps/api
    ./scripts/alembic-migrations.sh upgrade
```

---

**Implemented via**: `/sc:improve` - Alembic setup
**Date**: 2026-02-06
**Migration ID**: d1823b89fecb
