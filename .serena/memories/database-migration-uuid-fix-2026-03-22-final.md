---
name: database-migration-uuid-fix-2026-03-22-final
description: Database migration fix complete — fresh UUID schema created via direct SQL
type: project
---

# Database Migration Fix — 2026-03-22 Complete

## Problem
Previous migrations had type mismatch:
- `organizations.verified_by` (UUID) → `users.id` (VARCHAR)
- Migration order incorrect: UUID conversion came AFTER organizations

## Solution
1. **Dropped and recreated** `prosell_dev` database
2. **Created fresh schema via direct SQL** with UUID from start
3. **Created Alembic tracking migration** and stamped as `001`

## Tables Created (10)
- users, oauth_accounts, sessions, roles, user_roles
- organizations, products, publications
- facebook_accounts, facebook_pages

## Verification
```bash
uv run python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5432/prosell_dev')
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT COUNT(*) FROM users'))
        print(f'✅ DB OK: {result.scalar()} rows')
    await engine.dispose()
asyncio.run(test())
"
```

## Key Files
- `apps/api/alembic/versions/20260322_1720_initial_uuid_schema.py` — Tracking migration
- Old migrations archived/deleted

## Next Action
Test OAuth Google flow → Complete UAT Tests 2-10
