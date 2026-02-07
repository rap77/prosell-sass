# Development Commands - ProSell SaaS

## Initial Setup
```bash
# Install all dependencies (from root)
pnpm install

# Install Python dependencies
cd apps/api && uv venv && source .venv/bin/activate && uv pip install -e ".[dev]"
```

## Development
```bash
# Start all services with Turbo
pnpm dev

# Start API only
cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py --reload

# Start Web only
cd apps/web && pnpm dev

# With Docker
docker compose -f docker/docker-compose.yml up
```

## Testing
```bash
# Python unit tests
cd apps/api && uv run pytest

# Python with coverage
cd apps/api && uv run pytest --cov=prosell

# Frontend tests
cd apps/web && pnpm test

# E2E tests
cd tests/e2e && pnpm test

# All tests via Turbo
pnpm test
```

## Linting & Type Checking
```bash
# Python (from apps/api)
ruff check . && ruff format .
pyright

# Frontend (from apps/web)
pnpm lint
pnpm typecheck

# All via pre-commit
pre-commit run --all-files

# All via Turborepo
pnpm lint
pnpm typecheck
```

## AI Code Review (GGA)
```bash
# Manual review of staged files
gga run

# Force review (bypass cache)
gga run --no-cache

# Clear cache
gga cache clear
```

## System Utilities (Linux)
- `fd` - alternative to find
- `rg` - alternative to grep
- `bat` - alternative to cat
- `eza` - alternative to ls
- `sd` - alternative to sed
