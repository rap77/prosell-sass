# When Task is Completed - ProSell SaaS

## Pre-commit Checklist
Before committing any changes:

1. **Python (apps/api)**
   ```bash
   cd apps/api
   ruff check . && ruff format .
   pyright
   uv run pytest
   ```

2. **Frontend (apps/web)**
   ```bash
   cd apps/web
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

3. **Run all pre-commit hooks**
   ```bash
   pre-commit run --all-files
   ```

4. **AI Code Review (GGA)**
   ```bash
   gga run
   ```

## Commit Guidelines
- Use conventional commits format
- Examples: `feat: add user authentication`, `fix: resolve login bug`
- NO AI attribution in commits (no "Co-Authored-By")

## Monorepo Considerations
- Check if changes affect multiple apps (api + web)
- Run `pnpm lint` and `pnpm typecheck` from root for full check
- Verify no breaking changes in shared packages (future)

## Clean Architecture Verification
- Domain layer has NO external dependencies
- Use cases are single-action classes
- Repository interfaces in domain, implementations in infrastructure
- All aggregates include `tenant_id` for multi-tenancy
